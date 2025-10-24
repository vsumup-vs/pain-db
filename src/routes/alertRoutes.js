const express = require('express');
const router = express.Router();
const {
  alertValidations,
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const { requireRole } = require('../middleware/auth');
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
  forceClaimAlert,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  unsnoozeAlert,
  suppressAlert,
  unsuppressAlert,
  escalateAlert,
  getEscalationHistory,
  bulkAlertActions
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

// Bulk alert actions (Phase 1b - Multi-select operations)
// Restricted to ORG_ADMIN role (coordinator-level access)
router.post('/bulk-actions', requireRole('ORG_ADMIN'), handleValidationErrors, bulkAlertActions);

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

// Force claim alert (Phase 1b - Option 3 Hybrid)
// Restricted to ORG_ADMIN and SUPERVISOR roles
router.post('/:id/force-claim', commonValidations.id, requireRole(['ORG_ADMIN', 'SUPERVISOR']), handleValidationErrors, forceClaimAlert);

// Acknowledge alert (Critical Fix #3 - Audit Logging)
router.post('/:id/acknowledge', commonValidations.id, handleValidationErrors, acknowledgeAlert);

// Resolve alert with required documentation (Critical Fixes #1, #2, #3, #4)
router.post('/:id/resolve', commonValidations.id, handleValidationErrors, resolveAlert);

// Snooze alert (Phase 1b)
router.post('/:id/snooze', commonValidations.id, handleValidationErrors, snoozeAlert);

// Unsnooze alert (Phase 1b)
router.post('/:id/unsnooze', commonValidations.id, handleValidationErrors, unsnoozeAlert);

// Suppress alert (Phase 1b)
router.post('/:id/suppress', commonValidations.id, handleValidationErrors, suppressAlert);

// Unsuppress alert (Phase 1b)
router.post('/:id/unsuppress', commonValidations.id, handleValidationErrors, unsuppressAlert);

// Escalate alert (Phase 1b - Manual escalation)
router.post('/:id/escalate', commonValidations.id, handleValidationErrors, escalateAlert);

// Get escalation history for an alert (Phase 1b)
router.get('/:id/escalation-history', commonValidations.id, handleValidationErrors, getEscalationHistory);

module.exports = router;