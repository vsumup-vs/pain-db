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
  getRecentAlerts,
  getTriageQueue,
  claimAlert,
  unclaimAlert,
  acknowledgeAlert,
  resolveAlert
} = require('../controllers/alertController');

// Create a new alert with validation
router.post('/', alertValidations.create, handleValidationErrors, createAlert);

// Get all alerts with filtering and pagination
router.get('/', commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getAlerts);

// Get alert statistics
router.get('/stats', getAlertStats);

// Get recent alerts (optimized for dashboard)
router.get('/recent', getRecentAlerts);

// Get prioritized triage queue (Phase 1a - Workflow Optimizer)
router.get('/triage-queue', commonValidations.pagination, handleValidationErrors, getTriageQueue);

// Evaluate alert rules
router.post('/evaluate', evaluateAlerts);

// Get alert by ID with validation
router.get('/:id', commonValidations.id, handleValidationErrors, getAlertById);

// Update alert with validation
router.put('/:id', commonValidations.id, alertValidations.update, handleValidationErrors, updateAlert);

// Delete alert with validation
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteAlert);

// Claim alert (Phase 1a - Workflow Optimizer)
router.post('/:id/claim', commonValidations.id, handleValidationErrors, claimAlert);

// Unclaim alert (Phase 1a - Workflow Optimizer)
router.post('/:id/unclaim', commonValidations.id, handleValidationErrors, unclaimAlert);

// Acknowledge alert (Critical Fix #3 - Audit Logging)
router.post('/:id/acknowledge', commonValidations.id, handleValidationErrors, acknowledgeAlert);

// Resolve alert with required documentation (Critical Fixes #1, #2, #3, #4)
router.post('/:id/resolve', commonValidations.id, handleValidationErrors, resolveAlert);

module.exports = router;