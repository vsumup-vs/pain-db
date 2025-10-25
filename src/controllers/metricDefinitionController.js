const { PrismaClient } = require('@prisma/client');

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

// Helper function to generate key from name and category
const generateKeyFromNameAndCategory = (name, category) => {
  const categoryPrefixes = {
    'Pain Management': 'pain',
    'Diabetes': 'glucose',
    'Cardiovascular': 'bp',
    'Fibromyalgia': 'fatigue',
    'Arthritis': 'joint',
    'Medication': 'medication',
    'General': 'general'
  };
  
  const prefix = categoryPrefixes[category] || 'general';
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 20);
  
  return `${prefix}_${cleanName}`;
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
        name: true,
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
      name,          // Accept 'name' from frontend
      displayName,   // Also accept displayName for backward compatibility
      description,
      valueType,
      category,      // Add category field
      unit,
      minValue,      // Accept both minValue and scaleMin
      maxValue,      // Accept both maxValue and scaleMax
      scaleMin,
      scaleMax,
      decimalPrecision,
      requiredDefault = false,
      defaultFrequency,
      coding,
      options,
      validation,
      localeOverrides
    } = req.body;

    // Use name or displayName, whichever is provided
    const finalDisplayName = displayName || name;
    const finalCategory = category || 'General';
    
    // Generate key from name and category
    const key = generateKeyFromNameAndCategory(finalDisplayName, finalCategory);

    // Use the provided scale values or fall back to min/max values
    const finalScaleMin = scaleMin !== undefined ? scaleMin : minValue;
    const finalScaleMax = scaleMax !== undefined ? scaleMax : maxValue;

    // Validate required fields
    if (!finalDisplayName || !valueType) {
      return res.status(400).json({
        success: false,
        message: 'name/displayName and valueType are required'
      });
    }

    // Validate value type specific requirements
    if (valueType === 'numeric' && (finalScaleMin === undefined || finalScaleMax === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Numeric metrics require scaleMin/minValue and scaleMax/maxValue'
      });
    }

    // Process options for categorical/ordinal metrics
    let processedOptions = options;
    if (valueType === 'categorical' || valueType === 'ordinal') {
      if (typeof options === 'string') {
        // Convert string options (from textarea) to proper format
        const optionLines = options.split('\n').filter(line => line.trim());
        processedOptions = {
          values: optionLines.map((line, index) => ({
            code: `option_${index + 1}`,
            display: line.trim()
          }))
        };
      } else if (Array.isArray(options)) {
        // Convert array to proper format
        processedOptions = {
          values: options.map((option, index) => ({
            code: typeof option === 'object' ? option.code : `option_${index + 1}`,
            display: typeof option === 'object' ? option.display : option
          }))
        };
      }

      if (!processedOptions || !processedOptions.values || processedOptions.values.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Categorical and ordinal metrics require options'
        });
      }
    }

    const metricDefinition = await prisma.metricDefinition.create({
      data: {
        key,
        displayName: finalDisplayName,
        description,
        valueType,
        unit,
        scaleMin: valueType === 'numeric' ? finalScaleMin : null,
        scaleMax: valueType === 'numeric' ? finalScaleMax : null,
        decimalPrecision,
        requiredDefault,
        defaultFrequency,
        coding,
        options: processedOptions,
        validation,
        localeOverrides
      }
    });

    // Add category info to response
    const enrichedMetric = {
      ...metricDefinition,
      category: finalCategory,
      isStandardized: !!metricDefinition.coding
    };

    res.status(201).json({
      success: true,
      message: 'Metric definition created successfully',
      data: enrichedMetric
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

// Get all metric definitions with filtering (org-aware)
const getAllMetricDefinitions = async (req, res) => {
  try {
    const {
      isActive,
      category,
      valueType,
      page = 1,
      limit = 100,  // Increased default limit
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get current organization from auth middleware
    const currentOrgId = req.user?.currentOrganization || null;

    // Build filter conditions - show standardized + org-specific
    const where = {
      OR: [
        { organizationId: null, isStandardized: true }, // Platform standardized
        { organizationId: currentOrgId }                 // Org-specific custom
      ]
    };

    // Add additional filters
    // Note: MetricDefinition doesn't have isActive field - removed filter
    if (category) where.category = category;
    if (valueType) where.valueType = valueType;
    if (search) {
      where.AND = [
        {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' } },
            { key: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [metricDefinitions, total] = await Promise.all([
      prisma.metricDefinition.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isStandardized: 'desc' }, // Standardized first
          { createdAt: 'desc' }
        ],
        include: {
          organization: {
            select: { id: true, name: true }
          },
          sourceMetric: {
            select: { id: true, key: true, displayName: true }
          },
          _count: {
            select: { observations: true }
          }
        }
      }),
      prisma.metricDefinition.count({ where })
    ]);

    // Add standardization info and convert Decimal values
    const enrichedMetrics = metricDefinitions.map(metric => ({
      ...metric,
      scaleMin: metric.scaleMin ? Number(metric.scaleMin.toString()) : null,
      scaleMax: metric.scaleMax ? Number(metric.scaleMax.toString()) : null,
      isStandardized: metric.isStandardized || !!metric.standardCoding,
      isCustomized: !!metric.organizationId,  // True if org-specific
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

    // Add standardization info and convert Decimal values to numbers
    const enrichedMetric = {
      ...metricDefinition,
      // Convert Prisma Decimal objects to JavaScript numbers
      scaleMin: metricDefinition.scaleMin ? Number(metricDefinition.scaleMin.toString()) : null,
      scaleMax: metricDefinition.scaleMax ? Number(metricDefinition.scaleMax.toString()) : null,
      isStandardized: !!metricDefinition.standardCoding || metricDefinition.isStandardized,
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

    console.log('Update metric request - ID:', id);
    console.log('Update metric request - Body:', JSON.stringify(requestData, null, 2));

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

    console.log('Existing metric found:', existingMetric.key);

    // Check if this is a standardized metric
    const isStandardized = !!existingMetric.standardCoding || existingMetric.isStandardized;

    // BLOCK: Prevent direct editing of standardized metrics
    // User must use the customize endpoint first to create an org-specific copy
    if (isStandardized && !existingMetric.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot directly edit standardized metrics. Please use the "Customize" feature to create an editable copy for your organization first.',
        hint: 'Click the "Customize" button to clone this metric for your organization',
        standardizedMetric: {
          id: existingMetric.id,
          key: existingMetric.key,
          displayName: existingMetric.displayName
        }
      });
    }
    
    // Define which fields can be updated for standardized metrics (only fields that exist in schema)
    const standardizedEditableFields = [
      'displayName', 'description'
    ];
    
    // Define all valid fields for custom metrics
    const allValidFields = [
      'key', 'displayName', 'valueType', 'unit', 'scaleMin', 'scaleMax',
      'decimalPrecision', 'requiredDefault', 'defaultFrequency', 'coding',
      'options', 'validation', 'localeOverrides', 'version', 'activeFrom', 'activeTo'
    ];

    const updateData = {};

    console.log('Is standardized:', isStandardized);

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

      console.log('Attempted protected edits:', attemptedProtectedEdits);

      if (attemptedProtectedEdits.length > 0) {
        console.log('VALIDATION ERROR: Cannot modify protected fields');
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

    console.log('Update data to send to Prisma:', JSON.stringify(updateData, null, 2));

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

    // BLOCK: Prevent deletion of standardized metrics
    const isStandardized = !!existingMetric.standardCoding || existingMetric.isStandardized;
    if (isStandardized && !existingMetric.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete standardized metrics. These are platform-level resources shared across all organizations.',
        standardizedMetric: {
          id: existingMetric.id,
          key: existingMetric.key,
          displayName: existingMetric.displayName
        }
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
        OR: [
          { standardCoding: { not: null } },
          { isStandardized: true }
        ]
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
          isStandardized: !!metric.standardCoding || metric.isStandardized,
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

    // Note: MetricDefinition doesn't have isActive field - removed validation check

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

// Customize/Clone a standardized metric for organization
const customizeMetric = async (req, res) => {
  try {
    const { id } = req.params;
    const currentOrgId = req.user?.currentOrganization;

    if (!currentOrgId) {
      return res.status(400).json({
        success: false,
        message: 'Current organization not found'
      });
    }

    // Get the source metric
    const sourceMetric = await prisma.metricDefinition.findUnique({
      where: { id }
    });

    if (!sourceMetric) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    // Check if already customized by this org
    const existingCustom = await prisma.metricDefinition.findFirst({
      where: {
        organizationId: currentOrgId,
        sourceMetricId: id
      }
    });

    if (existingCustom) {
      return res.status(400).json({
        success: false,
        message: 'This metric has already been customized for your organization',
        data: existingCustom
      });
    }

    // Clone the metric for this organization
    const customMetric = await prisma.metricDefinition.create({
      data: {
        organizationId: currentOrgId,
        sourceMetricId: id,
        key: sourceMetric.key,  // Same key, but unique per org
        displayName: `${sourceMetric.displayName} (Custom)`,
        description: sourceMetric.description,
        unit: sourceMetric.unit,
        valueType: sourceMetric.valueType,
        category: sourceMetric.category,
        isStandardized: false,  // No longer standardized
        scaleMin: sourceMetric.scaleMin,
        scaleMax: sourceMetric.scaleMax,
        decimalPrecision: sourceMetric.decimalPrecision,
        options: sourceMetric.options,
        normalRange: sourceMetric.normalRange,
        standardCoding: sourceMetric.standardCoding,  // Preserve coding reference
        validationInfo: sourceMetric.validationInfo
      }
    });

    res.status(201).json({
      success: true,
      message: 'Metric customized for your organization. You can now edit it.',
      data: {
        ...customMetric,
        scaleMin: customMetric.scaleMin ? Number(customMetric.scaleMin.toString()) : null,
        scaleMax: customMetric.scaleMax ? Number(customMetric.scaleMax.toString()) : null,
        isCustomized: true,
        category: getCategoryFromKey(customMetric.key)
      }
    });
  } catch (error) {
    console.error('Error customizing metric:', error);
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
  customizeMetric,  // New customize endpoint
  // Functions for standardized templates
  getStandardizedTemplates,
  createFromTemplate,
  getTemplateDetails
};