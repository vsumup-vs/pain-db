const express = require('express');
const router = express.Router();
const {
  metricDefinitionValidations,
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
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
} = require('../controllers/metricDefinitionController');

// Standardized template routes (place before parameterized routes)
router.get('/templates/standardized', getStandardizedTemplates);
router.get('/templates/:templateKey', getTemplateDetails);
router.post('/templates/create', createFromTemplate);

// Base routes with validation
router.post('/', metricDefinitionValidations.create, handleValidationErrors, createMetricDefinition);
router.get('/', commonValidations.pagination, handleValidationErrors, getAllMetricDefinitions);
router.get('/stats', getMetricDefinitionStats);
router.get('/:id', commonValidations.id, handleValidationErrors, getMetricDefinitionById);
router.put('/:id', commonValidations.id, metricDefinitionValidations.update, handleValidationErrors, updateMetricDefinition);
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteMetricDefinition);

// Utility routes with validation
router.post('/:id/validate', commonValidations.id, handleValidationErrors, validateMetricValue);

module.exports = router;