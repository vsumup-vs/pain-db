const { PrismaClient } = require('@prisma/client');
const {
  calculateRiskScore: calculateRiskScoreAdvanced,
  calculateMedicationAdherence
} = require('./riskScoringService');
const notificationService = require('./notificationService');
const sseService = require('./sseService');

// Use global prisma client in test environment
const prisma = global.prisma || new PrismaClient();

/**
 * Alert Evaluation Service
 *
 * Automatically evaluates observations against active alert rules
 * and triggers alerts when conditions are met.
 *
 * Phase 1a: Workflow Optimizer
 */

/**
 * Evaluate a single observation against all active alert rules for the patient's enrollments
 * @param {Object} observation - The observation to evaluate
 * @returns {Promise<Array>} Array of triggered alerts
 */
async function evaluateObservation(observation) {
  try {
    const triggeredAlerts = [];

    // Get the metric definition to understand what type of metric this is
    const metric = await prisma.metricDefinition.findUnique({
      where: { id: observation.metricId },
      select: { key: true, displayName: true, category: true }
    });

    if (!metric) {
      console.log(`Metric not found for observation ${observation.id}`);
      return [];
    }

    // Get patient's active enrollments with their condition presets and linked alert rules
    const enrollments = await prisma.enrollment.findMany({
      where: {
        patientId: observation.patientId,
        organizationId: observation.organizationId,
        status: 'ACTIVE'
      },
      include: {
        conditionPreset: {
          include: {
            alertRules: {
              where: {
                isEnabled: true,
                rule: {
                  isActive: true
                }
              },
              include: {
                rule: true
              }
            }
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Also get global/organization-level alert rules not tied to specific condition presets
    const globalAlertRules = await prisma.alertRule.findMany({
      where: {
        OR: [
          { organizationId: null }, // Platform-level standardized rules
          { organizationId: observation.organizationId } // Organization-specific rules
        ],
        isActive: true
      }
    });

    // Collect all alert rules to evaluate (from condition presets + global rules)
    const allRulesToEvaluate = [];

    // Add rules from condition presets
    for (const enrollment of enrollments) {
      if (enrollment.conditionPreset && enrollment.conditionPreset.alertRules) {
        for (const conditionPresetAlertRule of enrollment.conditionPreset.alertRules) {
          allRulesToEvaluate.push({
            rule: conditionPresetAlertRule.rule,
            enrollment,
            priority: conditionPresetAlertRule.priority
          });
        }
      }
    }

    // Add global alert rules (assign to primary enrollment if exists)
    const primaryEnrollment = enrollments[0] || null;
    for (const rule of globalAlertRules) {
      allRulesToEvaluate.push({
        rule,
        enrollment: primaryEnrollment,
        priority: rule.priority || 0
      });
    }

    // Evaluate each rule
    for (const { rule, enrollment, priority } of allRulesToEvaluate) {
      const shouldTrigger = await evaluateCondition(
        rule.conditions,
        observation,
        metric
      );

      if (shouldTrigger) {
        // Check cooldown - don't trigger duplicate alerts within a short time window
        const recentAlert = await checkAlertCooldown(
          observation.patientId,
          rule.id,
          observation.organizationId
        );

        if (!recentAlert) {
          // Get metric definition with full details for risk scoring
          const fullMetric = await prisma.metricDefinition.findUnique({
            where: { id: observation.metricId }
          });

          // Get recent observations for trend calculation (7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const recentObservations = await prisma.observation.findMany({
            where: {
              patientId: observation.patientId,
              metricId: observation.metricId,
              recordedAt: {
                gte: sevenDaysAgo
              }
            },
            orderBy: { recordedAt: 'asc' },
            take: 10
          });

          // Get patient for risk calculation
          const patient = await prisma.patient.findUnique({
            where: { id: observation.patientId }
          });

          // Get medication adherence
          const adherence = await calculateMedicationAdherence(observation.patientId, 30);

          // Create alert object for risk scoring (before database creation)
          const alertForScoring = {
            id: 'temp',
            severity: rule.severity,
            data: {
              value: observation.value,
              metricId: observation.metricId
            }
          };

          // Calculate advanced risk score
          const { riskScore } = calculateRiskScoreAdvanced(
            alertForScoring,
            patient,
            fullMetric,
            recentObservations,
            adherence
          );

          // Create alert
          const alert = await prisma.alert.create({
            data: {
              organizationId: observation.organizationId,
              ruleId: rule.id,
              patientId: observation.patientId,
              clinicianId: enrollment?.clinicianId || null,
              severity: rule.severity,
              status: 'PENDING',
              message: generateAlertMessage(observation, rule, metric),
              data: {
                observationId: observation.id,
                metricKey: metric.key,
                metricId: observation.metricId,
                value: observation.value,
                recordedAt: observation.recordedAt,
                enrollmentId: enrollment?.id || null
              },
              riskScore,
              slaBreachTime: calculateSLABreachTime(rule.severity)
            }
          });

          triggeredAlerts.push(alert);

          console.log(`✅ Alert triggered: ${rule.name} for patient ${observation.patientId} (Risk Score: ${riskScore})`);

          // Send notification for MEDIUM, HIGH, and CRITICAL alerts
          if (['MEDIUM', 'HIGH', 'CRITICAL'].includes(alert.severity)) {
            try {
              // Clinician data is already available from enrollment (with email, phone)
              if (enrollment?.clinician) {
                // Fetch complete clinician details with email and phone
                const clinician = await prisma.clinician.findUnique({
                  where: { id: enrollment.clinician.id },
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                });

                // Patient data is already fetched above (line 149)
                if (clinician && patient) {
                  await notificationService.sendAlertNotification(alert, clinician, patient);
                  console.log(`📧 Notification sent to ${clinician.email} for ${alert.severity} alert`);
                }
              } else {
                console.log(`⚠️  No clinician assigned for alert ${alert.id}, skipping notification`);
              }
            } catch (notificationError) {
              // Log but don't fail alert creation if notification fails
              console.error('Failed to send alert notification:', notificationError);
            }
          }

          // Broadcast real-time alert via SSE to connected clinicians
          try {
            sseService.broadcastNewAlert(alert);
            console.log(`📡 Real-time alert broadcast for alert ${alert.id}`);
          } catch (sseError) {
            console.error('Failed to broadcast SSE alert:', sseError);
          }
        } else {
          console.log(`⏸️  Alert cooldown active: ${rule.name} for patient ${observation.patientId}`);
        }
      }
    }

    return triggeredAlerts;

  } catch (error) {
    console.error('Error evaluating observation:', error);
    throw error;
  }
}

/**
 * Evaluate if a condition is met based on the observation
 * @param {Object} conditions - The conditions from the alert rule
 * @param {Object} observation - The observation to check
 * @param {Object} metric - The metric definition
 * @returns {Promise<Boolean>} True if condition is met
 */
async function evaluateCondition(conditions, observation, metric) {
  try {
    // Check if this condition applies to this metric
    if (conditions.metric && conditions.metric !== metric.key) {
      return false;
    }

    // Extract the value from observation.value (which is stored as JSON)
    let observationValue = observation.value;

    // Handle numeric comparisons
    if (typeof observationValue === 'object' && observationValue !== null) {
      // If it's a JSON object, try to extract a numeric value
      if (observationValue.value !== undefined) {
        observationValue = observationValue.value;
      } else if (observationValue.code !== undefined) {
        observationValue = observationValue.code;
      }
    }

    // Perform the comparison based on operator
    const operator = conditions.operator;
    const threshold = conditions.value;

    switch (operator) {
      case 'gt':
        return Number(observationValue) > Number(threshold);
      case 'gte':
        return Number(observationValue) >= Number(threshold);
      case 'lt':
        return Number(observationValue) < Number(threshold);
      case 'lte':
        return Number(observationValue) <= Number(threshold);
      case 'eq':
      case 'equals':
        return observationValue === threshold || String(observationValue) === String(threshold);
      case 'neq':
      case 'not_equals':
        return observationValue !== threshold;
      case 'in':
        return Array.isArray(threshold) && threshold.includes(observationValue);
      case 'increase':
      case 'decrease':
        // For trend-based operators, we need to compare with previous readings
        return await evaluateTrend(
          observation.patientId,
          metric.key,
          observationValue,
          operator,
          threshold,
          conditions.timeWindow
        );
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }

  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

/**
 * Evaluate trend-based conditions (increase/decrease over time)
 * @param {String} patientId - Patient ID
 * @param {String} metricKey - Metric key
 * @param {Number} currentValue - Current observation value
 * @param {String} operator - 'increase' or 'decrease'
 * @param {Number} threshold - The change threshold
 * @param {String} timeWindow - Time window (e.g., '72h', '24h')
 * @returns {Promise<Boolean>} True if trend condition is met
 */
async function evaluateTrend(patientId, metricKey, currentValue, operator, threshold, timeWindow) {
  try {
    // Parse time window (e.g., '72h' -> 72 hours)
    const hours = parseInt(timeWindow);
    if (isNaN(hours)) {
      console.warn(`Invalid time window: ${timeWindow}`);
      return false;
    }

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    // Get the metric
    const metric = await prisma.metricDefinition.findFirst({
      where: { key: metricKey }
    });

    if (!metric) return false;

    // Get previous observations in the time window
    const previousObservations = await prisma.observation.findMany({
      where: {
        patientId,
        metricId: metric.id,
        recordedAt: {
          gte: startDate
        }
      },
      orderBy: { recordedAt: 'asc' },
      take: 10 // Look at last 10 readings
    });

    if (previousObservations.length === 0) {
      return false; // No previous data to compare
    }

    // Get the earliest value in the window
    let earliestValue = previousObservations[0].value;
    if (typeof earliestValue === 'object' && earliestValue !== null && earliestValue.value !== undefined) {
      earliestValue = earliestValue.value;
    }

    const change = Number(currentValue) - Number(earliestValue);

    if (operator === 'increase') {
      return change >= Number(threshold);
    } else if (operator === 'decrease') {
      return change <= -Number(threshold);
    }

    return false;

  } catch (error) {
    console.error('Error evaluating trend:', error);
    return false;
  }
}

/**
 * Check if an alert for this rule was recently triggered (cooldown period)
 * @param {String} patientId - Patient ID
 * @param {String} ruleId - Alert rule ID
 * @param {String} organizationId - Organization ID
 * @returns {Promise<Boolean>} True if cooldown is active
 */
async function checkAlertCooldown(patientId, ruleId, organizationId) {
  try {
    // Default cooldown: 1 hour
    const cooldownMinutes = 60;
    const cooldownDate = new Date();
    cooldownDate.setMinutes(cooldownDate.getMinutes() - cooldownMinutes);

    const recentAlert = await prisma.alert.findFirst({
      where: {
        patientId,
        ruleId,
        organizationId,
        triggeredAt: {
          gte: cooldownDate
        }
      },
      orderBy: { triggeredAt: 'desc' }
    });

    return !!recentAlert;

  } catch (error) {
    console.error('Error checking alert cooldown:', error);
    return false;
  }
}

/**
 * Calculate risk score for an alert (0-10 scale)
 * DEPRECATED: This function is replaced by riskScoringService.calculateRiskScore()
 * Kept for backward compatibility if needed, but evaluateObservation now uses the advanced risk scoring.
 *
 * @param {Object} observation - The observation
 * @param {Object} rule - The alert rule
 * @param {Object} metric - The metric definition
 * @returns {Number} Risk score (0-10)
 */
function calculateRiskScore(observation, rule, metric) {
  try {
    let riskScore = 5.0; // Base score

    // Adjust based on severity
    const severityWeights = {
      'CRITICAL': 10.0,
      'HIGH': 8.0,
      'MEDIUM': 5.0,
      'LOW': 2.0
    };

    riskScore = severityWeights[rule.severity] || 5.0;

    // Adjust based on how far outside normal range (if applicable)
    if (metric.normalRange) {
      let value = observation.value;
      if (typeof value === 'object' && value !== null && value.value !== undefined) {
        value = value.value;
      }

      const numValue = Number(value);
      if (!isNaN(numValue)) {
        if (metric.normalRange.min !== undefined && numValue < metric.normalRange.min) {
          const deviation = (metric.normalRange.min - numValue) / metric.normalRange.min;
          riskScore = Math.min(10, riskScore + deviation * 2);
        } else if (metric.normalRange.max !== undefined && numValue > metric.normalRange.max) {
          const deviation = (numValue - metric.normalRange.max) / metric.normalRange.max;
          riskScore = Math.min(10, riskScore + deviation * 2);
        }
      }
    }

    // Cap between 0-10
    return Math.max(0, Math.min(10, riskScore));

  } catch (error) {
    console.error('Error calculating risk score:', error);
    return 5.0; // Default medium risk
  }
}

/**
 * Calculate SLA breach time based on severity
 * @param {String} severity - Alert severity
 * @returns {Date} SLA breach time
 */
function calculateSLABreachTime(severity) {
  const slaMinutes = {
    'CRITICAL': 30,   // 30 minutes for critical
    'HIGH': 120,      // 2 hours for high
    'MEDIUM': 480,    // 8 hours for medium
    'LOW': 1440       // 24 hours for low
  };

  const minutes = slaMinutes[severity] || 480;
  const breachTime = new Date();
  breachTime.setMinutes(breachTime.getMinutes() + minutes);

  return breachTime;
}

/**
 * Generate alert message from observation and rule
 * @param {Object} observation - The observation
 * @param {Object} rule - The alert rule
 * @param {Object} metric - The metric definition
 * @returns {String} Alert message
 */
function generateAlertMessage(observation, rule, metric) {
  try {
    let value = observation.value;
    if (typeof value === 'object' && value !== null && value.value !== undefined) {
      value = value.value;
    }

    const unit = metric.unit || '';
    const metricName = metric.displayName;

    return `${rule.description || rule.name}: ${metricName} is ${value}${unit}`;

  } catch (error) {
    console.error('Error generating alert message:', error);
    return rule.description || rule.name;
  }
}

/**
 * Evaluate all recent observations for missed assessment checks
 * (Scheduled job function)
 * @param {String} organizationId - Organization ID (optional, if null checks all orgs)
 * @returns {Promise<Number>} Number of alerts triggered
 */
async function evaluateMissedAssessments(organizationId = null) {
  try {
    console.log('🔍 Checking for missed assessments...');

    // This is a placeholder for future implementation
    // Would check for enrollments that haven't had observations in their expected frequency

    return 0;

  } catch (error) {
    console.error('Error evaluating missed assessments:', error);
    return 0;
  }
}

/**
 * Evaluate medication adherence for all active patients
 * (Scheduled job function)
 * @param {String} organizationId - Organization ID (optional)
 * @returns {Promise<Number>} Number of alerts triggered
 */
async function evaluateMedicationAdherence(organizationId = null) {
  try {
    console.log('🔍 Checking medication adherence...');

    // This is a placeholder for future implementation
    // Would check for missed medication doses and trigger adherence alerts

    return 0;

  } catch (error) {
    console.error('Error evaluating medication adherence:', error);
    return 0;
  }
}

module.exports = {
  evaluateObservation,
  evaluateCondition,
  evaluateTrend,
  checkAlertCooldown,
  calculateRiskScore,
  calculateSLABreachTime,
  generateAlertMessage,
  evaluateMissedAssessments,
  evaluateMedicationAdherence
};
