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
  validateMetricValue
} = require('../controllers/metricDefinitionController');

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