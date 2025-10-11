const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Get all assessment templates
const getAllAssessmentTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.assessmentTemplate.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assessments: {
            select: {
              id: true,
              completedAt: true
            }
          },
          conditionPresetTemplates: {
            include: {
              conditionPreset: {
                select: {
                  id: true,
                  name: true,
                  isStandardized: true
                }
              }
            }
          }
        }
      }),
      prisma.assessmentTemplate.count({ where })
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching assessment templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching assessment templates'
    });
  }
};

// Get assessment template by ID
const getAssessmentTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.assessmentTemplate.findUnique({
      where: { id },
      include: {
        assessments: {
          select: {
            id: true,
            completedAt: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { completedAt: 'desc' },
          take: 10
        },
        conditionPresetTemplates: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true,
                isStandardized: true
              }
            }
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

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching assessment template'
    });
  }
};

// Create assessment template
const createAssessmentTemplate = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      questions = {}, 
      scoring = null,
      isStandardized = false,
      category = null,
      standardCoding = null,
      validationInfo = null,
      scoringInfo = null,
      copyrightInfo = null,
      clinicalUse = null
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Check if template name already exists
    const existingTemplate = await prisma.assessmentTemplate.findFirst({
      where: { name }
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Assessment template with this name already exists'
      });
    }

    // Create template
    const template = await prisma.assessmentTemplate.create({
      data: {
        name,
        description,
        questions,
        scoring,
        isStandardized,
        category,
        standardCoding,
        validationInfo,
        scoringInfo,
        copyrightInfo,
        clinicalUse
      },
      include: {
        assessments: true,
        conditionPresetTemplates: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true,
                isStandardized: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Assessment template created successfully'
    });
  } catch (error) {
    console.error('Error creating assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating assessment template'
    });
  }
};

// Update assessment template
const updateAssessmentTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      questions,
      scoring,
      isStandardized,
      category,
      standardCoding,
      validationInfo,
      scoringInfo,
      copyrightInfo,
      clinicalUse
    } = req.body;

    // Check if template exists
    const existingTemplate = await prisma.assessmentTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== existingTemplate.name) {
      const nameExists = await prisma.assessmentTemplate.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Assessment template with this name already exists'
        });
      }
    }

    // Update template
    const updatedTemplate = await prisma.assessmentTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(questions && { questions }),
        ...(scoring !== undefined && { scoring }),
        ...(isStandardized !== undefined && { isStandardized }),
        ...(category !== undefined && { category }),
        ...(standardCoding !== undefined && { standardCoding }),
        ...(validationInfo !== undefined && { validationInfo }),
        ...(scoringInfo !== undefined && { scoringInfo }),
        ...(copyrightInfo !== undefined && { copyrightInfo }),
        ...(clinicalUse !== undefined && { clinicalUse })
      },
      include: {
        assessments: true,
        conditionPresetTemplates: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true,
                isStandardized: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Assessment template updated successfully'
    });
  } catch (error) {
    console.error('Error updating assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating assessment template'
    });
  }
};

// Delete assessment template
const deleteAssessmentTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const existingTemplate = await prisma.assessmentTemplate.findUnique({
      where: { id },
      include: {
        assessments: true,
        conditionPresetTemplates: true
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Check if template is in use
    if (existingTemplate.assessments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assessment template that has associated assessments'
      });
    }

    if (existingTemplate.conditionPresetTemplates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assessment template that is linked to condition presets'
      });
    }

    // Delete template
    await prisma.assessmentTemplate.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Assessment template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting assessment template'
    });
  }
};

module.exports = {
  getAllAssessmentTemplates,
  getAssessmentTemplateById,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate
};