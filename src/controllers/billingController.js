/**
 * Billing Controller
 *
 * Handles HTTP requests for billing readiness calculations and billing program management.
 *
 * Uses the NEW CONFIGURABLE billing service (reads criteria from database, not hardcoded).
 *
 * Endpoints:
 * - GET /api/billing/readiness/:enrollmentId/:billingMonth - Single enrollment billing readiness
 * - GET /api/billing/organization/:organizationId/:billingMonth - All enrollments for organization
 * - GET /api/billing/summary/:organizationId/:billingMonth - Organization billing summary
 * - GET /api/billing/programs - List all billing programs
 * - GET /api/billing/programs/:code - Get specific billing program with CPT codes and rules
 * - GET /api/billing/export/:organizationId/:billingMonth - Export billing summary to CSV
 *
 * @module billingController
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const billingService = require('../services/billingReadinessService');

/**
 * Get billing readiness for a specific enrollment
 *
 * GET /api/billing/readiness/:enrollmentId/:billingMonth
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getEnrollmentBillingReadiness = async (req, res) => {
  try {
    const { enrollmentId, billingMonth } = req.params;

    // Validate billing month format (YYYY-MM)
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(billingMonth)) {
      return res.status(400).json({
        error: 'Invalid billing month format. Use YYYY-MM (e.g., 2025-10)'
      });
    }

    // Verify enrollment exists and user has access (organization-level isolation)
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { organizationId: true }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check organization access
    if (req.user) {
      const hasAccess = req.user.organizations?.some(
        org => org.organizationId === enrollment.organizationId
      ) || req.user.isPlatformAdmin;

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this enrollment' });
      }
    }

    // Check organization type - block PLATFORM organizations from accessing billing features
    const organization = await prisma.organization.findUnique({
      where: { id: enrollment.organizationId },
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

    // Block PLATFORM organizations from accessing billing (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Billing and reimbursement tracking is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Calculate billing readiness
    const result = await billingService.calculateBillingReadiness(enrollmentId, billingMonth);

    res.json(result);
  } catch (error) {
    console.error('Error getting enrollment billing readiness:', error);
    res.status(500).json({
      error: 'Failed to calculate billing readiness',
      message: error.message
    });
  }
};

/**
 * Get billing readiness for all enrollments in an organization
 *
 * GET /api/billing/organization/:organizationId/:billingMonth
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getOrganizationBillingReadiness = async (req, res) => {
  try {
    const { organizationId, billingMonth } = req.params;

    // Validate billing month format
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(billingMonth)) {
      return res.status(400).json({
        error: 'Invalid billing month format. Use YYYY-MM (e.g., 2025-10)'
      });
    }

    // Check organization access
    if (req.user) {
      const hasAccess = req.user.organizations?.some(
        org => org.organizationId === organizationId
      ) || req.user.isPlatformAdmin;

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }

    // Check organization type - block PLATFORM organizations from accessing billing features
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

    // Block PLATFORM organizations from accessing billing (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Billing and reimbursement tracking is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Calculate billing readiness for all enrollments
    const results = await billingService.calculateOrganizationBillingReadiness(
      organizationId,
      billingMonth
    );

    res.json({
      organizationId,
      billingMonth,
      totalEnrollments: results.length,
      enrollments: results
    });
  } catch (error) {
    console.error('Error getting organization billing readiness:', error);
    res.status(500).json({
      error: 'Failed to calculate organization billing readiness',
      message: error.message
    });
  }
};

/**
 * Get billing summary for an organization
 *
 * GET /api/billing/summary/:organizationId/:billingMonth
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getOrganizationBillingSummary = async (req, res) => {
  try {
    const { organizationId, billingMonth } = req.params;

    // Validate billing month format
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(billingMonth)) {
      return res.status(400).json({
        error: 'Invalid billing month format. Use YYYY-MM (e.g., 2025-10)'
      });
    }

    // Check organization access
    if (req.user) {
      console.log('[Billing Summary] req.user:', JSON.stringify({
        userId: req.user.userId,
        organizations: req.user.organizations,
        isPlatformAdmin: req.user.isPlatformAdmin
      }, null, 2));
      console.log('[Billing Summary] requestedOrganizationId:', organizationId);

      const hasAccess = req.user.organizations?.some(
        org => org.organizationId === organizationId
      ) || req.user.isPlatformAdmin;

      console.log('[Billing Summary] hasAccess:', hasAccess);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }

    // Check organization type - block PLATFORM organizations from accessing billing features
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

    // Block PLATFORM organizations from accessing billing (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Billing and reimbursement tracking is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Generate billing summary
    const summary = await billingService.generateBillingSummary(organizationId, billingMonth);

    res.json(summary);
  } catch (error) {
    console.error('Error generating billing summary:', error);
    res.status(500).json({
      error: 'Failed to generate billing summary',
      message: error.message
    });
  }
};

/**
 * Get all active billing programs
 *
 * GET /api/billing/programs?region=US&programType=RPM
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getBillingPrograms = async (req, res) => {
  try {
    const { region, programType, isActive } = req.query;

    const whereClause = {};

    if (region) {
      whereClause.region = region;
    }

    if (programType) {
      whereClause.programType = programType;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    } else {
      // Default to active programs only
      whereClause.isActive = true;
    }

    // Check effective date (optional filter for current programs)
    if (req.query.effectiveNow === 'true') {
      const now = new Date();
      whereClause.effectiveFrom = { lte: now };
      whereClause.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: now } }
      ];
    }

    const programs = await prisma.billingProgram.findMany({
      where: whereClause,
      include: {
        cptCodes: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            code: true,
            description: true,
            category: true,
            reimbursementRate: true,
            currency: true,
            isRecurring: true
          }
        },
        eligibilityRules: {
          orderBy: { priority: 'asc' },
          select: {
            id: true,
            ruleName: true,
            ruleType: true,
            priority: true,
            isRequired: true,
            description: true
          }
        }
      },
      orderBy: [
        { region: 'asc' },
        { programType: 'asc' },
        { effectiveFrom: 'desc' }
      ]
    });

    res.json({
      count: programs.length,
      programs
    });
  } catch (error) {
    console.error('Error getting billing programs:', error);
    res.status(500).json({
      error: 'Failed to get billing programs',
      message: error.message
    });
  }
};

/**
 * Get a specific billing program by code
 *
 * GET /api/billing/programs/:code
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getBillingProgramByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const program = await prisma.billingProgram.findUnique({
      where: { code },
      include: {
        cptCodes: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        eligibilityRules: {
          orderBy: { priority: 'asc' }
        },
        enrollments: {
          select: {
            id: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                medicalRecordNumber: true
              }
            }
          },
          take: 10  // Limit to 10 sample enrollments
        }
      }
    });

    if (!program) {
      return res.status(404).json({ error: 'Billing program not found' });
    }

    // Count total enrollments using this program
    const enrollmentCount = await prisma.enrollment.count({
      where: { billingProgramId: program.id }
    });

    res.json({
      ...program,
      enrollmentCount,
      sampleEnrollments: program.enrollments
    });
  } catch (error) {
    console.error('Error getting billing program:', error);
    res.status(500).json({
      error: 'Failed to get billing program',
      message: error.message
    });
  }
};

/**
 * Get billing programs available for a specific organization
 *
 * GET /api/billing/programs/organization/:organizationId
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getOrganizationBillingPrograms = async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Check organization access
    if (req.user) {
      const hasAccess = req.user.organizations?.some(
        org => org.organizationId === organizationId
      ) || req.user.isPlatformAdmin;

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }

    // Get organization to determine region
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { country: true, state: true }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Determine region from organization country
    let region = 'US';  // Default
    if (organization.country) {
      const countryRegionMap = {
        'United States': 'US',
        'United Kingdom': 'UK',
        'Canada': 'CA',
        'Australia': 'AU'
      };
      region = countryRegionMap[organization.country] || 'US';
    }

    // Get active programs for this region
    const now = new Date();
    const programs = await prisma.billingProgram.findMany({
      where: {
        region,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } }
        ]
      },
      include: {
        cptCodes: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            code: true,
            description: true,
            category: true,
            reimbursementRate: true
          }
        }
      },
      orderBy: [
        { programType: 'asc' },
        { version: 'desc' }
      ]
    });

    res.json({
      organizationId,
      region,
      count: programs.length,
      programs
    });
  } catch (error) {
    console.error('Error getting organization billing programs:', error);
    res.status(500).json({
      error: 'Failed to get organization billing programs',
      message: error.message
    });
  }
};

/**
 * Export billing summary to CSV
 *
 * GET /api/billing/export/:organizationId/:billingMonth
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const exportBillingSummaryCSV = async (req, res) => {
  try {
    const { organizationId, billingMonth } = req.params;

    // Validate billing month format
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(billingMonth)) {
      return res.status(400).json({
        error: 'Invalid billing month format. Use YYYY-MM (e.g., 2025-10)'
      });
    }

    // Check organization access
    if (req.user) {
      const hasAccess = req.user.organizations?.some(
        org => org.organizationId === organizationId
      ) || req.user.isPlatformAdmin;

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }

    // Check organization type - block PLATFORM organizations from accessing billing features
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

    // Block PLATFORM organizations from accessing billing (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Billing and reimbursement tracking is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Generate billing summary
    const summary = await billingService.generateBillingSummary(organizationId, billingMonth);

    // Build CSV
    const headers = [
      'Patient Name',
      'Patient ID',
      'Billing Program',
      'Eligible',
      'Total Reimbursement',
      'Eligible CPT Codes',
      'Total CPT Codes',
      'Setup Completed',
      'Data Collection Met',
      'Clinical Time Met'
    ];

    const rows = summary.eligiblePatients.map(p => [
      p.patientName,
      p.patientId,
      p.billingProgram,
      p.eligible ? 'Yes' : 'No',
      `$${p.totalReimbursement}`,
      p.summary.eligibleCPTCodes,
      p.summary.totalCPTCodes,
      p.summary.setupCompleted ? 'Yes' : 'No',
      p.summary.dataCollectionMet ? 'Yes' : 'No',
      p.summary.clinicalTimeMet ? 'Yes' : 'No'
    ]);

    // Add not eligible patients
    summary.notEligiblePatients.forEach(p => {
      rows.push([
        p.patientName,
        p.patientId,
        p.billingProgram || 'N/A',
        'No',
        '$0.00',
        '0',
        p.cptCodes?.length || '0',
        'N/A',
        'N/A',
        'N/A'
      ]);
    });

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];

    const csv = csvLines.join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="billing-summary-${billingMonth}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting billing summary:', error);
    res.status(500).json({
      error: 'Failed to export billing summary',
      message: error.message
    });
  }
};

/**
 * Get available CPT codes for an enrollment with contextual filtering
 *
 * GET /api/billing/available-cpt-codes/:enrollmentId/:billingMonth?duration=25
 *
 * Returns CPT codes filtered by:
 * - Billing program (RPM/RTM/CCM)
 * - Eligibility (based on current month data)
 * - Prerequisites (e.g., 99458 requires 99457 first)
 * - Auto-recommendation based on time duration
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getAvailableCPTCodes = async (req, res) => {
  try {
    const { enrollmentId, billingMonth } = req.params;
    const duration = req.query.duration ? parseInt(req.query.duration) : null;

    // Validate billing month format (YYYY-MM)
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(billingMonth)) {
      return res.status(400).json({
        error: 'Invalid billing month format. Use YYYY-MM (e.g., 2025-10)'
      });
    }

    // Verify enrollment exists and user has access (organization-level isolation)
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { organizationId: true }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check organization access
    if (enrollment.organizationId !== req.user?.currentOrganization) {
      return res.status(403).json({ error: 'Access denied to this enrollment' });
    }

    // Get available CPT codes with eligibility and auto-recommendation
    const result = await billingService.getAvailableCPTCodes(enrollmentId, billingMonth, duration);

    res.json(result);
  } catch (error) {
    console.error('Error getting available CPT codes:', error);
    res.status(500).json({
      error: 'Failed to get available CPT codes',
      message: error.message
    });
  }
};

module.exports = {
  getEnrollmentBillingReadiness,
  getOrganizationBillingReadiness,
  getOrganizationBillingSummary,
  getBillingPrograms,
  getBillingProgramByCode,
  getOrganizationBillingPrograms,
  exportBillingSummaryCSV,
  getAvailableCPTCodes
};
