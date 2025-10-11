const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

// Get all condition presets
const getAllConditionPresets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      isStandardized,
      sortBy = 'name',
      sortOrder = 'asc'
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
    
    if (category) {
      where.category = category;
    }
    
    if (isStandardized !== undefined) {
      where.isStandardized = isStandardized === 'true';
    }

    const [presets, total] = await Promise.all([
      prisma.conditionPreset.findMany({
        where,
        include: {
          diagnoses: true,
          templates: {
            include: {
              template: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isStandardized: true,
                  category: true
                }
              }
            }
          },
          alertRules: {
            include: {
              rule: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  severity: true,
                  isStandardized: true
                }
              }
            }
          },
          _count: {
            select: {
              enrollments: true
            }
          }
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.conditionPreset.count({ where })
    ]);

    res.json({
      success: true,
      data: presets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching condition presets:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching condition presets'
    });
  }
};

// Get condition preset by ID
const getConditionPresetById = async (req, res) => {
  try {
    const { id } = req.params;

    const preset = await prisma.conditionPreset.findUnique({
      where: { id },
      include: {
        diagnoses: true,
        templates: {
          include: {
            template: true
          }
        },
        alertRules: {
          include: {
            rule: true
          }
        },
        enrollments: {
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
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!preset) {
      return res.status(404).json({
        success: false,
        message: 'Condition preset not found'
      });
    }

    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    console.error('Error fetching condition preset:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching condition preset'
    });
  }
};

// Create a new condition preset
const createConditionPreset = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      isStandardized = false,
      diagnoses = [],
      templateIds = [],
      alertRuleIds = []
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Check for duplicate name
    const existingPreset = await prisma.conditionPreset.findFirst({
      where: { name }
    });

    if (existingPreset) {
      return res.status(400).json({
        success: false,
        message: 'Condition preset with this name already exists'
      });
    }

    // Validate template IDs if provided
    if (templateIds.length > 0) {
      const existingTemplates = await prisma.assessmentTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true }
      });
    
      const existingTemplateIds = existingTemplates.map(t => t.id);
      const invalidTemplateIds = templateIds.filter(id => !existingTemplateIds.includes(id));
    
      if (invalidTemplateIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid template IDs: ${invalidTemplateIds.join(', ')}`
        });
      }
    }

    const preset = await prisma.conditionPreset.create({
      data: {
        name,
        description,
        category,
        isStandardized,
        diagnoses: {
          create: diagnoses.map(diagnosis => ({
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label,
            isPrimary: diagnosis.isPrimary || false
          }))
        },
        templates: {
          create: templateIds.map(templateId => ({
            templateId
          }))
        },
        alertRules: {
          create: alertRuleIds.map(ruleId => ({
            alertRuleId: ruleId
          }))
        }
      },
      include: {
        diagnoses: true,
        templates: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                category: true,
                isStandardized: true
              }
            }
          }
        },
        alertRules: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                severity: true,
                conditions: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Condition preset created successfully',
      data: preset
    });
  } catch (error) {
    console.error('Error creating condition preset:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating condition preset'
    });
  }
};

// Update condition preset
const updateConditionPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, isStandardized, diagnoses, templateIds, alertRuleIds } = req.body;

    // Check if preset exists
    const existingPreset = await prisma.conditionPreset.findUnique({
      where: { id }
    });

    if (!existingPreset) {
      return res.status(404).json({
        success: false,
        message: 'Condition preset not found'
      });
    }

    // Check for duplicate name (excluding current preset)
    if (name && name !== existingPreset.name) {
      const duplicateName = await prisma.conditionPreset.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (duplicateName) {
        return res.status(400).json({
          success: false,
          message: 'A condition preset with this name already exists'
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isStandardized !== undefined) updateData.isStandardized = isStandardized;

    // Handle diagnoses update
    if (diagnoses !== undefined) {
      // Filter out duplicates by icd10 code
      const uniqueDiagnoses = diagnoses.filter((diagnosis, index, self) =>
        index === self.findIndex(d => d.icd10 === diagnosis.icd10)
      );

      updateData.diagnoses = {
        deleteMany: {},
        create: uniqueDiagnoses.map(diagnosis => ({
          icd10: diagnosis.icd10,
          snomed: diagnosis.snomed,
          label: diagnosis.label,
          isPrimary: diagnosis.isPrimary || false
        }))
      };
    }

    // Handle templates update
    if (templateIds !== undefined) {
      updateData.templates = {
        deleteMany: {},
        create: templateIds.map(templateId => ({
          templateId
        }))
      };
    }

    // Handle alert rules update
    if (alertRuleIds !== undefined) {
      updateData.alertRules = {
        deleteMany: {},
        create: alertRuleIds.map(ruleId => ({
          alertRuleId: ruleId
        }))
      };
    }

    const preset = await prisma.conditionPreset.update({
      where: { id },
      data: updateData,
      include: {
        diagnoses: true,
        templates: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                category: true,
                isStandardized: true
              }
            }
          }
        },
        alertRules: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                severity: true,
                conditions: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Condition preset updated successfully',
      data: preset
    });
  } catch (error) {
    console.error('Error updating condition preset:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating condition preset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete condition preset
const deleteConditionPreset = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if preset exists
    const existingPreset = await prisma.conditionPreset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!existingPreset) {
      return res.status(404).json({
        success: false,
        message: 'Condition preset not found'
      });
    }

    // Check if preset is being used in enrollments
    if (existingPreset._count.enrollments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete condition preset that is being used in enrollments'
      });
    }

    await prisma.conditionPreset.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Condition preset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting condition preset:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting condition preset'
    });
  }
};

// Get condition preset statistics
const getConditionPresetStats = async (req, res) => {
  try {
    const totalPresets = await prisma.conditionPreset.count();

    const presetsWithEnrollments = await prisma.conditionPreset.findMany({
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        enrollments: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const mostUsedPresets = presetsWithEnrollments.filter(
      preset => preset._count.enrollments > 0
    );

    res.json({
      success: true,
      data: {
        totalPresets,
        mostUsedPresets: mostUsedPresets.map(preset => ({
          id: preset.id,
          name: preset.name,
          enrollmentCount: preset._count.enrollments
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching condition preset stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching condition preset stats'
    });
  }
};

module.exports = {
  getAllConditionPresets,
  getConditionPresetById,
  createConditionPreset,
  updateConditionPreset,
  deleteConditionPreset,
  getConditionPresetStats
};