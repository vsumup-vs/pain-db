const { PrismaClient } = require('../../generated/prisma');
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
        include: {
          items: {
            include: {
              metricDefinition: {
                select: {
                  id: true,
                  displayName: true,
                  valueType: true,
                  unit: true
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          },
          _count: {
            select: {
              observations: true,
              presets: true
            }
          }
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder }
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
        items: {
          include: {
            metricDefinition: true
          },
          orderBy: { displayOrder: 'asc' }
        },
        presets: {
          include: {
            preset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        observations: {
          select: {
            id: true,
            recordedAt: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { recordedAt: 'desc' },
          take: 10
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

// Create new assessment template
// Optimize the createAssessmentTemplate function
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

    // Add connection timeout and retry logic
    const template = await prisma.$transaction(async (tx) => {
      // Simplified transaction with better error handling
      return await tx.assessmentTemplate.create({
        data: {
          name,
          description,
          items: {
            create: items.map((item, index) => ({
              metricDefinitionId: item.metricDefinitionId,
              required: item.required || false,
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
                  displayName: true,
                  valueType: true,
                  unit: true
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          }
        }
      });
    }, {
      timeout: 30000, // 30 second timeout
      maxWait: 35000  // 35 second max wait
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Assessment template created successfully'
    });
  } catch (error) {
    // Enhanced error logging
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
          version: { increment: 1 },
          items: {
            create: items.map((item, index) => ({
              metricDefinitionId: item.metricDefinitionId,
              required: item.required || false,
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
                  displayName: true,
                  valueType: true,
                  unit: true
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
        observations: { select: { id: true } },
        presets: { select: { id: true } }
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Assessment template not found'
      });
    }

    // Check if template is being used
    if (existingTemplate.observations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assessment template that has associated observations'
      });
    }

    if (existingTemplate.presets.length > 0) {
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
  getAssessmentTemplateById,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate
};