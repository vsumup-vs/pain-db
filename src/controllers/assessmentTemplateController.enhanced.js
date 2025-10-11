
// Enhanced Assessment Template Controller
// Supports both standardized and custom templates

const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Transform template data for frontend compatibility
const transformTemplateForFrontend = (template) => {
  if (!template) return template;
  
  return {
    ...template,
    // Map items to items for frontend compatibility
    items: template.items?.map(item => ({
      id: item.id,
      metricDefinitionId: item.metricDefinitionId,
      required: item.isRequired,
      isRequired: item.isRequired,
      displayOrder: item.displayOrder,
      helpText: item.helpText,
      defaultValue: item.defaultValue,
      metricDefinition: item.metricDefinition,
      // Include the metric definition data directly for easier access
      name: item.metricDefinition?.displayName,
      displayName: item.metricDefinition?.displayName,
      valueType: item.metricDefinition?.valueType,
      unit: item.metricDefinition?.unit,
      category: item.metricDefinition?.category
    })) || []
  };
};

// Get all assessment templates
const getAllAssessmentTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, isStandardized, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;
    
    let where = {};
    if (category) {
      where.category = category;
    }
    if (isStandardized !== undefined) {
      where.isStandardized = isStandardized === 'true';
    }

    const [templates, total] = await Promise.all([
      prisma.assessmentTemplate.findMany({
        skip: parseInt(skip),
        take: parseInt(limit),
        where,
        include: {
          items: {
            include: {
              metricDefinition: {
                select: {
                  id: true,
                  key: true,
                  displayName: true,
                  description: true,
                  unit: true,
                  valueType: true,
                  category: true,
                  isStandardized: true
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          },
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
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.assessmentTemplate.count({ where })
    ]);

    // Transform templates for frontend compatibility
    const transformedTemplates = templates.map(transformTemplateForFrontend);

    res.json({
      success: true,
      data: transformedTemplates,
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

// Get standardized templates only
const getStandardizedTemplates = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let where = { isStandardized: true };
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.assessmentTemplate.findMany({
      where,
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                displayName: true,
                description: true,
                unit: true,
                valueType: true,
                category: true,
                isStandardized: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },
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
      },
      orderBy: { name: 'asc' }
    });

    // Transform templates for frontend compatibility
    const transformedTemplates = templates.map(transformTemplateForFrontend);

    res.json({
      success: true,
      data: transformedTemplates,
      count: transformedTemplates.length
    });
  } catch (error) {
    console.error('Error fetching standardized templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching standardized templates'
    });
  }
};

// Get custom templates only
const getCustomTemplates = async (req, res) => {
  try {
    const { search } = req.query;
    
    let where = { isStandardized: false };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.assessmentTemplate.findMany({
      where,
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                displayName: true,
                description: true,
                unit: true,
                valueType: true,
                category: true,
                isStandardized: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },
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
      },
      orderBy: { name: 'asc' }
    });

    // Transform templates for frontend compatibility
    const transformedTemplates = templates.map(transformTemplateForFrontend);

    res.json({
      success: true,
      data: transformedTemplates,
      count: transformedTemplates.length
    });
  } catch (error) {
    console.error('Error fetching custom templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching custom templates'
    });
  }
};

// Get template categories
const getTemplateCategories = async (req, res) => {
  try {
    const categories = await prisma.assessmentTemplate.findMany({
      select: {
        category: true
      },
      where: {
        category: {
          not: null
        }
      },
      distinct: ['category']
    });

    const categoryList = categories
      .map(t => t.category)
      .filter(Boolean)
      .sort();

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Error fetching template categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching template categories'
    });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.assessmentTemplate.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                displayName: true,
                description: true,
                unit: true,
                valueType: true,
                category: true,
                isStandardized: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },
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

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Transform template for frontend compatibility
    const transformedTemplate = transformTemplateForFrontend(template);

    res.json({
      success: true,
      data: transformedTemplate
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
    const { name, description, items = [] } = req.body;

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

    // Validate metric definitions exist
    if (items.length > 0) {
      const metricIds = items.map(item => item.metricDefinitionId);
      const existingMetrics = await prisma.metricDefinition.findMany({
        where: { id: { in: metricIds } },
        select: { id: true }
      });

      const existingMetricIds = existingMetrics.map(m => m.id);
      const invalidMetricIds = metricIds.filter(id => !existingMetricIds.includes(id));

      if (invalidMetricIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid metric definition IDs: ${invalidMetricIds.join(', ')}`
        });
      }
    }

    // Create template with transaction
    const template = await prisma.$transaction(async (tx) => {
      return await tx.assessmentTemplate.create({
        data: {
          name,
          description,
          items: {
            create: items.map((item, index) => ({
              metricDefinitionId: item.metricDefinitionId,
              isRequired: item.required || false,
              displayOrder: item.displayOrder ?? index,
              helpText: item.helpText,
              defaultValue: item.defaultValue
            }))
          }
        },
        include: {
          items: {
            include: {
              metricDefinition: {
                select: {
                  id: true,
                  key: true,
                  displayName: true,
                  description: true,
                  unit: true,
                  valueType: true,
                  category: true,
                  isStandardized: true
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          },
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
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Assessment template created successfully'
    });
  } catch (error) {
    console.error('Assessment template creation error:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
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
    const { name, description, items = [] } = req.body;

    // Check if template exists
    const existingTemplate = await prisma.assessmentTemplate.findUnique({
      where: { id },
      include: { items: true }
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

    // Validate metric definitions exist
    if (items.length > 0) {
      const metricIds = items.map(item => item.metricDefinitionId);
      const existingMetrics = await prisma.metricDefinition.findMany({
        where: { id: { in: metricIds } },
        select: { id: true }
      });

      const existingMetricIds = existingMetrics.map(m => m.id);
      const invalidMetricIds = metricIds.filter(id => !existingMetricIds.includes(id));

      if (invalidMetricIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid metric definition IDs: ${invalidMetricIds.join(', ')}`
        });
      }
    }

    // Update template using transaction
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.assessmentTemplateItem.deleteMany({
        where: { templateId: id }
      });

      // Update template and create new items
      return await tx.assessmentTemplate.update({
        where: { id },
        data: {
          name,
          description,
          items: {
            create: items.map((item, index) => ({
              metricDefinitionId: item.metricDefinitionId,
              isRequired: item.required || false,
              displayOrder: item.displayOrder ?? index,
              helpText: item.helpText,
              defaultValue: item.defaultValue
            }))
          }
        },
        include: {
          items: {
            include: {
              metricDefinition: {
                select: {
                  id: true,
                  key: true,
                  displayName: true,
                  description: true,
                  unit: true,
                  valueType: true,
                  category: true,
                  isStandardized: true
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          }
        }
      });
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
        assessments: { select: { id: true } },
        conditionPresetTemplates: { select: { id: true } }
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Check if template is being used
    if (existingTemplate.assessments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assessment template that has associated assessments'
      });
    }

    // Check if template is linked to condition presets
    if (existingTemplate.conditionPresetTemplates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assessment template that is linked to condition presets'
      });
    }

    // Delete template (items will be deleted due to cascade)
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
  getStandardizedTemplates,
  getCustomTemplates,
  getTemplateCategories,
  getTemplateById,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate
};
