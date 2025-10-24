/**
 * Basic Assessment Controller
 *
 * Handles CRUD operations for completed assessments with responses
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a completed assessment with responses
 * POST /api/assessments
 */
const createAssessment = async (req, res) => {
  try {
    const {
      patientId,
      clinicianId,
      templateId,
      responses,  // Object: { metricDefinitionId: value }
      notes
    } = req.body;

    const organizationId = req.user.currentOrganization;

    // Validate required fields
    if (!patientId || !clinicianId || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, clinicianId, templateId'
      });
    }

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'responses must be an object with metric IDs as keys'
      });
    }

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
        message: 'Patient not found'
      });
    }

    // Verify template exists
    const template = await prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          include: {
            metricDefinition: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Create the assessment with responses stored as JSON
    const assessment = await prisma.assessment.create({
      data: {
        patientId,
        clinicianId,
        templateId,
        responses: responses, // Store as JSON object
        completedAt: new Date(),
        notes
      }
    });

    // Fetch the complete assessment with relationships
    const completeAssessment = await prisma.assessment.findUnique({
      where: { id: assessment.id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: completeAssessment,
      message: 'Assessment created successfully'
    });

  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assessment',
      error: error.message
    });
  }
};

/**
 * Get assessment by ID
 * GET /api/assessments/:id
 */
const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.currentOrganization;

    const assessment = await prisma.assessment.findFirst({
      where: {
        id,
        patient: {
          organizationId
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            items: {
              include: {
                metricDefinition: {
                  select: {
                    id: true,
                    displayName: true,
                    unit: true,
                    valueType: true,
                    description: true
                  }
                }
              },
              orderBy: {
                displayOrder: 'asc'
              }
            }
          }
        }
      }
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      data: assessment
    });

  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment',
      error: error.message
    });
  }
};

/**
 * Get all assessments for a patient
 * GET /api/assessments/patient/:patientId
 */
const getAssessmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.user.currentOrganization;

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
        message: 'Patient not found'
      });
    }

    const assessments = await prisma.assessment.findMany({
      where: { patientId },
      orderBy: { completedAt: 'desc' },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: assessments
    });

  } catch (error) {
    console.error('Error fetching patient assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient assessments',
      error: error.message
    });
  }
};

module.exports = {
  createAssessment,
  getAssessmentById,
  getAssessmentsByPatient
};
