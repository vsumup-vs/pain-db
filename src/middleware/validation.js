const { body, param, query, validationResult } = require('express-validator');

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  id: param('id').isUUID().withMessage('ID must be a valid UUID'),
  
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isString().trim().withMessage('Sort by must be a string'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ],
  
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
  ]
};

// Patient validation rules
const patientValidations = {
  create: [
    body('firstName').notEmpty().trim().isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be 1-50 characters'),
    body('lastName').notEmpty().trim().isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be 1-50 characters'),
    body('dateOfBirth').isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('email').optional().isEmail().normalizeEmail()
      .withMessage('Email must be a valid email address'),
    body('phone').optional().isMobilePhone().withMessage('Phone must be a valid phone number'),
    body('address').optional().trim().isLength({ max: 200 })
      .withMessage('Address must be less than 200 characters'),
    body('emergencyContact').optional().trim().isLength({ max: 100 })
      .withMessage('Emergency contact must be less than 100 characters'),
    body('medicalHistory').optional().trim().isLength({ max: 1000 })
      .withMessage('Medical history must be less than 1000 characters')
  ],
  
  update: [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('email').optional().isEmail().normalizeEmail()
      .withMessage('Email must be a valid email address'),
    body('phone').optional().isMobilePhone().withMessage('Phone must be a valid phone number'),
    body('address').optional().trim().isLength({ max: 200 })
      .withMessage('Address must be less than 200 characters'),
    body('emergencyContact').optional().trim().isLength({ max: 100 })
      .withMessage('Emergency contact must be less than 100 characters'),
    body('medicalHistory').optional().trim().isLength({ max: 1000 })
      .withMessage('Medical history must be less than 1000 characters')
  ]
};

// Clinician validation rules
const clinicianValidations = {
  create: [
    body('firstName').notEmpty().trim().isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be 1-50 characters'),
    body('lastName').notEmpty().trim().isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be 1-50 characters'),
    body('email').isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('specialization').notEmpty().trim().isLength({ min: 1, max: 100 })
      .withMessage('Specialization is required and must be 1-100 characters'),
    body('licenseNumber').notEmpty().trim().isLength({ min: 1, max: 50 })
      .withMessage('License number is required and must be 1-50 characters'),
    body('phone').optional().isMobilePhone().withMessage('Phone must be a valid phone number'),
    body('department').optional().trim().isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters')
  ],
  
  update: [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('email').optional().isEmail().normalizeEmail()
      .withMessage('Email must be a valid email address'),
    body('specialization').optional().trim().isLength({ min: 1, max: 100 })
      .withMessage('Specialization must be 1-100 characters'),
    body('licenseNumber').optional().trim().isLength({ min: 1, max: 50 })
      .withMessage('License number must be 1-50 characters'),
    body('phone').optional().isMobilePhone().withMessage('Phone must be a valid phone number'),
    body('department').optional().trim().isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters')
  ]
};

// Enrollment validation rules
const enrollmentValidations = {
  create: [
    body('patientId').isUUID().withMessage('Patient ID must be a valid UUID'),
    body('clinicianId').isUUID().withMessage('Clinician ID must be a valid UUID'),
    body('presetId').isUUID().withMessage('Preset ID must be a valid UUID'),
    body('diagnosisCode').notEmpty().trim().isLength({ min: 1, max: 50 })
      .withMessage('Diagnosis code is required and must be 1-50 characters'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('status').optional().isIn(['active', 'paused', 'ended'])
      .withMessage('Status must be active, paused, or ended'),
    body('consentAt').optional().isISO8601().withMessage('Consent date must be a valid date'),
    body('notes').optional().trim().isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ],
  
  update: [
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('status').optional().isIn(['active', 'paused', 'ended'])
      .withMessage('Status must be active, paused, or ended'),
    body('consentAt').optional().isISO8601().withMessage('Consent date must be a valid date'),
    body('notes').optional().trim().isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ]
};

// Metric Definition validation rules
const metricDefinitionValidations = {
  create: [
    body('name').notEmpty().trim().isLength({ min: 1, max: 100 })
      .withMessage('Name is required and must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('unit').notEmpty().trim().isLength({ min: 1, max: 20 })
      .withMessage('Unit is required and must be 1-20 characters'),
    body('dataType').isIn(['INTEGER', 'DECIMAL', 'TEXT', 'BOOLEAN'])
      .withMessage('Data type must be INTEGER, DECIMAL, TEXT, or BOOLEAN'),
    body('minValue').optional().isNumeric().withMessage('Min value must be a number'),
    body('maxValue').optional().isNumeric().withMessage('Max value must be a number'),
    body('category').optional().trim().isLength({ max: 50 })
      .withMessage('Category must be less than 50 characters'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ],
  
  update: [
    body('name').optional().trim().isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('unit').optional().trim().isLength({ min: 1, max: 20 })
      .withMessage('Unit must be 1-20 characters'),
    body('dataType').optional().isIn(['INTEGER', 'DECIMAL', 'TEXT', 'BOOLEAN'])
      .withMessage('Data type must be INTEGER, DECIMAL, TEXT, or BOOLEAN'),
    body('minValue').optional().isNumeric().withMessage('Min value must be a number'),
    body('maxValue').optional().isNumeric().withMessage('Max value must be a number'),
    body('category').optional().trim().isLength({ max: 50 })
      .withMessage('Category must be less than 50 characters'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ]
};

// Observation validation rules
const observationValidations = {
  create: [
    body('patientId').isUUID().withMessage('Patient ID must be a valid UUID'),
    body('metricDefinitionId').isUUID().withMessage('Metric definition ID must be a valid UUID'),
    body('value').notEmpty().withMessage('Value is required'),
    body('recordedAt').isISO8601().withMessage('Recorded at must be a valid date'),
    body('notes').optional().trim().isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters'),
    body('recordedBy').optional().isUUID().withMessage('Recorded by must be a valid UUID')
  ],
  
  update: [
    body('value').optional().notEmpty().withMessage('Value cannot be empty'),
    body('recordedAt').optional().isISO8601().withMessage('Recorded at must be a valid date'),
    body('notes').optional().trim().isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters'),
    body('recordedBy').optional().isUUID().withMessage('Recorded by must be a valid UUID')
  ],
  
  bulk: [
    body('observations').isArray({ min: 1, max: 100 })
      .withMessage('Observations must be an array with 1-100 items'),
    body('observations.*.patientId').isUUID().withMessage('Patient ID must be a valid UUID'),
    body('observations.*.metricDefinitionId').isUUID()
      .withMessage('Metric definition ID must be a valid UUID'),
    body('observations.*.value').notEmpty().withMessage('Value is required'),
    body('observations.*.recordedAt').isISO8601().withMessage('Recorded at must be a valid date'),
    body('observations.*.notes').optional().trim().isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters')
  ]
};

// Alert validation rules
const alertValidations = {
  create: [
    body('patientId').isUUID().withMessage('Patient ID must be a valid UUID'),
    body('metricDefinitionId').isUUID().withMessage('Metric definition ID must be a valid UUID'),
    body('ruleType').isIn(['THRESHOLD_EXCEEDED', 'THRESHOLD_BELOW', 'TREND_INCREASING', 'TREND_DECREASING', 'MISSING_DATA'])
      .withMessage('Rule type must be a valid alert rule type'),
    body('threshold').isNumeric().withMessage('Threshold must be a number'),
    body('message').optional().trim().isLength({ max: 200 })
      .withMessage('Message must be less than 200 characters'),
    body('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Severity must be LOW, MEDIUM, HIGH, or CRITICAL'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ],
  
  update: [
    body('ruleType').optional().isIn(['THRESHOLD_EXCEEDED', 'THRESHOLD_BELOW', 'TREND_INCREASING', 'TREND_DECREASING', 'MISSING_DATA'])
      .withMessage('Rule type must be a valid alert rule type'),
    body('threshold').optional().isNumeric().withMessage('Threshold must be a number'),
    body('message').optional().trim().isLength({ max: 200 })
      .withMessage('Message must be less than 200 characters'),
    body('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Severity must be LOW, MEDIUM, HIGH, or CRITICAL'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ]
};

// Custom validation middleware for business logic
const customValidations = {
  // Validate date range
  validateDateRange: (req, res, next) => {
    const { startDate, endDate } = req.query;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'dateRange', message: 'Start date must be before end date' }]
      });
    }
    next();
  },
  
  // Validate metric value against definition constraints
  validateMetricValue: async (req, res, next) => {
    try {
      const { metricDefinitionId, value } = req.body;
      if (!metricDefinitionId || value === undefined) {
        return next();
      }
      
      const { PrismaClient } = require('../../generated/prisma');
      const prisma = new PrismaClient();
      
      const metricDef = await prisma.metricDefinition.findUnique({
        where: { id: metricDefinitionId }
      });
      
      if (!metricDef) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'metricDefinitionId', message: 'Metric definition not found' }]
        });
      }
      
      // Validate data type
      const numericValue = parseFloat(value);
      if (metricDef.dataType === 'INTEGER' && !Number.isInteger(numericValue)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'value', message: 'Value must be an integer' }]
        });
      }
      
      if ((metricDef.dataType === 'DECIMAL' || metricDef.dataType === 'INTEGER') && isNaN(numericValue)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'value', message: 'Value must be a number' }]
        });
      }
      
      // Validate range
      if (metricDef.minValue !== null && numericValue < metricDef.minValue) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'value', message: `Value must be at least ${metricDef.minValue}` }]
        });
      }
      
      if (metricDef.maxValue !== null && numericValue > metricDef.maxValue) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'value', message: `Value must be at most ${metricDef.maxValue}` }]
        });
      }
      
      await prisma.$disconnect();
      next();
    } catch (error) {
      console.error('Error validating metric value:', error);
      res.status(500).json({ error: 'Internal server error during validation' });
    }
  },
  
  // Validate age calculation
  validateAge: (req, res, next) => {
    const { dateOfBirth } = req.body;
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 0 || age > 150) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'dateOfBirth', message: 'Invalid date of birth' }]
        });
      }
    }
    next();
  }
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  patientValidations,
  clinicianValidations,
  enrollmentValidations,
  metricDefinitionValidations,
  observationValidations,
  alertValidations,
  customValidations
};