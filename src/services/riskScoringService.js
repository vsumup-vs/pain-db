/**
 * Risk Scoring Service
 *
 * Calculates risk scores (0-10) for clinical alerts based on:
 * - Vitals deviation from normal range (50% weight)
 * - Trend velocity over 7 days (30% weight)
 * - Medication adherence penalty (20% weight)
 * - Severity multiplier (CRITICAL: 2.0x, HIGH: 1.5x, MEDIUM: 1.0x, LOW: 0.5x)
 *
 * Phase 1a: Workflow Optimizer - Triage Queue
 */

const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

/**
 * Calculate vitals deviation from normal range
 * @param {number} value - Observation value
 * @param {Object} normalRange - { min, max }
 * @returns {number} Deviation score (0-10)
 */
function calculateVitalsDeviation(value, normalRange) {
  if (!normalRange || normalRange.min === undefined || normalRange.max === undefined) {
    return 0;
  }

  let deviation = 0;

  if (value < normalRange.min) {
    // Below normal range
    deviation = (normalRange.min - value) / normalRange.min;
  } else if (value > normalRange.max) {
    // Above normal range
    deviation = (value - normalRange.max) / normalRange.max;
  } else {
    // Within normal range
    return 0;
  }

  // Convert to 0-10 scale and cap at 10
  return Math.min(10, deviation * 10);
}

/**
 * Calculate trend velocity based on recent observations
 * @param {Array} observations - Recent observations (7 days)
 * @returns {number} Velocity score (0-10)
 */
function calculateTrendVelocity(observations) {
  if (!observations || observations.length < 2) {
    return 0;
  }

  // Extract values and timestamps
  const data = observations.map(obs => {
    let value = obs.value;

    // Handle JSONB format { value: x }
    if (typeof value === 'object' && value !== null && value.value !== undefined) {
      value = value.value;
    }

    return {
      value: Number(value),
      timestamp: new Date(obs.recordedAt).getTime()
    };
  });

  // Sort by timestamp ascending
  data.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate linear regression slope
  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.timestamp, 0);
  const sumY = data.reduce((sum, d) => sum + d.value, 0);
  const sumXY = data.reduce((sum, d) => sum + d.timestamp * d.value, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.timestamp * d.timestamp, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // If slope is negative (improving), return 0
  if (slope <= 0) {
    return 0;
  }

  // Normalize slope to 0-10 scale
  // Slope is in units per millisecond, scale to meaningful range
  // Typical slope for pain increasing 1 point per day ≈ 1.16e-8
  // We want slope of ~1 point/day to give velocity ~5
  const scalingFactor = 4.32e8; // (1 point per day) * (milliseconds per day)
  const normalizedVelocity = slope * scalingFactor;

  // Cap at 10
  return Math.min(10, Math.max(0, normalizedVelocity));
}

/**
 * Calculate adherence penalty from adherence percentage
 * @param {number} adherencePercentage - Adherence % (0-100)
 * @returns {number} Penalty score (0-10)
 */
function calculateAdherencePenalty(adherencePercentage) {
  if (adherencePercentage === null || adherencePercentage === undefined) {
    return 0;
  }

  // Convert adherence % to penalty (inverse relationship)
  // 100% adherence = 0 penalty, 0% adherence = 10 penalty
  return 10 - (adherencePercentage / 10);
}

/**
 * Get severity multiplier
 * @param {string} severity - Alert severity (CRITICAL, HIGH, MEDIUM, LOW)
 * @returns {number} Multiplier (0.5-2.0)
 */
function getSeverityMultiplier(severity) {
  const multipliers = {
    CRITICAL: 2.0,
    HIGH: 1.5,
    MEDIUM: 1.0,
    LOW: 0.5
  };

  return multipliers[severity] || 1.0;
}

/**
 * Extract numeric value from observation data
 * @param {*} data - Alert data with value field
 * @returns {number} Numeric value
 */
function extractValue(data) {
  if (!data || data.value === undefined) {
    return 0;
  }

  let value = data.value;

  // Handle JSONB format { value: x }
  if (typeof value === 'object' && value !== null && value.value !== undefined) {
    value = value.value;
  }

  return Number(value);
}

/**
 * Calculate risk score for an alert
 * @param {Object} alert - Alert object with severity, data
 * @param {Object} patient - Patient object
 * @param {Object} metric - Metric definition with normalRange
 * @param {Array} observations - Recent observations for trend (7 days)
 * @param {Object} adherence - { percentage: 0-100 }
 * @returns {Object} { riskScore, components: { vitalsDeviation, trendVelocity, adherencePenalty, severityMultiplier } }
 */
function calculateRiskScore(alert, patient, metric, observations = [], adherence = { percentage: 100 }) {
  // Extract observation value from alert data
  const value = extractValue(alert.data);

  // Calculate components
  const vitalsDeviation = calculateVitalsDeviation(value, metric.normalRange);
  const trendVelocity = calculateTrendVelocity(observations);
  const adherencePenalty = calculateAdherencePenalty(adherence.percentage);
  const severityMultiplier = getSeverityMultiplier(alert.severity);

  // Calculate weighted risk score
  // Formula: (vitals * 0.5 + trend * 0.3 + adherence * 0.2) * severity
  const baseScore = (
    (vitalsDeviation * 0.5) +
    (trendVelocity * 0.3) +
    (adherencePenalty * 0.2)
  );

  const riskScore = Math.min(10, Math.max(0, baseScore * severityMultiplier));

  return {
    riskScore: Math.round(riskScore * 100) / 100, // Round to 2 decimal places
    components: {
      vitalsDeviation: Math.round(vitalsDeviation * 100) / 100,
      trendVelocity: Math.round(trendVelocity * 100) / 100,
      adherencePenalty: Math.round(adherencePenalty * 100) / 100,
      severityMultiplier
    }
  };
}

/**
 * Calculate medication adherence percentage for a patient
 * @param {string} patientId - Patient ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object>} { percentage: 0-100, taken: number, expected: number }
 */
async function calculateMedicationAdherence(patientId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get patient's active medications
    const medications = await prisma.patientMedication.findMany({
      where: {
        patientId,
        isActive: true,
        startDate: {
          lte: new Date()
        }
      },
      include: {
        medicationAdherence: {
          where: {
            takenAt: {
              gte: startDate
            }
          }
        }
      }
    });

    if (medications.length === 0) {
      return { percentage: 100, taken: 0, expected: 0 };
    }

    // Calculate total doses taken vs expected
    let totalTaken = 0;
    let totalExpected = 0;

    for (const med of medications) {
      // Count actual doses taken
      totalTaken += med.medicationAdherence.length;

      // Calculate expected doses based on frequency
      // This is a simplified calculation - adjust based on your frequency encoding
      const medStartDate = med.startDate > startDate ? med.startDate : startDate;
      const daysActive = Math.ceil((new Date() - medStartDate) / (1000 * 60 * 60 * 24));

      // Parse frequency (e.g., "twice daily", "once daily", "3 times daily")
      let dosesPerDay = 1;
      if (med.frequency) {
        const frequencyLower = med.frequency.toLowerCase();
        if (frequencyLower.includes('twice') || frequencyLower.includes('2')) {
          dosesPerDay = 2;
        } else if (frequencyLower.includes('three') || frequencyLower.includes('3')) {
          dosesPerDay = 3;
        } else if (frequencyLower.includes('four') || frequencyLower.includes('4')) {
          dosesPerDay = 4;
        }
      }

      totalExpected += daysActive * dosesPerDay;
    }

    if (totalExpected === 0) {
      return { percentage: 100, taken: totalTaken, expected: totalExpected };
    }

    const percentage = Math.min(100, (totalTaken / totalExpected) * 100);

    return {
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
      taken: totalTaken,
      expected: totalExpected
    };

  } catch (error) {
    console.error('Error calculating medication adherence:', error);
    return { percentage: 100, taken: 0, expected: 0 };
  }
}

/**
 * Update risk scores for alerts related to a specific patient and metric
 * Called after new observation is created
 * @param {string} patientId - Patient ID
 * @param {string} metricId - Metric definition ID
 * @returns {Promise<Object>} { updated: number, alerts: Array }
 */
async function updateAlertRiskScores(patientId, metricId) {
  try {
    // Find all PENDING or ACKNOWLEDGED alerts for this patient/metric
    const alerts = await prisma.alert.findMany({
      where: {
        patientId,
        data: {
          path: ['metricId'],
          equals: metricId
        },
        status: {
          in: ['PENDING', 'ACKNOWLEDGED']
        }
      },
      include: {
        patient: true,
        rule: true
      }
    });

    if (alerts.length === 0) {
      return { updated: 0, alerts: [] };
    }

    // Get metric definition
    const metric = await prisma.metricDefinition.findUnique({
      where: { id: metricId }
    });

    if (!metric) {
      return { updated: 0, alerts: [] };
    }

    // Get recent observations for trend calculation (7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const observations = await prisma.observation.findMany({
      where: {
        patientId,
        metricId,
        recordedAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: { recordedAt: 'asc' },
      take: 10
    });

    // Get medication adherence
    const adherence = await calculateMedicationAdherence(patientId, 30);

    // Update each alert
    const updatedAlerts = [];

    for (const alert of alerts) {
      const { riskScore, components } = calculateRiskScore(
        alert,
        alert.patient,
        metric,
        observations,
        adherence
      );

      // Update alert in database
      const updated = await prisma.alert.update({
        where: { id: alert.id },
        data: { riskScore }
      });

      updatedAlerts.push(updated);
    }

    return {
      updated: updatedAlerts.length,
      alerts: updatedAlerts
    };

  } catch (error) {
    console.error('Error updating alert risk scores:', error);
    return { updated: 0, alerts: [] };
  }
}

module.exports = {
  calculateRiskScore,
  calculateVitalsDeviation,
  calculateTrendVelocity,
  calculateAdherencePenalty,
  calculateMedicationAdherence,
  updateAlertRiskScores,
  getSeverityMultiplier,
  extractValue
};
