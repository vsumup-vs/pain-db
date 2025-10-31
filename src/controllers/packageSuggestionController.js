const packageSuggestionService = require('../services/packageSuggestionService');

/**
 * List all billing package templates
 * GET /api/billing/packages
 */
async function listBillingPackageTemplates(req, res) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const { category, isStandardized, isActive } = req.query;
    const organizationId = req.user.currentOrganization;

    const where = {
      OR: [
        { organizationId: null, isStandardized: true }, // Platform templates
        { organizationId } // Organization-specific templates
      ]
    };

    if (category) {
      where.category = category;
    }

    if (isStandardized !== undefined) {
      where.isStandardized = isStandardized === 'true';
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.billingPackageTemplate.findMany({
      where,
      orderBy: [
        { isStandardized: 'desc' },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });

  } catch (error) {
    console.error('Error listing billing package templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list billing package templates',
      message: error.message
    });
  }
}

/**
 * Get specific billing package template by code
 * GET /api/billing/packages/:code
 */
async function getBillingPackageTemplate(req, res) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const { code } = req.params;

    const template = await prisma.billingPackageTemplate.findUnique({
      where: { code }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Billing package template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error getting billing package template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get billing package template',
      message: error.message
    });
  }
}

/**
 * Suggest billing packages for a patient
 * POST /api/billing/suggest-package
 * Body: { patientId, minMatchScore?, maxSuggestions?, sourceType?, sourceId? }
 */
async function suggestBillingPackagesForPatient(req, res) {
  try {
    const { patientId, minMatchScore, maxSuggestions, sourceType, sourceId } = req.body;
    const organizationId = req.user.currentOrganization;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'patientId is required'
      });
    }

    const options = {};
    if (minMatchScore !== undefined) options.minMatchScore = parseInt(minMatchScore);
    if (maxSuggestions !== undefined) options.maxSuggestions = parseInt(maxSuggestions);
    if (sourceType) options.sourceType = sourceType;
    if (sourceId) options.sourceId = sourceId;

    const suggestions = await packageSuggestionService.suggestBillingPackages(
      patientId,
      organizationId,
      options
    );

    res.json({
      success: true,
      count: suggestions.length,
      data: suggestions
    });

  } catch (error) {
    console.error('Error suggesting billing packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suggest billing packages',
      message: error.message
    });
  }
}

/**
 * Get pending suggestions for a patient
 * GET /api/patients/:patientId/suggestions
 */
async function getPatientSuggestions(req, res) {
  try {
    const { patientId } = req.params;
    const organizationId = req.user.currentOrganization;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Verify patient belongs to organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    const suggestions = await packageSuggestionService.getPendingSuggestions(
      patientId,
      organizationId
    );

    res.json({
      success: true,
      count: suggestions.length,
      data: suggestions
    });

  } catch (error) {
    console.error('Error getting patient suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get patient suggestions',
      message: error.message
    });
  }
}

/**
 * Approve a suggestion and create enrollments
 * POST /api/suggestions/:suggestionId/approve
 * Body: { clinicianId?, startDate?, selectedProgramType? }
 */
async function approveSuggestion(req, res) {
  try {
    const { suggestionId } = req.params;
    const { clinicianId, startDate, selectedProgramType } = req.body;
    const reviewedById = req.user.id;

    const options = {};
    if (clinicianId) options.clinicianId = clinicianId;
    if (startDate) options.startDate = new Date(startDate);
    if (selectedProgramType) options.selectedProgramType = selectedProgramType;

    const updatedSuggestion = await packageSuggestionService.approveSuggestion(
      suggestionId,
      reviewedById,
      options
    );

    res.json({
      success: true,
      message: 'Suggestion approved and enrollments created',
      data: updatedSuggestion
    });

  } catch (error) {
    console.error('Error approving suggestion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve suggestion',
      message: error.message
    });
  }
}

/**
 * Reject a suggestion
 * POST /api/suggestions/:suggestionId/reject
 * Body: { rejectionReason }
 */
async function rejectSuggestion(req, res) {
  try {
    const { suggestionId } = req.params;
    const { rejectionReason } = req.body;
    const reviewedById = req.user.id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'rejectionReason is required'
      });
    }

    const updatedSuggestion = await packageSuggestionService.rejectSuggestion(
      suggestionId,
      reviewedById,
      rejectionReason
    );

    res.json({
      success: true,
      message: 'Suggestion rejected',
      data: updatedSuggestion
    });

  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject suggestion',
      message: error.message
    });
  }
}

/**
 * Get suggestion history for organization
 * GET /api/suggestions/history
 */
async function getSuggestionHistory(req, res) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const organizationId = req.user.currentOrganization;
    const { status, limit = 50, offset = 0 } = req.query;

    const where = { organizationId };
    if (status) {
      where.status = status;
    }

    const [suggestions, total] = await Promise.all([
      prisma.enrollmentSuggestion.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true
            }
          },
          packageTemplate: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.enrollmentSuggestion.count({ where })
    ]);

    res.json({
      success: true,
      count: suggestions.length,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: suggestions
    });

  } catch (error) {
    console.error('Error getting suggestion history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestion history',
      message: error.message
    });
  }
}

module.exports = {
  listBillingPackageTemplates,
  getBillingPackageTemplate,
  suggestBillingPackagesForPatient,
  getPatientSuggestions,
  approveSuggestion,
  rejectSuggestion,
  getSuggestionHistory
};
