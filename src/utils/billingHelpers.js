/**
 * Billing Helper Functions
 *
 * Utility functions for billing-related operations, including
 * automatic enrollment detection for billing program linkage.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Find active billing-enabled enrollment for a patient
 *
 * Searches for the most recent active enrollment that has a billing program
 * assigned. This is used to automatically link TimeLogs and Observations
 * to the correct billing program when a patient is enrolled in multiple programs.
 *
 * @param {string} patientId - Patient ID
 * @param {string} organizationId - Organization ID
 * @param {object} tx - Prisma transaction client (optional, defaults to global prisma)
 * @returns {Promise<string|null>} enrollmentId or null if no billing enrollment found
 */
async function findBillingEnrollment(patientId, organizationId, tx = prisma) {
  const enrollment = await tx.enrollment.findFirst({
    where: {
      patientId,
      organizationId,
      billingProgramId: { not: null }, // Must have billing program
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    },
    orderBy: {
      startDate: 'desc' // Prefer most recent enrollment
    },
    select: {
      id: true
    }
  });

  return enrollment?.id || null;
}

module.exports = {
  findBillingEnrollment
};
