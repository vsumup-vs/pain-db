const { PrismaClient } = require('@prisma/client');
const { calculateAlertRiskScore, recalculatePriorityRanks } = require('../services/alertRiskScoringService');
const { findBillingEnrollment } = require('../utils/billingHelpers');
const { broadcastNewAlert } = require('../services/sseService');

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

    // Check organization type - block PLATFORM organizations from creating manual alerts
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true
      }
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from creating manual alerts (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Manual alert creation is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Extract patientId and clinicianId from enrollment
    const patientId = enrollment.patientId;
    const clinicianId = enrollment.clinicianId;

    const alert = await prisma.alert.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        ruleId,
        patientId,
        clinicianId,
        severity: rule.severity || 'MEDIUM',
        message: facts?.message || rule.name || 'Alert triggered',
        data: facts || {}
      },
      include: {
        rule: {
          select: { id: true, name: true, severity: true }
        },
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        clinician: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    // Broadcast the new alert via SSE to connected clients
    broadcastNewAlert(alert);

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
      limit = 50, // Increased from 10 for better performance and UX
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
    // Note: Alert doesn't have enrollmentId field, use patientId instead if needed
    // if (enrollmentId) where.enrollmentId = enrollmentId;
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
      followUpTaskPriority,
      followUpTaskAssignedToId,
      createEncounterNote,
      encounterNoteType
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
      // Determine clinicianId: use alert's clinician, or find any clinician in organization, or skip TimeLog
      let clinicianIdForTimeLog = alert.clinicianId;

      if (!clinicianIdForTimeLog) {
        // Try to find a clinician in the organization
        const anyClinician = await tx.clinician.findFirst({
          where: { organizationId },
          select: { id: true }
        });

        if (anyClinician) {
          clinicianIdForTimeLog = anyClinician.id;
        }
      }

      // Only create TimeLog if we have a valid clinicianId
      let timeLog = null;
      if (clinicianIdForTimeLog) {
        // Find billing enrollment for this patient
        // IMPORTANT: Use patient's organizationId, not clinician's organizationId
        // This ensures we find the correct enrollment even when clinician and patient are in different orgs
        const enrollmentId = await findBillingEnrollment(alert.patientId, alert.patient.organizationId, tx);

        timeLog = await tx.timeLog.create({
          data: {
            patientId: alert.patientId,
            clinicianId: clinicianIdForTimeLog,
            enrollmentId, // Link to billing enrollment for accurate billing
            activity,
            duration: parseInt(timeSpentMinutes),
            cptCode,
            notes: resolutionNotes.trim(),
            billable: cptCode !== null, // Only billable if CPT code assigned
            loggedAt: new Date()
          }
        });
      } else {
        console.warn(`No clinician found for TimeLog creation. Alert ${id} resolved without billable time log.`);
      }

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
            timeLogId: timeLog?.id || null,
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
            assignedToId: followUpTaskAssignedToId || currentUserId, // Use form value or default to current user
            assignedById: currentUserId,
            patientId: alert.patientId,
            alertId: alert.id,
            organizationId
          }
        });
      }

      // 5. Optional: Create encounter note
      let encounterNote = null;
      if (createEncounterNote) {
        // Fetch data for auto-population (same logic as encounterNoteController)
        const [recentVitals, recentAssessments, recentAlerts] = await Promise.all([
          // Last 5 vital readings
          tx.observation.findMany({
            where: {
              patientId: alert.patientId,
              organizationId,
              metric: {
                category: { in: ['Vitals', 'Clinical Measurements'] }
              }
            },
            include: {
              metric: {
                select: {
                  displayName: true,
                  unit: true
                }
              }
            },
            orderBy: { recordedAt: 'desc' },
            take: 5
          }),
          // Last 3 assessments
          tx.assessment.findMany({
            where: { patientId: alert.patientId },
            include: {
              template: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { completedAt: 'desc' },
            take: 3
          }),
          // Recent active alerts
          tx.alert.findMany({
            where: {
              patientId: alert.patientId,
              organizationId,
              status: { in: ['PENDING', 'ACKNOWLEDGED'] }
            },
            include: {
              rule: {
                select: {
                  name: true,
                  severity: true
                }
              }
            },
            orderBy: { triggeredAt: 'desc' },
            take: 5
          })
        ]);

        // Auto-populate vitalsSnapshot
        const vitalsSnapshot = recentVitals.map(obs => ({
          metric: obs.metric.displayName,
          value: obs.value,
          unit: obs.metric.unit,
          recordedAt: obs.recordedAt
        }));

        // Auto-populate assessmentSummary
        const assessmentSummary = recentAssessments.length > 0
          ? recentAssessments.map(a =>
              `${a.template.name}: Score ${JSON.stringify(a.score)} (${new Date(a.completedAt).toLocaleDateString()})`
            ).join('\n')
          : null;

        // Auto-populate alertsSummary
        const alertsSummary = recentAlerts.length > 0
          ? recentAlerts.map(a =>
              `${a.rule.name} (${a.rule.severity}): ${a.message}`
            ).join('\n')
          : null;

        encounterNote = await tx.encounterNote.create({
          data: {
            organizationId,
            patientId: alert.patientId,
            clinicianId: alert.clinicianId || currentUserId,
            encounterType: encounterNoteType || 'GENERAL',
            vitalsSnapshot,
            assessmentSummary,
            alertsSummary,
            subjective: `Alert Resolution: ${alert.rule?.name}\nPatient Outcome: ${patientOutcome}`,
            objective: resolutionNotes.trim(),
            assessment: `Intervention: ${interventionType.replace(/_/g, ' ')}`,
            plan: `Follow-up as needed. Time spent: ${timeSpentMinutes} minutes.`,
            alertId: alert.id
          }
        });
      }

      // 6. Auto-mark triggering observation as REVIEWED (RPM workflow)
      let reviewedObservation = null;
      if (alert.observationId) {
        try {
          reviewedObservation = await tx.observation.update({
            where: { id: alert.observationId },
            data: {
              review_status: 'REVIEWED',
              reviewed_at: new Date(),
              reviewed_by: clinicianIdForTimeLog || currentUserId,
              review_method: 'ALERT',
              review_notes: `Auto-reviewed via alert resolution: ${resolutionNotes.trim()}`,
              related_alert_id: alert.id
            }
          });
        } catch (obsError) {
          console.warn(`Failed to auto-review observation ${alert.observationId}:`, obsError.message);
          // Continue even if observation review fails (non-critical)
        }
      }

      return {
        alert: updatedAlert,
        timeLog,
        auditLog,
        followUpTask,
        encounterNote,
        reviewedObservation
      };
    });

    res.json({
      success: true,
      data: result.alert,
      timeLog: result.timeLog,
      followUpTask: result.followUpTask,
      encounterNote: result.encounterNote,
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
    // Note: Alert doesn't have enrollmentId field, use patientId instead if needed
    // if (enrollmentId) where.enrollmentId = enrollmentId;

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
      escalationStatus, // 'escalated-to-me', 'all-escalated', 'sla-breached-only'
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

    // Filter out snoozed and suppressed alerts by default (Phase 1b)
    // Snoozed: snoozedUntil is in the future
    // Suppressed: isSuppressed is true
    where.AND = [
      {
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: new Date() } } // Include if snooze expired
        ]
      },
      {
        isSuppressed: false
      }
    ];

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

    // Escalation status filter (Supervisor filters - Phase 1b)
    if (escalationStatus) {
      const now = new Date();

      if (escalationStatus === 'escalated-to-me') {
        // Show only alerts escalated to current user
        where.isEscalated = true;
        where.escalatedToId = currentUserId;
      } else if (escalationStatus === 'all-escalated') {
        // Show all escalated alerts in organization
        where.isEscalated = true;
      } else if (escalationStatus === 'sla-breached-only') {
        // Show only alerts where SLA breach time has passed
        where.slaBreachTime = { lt: now };
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

    // Calculate total time logged per patient for badge display
    const patientIds = [...new Set(alerts.map(a => a.patientId))];

    const timeLogsByPatient = await prisma.timeLog.groupBy({
      by: ['patientId'],
      where: {
        patientId: { in: patientIds }
      },
      _sum: {
        duration: true
      }
    });

    // Create a map of patientId -> total minutes logged
    const timeLoggedMap = {};
    timeLogsByPatient.forEach(record => {
      timeLoggedMap[record.patientId] = record._sum.duration || 0;
    });

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
          isClaimedByMe: alert.claimedById === currentUserId,
          totalTimeLoggedMinutes: timeLoggedMap[alert.patientId] || 0
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

// Force claim an alert (Phase 1b - Option 3 Hybrid)
// Allows supervisors/admins to claim an already-claimed alert
const forceClaimAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Required reason for force claim
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

    // Validate reason is provided
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Reason for force claim is required (minimum 10 characters)'
      });
    }

    // Check user has permission (ORG_ADMIN or SUPERVISOR role)
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: currentUserId,
        organizationId,
        role: { in: ['ORG_ADMIN', 'SUPERVISOR'] }
      }
    });

    if (!userOrg) {
      return res.status(403).json({
        success: false,
        error: 'Only supervisors and organization admins can force claim alerts'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        claimedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
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
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is already resolved
    if (alert.status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot force claim a resolved alert'
      });
    }

    // Check if trying to force claim own alert
    if (alert.claimedById === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'You already own this alert. No need to force claim.'
      });
    }

    const previousClaimerId = alert.claimedById;
    const previousClaimerName = alert.claimedBy
      ? `${alert.claimedBy.firstName} ${alert.claimedBy.lastName}`
      : 'None';

    // Force claim with audit logging
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
      // Create audit log for force claim
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_FORCE_CLAIMED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            claimedById: previousClaimerId,
            claimedAt: alert.claimedAt
          },
          newValues: {
            claimedById: currentUserId,
            claimedAt: new Date()
          },
          metadata: {
            previousClaimerId,
            previousClaimerName,
            reason: reason.trim(),
            forceClaim: true,
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity
          },
          hipaaRelevant: true
        }
      })
    ]);

    // Broadcast SSE update
    try {
      const sseService = require('../services/sseService');
      sseService.broadcastAlertUpdate(updatedAlert);
    } catch (sseError) {
      console.error('Failed to broadcast SSE force claim update:', sseError);
    }

    // Send notification to previous claimer if there was one
    if (previousClaimerId) {
      try {
        const notificationService = require('../services/notificationService');
        const patientName = `${alert.patient.firstName} ${alert.patient.lastName}`;
        const currentUserName = `${updatedAlert.claimedBy.firstName} ${updatedAlert.claimedBy.lastName}`;

        await notificationService.sendEmail({
          to: alert.claimedBy.email,
          subject: `⚠️ Alert Force Claimed: ${patientName}`,
          html: `
            <h2>Alert Reassigned by Supervisor</h2>
            <p>Dear ${previousClaimerName},</p>
            <p>Your claim on the following alert was reassigned by a supervisor:</p>
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Alert:</strong> ${alert.rule.name}</p>
            <p><strong>Severity:</strong> ${alert.severity}</p>
            <p><strong>Reassigned To:</strong> ${currentUserName}</p>
            <p><strong>Reason:</strong> ${reason.trim()}</p>
            <p>The alert has been claimed by another team member and is no longer in your queue.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/alerts">View Triage Queue</a></p>
          `
        });
        console.log(`📧 Force claim notification sent to ${alert.claimedBy.email}`);
      } catch (emailError) {
        console.error('Failed to send force claim notification:', emailError);
      }
    }

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert force claimed successfully'
    });
  } catch (error) {
    console.error('Error force claiming alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while force claiming alert'
    });
  }
};

// Snooze an alert (Phase 1b)
const snoozeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { snoozeMinutes: snoozeMinutesRaw } = req.body; // Duration in minutes
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

    // Parse and validate snooze duration
    const snoozeMinutes = parseInt(snoozeMinutesRaw);

    if (!snoozeMinutes || isNaN(snoozeMinutes) || snoozeMinutes < 1) {
      return res.status(400).json({
        success: false,
        error: 'Snooze duration (minutes) is required and must be at least 1 minute'
      });
    }

    // Maximum snooze duration: 1 week (10080 minutes)
    const MAX_SNOOZE_MINUTES = 10080;
    if (snoozeMinutes > MAX_SNOOZE_MINUTES) {
      return res.status(400).json({
        success: false,
        error: `Snooze duration cannot exceed ${MAX_SNOOZE_MINUTES} minutes (1 week)`
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        rule: true,
        patient: true
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is already resolved or dismissed
    if (['RESOLVED', 'DISMISSED'].includes(alert.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot snooze ${alert.status.toLowerCase()} alert`
      });
    }

    // Calculate snooze expiration
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

    // Update alert with snooze details and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          snoozedUntil,
          snoozedById: currentUserId,
          snoozedAt: new Date()
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
          snoozedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      // Create audit log
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_SNOOZED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            snoozedUntil: alert.snoozedUntil,
            snoozedById: alert.snoozedById,
            snoozedAt: alert.snoozedAt
          },
          newValues: {
            snoozedUntil,
            snoozedById: currentUserId,
            snoozedAt: new Date()
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity,
            snoozeMinutes
          },
          hipaaRelevant: true
        }
      })
    ]);

    // Broadcast SSE update
    const sseService = require('../services/sseService');
    try {
      sseService.broadcastAlertUpdate(updatedAlert);
    } catch (sseError) {
      console.error('Failed to broadcast SSE alert update:', sseError);
    }

    res.json({
      success: true,
      data: updatedAlert,
      message: `Alert snoozed for ${snoozeMinutes} minutes`
    });
  } catch (error) {
    console.error('Error snoozing alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while snoozing alert'
    });
  }
};

// Unsnooze an alert (Phase 1b)
const unsnoozeAlert = async (req, res) => {
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
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is snoozed
    if (!alert.snoozedUntil) {
      return res.status(400).json({
        success: false,
        error: 'Alert is not snoozed'
      });
    }

    // Update alert to remove snooze and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          snoozedUntil: null,
          snoozedById: null,
          snoozedAt: null
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
      // Create audit log
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_UNSNOOZED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            snoozedUntil: alert.snoozedUntil,
            snoozedById: alert.snoozedById,
            snoozedAt: alert.snoozedAt
          },
          newValues: {
            snoozedUntil: null,
            snoozedById: null,
            snoozedAt: null
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity
          },
          hipaaRelevant: true
        }
      })
    ]);

    // Broadcast SSE update
    const sseService = require('../services/sseService');
    try {
      sseService.broadcastAlertUpdate(updatedAlert);
    } catch (sseError) {
      console.error('Failed to broadcast SSE alert update:', sseError);
    }

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert snooze removed'
    });
  } catch (error) {
    console.error('Error unsnoozing alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while unsnoozing alert'
    });
  }
};

// Suppress an alert (Phase 1b)
const suppressAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { suppressReason, suppressNotes } = req.body;
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

    // Validate suppress reason
    if (!suppressReason) {
      return res.status(400).json({
        success: false,
        error: 'Suppress reason is required'
      });
    }

    const validSuppressReasons = [
      'FALSE_POSITIVE',
      'PATIENT_CONTACTED',
      'DUPLICATE_ALERT',
      'PLANNED_INTERVENTION',
      'PATIENT_HOSPITALIZED',
      'DEVICE_MALFUNCTION',
      'DATA_ENTRY_ERROR',
      'CLINICAL_JUDGMENT',
      'OTHER'
    ];

    if (!validSuppressReasons.includes(suppressReason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid suppress reason. Must be one of: ${validSuppressReasons.join(', ')}`
      });
    }

    // If reason is OTHER, require notes
    if (suppressReason === 'OTHER' && (!suppressNotes || suppressNotes.trim().length < 10)) {
      return res.status(400).json({
        success: false,
        error: 'Suppress notes are required (minimum 10 characters) when reason is OTHER'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        rule: true,
        patient: true
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is already resolved
    if (alert.status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot suppress resolved alert'
      });
    }

    // Check if already suppressed
    if (alert.isSuppressed) {
      return res.status(400).json({
        success: false,
        error: 'Alert is already suppressed'
      });
    }

    // Update alert with suppression details and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          isSuppressed: true,
          suppressReason,
          suppressedById: currentUserId,
          suppressedAt: new Date(),
          suppressNotes: suppressNotes?.trim() || null,
          status: 'DISMISSED' // Change status to DISMISSED
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
          suppressedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      // Create audit log
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_SUPPRESSED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            isSuppressed: alert.isSuppressed,
            suppressReason: alert.suppressReason,
            status: alert.status
          },
          newValues: {
            isSuppressed: true,
            suppressReason,
            suppressedById: currentUserId,
            suppressedAt: new Date(),
            suppressNotes: suppressNotes?.trim() || null,
            status: 'DISMISSED'
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity,
            suppressReason
          },
          hipaaRelevant: true
        }
      })
    ]);

    // Broadcast SSE update
    const sseService = require('../services/sseService');
    try {
      sseService.broadcastAlertUpdate(updatedAlert);
    } catch (sseError) {
      console.error('Failed to broadcast SSE alert update:', sseError);
    }

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert suppressed successfully'
    });
  } catch (error) {
    console.error('Error suppressing alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while suppressing alert'
    });
  }
};

// Unsuppress an alert (Phase 1b)
const unsuppressAlert = async (req, res) => {
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
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is suppressed
    if (!alert.isSuppressed) {
      return res.status(400).json({
        success: false,
        error: 'Alert is not suppressed'
      });
    }

    // Update alert to remove suppression and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          isSuppressed: false,
          suppressReason: null,
          suppressedById: null,
          suppressedAt: null,
          suppressNotes: null,
          status: 'PENDING' // Reactivate alert
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
      // Create audit log
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_UNSUPPRESSED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            isSuppressed: alert.isSuppressed,
            suppressReason: alert.suppressReason,
            status: alert.status
          },
          newValues: {
            isSuppressed: false,
            suppressReason: null,
            suppressedById: null,
            suppressedAt: null,
            suppressNotes: null,
            status: 'PENDING'
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity
          },
          hipaaRelevant: true
        }
      })
    ]);

    // Broadcast SSE update
    const sseService = require('../services/sseService');
    try {
      sseService.broadcastAlertUpdate(updatedAlert);
    } catch (sseError) {
      console.error('Failed to broadcast SSE alert update:', sseError);
    }

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert suppression removed and alert reactivated'
    });
  } catch (error) {
    console.error('Error unsuppressing alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while unsuppressing alert'
    });
  }
};

// Escalate an alert (Phase 1b - Manual or automatic escalation)
const escalateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalatedToId, escalationReason } = req.body;
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

    // Validate escalatedToId (required for manual escalation)
    if (!escalatedToId) {
      return res.status(400).json({
        success: false,
        error: 'Escalation target user ID (escalatedToId) is required'
      });
    }

    // Validate escalation target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: escalatedToId }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Escalation target user not found'
      });
    }

    // Check if alert exists and belongs to organization
    const alert = await prisma.alert.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        rule: true,
        patient: true
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if alert is already resolved
    if (alert.status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot escalate resolved alert'
      });
    }

    // Calculate new escalation level
    const newEscalationLevel = (alert.escalationLevel || 0) + 1;

    // Update alert with escalation details and create audit log
    const [updatedAlert] = await prisma.$transaction([
      prisma.alert.update({
        where: { id },
        data: {
          isEscalated: true,
          escalatedAt: new Date(),
          escalatedToId,
          escalationLevel: newEscalationLevel,
          escalationReason: escalationReason || 'Manual escalation'
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
          escalatedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      // Create audit log
      prisma.auditLog.create({
        data: {
          userId: currentUserId,
          organizationId,
          action: 'ALERT_ESCALATED',
          resource: 'Alert',
          resourceId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          oldValues: {
            isEscalated: alert.isEscalated,
            escalationLevel: alert.escalationLevel,
            escalatedToId: alert.escalatedToId
          },
          newValues: {
            isEscalated: true,
            escalatedAt: new Date(),
            escalatedToId,
            escalationLevel: newEscalationLevel,
            escalationReason: escalationReason || 'Manual escalation'
          },
          metadata: {
            patientId: alert.patientId,
            ruleId: alert.ruleId,
            severity: alert.severity,
            escalationLevel: newEscalationLevel,
            escalatedToEmail: targetUser.email
          },
          hipaaRelevant: true
        }
      })
    ]);

    // Broadcast SSE update
    const sseService = require('../services/sseService');
    try {
      sseService.broadcastAlertUpdate(updatedAlert);
    } catch (sseError) {
      console.error('Failed to broadcast SSE alert update:', sseError);
    }

    // TODO: Send escalation notification email to escalatedTo user
    // This will be implemented when we add email notification service

    res.json({
      success: true,
      data: updatedAlert,
      message: `Alert escalated to ${updatedAlert.escalatedTo?.firstName} ${updatedAlert.escalatedTo?.lastName} (Level ${newEscalationLevel})`
    });
  } catch (error) {
    console.error('Error escalating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while escalating alert'
    });
  }
};

// Get escalation history for an alert (Phase 1b)
const getEscalationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId || req.user?.currentOrganization;

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

    // Get all escalation-related audit logs for this alert
    const escalationLogs = await prisma.auditLog.findMany({
      where: {
        resource: 'Alert',
        resourceId: id,
        action: 'ALERT_ESCALATED'
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Extract escalation details from metadata
    const escalationHistory = escalationLogs.map(log => ({
      escalatedAt: log.createdAt,
      escalatedBy: log.user,
      escalatedToId: log.newValues?.escalatedToId,
      escalatedToEmail: log.metadata?.escalatedToEmail,
      escalationLevel: log.metadata?.escalationLevel,
      escalationReason: log.newValues?.escalationReason,
      severity: log.metadata?.severity
    }));

    res.json({
      success: true,
      data: {
        alertId: id,
        currentEscalationLevel: alert.escalationLevel,
        isEscalated: alert.isEscalated,
        history: escalationHistory
      }
    });
  } catch (error) {
    console.error('Error fetching escalation history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching escalation history'
    });
  }
};

// Bulk alert actions (Phase 1b - Multi-select operations)
const bulkAlertActions = async (req, res) => {
  try {
    const { alertIds, action, actionData } = req.body;
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

    // Validate alertIds array
    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Alert IDs array is required and must contain at least one alert ID'
      });
    }

    // Validate action
    const validActions = ['acknowledge', 'resolve', 'snooze', 'suppress', 'assign', 'dismiss'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    // Fetch all alerts to verify they exist and belong to organization
    const alerts = await prisma.alert.findMany({
      where: {
        id: { in: alertIds },
        organizationId
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        rule: { select: { id: true, name: true, severity: true } }
      }
    });

    if (alerts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching alerts found'
      });
    }

    if (alerts.length !== alertIds.length) {
      return res.status(400).json({
        success: false,
        error: `Only ${alerts.length} of ${alertIds.length} alerts found or belong to your organization`
      });
    }

    // Execute bulk action based on type
    let results = { success: [], failed: [], summary: {} };
    const sseService = require('../services/sseService');

    switch (action) {
      case 'acknowledge':
        for (const alert of alerts) {
          try {
            if (alert.status === 'PENDING') {
              const [updatedAlert] = await prisma.$transaction([
                prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedAt: new Date()
                  }
                }),
                prisma.auditLog.create({
                  data: {
                    userId: currentUserId,
                    organizationId,
                    action: 'ALERT_ACKNOWLEDGED_BULK',
                    resource: 'Alert',
                    resourceId: alert.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    oldValues: { status: alert.status },
                    newValues: { status: 'ACKNOWLEDGED' },
                    metadata: { patientId: alert.patientId, bulkAction: true },
                    hipaaRelevant: true
                  }
                })
              ]);
              results.success.push({ id: alert.id, message: 'Acknowledged' });
              try {
                sseService.broadcastAlertUpdate(updatedAlert);
              } catch (sseError) {
                console.error('SSE broadcast failed:', sseError);
              }
            } else {
              results.failed.push({ id: alert.id, reason: `Already ${alert.status.toLowerCase()}` });
            }
          } catch (error) {
            results.failed.push({ id: alert.id, reason: error.message });
          }
        }
        break;

      case 'snooze':
        const snoozeMinutes = actionData?.snoozeMinutes || 60;
        const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

        for (const alert of alerts) {
          try {
            if (!['RESOLVED', 'DISMISSED'].includes(alert.status)) {
              const [updatedAlert] = await prisma.$transaction([
                prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    snoozedUntil,
                    snoozedById: currentUserId,
                    snoozedAt: new Date()
                  }
                }),
                prisma.auditLog.create({
                  data: {
                    userId: currentUserId,
                    organizationId,
                    action: 'ALERT_SNOOZED_BULK',
                    resource: 'Alert',
                    resourceId: alert.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    oldValues: { snoozedUntil: alert.snoozedUntil },
                    newValues: { snoozedUntil },
                    metadata: { patientId: alert.patientId, snoozeMinutes, bulkAction: true },
                    hipaaRelevant: true
                  }
                })
              ]);
              results.success.push({ id: alert.id, message: `Snoozed for ${snoozeMinutes} minutes` });
              try {
                sseService.broadcastAlertUpdate(updatedAlert);
              } catch (sseError) {
                console.error('SSE broadcast failed:', sseError);
              }
            } else {
              results.failed.push({ id: alert.id, reason: `Cannot snooze ${alert.status.toLowerCase()} alert` });
            }
          } catch (error) {
            results.failed.push({ id: alert.id, reason: error.message });
          }
        }
        break;

      case 'suppress':
        const suppressReason = actionData?.suppressReason || 'CLINICAL_JUDGMENT';
        const suppressNotes = actionData?.suppressNotes;

        for (const alert of alerts) {
          try {
            if (alert.status !== 'RESOLVED' && !alert.isSuppressed) {
              const [updatedAlert] = await prisma.$transaction([
                prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    isSuppressed: true,
                    suppressReason,
                    suppressedById: currentUserId,
                    suppressedAt: new Date(),
                    suppressNotes,
                    status: 'DISMISSED'
                  }
                }),
                prisma.auditLog.create({
                  data: {
                    userId: currentUserId,
                    organizationId,
                    action: 'ALERT_SUPPRESSED_BULK',
                    resource: 'Alert',
                    resourceId: alert.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    oldValues: { isSuppressed: alert.isSuppressed, status: alert.status },
                    newValues: { isSuppressed: true, suppressReason, status: 'DISMISSED' },
                    metadata: { patientId: alert.patientId, suppressReason, bulkAction: true },
                    hipaaRelevant: true
                  }
                })
              ]);
              results.success.push({ id: alert.id, message: 'Suppressed' });
              try {
                sseService.broadcastAlertUpdate(updatedAlert);
              } catch (sseError) {
                console.error('SSE broadcast failed:', sseError);
              }
            } else {
              results.failed.push({ id: alert.id, reason: 'Already resolved or suppressed' });
            }
          } catch (error) {
            results.failed.push({ id: alert.id, reason: error.message });
          }
        }
        break;

      case 'assign':
        const assignToId = actionData?.assignToId;
        if (!assignToId) {
          return res.status(400).json({
            success: false,
            error: 'assignToId is required for assign action'
          });
        }

        // Verify target user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: assignToId }
        });
        if (!targetUser) {
          return res.status(404).json({
            success: false,
            error: 'Target user not found'
          });
        }

        for (const alert of alerts) {
          try {
            const [updatedAlert] = await prisma.$transaction([
              prisma.alert.update({
                where: { id: alert.id },
                data: {
                  claimedById: assignToId,
                  claimedAt: new Date()
                }
              }),
              prisma.auditLog.create({
                data: {
                  userId: currentUserId,
                  organizationId,
                  action: 'ALERT_ASSIGNED_BULK',
                  resource: 'Alert',
                  resourceId: alert.id,
                  ipAddress: req.ip,
                  userAgent: req.get('user-agent'),
                  oldValues: { claimedById: alert.claimedById },
                  newValues: { claimedById: assignToId },
                  metadata: { patientId: alert.patientId, assignedToEmail: targetUser.email, bulkAction: true },
                  hipaaRelevant: true
                }
              })
            ]);
            results.success.push({ id: alert.id, message: `Assigned to ${targetUser.firstName} ${targetUser.lastName}` });
            try {
              sseService.broadcastAlertUpdate(updatedAlert);
            } catch (sseError) {
              console.error('SSE broadcast failed:', sseError);
            }
          } catch (error) {
            results.failed.push({ id: alert.id, reason: error.message });
          }
        }
        break;

      case 'resolve':
        // Validate required fields for resolution
        const resolutionNotes = actionData?.resolutionNotes;
        const interventionType = actionData?.interventionType || 'NO_PATIENT_CONTACT';
        const patientOutcome = actionData?.patientOutcome || 'NO_CHANGE';

        if (!resolutionNotes || resolutionNotes.trim().length < 10) {
          return res.status(400).json({
            success: false,
            error: 'Resolution notes are required (minimum 10 characters) for bulk resolution'
          });
        }

        for (const alert of alerts) {
          try {
            if (alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED') {
              const [updatedAlert] = await prisma.$transaction([
                prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                    resolvedById: currentUserId,
                    resolutionNotes: resolutionNotes.trim(),
                    interventionType,
                    patientOutcome
                  }
                }),
                prisma.auditLog.create({
                  data: {
                    userId: currentUserId,
                    organizationId,
                    action: 'ALERT_RESOLVED_BULK',
                    resource: 'Alert',
                    resourceId: alert.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    oldValues: { status: alert.status },
                    newValues: {
                      status: 'RESOLVED',
                      interventionType,
                      patientOutcome
                    },
                    metadata: { patientId: alert.patientId, bulkAction: true },
                    hipaaRelevant: true
                  }
                })
              ]);
              results.success.push({ id: alert.id, message: 'Resolved' });
              try {
                sseService.broadcastAlertUpdate(updatedAlert);
              } catch (sseError) {
                console.error('SSE broadcast failed:', sseError);
              }
            } else {
              results.failed.push({ id: alert.id, reason: `Already ${alert.status.toLowerCase()}` });
            }
          } catch (error) {
            results.failed.push({ id: alert.id, reason: error.message });
          }
        }
        break;

      case 'dismiss':
        for (const alert of alerts) {
          try {
            if (alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED') {
              const [updatedAlert] = await prisma.$transaction([
                prisma.alert.update({
                  where: { id: alert.id },
                  data: {
                    status: 'DISMISSED'
                  }
                }),
                prisma.auditLog.create({
                  data: {
                    userId: currentUserId,
                    organizationId,
                    action: 'ALERT_DISMISSED_BULK',
                    resource: 'Alert',
                    resourceId: alert.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    oldValues: { status: alert.status },
                    newValues: { status: 'DISMISSED' },
                    metadata: { patientId: alert.patientId, bulkAction: true },
                    hipaaRelevant: true
                  }
                })
              ]);
              results.success.push({ id: alert.id, message: 'Dismissed' });
              try {
                sseService.broadcastAlertUpdate(updatedAlert);
              } catch (sseError) {
                console.error('SSE broadcast failed:', sseError);
              }
            } else {
              results.failed.push({ id: alert.id, reason: `Already ${alert.status.toLowerCase()}` });
            }
          } catch (error) {
            results.failed.push({ id: alert.id, reason: error.message });
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Action ${action} not implemented yet`
        });
    }

    // Generate summary
    results.summary = {
      total: alertIds.length,
      successful: results.success.length,
      failed: results.failed.length,
      action
    };

    res.json({
      success: true,
      data: results,
      message: `Bulk ${action} completed: ${results.success.length} successful, ${results.failed.length} failed`
    });
  } catch (error) {
    console.error('Error performing bulk alert actions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while performing bulk actions'
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
  forceClaimAlert,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  unsnoozeAlert,
  suppressAlert,
  unsuppressAlert,
  escalateAlert,
  getEscalationHistory,
  bulkAlertActions
};