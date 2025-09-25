const express = require('express');
const router = express.Router();
const {
  alertValidations,
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
  evaluateAlerts,
  getAlertStats,
  getRecentAlerts
} = require('../controllers/alertController');

// Create a new alert with validation
router.post('/', alertValidations.create, handleValidationErrors, createAlert);

// Get all alerts with filtering and pagination
router.get('/', commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getAlerts);

// Get alert statistics
router.get('/stats', getAlertStats);

// Get recent alerts (optimized for dashboard)
router.get('/recent', getRecentAlerts);

// Evaluate alert rules
router.post('/evaluate', evaluateAlerts);

// Get alert by ID with validation
router.get('/:id', commonValidations.id, handleValidationErrors, getAlertById);

// Update alert with validation
router.put('/:id', commonValidations.id, alertValidations.update, handleValidationErrors, updateAlert);

// Delete alert with validation
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteAlert);

module.exports = router;