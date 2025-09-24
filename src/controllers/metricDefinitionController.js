const { PrismaClient } = require('../../generated/prisma');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new metric definition
const createMetricDefinition = async (req, res) => {
  try {
    const {
      key,           // Add this required field
      displayName,   // Change from 'name'
      description,
      valueType,     // Change from 'dataType'
      unit,
      scaleMin,      // Change from 'minValue'
      scaleMax,      // Change from 'maxValue'
      decimalPrecision,
      requiredDefault = false,
      defaultFrequency,
      coding,
      options,
      validation,
      localeOverrides
    } = req.body;

    // Validate required fields
    if (!key || !displayName || !valueType) {
      return res.status(400).json({
        success: false,
        message: 'key, displayName and valueType are required'
      });
    }

    // Validate value type specific requirements
    if (valueType === 'numeric' && (scaleMin === undefined || scaleMax === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Numeric metrics require scaleMin and scaleMax'
      });
    }

    // Validate categorical/ordinal metrics require options
    if ((valueType === 'categorical' || valueType === 'ordinal') && (!options || !Array.isArray(options) || options.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Categorical and ordinal metrics require options array'
      });
    }

    const metricDefinition = await prisma.metricDefinition.create({
      data: {
        key,
        displayName,
        description,  // Add this missing field
        valueType,
        unit,
        scaleMin: valueType === 'numeric' ? scaleMin : null,
        scaleMax: valueType === 'numeric' ? scaleMax : null,
        decimalPrecision,
        requiredDefault,
        defaultFrequency,
        coding,
        options,
        validation,
        localeOverrides
      }
    });

    res.status(201).json({
      success: true,
      message: 'Metric definition created successfully',
      data: metricDefinition
    });
  } catch (error) {
    console.error('Error creating metric definition:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all metric definitions with filtering
const getAllMetricDefinitions = async (req, res) => {
  try {
    const {
      isActive,
      category,
      valueType,     // Fix: was 'dataType'
      page = 1,
      limit = 10,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter conditions
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (category) where.category = category;
    if (valueType) where.valueType = valueType;  // Fix: was 'dataType'
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [metricDefinitions, total] = await Promise.all([
      prisma.metricDefinition.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { observations: true }
          }
        }
      }),
      prisma.metricDefinition.count({ where })
    ]);

    res.json({
      success: true,
      data: metricDefinitions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching metric definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get metric definition by ID
const getMetricDefinitionById = async (req, res) => {
  try {
    const { id } = req.params;

    const metricDefinition = await prisma.metricDefinition.findUnique({
      where: { id },
      include: {
        observations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: {
              select: { id: true, mrn: true, createdAt: true }  // Remove firstName and lastName
            }
          }
        },
        _count: {
          select: { observations: true }
        }
      }
    });

    if (!metricDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    res.json({
      success: true,
      data: metricDefinition
    });
  } catch (error) {
    console.error('Error fetching metric definition:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update metric definition
const updateMetricDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if metric definition exists
    const existingMetric = await prisma.metricDefinition.findUnique({
      where: { id }  // Remove parseInt(id)
    });

    if (!existingMetric) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    // Validate data type specific requirements if being updated
    if (updateData.valueType === 'numeric' &&   // Fix: change from 'NUMERIC' to 'numeric'
        (updateData.scaleMin === undefined || updateData.scaleMax === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Numeric metrics require scaleMin and scaleMax'
      });
    }

    if (updateData.valueType === 'categorical' &&   // Fix: change from 'CATEGORICAL' to 'categorical'
        (!updateData.options || updateData.options.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Categorical metrics require options array'
      });
    }

    const updatedMetricDefinition = await prisma.metricDefinition.update({
      where: { id },  // Remove parseInt(id)
      data: updateData
    });

    res.json({
      success: true,
      message: 'Metric definition updated successfully',
      data: updatedMetricDefinition
    });
  } catch (error) {
    console.error('Error updating metric definition:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Soft delete metric definition (deactivate)
const deleteMetricDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const existingMetric = await prisma.metricDefinition.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { observations: true }
        }
      }
    });

    if (!existingMetric) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    if (permanent === 'true') {
      // Check if there are observations using this metric
      if (existingMetric._count.observations > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot permanently delete metric definition with existing observations. Use soft delete instead.'
        });
      }

      await prisma.metricDefinition.delete({
        where: { id: parseInt(id) }
      });

      res.json({
        success: true,
        message: 'Metric definition permanently deleted'
      });
    } else {
      // Soft delete - just deactivate
      const deactivatedMetric = await prisma.metricDefinition.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Metric definition deactivated successfully',
        data: deactivatedMetric
      });
    }
  } catch (error) {
    console.error('Error deleting metric definition:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get metric definition statistics
const getMetricDefinitionStats = async (req, res) => {
  try {
    const stats = await prisma.metricDefinition.groupBy({
      by: ['valueType'],
      _count: {
        id: true
      }
    });

    const totalMetrics = await prisma.metricDefinition.count();

    const mostUsedMetrics = await prisma.metricDefinition.findMany({
      take: 5,
      orderBy: {
        observations: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: { observations: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        byType: stats.reduce((acc, stat) => {
          acc[stat.valueType] = stat._count.id;
          return acc;
        }, {}),
        totalMetrics,
        mostUsedMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching metric definition stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Validate metric value against definition
const validateMetricValue = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    const metricDefinition = await prisma.metricDefinition.findUnique({
      where: { id }  // Remove parseInt(id)
    });

    if (!metricDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    if (!metricDefinition.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Metric definition is not active'
      });
    }

    let isValid = true;
    let errors = [];

    switch (metricDefinition.dataType) {
      case 'NUMERIC':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          isValid = false;
          errors.push('Value must be a number');
        } else {
          if (numValue < metricDefinition.minValue) {
            isValid = false;
            errors.push(`Value must be >= ${metricDefinition.minValue}`);
          }
          if (numValue > metricDefinition.maxValue) {
            isValid = false;
            errors.push(`Value must be <= ${metricDefinition.maxValue}`);
          }
        }
        break;

      case 'CATEGORICAL':
        if (!metricDefinition.validValues.includes(value)) {
          isValid = false;
          errors.push(`Value must be one of: ${metricDefinition.validValues.join(', ')}`);
        }
        break;

      case 'TEXT':
        if (typeof value !== 'string') {
          isValid = false;
          errors.push('Value must be a string');
        }
        break;

      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          isValid = false;
          errors.push('Value must be a boolean');
        }
        break;
    }

    res.json({
      success: true,
      data: {
        isValid,
        errors,
        metricDefinition: {
          id: metricDefinition.id,
          name: metricDefinition.name,
          dataType: metricDefinition.dataType
        }
      }
    });
  } catch (error) {
    console.error('Error validating metric value:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createMetricDefinition,
  getAllMetricDefinitions,
  getMetricDefinitionById,
  updateMetricDefinition,
  deleteMetricDefinition,
  getMetricDefinitionStats,
  validateMetricValue
};