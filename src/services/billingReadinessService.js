/**
 * Billing Readiness Service
 *
 * Calculates patient eligibility for CMS billing codes based on TimeLog and Observation data.
 *
 * CMS Requirements:
 * - CCM (99091): 20+ minutes of clinical time per calendar month
 * - RPM (99454): 16+ days of device readings (observations) per calendar month
 * - RTM (99457): 20+ minutes of interactive communication + 16+ days of data per calendar month
 *
 * Eligibility Status:
 * - ELIGIBLE: Meets all requirements for billing
 * - CLOSE: Within 80% of requirements (e.g., 16+ min for CCM, 13+ days for RPM)
 * - NOT_ELIGIBLE: Below 80% threshold
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate billing readiness for a specific patient and month
 *
 * @param {string} patientId - Patient ID
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @param {string} organizationId - Organization ID for data isolation
 * @returns {Promise<Object>} Billing readiness object
 */
const calculatePatientBillingReadiness = async (patientId, year, month, organizationId) => {
  try {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Fetch patient with enrollment info
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId
      },
      include: {
        enrollments: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: endDate }
          },
          include: {
            careProgram: true,
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!patient) {
      return null;
    }

    // Calculate CCM eligibility (99091): 20+ minutes of clinical time
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        patientId,
        billable: true,
        loggedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalMinutes = timeLogs.reduce((sum, log) => sum + log.duration, 0);
    const ccmEligible = totalMinutes >= 20;
    const ccmClose = totalMinutes >= 16 && totalMinutes < 20; // 80% threshold
    const ccmStatus = ccmEligible ? 'ELIGIBLE' : ccmClose ? 'CLOSE' : 'NOT_ELIGIBLE';

    // Get CPT codes from time logs
    const cptCodes = [...new Set(timeLogs.map(log => log.cptCode).filter(Boolean))];

    // Calculate RPM eligibility (99454): 16+ days of device readings
    const deviceObservations = await prisma.observation.findMany({
      where: {
        patientId,
        source: 'DEVICE',
        recordedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        recordedAt: true
      }
    });

    // Count unique days with device readings
    const uniqueDays = new Set(
      deviceObservations.map(obs =>
        new Date(obs.recordedAt).toISOString().split('T')[0]
      )
    );
    const daysWithReadings = uniqueDays.size;
    const rpmEligible = daysWithReadings >= 16;
    const rpmClose = daysWithReadings >= 13 && daysWithReadings < 16; // 80% threshold
    const rpmStatus = rpmEligible ? 'ELIGIBLE' : rpmClose ? 'CLOSE' : 'NOT_ELIGIBLE';

    // Calculate RTM eligibility (99457): 20+ minutes of interactive communication + 16+ days
    const rtmTimeLogs = timeLogs.filter(log =>
      log.cptCode === 'CODE_99457' || log.cptCode === 'CODE_99458'
    );
    const rtmMinutes = rtmTimeLogs.reduce((sum, log) => sum + log.duration, 0);
    const rtmTimeEligible = rtmMinutes >= 20;
    const rtmDataEligible = daysWithReadings >= 16;
    const rtmEligible = rtmTimeEligible && rtmDataEligible;
    const rtmClose = (rtmMinutes >= 16 || daysWithReadings >= 13) && !rtmEligible; // Partial eligibility
    const rtmStatus = rtmEligible ? 'ELIGIBLE' : rtmClose ? 'CLOSE' : 'NOT_ELIGIBLE';

    // Determine overall billing status (best case scenario)
    let overallStatus = 'NOT_ELIGIBLE';
    if (ccmEligible || rpmEligible || rtmEligible) {
      overallStatus = 'ELIGIBLE';
    } else if (ccmClose || rpmClose || rtmClose) {
      overallStatus = 'CLOSE';
    }

    return {
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      medicalRecordNumber: patient.medicalRecordNumber,
      month,
      year,
      overallStatus,
      ccm: {
        status: ccmStatus,
        totalMinutes,
        required: 20,
        percentage: Math.min(100, Math.round((totalMinutes / 20) * 100))
      },
      rpm: {
        status: rpmStatus,
        daysWithReadings,
        required: 16,
        percentage: Math.min(100, Math.round((daysWithReadings / 16) * 100))
      },
      rtm: {
        status: rtmStatus,
        interactiveMinutes: rtmMinutes,
        daysWithReadings,
        requiredMinutes: 20,
        requiredDays: 16,
        percentageTime: Math.min(100, Math.round((rtmMinutes / 20) * 100)),
        percentageData: Math.min(100, Math.round((daysWithReadings / 16) * 100))
      },
      cptCodes,
      enrollments: patient.enrollments.map(e => ({
        id: e.id,
        programName: e.careProgram.name,
        programType: e.careProgram.type,
        clinician: e.clinician
      })),
      timeLogCount: timeLogs.length,
      observationDays: daysWithReadings
    };
  } catch (error) {
    console.error('Error calculating patient billing readiness:', error);
    throw error;
  }
};

/**
 * Calculate billing readiness for all active patients in an organization for a given month
 *
 * @param {string} organizationId - Organization ID
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Billing readiness summary with patient details
 */
const calculateOrganizationBillingReadiness = async (organizationId, year, month) => {
  try {
    // Get all patients with active enrollments
    const patients = await prisma.patient.findMany({
      where: {
        organizationId,
        enrollments: {
          some: {
            status: 'ACTIVE',
            startDate: { lte: new Date(year, month, 0) } // Started before end of month
          }
        }
      },
      select: {
        id: true
      }
    });

    // Calculate readiness for each patient
    const patientReadiness = await Promise.all(
      patients.map(patient =>
        calculatePatientBillingReadiness(patient.id, year, month, organizationId)
      )
    );

    // Filter out null results (patients not found)
    const validResults = patientReadiness.filter(r => r !== null);

    // Calculate summary statistics
    const summary = {
      totalPatients: validResults.length,
      eligible: validResults.filter(r => r.overallStatus === 'ELIGIBLE').length,
      close: validResults.filter(r => r.overallStatus === 'CLOSE').length,
      notEligible: validResults.filter(r => r.overallStatus === 'NOT_ELIGIBLE').length,
      ccmEligible: validResults.filter(r => r.ccm.status === 'ELIGIBLE').length,
      rpmEligible: validResults.filter(r => r.rpm.status === 'ELIGIBLE').length,
      rtmEligible: validResults.filter(r => r.rtm.status === 'ELIGIBLE').length,
      eligibilityPercentage: validResults.length > 0
        ? Math.round((validResults.filter(r => r.overallStatus === 'ELIGIBLE').length / validResults.length) * 100)
        : 0
    };

    return {
      organizationId,
      month,
      year,
      summary,
      patients: validResults
    };
  } catch (error) {
    console.error('Error calculating organization billing readiness:', error);
    throw error;
  }
};

/**
 * Generate CSV export data for billing readiness
 *
 * @param {Object} billingData - Billing readiness data from calculateOrganizationBillingReadiness
 * @returns {string} CSV string
 */
const generateBillingCSV = (billingData) => {
  const headers = [
    'Patient Name',
    'MRN',
    'Overall Status',
    'CCM Status',
    'CCM Minutes',
    'CCM %',
    'RPM Status',
    'RPM Days',
    'RPM %',
    'RTM Status',
    'RTM Minutes',
    'RTM Days',
    'RTM %',
    'Program',
    'Clinician'
  ];

  const rows = billingData.patients.map(p => [
    p.patientName,
    p.medicalRecordNumber || 'N/A',
    p.overallStatus,
    p.ccm.status,
    p.ccm.totalMinutes,
    `${p.ccm.percentage}%`,
    p.rpm.status,
    p.rpm.daysWithReadings,
    `${p.rpm.percentage}%`,
    p.rtm.status,
    p.rtm.interactiveMinutes,
    p.rtm.daysWithReadings,
    `${p.rtm.percentageTime}%`,
    p.enrollments.map(e => e.programName).join('; '),
    p.enrollments.map(e => `${e.clinician.firstName} ${e.clinician.lastName}`).join('; ')
  ]);

  // Build CSV string
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ];

  return csvLines.join('\n');
};

module.exports = {
  calculatePatientBillingReadiness,
  calculateOrganizationBillingReadiness,
  generateBillingCSV
};
