/**
 * Billing Readiness Service
 *
 * Calculates billing eligibility for patients enrolled in CMS programs (RPM, RTM, CCM)
 * based on CONFIGURABLE criteria stored in the database.
 *
 * ⚠️  NO HARDCODED BILLING REQUIREMENTS ⚠️
 *
 * This service reads billing program criteria from BillingProgram, BillingCPTCode,
 * and BillingEligibilityRule models, then evaluates patient data (observations,
 * time logs, enrollments) to determine which CPT codes are billable.
 *
 * Key Features:
 * - Configurable criteria (thresholds read from database)
 * - Supports multiple billing programs (RPM, RTM, CCM)
 * - Version-aware (effective dates)
 * - International program support (US CMS, UK NHS, etc.)
 * - Detailed eligibility breakdown per CPT code
 *
 * @module billingReadinessService
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate billing readiness for a specific enrollment
 *
 * @param {string} enrollmentId - Enrollment ID to calculate billing for
 * @param {string} billingMonth - Month to calculate (YYYY-MM format, e.g., "2025-10")
 * @returns {Promise<Object>} Billing readiness details
 */
async function calculateBillingReadiness(enrollmentId, billingMonth) {
  // Parse billing month
  const [year, month] = billingMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch enrollment with billing program
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      patient: true,
      billingProgram: {
        include: {
          cptCodes: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
          },
          eligibilityRules: {
            where: { isRequired: true },
            orderBy: { priority: 'asc' }
          }
        }
      }
    }
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`);
  }

  if (!enrollment.billingProgram) {
    throw new Error(`Enrollment ${enrollmentId} has no billing program assigned`);
  }

  const billingProgram = enrollment.billingProgram;

  // Check if billing program is active and effective for this month
  if (!billingProgram.isActive) {
    return {
      enrollmentId,
      billingMonth,
      eligible: false,
      reason: 'Billing program is not active',
      billingProgram: null,
      cptCodes: []
    };
  }

  const effectiveFrom = new Date(billingProgram.effectiveFrom);
  const effectiveTo = billingProgram.effectiveTo ? new Date(billingProgram.effectiveTo) : null;

  if (startDate < effectiveFrom || (effectiveTo && endDate > effectiveTo)) {
    return {
      enrollmentId,
      billingMonth,
      eligible: false,
      reason: `Billing program not effective for ${billingMonth}`,
      billingProgram: billingProgram.name,
      cptCodes: []
    };
  }

  // Evaluate eligibility rules
  const eligibilityResults = await evaluateEligibilityRules(
    enrollment,
    billingProgram.eligibilityRules
  );

  const allRulesPassed = eligibilityResults.every(r => r.passed);

  if (!allRulesPassed) {
    return {
      enrollmentId,
      billingMonth,
      eligible: false,
      reason: 'Failed eligibility requirements',
      billingProgram: billingProgram.name,
      eligibilityRules: eligibilityResults,
      cptCodes: []
    };
  }

  // Calculate CPT code eligibility
  const cptCodeResults = await Promise.all(
    billingProgram.cptCodes.map(cptCode =>
      evaluateCPTCode(enrollment, cptCode, startDate, endDate, billingMonth)
    )
  );

  // Calculate total potential reimbursement
  const totalReimbursement = cptCodeResults
    .filter(c => c.eligible)
    .reduce((sum, c) => sum + (parseFloat(c.reimbursementRate) || 0), 0);

  const eligibleCPTCodes = cptCodeResults.filter(c => c.eligible);
  const isEligible = eligibleCPTCodes.length > 0;

  return {
    enrollmentId,
    patientId: enrollment.patientId,
    patientName: `${enrollment.patient.firstName} ${enrollment.patient.lastName}`,
    billingMonth,
    eligible: isEligible,
    billingProgram: billingProgram.name,
    billingProgramCode: billingProgram.code,
    eligibilityRules: eligibilityResults,
    cptCodes: cptCodeResults,
    totalReimbursement: totalReimbursement.toFixed(2),
    currency: 'USD',
    summary: {
      totalCPTCodes: cptCodeResults.length,
      eligibleCPTCodes: eligibleCPTCodes.length,
      setupCompleted: cptCodeResults.some(c => c.category === 'SETUP' && c.eligible),
      dataCollectionMet: cptCodeResults.some(c => c.category === 'DATA_COLLECTION' && c.eligible),
      clinicalTimeMet: cptCodeResults.some(c =>
        ['CLINICAL_TIME', 'TREATMENT_TIME', 'CARE_COORDINATION'].includes(c.category) && c.eligible
      )
    }
  };
}

/**
 * Evaluate eligibility rules for an enrollment
 *
 * @param {Object} enrollment - Enrollment with patient data
 * @param {Array} rules - Array of BillingEligibilityRule objects
 * @returns {Promise<Array>} Array of rule evaluation results
 */
async function evaluateEligibilityRules(enrollment, rules) {
  const results = [];

  for (const rule of rules) {
    const ruleLogic = rule.ruleLogic;
    let passed = false;
    let actualValue = null;
    let reason = '';

    switch (rule.ruleType) {
      case 'INSURANCE':
        // Check patient insurance type
        const insuranceType = enrollment.patient.insuranceInfo?.type ||
                             enrollment.billingEligibility?.insurance?.type;

        if (ruleLogic.operator === 'IN') {
          passed = ruleLogic.values.some(v =>
            insuranceType && insuranceType.toLowerCase().includes(v.toLowerCase())
          );
          actualValue = insuranceType;
          reason = passed ? 'Insurance requirement met' :
                   (ruleLogic.errorMessage || 'Patient does not have required insurance');
        }
        break;

      case 'DIAGNOSIS':
        // Check chronic conditions count
        const chronicConditions = enrollment.billingEligibility?.chronicConditions || [];

        if (ruleLogic.operator === 'MIN_COUNT') {
          passed = chronicConditions.length >= ruleLogic.minCount;
          actualValue = chronicConditions.length;
          reason = passed ? `Has ${chronicConditions.length} chronic condition(s)` :
                   (ruleLogic.errorMessage || `Requires at least ${ruleLogic.minCount} chronic conditions`);
        }
        break;

      case 'CONSENT':
        // Check if patient has consented
        const hasConsent = enrollment.billingEligibility?.eligible === true;
        passed = hasConsent;
        actualValue = hasConsent ? 'Consented' : 'Not consented';
        reason = passed ? 'Patient consent obtained' :
                 (ruleLogic.errorMessage || 'Patient consent required');
        break;

      case 'AGE':
        // Check patient age requirements
        if (enrollment.patient.dateOfBirth) {
          const birthDate = new Date(enrollment.patient.dateOfBirth);
          const today = new Date();
          const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

          if (ruleLogic.operator === '>=') {
            passed = age >= ruleLogic.value;
          } else if (ruleLogic.operator === '<=') {
            passed = age <= ruleLogic.value;
          }

          actualValue = age;
          reason = passed ? `Age ${age} meets requirement` :
                   (ruleLogic.errorMessage || `Age requirement not met`);
        }
        break;

      case 'CUSTOM':
        // Custom rules - default to passed if billingEligibility exists
        passed = enrollment.billingEligibility?.eligible === true;
        actualValue = 'Checked during enrollment';
        reason = ruleLogic.errorMessage || 'Custom eligibility requirement';
        break;

      default:
        passed = false;
        reason = `Unknown rule type: ${rule.ruleType}`;
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      priority: rule.priority,
      passed,
      actualValue,
      reason,
      required: rule.isRequired
    });
  }

  return results;
}

/**
 * Evaluate a single CPT code for billing eligibility
 *
 * @param {Object} enrollment - Enrollment object
 * @param {Object} cptCode - BillingCPTCode object
 * @param {Date} startDate - Billing period start
 * @param {Date} endDate - Billing period end
 * @param {string} billingMonth - Billing month (YYYY-MM)
 * @returns {Promise<Object>} CPT code evaluation result
 */
async function evaluateCPTCode(enrollment, cptCode, startDate, endDate, billingMonth) {
  const criteria = cptCode.criteria;
  let eligible = false;
  let actualValue = 0;
  let details = '';

  switch (criteria.type) {
    case 'ONE_TIME_SETUP':
      // Check if setup was already billed
      const existingSetupBilling = await checkPreviousBilling(
        enrollment.id,
        cptCode.code,
        null,
        startDate
      );

      eligible = !existingSetupBilling;
      actualValue = existingSetupBilling ? 'Already billed' : 'Not yet billed';
      details = eligible ? 'Setup can be billed (first time)' : 'Setup already billed previously';
      break;

    case 'DATA_DAYS':
      // Calculate unique days with observations
      const uniqueDays = await calculateUniqueDaysWithData(
        enrollment.id,
        startDate,
        endDate,
        criteria.calculationMethod
      );

      eligible = evaluateOperator(uniqueDays, criteria.operator, criteria.threshold);
      actualValue = uniqueDays;
      details = `${uniqueDays} days with data (requires ${criteria.operator} ${criteria.threshold})`;
      break;

    case 'CLINICAL_TIME':
    case 'TREATMENT_TIME':
    case 'CARE_COORDINATION':
      // Calculate total billable time
      const totalMinutes = await calculateBillableTime(
        enrollment.id,
        startDate,
        endDate,
        criteria.calculationMethod
      );

      eligible = totalMinutes >= criteria.thresholdMinutes;
      actualValue = totalMinutes;
      details = `${totalMinutes} minutes logged (requires ≥ ${criteria.thresholdMinutes})`;
      break;

    case 'CLINICAL_TIME_INCREMENTAL':
    case 'TREATMENT_TIME_ADDITIONAL':
    case 'CARE_COORDINATION_ADDITIONAL':
      // Check if base code is eligible first
      const baseCodeRequired = criteria.requires?.[0];

      if (baseCodeRequired) {
        const baseCode = await prisma.billingCPTCode.findFirst({
          where: {
            billingProgramId: cptCode.billingProgramId,
            code: baseCodeRequired
          }
        });

        if (baseCode) {
          const baseResult = await evaluateCPTCode(enrollment, baseCode, startDate, endDate, billingMonth);

          if (!baseResult.eligible) {
            eligible = false;
            actualValue = 0;
            details = `Requires ${baseCodeRequired} to be eligible first`;
            break;
          }

          // Calculate additional time beyond base threshold
          const totalMinutes = await calculateBillableTime(
            enrollment.id,
            startDate,
            endDate,
            criteria.calculationMethod || baseCode.criteria.calculationMethod
          );

          const baseThreshold = baseCode.criteria.thresholdMinutes;
          const additionalMinutes = totalMinutes - baseThreshold;
          const additionalIncrements = Math.floor(additionalMinutes / criteria.thresholdMinutes);

          eligible = additionalIncrements > 0;
          actualValue = additionalIncrements;
          details = `${additionalMinutes} additional minutes (${additionalIncrements} x ${criteria.thresholdMinutes}-min increments)`;
        }
      }
      break;

    default:
      eligible = false;
      details = `Unknown criteria type: ${criteria.type}`;
  }

  return {
    code: cptCode.code,
    description: cptCode.description,
    category: cptCode.category,
    eligible,
    actualValue,
    details,
    reimbursementRate: cptCode.reimbursementRate ? parseFloat(cptCode.reimbursementRate) : 0,
    currency: cptCode.currency || 'USD',
    isRecurring: cptCode.isRecurring
  };
}

/**
 * Calculate unique days with observations based on calculation method
 *
 * @param {string} enrollmentId - Enrollment ID
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @param {string} calculationMethod - Method to use for calculation
 * @returns {Promise<number>} Number of unique days
 */
async function calculateUniqueDaysWithData(enrollmentId, startDate, endDate, calculationMethod) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { patientId: true }
  });

  if (!enrollment) return 0;

  let whereClause = {
    patientId: enrollment.patientId,
    recordedAt: {
      gte: startDate,
      lte: endDate
    }
  };

  // Filter by observation source based on calculation method
  if (calculationMethod === 'unique_days_device_observations') {
    whereClause.source = 'DEVICE';
  } else if (calculationMethod === 'unique_days_therapeutic_data') {
    whereClause.source = { in: ['DEVICE', 'MANUAL', 'API'] };
  }

  const observations = await prisma.observation.findMany({
    where: whereClause,
    select: {
      recordedAt: true
    }
  });

  // Count unique dates (YYYY-MM-DD)
  const uniqueDates = new Set(
    observations.map(obs => obs.recordedAt.toISOString().split('T')[0])
  );

  return uniqueDates.size;
}

/**
 * Calculate total billable time in minutes
 *
 * @param {string} enrollmentId - Enrollment ID
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @param {string} calculationMethod - Method to use for calculation
 * @returns {Promise<number>} Total minutes
 */
async function calculateBillableTime(enrollmentId, startDate, endDate, calculationMethod) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { patientId: true, clinicianId: true }
  });

  if (!enrollment) return 0;

  const whereClause = {
    patientId: enrollment.patientId,
    loggedAt: {
      gte: startDate,
      lte: endDate
    }
  };

  // Filter by activity type based on calculation method
  if (calculationMethod === 'sum_billable_time_logs') {
    // All billable activities
    whereClause.billable = true;
  } else if (calculationMethod === 'sum_care_coordination_time') {
    // Only care coordination activities - Note: TimeLog doesn't have activityType enum yet
    // For now, filter by billable only
    whereClause.billable = true;
  }

  const timeLogs = await prisma.timeLog.findMany({
    where: whereClause,
    select: {
      duration: true
    }
  });

  return timeLogs.reduce((sum, log) => sum + log.duration, 0);
}

/**
 * Check if a CPT code was already billed
 *
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} cptCode - CPT code to check
 * @param {Date} afterDate - Check for billing after this date (null = check all history)
 * @param {Date} beforeDate - Check for billing before this date
 * @returns {Promise<boolean>} True if previously billed
 */
async function checkPreviousBilling(enrollmentId, cptCode, afterDate, beforeDate) {
  // TODO: This will be implemented when we create the BillingRecord model
  // For now, assume setup codes haven't been billed
  return false;
}

/**
 * Evaluate an operator against actual and expected values
 *
 * @param {number} actual - Actual value
 * @param {string} operator - Comparison operator (>=, >, <, <=, ==)
 * @param {number} expected - Expected value
 * @returns {boolean} True if condition met
 */
function evaluateOperator(actual, operator, expected) {
  switch (operator) {
    case '>=': return actual >= expected;
    case '>': return actual > expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '==': return actual === expected;
    default: return false;
  }
}

/**
 * Calculate billing readiness for all enrollments in an organization for a month
 *
 * @param {string} organizationId - Organization ID
 * @param {string} billingMonth - Month to calculate (YYYY-MM)
 * @returns {Promise<Array>} Array of billing readiness results
 */
async function calculateOrganizationBillingReadiness(organizationId, billingMonth) {
  // Get all active enrollments with billing programs
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      billingProgramId: { not: null }
    },
    select: {
      id: true
    }
  });

  const results = await Promise.all(
    enrollments.map(enrollment =>
      calculateBillingReadiness(enrollment.id, billingMonth)
    )
  );

  return results;
}

/**
 * Generate monthly billing summary for an organization
 *
 * @param {string} organizationId - Organization ID
 * @param {string} billingMonth - Month to summarize (YYYY-MM)
 * @returns {Promise<Object>} Billing summary
 */
async function generateBillingSummary(organizationId, billingMonth) {
  const results = await calculateOrganizationBillingReadiness(organizationId, billingMonth);

  const eligible = results.filter(r => r.eligible);
  const notEligible = results.filter(r => !r.eligible);

  const totalReimbursement = eligible.reduce(
    (sum, r) => sum + parseFloat(r.totalReimbursement || 0),
    0
  );

  // Group by billing program
  const byProgram = {};
  eligible.forEach(r => {
    if (!byProgram[r.billingProgramCode]) {
      byProgram[r.billingProgramCode] = {
        programName: r.billingProgram,
        count: 0,
        totalReimbursement: 0,
        patients: []
      };
    }
    byProgram[r.billingProgramCode].count++;
    byProgram[r.billingProgramCode].totalReimbursement += parseFloat(r.totalReimbursement || 0);
    byProgram[r.billingProgramCode].patients.push({
      patientId: r.patientId,
      patientName: r.patientName,
      reimbursement: r.totalReimbursement
    });
  });

  return {
    organizationId,
    billingMonth,
    summary: {
      totalEnrollments: results.length,
      eligibleEnrollments: eligible.length,
      notEligibleEnrollments: notEligible.length,
      eligibilityRate: results.length > 0 ? (eligible.length / results.length * 100).toFixed(1) : 0,
      totalReimbursement: totalReimbursement.toFixed(2),
      currency: 'USD'
    },
    byProgram,
    eligiblePatients: eligible,
    notEligiblePatients: notEligible
  };
}

module.exports = {
  calculateBillingReadiness,
  calculateOrganizationBillingReadiness,
  generateBillingSummary,
  evaluateEligibilityRules,
  evaluateCPTCode,
  calculateUniqueDaysWithData,
  calculateBillableTime
};
