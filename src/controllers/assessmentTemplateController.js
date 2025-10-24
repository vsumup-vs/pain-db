const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Get all assessment templates (org-aware: shows standardized + org-specific)
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

    // Get current organization from auth middleware
    const currentOrgId = req.user?.currentOrganization || null;

    // Build where clause with org-aware filtering
    const where = {
      AND: [
        // Show standardized templates + org-specific templates
        {
          OR: [
            { organizationId: null, isStandardized: true }, // Platform standardized
            { organizationId: currentOrgId }                 // Org-specific custom
          ]
        }
      ]
    };

    // Add search filter if provided
    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const [templates, total] = await Promise.all([
      prisma.assessmentTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isStandardized: 'desc' }, // Standardized first
          { [sortBy]: sortOrder }
        ],
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          sourceTemplate: {
            select: {
              id: true,
              name: true,
              isStandardized: true
            }
          },
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
          },
          _count: {
            select: {
              assessments: true,
              conditionPresetTemplates: true
            }
          }
        }
      }),
      prisma.assessmentTemplate.count({ where })
    ]);

    // Enrich with computed fields
    const enrichedTemplates = templates.map(template => ({
      ...template,
      isCustomized: !!template.organizationId, // True if org-specific
      usageCount: template._count.assessments
    }));

    res.json({
      success: true,
      data: enrichedTemplates,
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
        items: {
          include: {
            metricDefinition: true
          },
          orderBy: {
            displayOrder: 'asc'
          }
        },
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

    // BLOCK: Prevent direct editing of standardized templates
    if (existingTemplate.isStandardized && !existingTemplate.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot directly edit standardized templates. Please use the "Customize" feature to create an editable copy for your organization first.',
        hint: 'Click the "Customize" button to clone this template for your organization',
        standardizedTemplate: {
          id: existingTemplate.id,
          name: existingTemplate.name
        }
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

    // BLOCK: Prevent deletion of standardized templates
    if (existingTemplate.isStandardized && !existingTemplate.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete standardized templates. These are platform-level resources shared across all organizations.',
        standardizedTemplate: {
          id: existingTemplate.id,
          name: existingTemplate.name
        }
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

// Customize/clone a standardized template for organization
const customizeTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const currentOrgId = req.user?.currentOrganization;

    if (!currentOrgId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context required for customization'
      });
    }

    // Get the source template
    const sourceTemplate = await prisma.assessmentTemplate.findUnique({
      where: { id }
    });

    if (!sourceTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Check if template is customizable (must be standardized or belong to this org)
    if (sourceTemplate.organizationId && sourceTemplate.organizationId !== currentOrgId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot customize templates from other organizations'
      });
    }

    // Check if already customized by this organization
    const existingCustom = await prisma.assessmentTemplate.findFirst({
      where: {
        organizationId: currentOrgId,
        sourceTemplateId: id
      }
    });

    if (existingCustom) {
      return res.status(400).json({
        success: false,
        message: 'This template has already been customized for your organization',
        data: existingCustom
      });
    }

    // Clone the template for this organization
    const customTemplate = await prisma.assessmentTemplate.create({
      data: {
        organizationId: currentOrgId,
        sourceTemplateId: id,
        name: sourceTemplate.name, // Same name, unique per org
        description: sourceTemplate.description,
        questions: sourceTemplate.questions,
        scoring: sourceTemplate.scoring,
        isStandardized: false, // Custom versions are not standardized
        category: sourceTemplate.category,
        standardCoding: sourceTemplate.standardCoding,
        validationInfo: sourceTemplate.validationInfo,
        scoringInfo: sourceTemplate.scoringInfo,
        copyrightInfo: sourceTemplate.copyrightInfo,
        clinicalUse: sourceTemplate.clinicalUse
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        sourceTemplate: {
          select: {
            id: true,
            name: true,
            isStandardized: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: customTemplate,
      message: 'Assessment template customized successfully. You can now modify it for your organization.'
    });
  } catch (error) {
    console.error('Error customizing assessment template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while customizing assessment template',
      error: error.message
    });
  }
};

module.exports = {
  getAllAssessmentTemplates,
  getAssessmentTemplateById,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
  customizeTemplate
};