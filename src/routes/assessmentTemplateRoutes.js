const express = require('express');
const router = express.Router();
const {
  getAllAssessmentTemplates,
  getAssessmentTemplateById,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
  customizeTemplate
} = require('../controllers/assessmentTemplateController');

const { handleValidationErrors, commonValidations } = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules for assessment templates
const assessmentTemplateValidations = {
  create: [
    body('name').notEmpty().trim().isLength({ min: 1, max: 100 })
      .withMessage('Template name is required and must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('items').optional().isArray()
      .withMessage('Items must be an array'),
    body('items.*.metricDefinitionId').isUUID()
      .withMessage('Metric definition ID must be a valid UUID'),
    body('items.*.required').optional().isBoolean()
      .withMessage('Required must be a boolean'),
    body('items.*.displayOrder').optional().isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer'),
    body('items.*.helpText').optional().trim().isLength({ max: 200 })
      .withMessage('Help text must be less than 200 characters'),
    body('items.*.defaultValue').optional().trim().isLength({ max: 100 })
      .withMessage('Default value must be less than 100 characters')
  ],
  
  update: [
    body('name').optional().notEmpty().trim().isLength({ min: 1, max: 100 })
      .withMessage('Template name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('items').optional().isArray()
      .withMessage('Items must be an array'),
    body('items.*.metricDefinitionId').isUUID()
      .withMessage('Metric definition ID must be a valid UUID'),
    body('items.*.required').optional().isBoolean()
      .withMessage('Required must be a boolean'),
    body('items.*.displayOrder').optional().isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer'),
    body('items.*.helpText').optional().trim().isLength({ max: 200 })
      .withMessage('Help text must be less than 200 characters'),
    body('items.*.defaultValue').optional().trim().isLength({ max: 100 })
      .withMessage('Default value must be less than 100 characters')
  ]
};

// Routes
router.get('/', getAllAssessmentTemplates);
router.get('/:id', commonValidations.id, handleValidationErrors, getAssessmentTemplateById);
router.post('/', assessmentTemplateValidations.create, handleValidationErrors, createAssessmentTemplate);
router.put('/:id', commonValidations.id, assessmentTemplateValidations.update, handleValidationErrors, updateAssessmentTemplate);
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteAssessmentTemplate);

// Multi-tenant customization route
router.post('/:id/customize', commonValidations.id, handleValidationErrors, customizeTemplate);

module.exports = router;