const { PrismaClient } = require('../../generated/prisma');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Helper function to categorize metrics
const getCategoryFromKey = (key) => {
  if (key.includes('pain')) return 'Pain Management';
  if (key.includes('glucose') || key.includes('hba1c')) return 'Diabetes';
  if (key.includes('bp') || key.includes('blood_pressure')) return 'Cardiovascular';
  if (key.includes('fatigue') || key.includes('sleep') || key.includes('cognitive')) return 'Fibromyalgia';
  if (key.includes('joint') || key.includes('stiffness')) return 'Arthritis';
  if (key.includes('medication')) return 'Medication';
  return 'General';
};

// Get standardized metric templates
const getStandardizedTemplates = async (req, res) => {
  try {
    const templates = await prisma.metricDefinition.findMany({
      where: {
        coding: {
          not: null
        }
      },
      select: {
        key: true,
        displayName: true,
        valueType: true,
        coding: true,
        validation: true,
        scaleMin: true,
        scaleMax: true,
        unit: true,
        options: true,
        defaultFrequency: true,
        decimalPrecision: true
      },
      orderBy: { displayName: 'asc' }
    });
    
    // Group by category
    const categorized = templates.reduce((acc, template) => {
      const category = getCategoryFromKey(template.key);
      if (!acc[category]) acc[category] = [];
      acc[category].push({
        ...template,
        category,
        isStandardized: true,
        loinc: template.coding?.primary?.code,
        loincDisplay: template.coding?.primary?.display,
        snomed: template.coding?.secondary?.[0]?.code,
        snomedDisplay: template.coding?.secondary?.[0]?.display,
        icd10: template.coding?.mappings?.icd10,
        icd10Description: template.coding?.mappings?.description
      });
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: categorized,
      totalTemplates: templates.length
    });
  } catch (error) {
    console.error('Error fetching standardized templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create metric from standardized template
const createFromTemplate = async (req, res) => {
  try {
    const { templateKey, customizations } = req.body;
    
    if (!templateKey) {
      return res.status(400).json({
        success: false,
        message: 'templateKey is required'
      });
    }
    
    // Get the template
    const template = await prisma.metricDefinition.findFirst({
      where: { key: templateKey }
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Generate unique key for the new metric
    const timestamp = Date.now();
    const customKey = customizations?.key || `${template.key}_custom_${timestamp}`;
    
    // Check if key already exists
    const existingMetric = await prisma.metricDefinition.findFirst({
      where: { key: customKey }
    });
    
    if (existingMetric) {
      return res.status(400).json({
        success: false,
        message: 'Metric key already exists'
      });
    }
    
    // Create new metric with template + customizations
    const newMetricData = {
      key: customKey,
      displayName: customizations?.displayName || `${template.displayName} (Custom)`,
      valueType: template.valueType, // Protected for standardized metrics
      unit: template.unit, // Protected for standardized metrics
      scaleMin: template.scaleMin, // Protected for standardized metrics
      scaleMax: template.scaleMax, // Protected for standardized metrics
      decimalPrecision: template.decimalPrecision, // Protected for standardized metrics
      coding: template.coding, // Preserve standardized codes
      validation: template.validation, // Preserve validation rules
      options: template.options, // Protected for standardized metrics
      // Allow customization of these fields
      defaultFrequency: customizations?.defaultFrequency || template.defaultFrequency,
      requiredDefault: customizations?.requiredDefault ?? template.requiredDefault
    };
    
    const newMetric = await prisma.metricDefinition.create({
      data: newMetricData
    });
    
    res.status(201).json({
      success: true,
      message: 'Metric created from standardized template successfully',
      data: {
        ...newMetric,
        isStandardized: true,
        templateUsed: templateKey
      }
    });
  } catch (error) {
    console.error('Error creating metric from template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get metric template details
const getTemplateDetails = async (req, res) => {
  try {
    const { templateKey } = req.params;
    
    const template = await prisma.metricDefinition.findFirst({
      where: { 
        key: templateKey,
        coding: {
          not: null
        }
      }
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Standardized template not found'
      });
    }
    
    // Add standardization details
    const templateDetails = {
      ...template,
      category: getCategoryFromKey(template.key),
      isStandardized: true,
      standardization: {
        loinc: {
          code: template.coding?.primary?.code,
          display: template.coding?.primary?.display,
          system: template.coding?.primary?.system
        },
        snomed: template.coding?.secondary?.map(code => ({
          code: code.code,
          display: code.display,
          system: code.system
        })) || [],
        icd10: {
          code: template.coding?.mappings?.icd10,
          description: template.coding?.mappings?.description
        }
      },
      editableFields: [
        'displayName',
        'defaultFrequency',
        'requiredDefault'
      ],
      protectedFields: [
        'key',
        'valueType',
        'unit',
        'scaleMin',
        'scaleMax',
        'coding',
        'validation',
        'options'
      ]
    };
    
    res.json({
      success: true,
      data: templateDetails
    });
  } catch (error) {
    console.error('Error fetching template details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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

    // Add standardization info to each metric
    const enrichedMetrics = metricDefinitions.map(metric => ({
      ...metric,
      isStandardized: !!metric.coding,
      category: getCategoryFromKey(metric.key)
    }));

    res.json({
      success: true,
      data: enrichedMetrics,
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

    // Add standardization info
    const enrichedMetric = {
      ...metricDefinition,
      isStandardized: !!metricDefinition.coding,
      category: getCategoryFromKey(metricDefinition.key)
    };

    res.json({
      success: true,
      data: enrichedMetric
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
    const requestData = req.body;

    // Check if metric definition exists
    const existingMetric = await prisma.metricDefinition.findUnique({
      where: { id }
    });

    if (!existingMetric) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    // Check if this is a standardized metric
    const isStandardized = !!existingMetric.coding;
    
    // Define which fields can be updated for standardized metrics
    const standardizedEditableFields = [
      'displayName', 'description', 'defaultFrequency', 'requiredDefault'
    ];
    
    // Define all valid fields for custom metrics
    const allValidFields = [
      'key', 'displayName', 'valueType', 'unit', 'scaleMin', 'scaleMax',
      'decimalPrecision', 'requiredDefault', 'defaultFrequency', 'coding',
      'options', 'validation', 'localeOverrides', 'version', 'activeFrom', 'activeTo'
    ];

    const updateData = {};
    
    if (isStandardized) {
      // For standardized metrics, only allow editing of specific fields
      standardizedEditableFields.forEach(field => {
        if (requestData[field] !== undefined) {
          updateData[field] = requestData[field];
        }
      });
      
      // Warn if trying to edit protected fields
      const protectedFields = allValidFields.filter(f => !standardizedEditableFields.includes(f));
      const attemptedProtectedEdits = protectedFields.filter(f => requestData[f] !== undefined);
      
      if (attemptedProtectedEdits.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot modify protected fields in standardized metric: ${attemptedProtectedEdits.join(', ')}`,
          editableFields: standardizedEditableFields,
          protectedFields: protectedFields
        });
      }
    } else {
      // For custom metrics, allow editing of all fields
      allValidFields.forEach(field => {
        if (requestData[field] !== undefined) {
          updateData[field] = requestData[field];
        }
      });
    }

    // Handle empty strings for nullable fields
    if (updateData.unit === '') updateData.unit = null;
    if (updateData.defaultFrequency === '') updateData.defaultFrequency = null;

    // Validate data type specific requirements if being updated
    if (updateData.valueType === 'numeric' &&
        (updateData.scaleMin === undefined || updateData.scaleMax === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Numeric metrics require scaleMin and scaleMax'
      });
    }

    const updatedMetric = await prisma.metricDefinition.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: `${isStandardized ? 'Standardized' : 'Custom'} metric definition updated successfully`,
      data: {
        ...updatedMetric,
        isStandardized,
        category: getCategoryFromKey(updatedMetric.key)
      }
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
      where: { id },
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
        where: { id }
      });

      res.json({
        success: true,
        message: 'Metric definition permanently deleted'
      });
    } else {
      // Soft delete - set activeTo to current date
      const deactivatedMetric = await prisma.metricDefinition.update({
        where: { id },
        data: { activeTo: new Date() }
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
    const standardizedMetrics = await prisma.metricDefinition.count({
      where: {
        coding: {
          not: null
        }
      }
    });

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
        standardizedMetrics,
        customMetrics: totalMetrics - standardizedMetrics,
        mostUsedMetrics: mostUsedMetrics.map(metric => ({
          ...metric,
          isStandardized: !!metric.coding,
          category: getCategoryFromKey(metric.key)
        }))
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

      default:
        // For other types, basic validation
        if (value === null || value === undefined || value === '') {
          isValid = false;
          errors.push('Value is required');
        }
    }

    res.json({
      success: true,
      data: {
        isValid,
        errors,
        value,
        metricDefinition: {
          id: metricDefinition.id,
          displayName: metricDefinition.displayName,
          valueType: metricDefinition.valueType
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
  validateMetricValue,
  // New functions for standardized templates
  getStandardizedTemplates,
  createFromTemplate,
  getTemplateDetails
};