/**
 * Alert Risk Scoring Service
 *
 * Implements the risk scoring algorithm for prioritized triage queue (Phase 1a).
 *
 * Risk Score Formula:
 * riskScore = (vitalsDeviation * 0.5 + trendVelocity * 0.3 + adherencePenalty * 0.2) * alertSeverityMultiplier
 *
 * Components:
 * - vitalsDeviation: 0-10 score based on how far observation deviates from normal range
 * - trendVelocity: 0-10 score based on rate of change (worsening trends)
 * - adherencePenalty: 0-10 score based on medication adherence (low adherence = higher risk)
 * - alertSeverityMultiplier: CRITICAL = 1.5, HIGH = 1.2, MEDIUM = 1.0, LOW = 0.8
 *
 * Result: Final score clamped to 0-10 range
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate vitals deviation score (0-10) based on how far observation deviates from normal range
 *
 * @param {string} patientId - Patient ID
 * @param {string} alertMetricId - Metric ID that triggered the alert
 * @returns {Promise<number>} Score from 0-10 (0 = within normal, 10 = severe deviation)
 */
const calculateVitalsDeviation = async (patientId, alertMetricId) => {
  try {
    // Get the most recent observation for this patient and metric
    const observation = await prisma.observation.findFirst({
      where: {
        patientId,
        metricId: alertMetricId
      },
      orderBy: {
        recordedAt: 'desc'
      },
      include: {
        metric: true
      }
    });

    // If no observation or no normal range defined, return moderate score
    if (!observation || !observation.metric.normalRange) {
      return 5;
    }

    const { value, metric } = observation;

    // Handle different value types
    let numericValue;
    if (typeof value === 'object' && value !== null) {
      // JSONB value field - try to extract numeric value
      numericValue = parseFloat(value.value || value);
    } else {
      numericValue = parseFloat(value);
    }

    if (isNaN(numericValue)) {
      return 5; // Cannot determine deviation for non-numeric values
    }

    const normalRange = metric.normalRange;
    const minValue = parseFloat(normalRange.minValue || normalRange.min);
    const maxValue = parseFloat(normalRange.maxValue || normalRange.max);

    if (isNaN(minValue) || isNaN(maxValue)) {
      return 5; // Invalid normal range
    }

    // Calculate deviation
    if (numericValue < minValue) {
      // Below normal range
      const deviation = (minValue - numericValue) / minValue;
      return Math.min(10, deviation * 10);
    } else if (numericValue > maxValue) {
      // Above normal range
      const deviation = (numericValue - maxValue) / maxValue;
      return Math.min(10, deviation * 10);
    }

    // Within normal range
    return 0;
  } catch (error) {
    console.error('Error calculating vitals deviation:', error);
    return 5; // Return moderate score on error
  }
};

/**
 * Calculate trend velocity score (0-10) based on rate of change in observations
 * Detects worsening trends (consistently increasing values)
 *
 * @param {string} patientId - Patient ID
 * @param {string} alertMetricId - Metric ID that triggered the alert
 * @param {number} daysBack - Number of days to look back for trend analysis (default: 7)
 * @returns {Promise<number>} Score from 0-10 (0 = no trend, 10 = rapidly worsening)
 */
const calculateTrendVelocity = async (patientId, alertMetricId, daysBack = 7) => {
  try {
    // Get recent observations for trend analysis
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const observations = await prisma.observation.findMany({
      where: {
        patientId,
        metricId: alertMetricId,
        recordedAt: {
          gte: cutoffDate
        }
      },
      orderBy: {
        recordedAt: 'asc'
      }
    });

    // Need at least 3 observations to detect a trend
    if (observations.length < 3) {
      return 0; // Insufficient data for trend analysis
    }

    // Extract numeric values
    const values = observations.map(obs => {
      let numericValue;
      if (typeof obs.value === 'object' && obs.value !== null) {
        numericValue = parseFloat(obs.value.value || obs.value);
      } else {
        numericValue = parseFloat(obs.value);
      }
      return isNaN(numericValue) ? null : numericValue;
    }).filter(v => v !== null);

    if (values.length < 3) {
      return 0; // Not enough numeric values
    }

    // Count how many consecutive increases
    let increasingCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        increasingCount++;
      }
    }

    // Calculate percentage of increasing transitions
    const trendPercent = increasingCount / (values.length - 1);

    // Map trend percentage to risk score
    if (trendPercent > 0.8) return 10; // 80%+ increasing = rapidly worsening
    if (trendPercent > 0.6) return 7;  // 60-80% increasing = worsening
    if (trendPercent > 0.4) return 5;  // 40-60% increasing = moderate trend
    return 2; // <40% increasing = minimal trend
  } catch (error) {
    console.error('Error calculating trend velocity:', error);
    return 0; // Return minimal score on error
  }
};

/**
 * Calculate adherence penalty score (0-10) based on medication adherence
 * Lower adherence = higher risk of adverse outcomes
 *
 * @param {string} patientId - Patient ID
 * @returns {Promise<number>} Score from 0-10 (0 = high adherence, 10 = very low adherence)
 */
const calculateAdherencePenalty = async (patientId) => {
  try {
    // Get active medications for this patient
    const activePatientMedications = await prisma.patientMedication.findMany({
      where: {
        patientId,
        isActive: true
      },
      include: {
        medicationAdherence: {
          where: {
            takenAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }
      }
    });

    if (activePatientMedications.length === 0) {
      return 0; // No active medications = no adherence penalty
    }

    // Calculate overall adherence percentage
    let totalAdherenceScore = 0;
    let medicationsWithData = 0;

    for (const patientMed of activePatientMedications) {
      if (patientMed.medicationAdherence.length > 0) {
        // Average adherence score for this medication
        const avgScore = patientMed.medicationAdherence.reduce((sum, record) => {
          return sum + (record.adherenceScore || 0);
        }, 0) / patientMed.medicationAdherence.length;

        totalAdherenceScore += avgScore;
        medicationsWithData++;
      }
    }

    if (medicationsWithData === 0) {
      return 3; // No adherence data = moderate penalty
    }

    // Calculate average adherence percentage across all medications
    const avgAdherencePercent = (totalAdherenceScore / medicationsWithData) * 100;

    // Map adherence percentage to penalty score (inverse relationship)
    if (avgAdherencePercent >= 80) return 0;   // High adherence (>80%) = no penalty
    if (avgAdherencePercent >= 60) return 3;   // Moderate adherence (60-80%) = small penalty
    if (avgAdherencePercent >= 40) return 6;   // Low adherence (40-60%) = moderate penalty
    return 10; // Very low adherence (<40%) = high penalty
  } catch (error) {
    console.error('Error calculating adherence penalty:', error);
    return 3; // Return moderate penalty on error
  }
};

/**
 * Get alert severity multiplier
 *
 * @param {string} severity - Alert severity (CRITICAL, HIGH, MEDIUM, LOW)
 * @returns {number} Multiplier for risk score
 */
const getAlertSeverityMultiplier = (severity) => {
  const multipliers = {
    'CRITICAL': 1.5,
    'HIGH': 1.2,
    'MEDIUM': 1.0,
    'LOW': 0.8
  };

  return multipliers[severity] || 1.0;
};

/**
 * Calculate SLA breach time based on alert severity
 *
 * @param {Date} triggeredAt - When alert was triggered
 * @param {string} severity - Alert severity (CRITICAL, HIGH, MEDIUM, LOW)
 * @returns {Date} Time when SLA will be breached
 */
const calculateSLABreachTime = (triggeredAt, severity) => {
  const slaMinutes = {
    'CRITICAL': 60,  // 1 hour
    'HIGH': 120,     // 2 hours
    'MEDIUM': 240,   // 4 hours
    'LOW': 480       // 8 hours
  };

  const slaWindow = slaMinutes[severity] || 240; // Default to 4 hours
  const breachTime = new Date(triggeredAt.getTime() + slaWindow * 60 * 1000);

  return breachTime;
};

/**
 * Calculate complete alert risk score
 *
 * @param {Object} alert - Alert object with patientId, severity, triggeredAt
 * @param {string} alertMetricId - Metric ID that triggered the alert (optional, determined from alert.data if not provided)
 * @returns {Promise<Object>} Object with riskScore and slaBreachTime
 */
const calculateAlertRiskScore = async (alert, alertMetricId = null) => {
  try {
    // Extract metric ID from alert data if not provided
    if (!alertMetricId && alert.data && alert.data.metricId) {
      alertMetricId = alert.data.metricId;
    }

    if (!alertMetricId) {
      console.warn(`No metric ID available for alert ${alert.id}, using default scores`);
    }

    // Calculate component scores in parallel
    const [vitalsDeviation, trendVelocity, adherencePenalty] = await Promise.all([
      alertMetricId ? calculateVitalsDeviation(alert.patientId, alertMetricId) : Promise.resolve(5),
      alertMetricId ? calculateTrendVelocity(alert.patientId, alertMetricId) : Promise.resolve(0),
      calculateAdherencePenalty(alert.patientId)
    ]);

    // Get severity multiplier
    const severityMultiplier = getAlertSeverityMultiplier(alert.severity);

    // Calculate raw score
    const rawScore = (
      vitalsDeviation * 0.5 +
      trendVelocity * 0.3 +
      adherencePenalty * 0.2
    ) * severityMultiplier;

    // Clamp to 0-10 range
    const riskScore = Math.max(0, Math.min(10, rawScore));

    // Calculate SLA breach time
    const slaBreachTime = calculateSLABreachTime(alert.triggeredAt, alert.severity);

    return {
      riskScore: parseFloat(riskScore.toFixed(2)),
      slaBreachTime,
      components: {
        vitalsDeviation: parseFloat(vitalsDeviation.toFixed(2)),
        trendVelocity: parseFloat(trendVelocity.toFixed(2)),
        adherencePenalty: parseFloat(adherencePenalty.toFixed(2)),
        severityMultiplier
      }
    };
  } catch (error) {
    console.error('Error calculating alert risk score:', error);

    // Return default values on error
    return {
      riskScore: 5.0,
      slaBreachTime: calculateSLABreachTime(alert.triggeredAt, alert.severity),
      components: {
        vitalsDeviation: 5.0,
        trendVelocity: 0.0,
        adherencePenalty: 3.0,
        severityMultiplier: getAlertSeverityMultiplier(alert.severity)
      }
    };
  }
};

/**
 * Recalculate priority ranks for all pending alerts in an organization
 * Assigns rank 1 to highest risk score, rank 2 to second highest, etc.
 *
 * @param {string} organizationId - Organization ID
 * @returns {Promise<number>} Number of alerts updated
 */
const recalculatePriorityRanks = async (organizationId) => {
  try {
    // Get all pending alerts sorted by risk score (highest first)
    const pendingAlerts = await prisma.alert.findMany({
      where: {
        organizationId,
        status: 'PENDING'
      },
      orderBy: [
        { riskScore: 'desc' },
        { triggeredAt: 'asc' } // Tie-breaker: older alerts first
      ]
    });

    // Update priority ranks in batches
    const updatePromises = pendingAlerts.map((alert, index) => {
      return prisma.alert.update({
        where: { id: alert.id },
        data: { priorityRank: index + 1 }
      });
    });

    await Promise.all(updatePromises);

    return pendingAlerts.length;
  } catch (error) {
    console.error('Error recalculating priority ranks:', error);
    throw error;
  }
};

module.exports = {
  calculateVitalsDeviation,
  calculateTrendVelocity,
  calculateAdherencePenalty,
  getAlertSeverityMultiplier,
  calculateSLABreachTime,
  calculateAlertRiskScore,
  recalculatePriorityRanks
};
