const { PrismaClient } = require('@prisma/client');
const { calculateAlertRiskScore, recalculatePriorityRanks } = require('../services/alertRiskScoringService');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new alert
const createAlert = async (req, res) => {
  try {
    const { ruleId, enrollmentId, facts } = req.body;

    // Validate required fields
    if (!ruleId || !enrollmentId) {
      return res.status(400).json({
        error: 'Missing required fields: ruleId, enrollmentId'
      });
    }

    // Check if rule and enrollment exist
    const rule = await prisma.alertRule.findUnique({ where: { id: ruleId } });
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const alert = await prisma.alert.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        ruleId,
        enrollmentId,
        facts: facts || {},
        status: 'open'
      },
      include: {
        rule: {
          select: { id: true, name: true, severity: true }
        },
        enrollment: {
          select: { 
            id: true, 
            patient: {
              select: { id: true, mrn: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all alerts with filtering
const getAlerts = async (req, res) => {
  try {
    const {
      enrollmentId,
      ruleId,
      status,
      page = 1,
      limit = 10,
      sortBy = 'triggeredAt',
      sortOrder = 'desc'
    } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const where = {
      organizationId  // SECURITY: Always filter by organization
    };
    if (enrollmentId) where.enrollmentId = enrollmentId;
    if (ruleId) where.ruleId = ruleId;
    if (status) where.status = status;

    // Filter by severity directly on the alert (not through rule relation)
    const { severity } = req.query;
    if (severity) {
      where.severity = severity.toUpperCase(); // severity enum values are UPPERCASE (CRITICAL, HIGH, MEDIUM, LOW)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          rule: {
            select: { id: true, name: true, severity: true }
          },
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true
            }
          }
        }
      }),
      prisma.alert.count({ where })
    ]);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get alert by ID
const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            severity: true
          }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update alert
const updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { ruleType, threshold, message, severity, isActive, status } = req.body;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if alert exists and belongs to organization
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Validate rule type if provided
    if (ruleType) {
      const validRuleTypes = ['THRESHOLD_EXCEEDED', 'THRESHOLD_BELOW', 'TREND_INCREASING', 'TREND_DECREASING', 'MISSING_DATA'];
      if (!validRuleTypes.includes(ruleType)) {
        return res.status(400).json({
          error: `Invalid rule type. Must be one of: ${validRuleTypes.join(', ')}`
        });
      }
    }

    // Validate severity if provided
    if (severity) {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (!validSeverities.includes(severity)) {
        return res.status(400).json({
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    const updateData = {};
    if (ruleType !== undefined) updateData.ruleType = ruleType;
    if (threshold !== undefined) updateData.threshold = parseFloat(threshold);
    if (message !== undefined) updateData.message = message;
    if (severity !== undefined) updateData.severity = severity;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle status updates with proper timestamps
    if (status !== undefined) {
      updateData.status = status;

      // Set acknowledgedAt timestamp when status changes to ACKNOWLEDGED
      if (status === 'ACKNOWLEDGED' && existingAlert.status !== 'ACKNOWLEDGED') {
        updateData.acknowledgedAt = new Date();
      }

      // Set resolvedAt timestamp when status changes to RESOLVED
      if (status === 'RESOLVED' && existingAlert.status !== 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        rule: {
          select: { id: true, name: true, severity: true }
        },
        clinician: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Acknowledge alert (Critical Fix #3 - Audit Logging)
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        patient: true,
        rule: true
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if already acknowledged
    if (alert.status === 'ACKNOWLEDGED' || alert.status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        error: `Alert is already ${alert.status.toLowerCase()}`
      });
    }

    // Update alert status and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true
            }
          }
        }
      }),
      // Create audit log (HIPAA compliance - §164.312(b) Audit Controls)
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_ACKNOWLEDGED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            status: alert.status,
            acknowledgedAt: alert.acknowledgedAt
          },
          newValues: {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date()
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            ruleName: alert.rule?.name,
            severity: alert.severity
          },
          hipaaRelevant: true // PHI access event
        }
      })
    ]);

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while acknowledging alert'
    });
  }
};

// Resolve alert with required documentation (Critical Fixes #1, #2, #3, #4)
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resolutionNotes,
      interventionType,
      patientOutcome,
      timeSpentMinutes,
      createFollowUpTask,
      followUpTaskType,
      followUpTaskTitle,
      followUpTaskDescription,
      followUpTaskDueDate,
      followUpTaskPriority
    } = req.body;

    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Critical Fix #1: Validate required resolution notes (min 10 chars)
    if (!resolutionNotes || resolutionNotes.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Resolution notes are required (minimum 10 characters) for clinical documentation'
      });
    }

    // Critical Fix #4: Validate required intervention type (for billing)
    if (!interventionType) {
      return res.status(400).json({
        success: false,
        error: 'Intervention type is required for billing documentation'
      });
    }

    const validInterventionTypes = [
      'PHONE_CALL',
      'VIDEO_CALL',
      'IN_PERSON_VISIT',
      'SECURE_MESSAGE',
      'MEDICATION_ADJUSTMENT',
      'REFERRAL',
      'PATIENT_EDUCATION',
      'CARE_COORDINATION',
      'MEDICATION_RECONCILIATION',
      'NO_PATIENT_CONTACT'
    ];

    if (!validInterventionTypes.includes(interventionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid intervention type. Must be one of: ${validInterventionTypes.join(', ')}`
      });
    }

    // Validate patient outcome
    if (!patientOutcome) {
      return res.status(400).json({
        success: false,
        error: 'Patient outcome is required'
      });
    }

    const validPatientOutcomes = ['IMPROVED', 'STABLE', 'DECLINED', 'NO_CHANGE', 'PATIENT_UNREACHABLE'];

    if (!validPatientOutcomes.includes(patientOutcome)) {
      return res.status(400).json({
        success: false,
        error: `Invalid patient outcome. Must be one of: ${validPatientOutcomes.join(', ')}`
      });
    }

    // Validate time spent (required for billing)
    if (!timeSpentMinutes || timeSpentMinutes < 1) {
      return res.status(400).json({
        success: false,
        error: 'Time spent (minutes) is required and must be at least 1 minute'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        patient: true,
        clinician: true,
        rule: true
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if already resolved
    if (alert.status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        error: 'Alert is already resolved'
      });
    }

    // Determine CPT code based on intervention type and time spent
    // Critical Fix #2: Auto-log billable time
    let cptCode = null;
    let activity = `Alert Resolution - ${interventionType.replace(/_/g, ' ')}`;

    // Interactive interventions qualify for RTM/RPM billing
    if (['PHONE_CALL', 'VIDEO_CALL', 'IN_PERSON_VISIT', 'SECURE_MESSAGE'].includes(interventionType)) {
      if (timeSpentMinutes >= 20) {
        // CPT 99457: First 20 minutes of interactive communication
        cptCode = 'CODE_99457';
        activity = `RTM/RPM Interactive Communication - ${interventionType.replace(/_/g, ' ')}`;
      } else {
        // < 20 minutes: Document time but may not be billable for RTM/RPM
        activity = `Alert Resolution - ${interventionType.replace(/_/g, ' ')} (${timeSpentMinutes} min - below 20 min threshold)`;
      }
    }

    // Use transaction to ensure atomicity (all-or-nothing)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update alert with resolution documentation
      const updatedAlert = await tx.alert.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedById: currentUserId,
          resolutionNotes: resolutionNotes.trim(),
          interventionType,
          patientOutcome,
          timeSpentMinutes: parseInt(timeSpentMinutes)
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true
            }
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // 2. Critical Fix #2: Create TimeLog entry for billing
      const timeLog = await tx.timeLog.create({
        data: {
          patientId: alert.patientId,
          clinicianId: alert.clinicianId || currentUserId,
          activity,
          duration: parseInt(timeSpentMinutes),
          cptCode,
          notes: resolutionNotes.trim(),
          billable: cptCode !== null, // Only billable if CPT code assigned
          loggedAt: new Date()
        }
      });

      // 3. Critical Fix #3: Create audit log (HIPAA compliance)
      const auditLog = await tx.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_RESOLVED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            status: alert.status,
            resolvedAt: alert.resolvedAt
          },
          newValues: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolutionNotes: resolutionNotes.trim(),
            interventionType,
            patientOutcome,
            timeSpentMinutes: parseInt(timeSpentMinutes)
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            ruleName: alert.rule?.name,
            severity: alert.severity,
            timeLogId: timeLog.id,
            cptCode,
            billable: cptCode !== null
          },
          hipaaRelevant: true // PHI access and clinical documentation event
        }
      });

      // 4. Optional: Create follow-up task
      let followUpTask = null;
      if (createFollowUpTask && followUpTaskTitle && followUpTaskDueDate) {
        followUpTask = await tx.task.create({
          data: {
            taskType: followUpTaskType || 'FOLLOW_UP_CALL',
            title: followUpTaskTitle,
            description: followUpTaskDescription || `Follow-up for resolved alert: ${alert.rule?.name}`,
            status: 'PENDING',
            priority: followUpTaskPriority || 'MEDIUM',
            dueDate: new Date(followUpTaskDueDate),
            assignedToId: currentUserId,
            assignedById: currentUserId,
            patientId: alert.patientId,
            alertId: alert.id,
            organizationId
          }
        });
      }

      return {
        alert: updatedAlert,
        timeLog,
        auditLog,
        followUpTask
      };
    });

    res.json({
      success: true,
      data: result.alert,
      timeLog: result.timeLog,
      followUpTask: result.followUpTask,
      message: 'Alert resolved successfully with clinical documentation and billable time logged'
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while resolving alert'
    });
  }
};

// Delete alert
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const existingAlert = await prisma.alert.findUnique({ where: { id } });
    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await prisma.alert.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Evaluate alert rules against observations
const evaluateAlerts = async (req, res) => {
  try {
    const { patientId, metricDefinitionId } = req.query;

    const where = { isActive: true };
    if (patientId) where.patientId = patientId;
    if (metricDefinitionId) where.metricDefinitionId = metricDefinitionId;

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        patient: true,
        metricDefinition: true
      }
    });

    const evaluationResults = [];

    for (const alert of alerts) {
      const result = await evaluateAlertRule(alert);
      evaluationResults.push(result);

      // Update alert trigger status if needed
      if (result.triggered !== alert.isTriggered) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { 
            isTriggered: result.triggered,
            lastTriggeredAt: result.triggered ? new Date() : alert.lastTriggeredAt
          }
        });
      }
    }

    res.json({ evaluationResults });
  } catch (error) {
    console.error('Error evaluating alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to evaluate individual alert rule
const evaluateAlertRule = async (alert) => {
  try {
    // Get recent observations for this patient and metric
    const observations = await prisma.observation.findMany({
      where: {
        patientId: alert.patientId,
        metricDefinitionId: alert.metricDefinitionId
      },
      orderBy: { recordedAt: 'desc' },
      take: 10 // Get last 10 observations for trend analysis
    });

    if (observations.length === 0) {
      return {
        alertId: alert.id,
        triggered: alert.ruleType === 'MISSING_DATA',
        reason: 'No observations found',
        value: null
      };
    }

    const latestObservation = observations[0];
    const latestValue = parseFloat(latestObservation.value);

    let triggered = false;
    let reason = '';

    switch (alert.ruleType) {
      case 'THRESHOLD_EXCEEDED':
        triggered = latestValue > alert.threshold;
        reason = triggered ? `Value ${latestValue} exceeds threshold ${alert.threshold}` : 'Within threshold';
        break;

      case 'THRESHOLD_BELOW':
        triggered = latestValue < alert.threshold;
        reason = triggered ? `Value ${latestValue} below threshold ${alert.threshold}` : 'Above threshold';
        break;

      case 'TREND_INCREASING':
        if (observations.length >= 3) {
          const values = observations.slice(0, 3).map(obs => parseFloat(obs.value));
          triggered = values[0] > values[1] && values[1] > values[2];
          reason = triggered ? 'Increasing trend detected' : 'No increasing trend';
        }
        break;

      case 'TREND_DECREASING':
        if (observations.length >= 3) {
          const values = observations.slice(0, 3).map(obs => parseFloat(obs.value));
          triggered = values[0] < values[1] && values[1] < values[2];
          reason = triggered ? 'Decreasing trend detected' : 'No decreasing trend';
        }
        break;

      case 'MISSING_DATA':
        const hoursSinceLastObservation = (new Date() - new Date(latestObservation.recordedAt)) / (1000 * 60 * 60);
        triggered = hoursSinceLastObservation > alert.threshold;
        reason = triggered ? `No data for ${hoursSinceLastObservation.toFixed(1)} hours` : 'Recent data available';
        break;
    }

    return {
      alertId: alert.id,
      triggered,
      reason,
      value: latestValue,
      observationCount: observations.length
    };
  } catch (error) {
    console.error('Error evaluating alert rule:', error);
    return {
      alertId: alert.id,
      triggered: false,
      reason: 'Evaluation error',
      error: error.message
    };
  }
};

// Get alert statistics
const getAlertStats = async (req, res) => {
  try {
    const { enrollmentId, timeframe = '7d' } = req.query;

    const where = {};
    if (enrollmentId) where.enrollmentId = enrollmentId;

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Add date filter to where clause for recent stats
    const recentWhere = { ...where, triggeredAt: { gte: startDate } };

    const [totalAlerts, activeAlerts, statusStats] = await Promise.all([
      prisma.alert.count({ where }),
      // Count active/pending alerts
      prisma.alert.count({
        where: {
          ...where,
          status: 'PENDING'
        }
      }),
      prisma.alert.groupBy({
        by: ['status'],
        where: recentWhere,
        _count: { status: true }
      })
    ]);

    // Get severity stats by fetching alerts with rules
    const alertsWithRules = await prisma.alert.findMany({
      where: recentWhere,
      include: {
        rule: {
          select: { severity: true }
        }
      }
    });

    // Process severity stats
    const severityBreakdown = {};
    alertsWithRules.forEach(alert => {
      const severity = alert.rule?.severity || 'unknown';
      severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;
    });

    res.json({
      data: {
        total: totalAlerts,
        active: activeAlerts,
        statusBreakdown: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {}),
        severityBreakdown,
        timeframe
      }
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Optimized version for dashboard - minimal includes
const getRecentAlerts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const alerts = await prisma.alert.findMany({
      where: {
        organizationId
      },
      orderBy: { triggeredAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        status: true,
        severity: true,
        message: true,
        triggeredAt: true,
        rule: {
          select: {
            name: true,
            severity: true
          }
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        alerts
      }
    });
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching recent alerts'
    });
  }
};

// Get prioritized triage queue (Phase 1a - Workflow Optimizer)
const getTriageQueue = async (req, res) => {
  try {
    const {
      status = 'PENDING',
      severity,
      minRiskScore,
      maxRiskScore,
      claimedBy,
      slaStatus, // 'breached', 'approaching', 'ok'
      page = 1,
      limit = 20,
      sortBy = 'priorityRank', // Default: sort by priority rank
      sortOrder = 'asc'
    } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;
    const currentUserId = req.user?.userId; // FIXED: JWT token uses userId, not id

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Build where clause
    const where = {
      organizationId
    };

    // Status filter (default to PENDING for triage queue)
    if (status) {
      where.status = status;
    }

    // Severity filter
    if (severity) {
      where.severity = severity;
    }

    // Risk score range filter
    if (minRiskScore !== undefined || maxRiskScore !== undefined) {
      where.riskScore = {};
      if (minRiskScore !== undefined) {
        where.riskScore.gte = parseFloat(minRiskScore);
      }
      if (maxRiskScore !== undefined) {
        where.riskScore.lte = parseFloat(maxRiskScore);
      }
    }

    // Claimed by filter
    if (claimedBy) {
      if (claimedBy === 'me') {
        where.claimedById = currentUserId;
      } else if (claimedBy === 'unclaimed') {
        where.claimedById = null;
      } else {
        where.claimedById = claimedBy; // Specific user ID
      }
    }

    // SLA status filter
    if (slaStatus) {
      const now = new Date();
      const slaWarningBuffer = 30 * 60 * 1000; // 30 minutes before breach

      if (slaStatus === 'breached') {
        where.slaBreachTime = { lt: now };
      } else if (slaStatus === 'approaching') {
        const warningTime = new Date(now.getTime() + slaWarningBuffer);
        where.slaBreachTime = {
          gte: now,
          lt: warningTime
        };
      } else if (slaStatus === 'ok') {
        const warningTime = new Date(now.getTime() + slaWarningBuffer);
        where.slaBreachTime = { gte: warningTime };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Determine sort order
    let orderBy;
    if (sortBy === 'priorityRank' || sortBy === 'riskScore') {
      orderBy = { [sortBy]: sortOrder };
    } else if (sortBy === 'slaBreachTime') {
      orderBy = { slaBreachTime: sortOrder };
    } else {
      orderBy = { triggeredAt: sortOrder };
    }

    // Fetch alerts with enriched data
    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              phone: true
            }
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true
            }
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true,
              description: true
            }
          },
          claimedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.alert.count({ where })
    ]);

    // Enrich alerts with computed fields
    const now = new Date();
    const enrichedAlerts = alerts.map(alert => {
      // Calculate time remaining until SLA breach
      const timeRemainingMs = alert.slaBreachTime ? alert.slaBreachTime.getTime() - now.getTime() : null;
      const timeRemainingMinutes = timeRemainingMs ? Math.floor(timeRemainingMs / (60 * 1000)) : null;

      // Determine SLA status
      let slaStatusValue = 'ok';
      if (timeRemainingMs !== null) {
        if (timeRemainingMs < 0) {
          slaStatusValue = 'breached';
        } else if (timeRemainingMs < 30 * 60 * 1000) { // Less than 30 minutes
          slaStatusValue = 'approaching';
        }
      }

      // Risk level label based on score
      let riskLevel = 'low';
      if (alert.riskScore >= 8) {
        riskLevel = 'critical';
      } else if (alert.riskScore >= 6) {
        riskLevel = 'high';
      } else if (alert.riskScore >= 4) {
        riskLevel = 'medium';
      }

      return {
        ...alert,
        computed: {
          timeRemainingMinutes,
          slaStatus: slaStatusValue,
          riskLevel,
          isClaimed: !!alert.claimedById,
          isClaimedByMe: alert.claimedById === currentUserId
        }
      };
    });

    // Summary statistics
    const summary = {
      total,
      pending: await prisma.alert.count({ where: { organizationId, status: 'PENDING' } }),
      breached: await prisma.alert.count({
        where: {
          organizationId,
          status: 'PENDING',
          slaBreachTime: { lt: now }
        }
      }),
      approaching: await prisma.alert.count({
        where: {
          organizationId,
          status: 'PENDING',
          slaBreachTime: {
            gte: now,
            lt: new Date(now.getTime() + 30 * 60 * 1000)
          }
        }
      }),
      unclaimed: await prisma.alert.count({
        where: {
          organizationId,
          status: 'PENDING',
          claimedById: null
        }
      }),
      claimedByMe: await prisma.alert.count({
        where: {
          organizationId,
          status: 'PENDING',
          claimedById: currentUserId
        }
      })
    };

    res.json({
      success: true,
      data: {
        alerts: enrichedAlerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching triage queue:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching triage queue'
    });
  }
};

// Claim an alert (Phase 1a - Workflow Optimizer)
const claimAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId; // FIXED: JWT token uses userId, not id
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is already claimed
    if (alert.claimedById) {
      if (alert.claimedById === currentUserId) {
        return res.status(400).json({
          success: false,
          error: 'You have already claimed this alert'
        });
      } else {
        return res.status(409).json({
          success: false,
          error: 'Alert is already claimed by another user',
          claimedById: alert.claimedById
        });
      }
    }

    // Claim the alert with audit logging (Critical Fix #3)
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          claimedById: currentUserId,
          claimedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          claimedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true
            }
          }
        }
      }),
      // Create audit log (HIPAA compliance - §164.312(b) Audit Controls)
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_CLAIMED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            claimedById: null,
            claimedAt: null
          },
          newValues: {
            claimedById: currentUserId,
            claimedAt: new Date()
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity
          },
          hipaaRelevant: true // PHI access event
        }
      })
    ]);

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert claimed successfully'
    });
  } catch (error) {
    console.error('Error claiming alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while claiming alert'
    });
  }
};

// Unclaim an alert (Phase 1a - Workflow Optimizer)
const unclaimAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId; // FIXED: JWT token uses userId, not id
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is claimed by current user
    if (alert.claimedById !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only unclaim alerts that you have claimed'
      });
    }

    // Unclaim the alert with audit logging (Critical Fix #3)
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          claimedById: null,
          claimedAt: null
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true
            }
          }
        }
      }),
      // Create audit log (HIPAA compliance - §164.312(b) Audit Controls)
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_UNCLAIMED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            claimedById: alert.claimedById,
            claimedAt: alert.claimedAt
          },
          newValues: {
            claimedById: null,
            claimedAt: null
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity
          },
          hipaaRelevant: true // PHI access event
        }
      })
    ]);

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert unclaimed successfully'
    });
  } catch (error) {
    console.error('Error unclaiming alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while unclaiming alert'
    });
  }
};

module.exports = {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
  evaluateAlerts,
  getAlertStats,
  getRecentAlerts,
  getTriageQueue,
  claimAlert,
  unclaimAlert,
  acknowledgeAlert,
  resolveAlert
};