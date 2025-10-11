const { PrismaClient } = require('@prisma/client');

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
      sortBy = 'createdAt',
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

    // If you need to filter by severity, you need to filter through the rule relation
    const { severity } = req.query;
    if (severity) {
      where.rule = {
        severity: severity.toLowerCase() // severity enum values are lowercase
      };
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
          enrollment: {
            select: { 
              id: true, 
              patient: {
                select: { id: true, mrn: true, firstName: true, lastName: true }
              }
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
    const { ruleType, threshold, message, severity, isActive } = req.body;

    // Check if alert exists
    const existingAlert = await prisma.alert.findUnique({ where: { id } });
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

    const updateData = {};
    if (ruleType !== undefined) updateData.ruleType = ruleType;
    if (threshold !== undefined) updateData.threshold = parseFloat(threshold);
    if (message !== undefined) updateData.message = message;
    if (severity !== undefined) updateData.severity = severity;
    if (isActive !== undefined) updateData.isActive = isActive;

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        metricDefinition: {
          select: { id: true, name: true, unit: true }
        }
      }
    });

    res.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const recentWhere = { ...where, createdAt: { gte: startDate } };

    const [totalAlerts, activeAlerts, statusStats] = await Promise.all([
      prisma.alert.count({ where }),
      // Count active/open alerts
      prisma.alert.count({ 
        where: { 
          ...where,
          status: 'open' 
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
    
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        status: true,
        createdAt: true,
        rule: {
          select: { 
            name: true, 
            severity: true 
          }
        },
        enrollment: {
          select: { 
            patient: {
              select: { 
                firstName: true, 
                lastName: true 
              }
            }
          }
        }
      }
    });

    res.json({
      alerts
    });
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({
      error: 'Internal server error while fetching recent alerts'
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
  getRecentAlerts
};