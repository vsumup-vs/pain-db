/**
 * Billing Routes
 *
 * Routes for CMS billing readiness calculations and exports.
 */

const express = require('express');
const router = express.Router();
const {
  getBillingReadiness,
  getPatientBillingReadiness,
  exportBillingReadiness,
  getBillingStats
} = require('../controllers/billingController');

// Get billing readiness for organization
router.get('/readiness', getBillingReadiness);

// Get billing readiness for specific patient
router.get('/readiness/patient/:patientId', getPatientBillingReadiness);

// Export billing readiness as CSV
router.get('/readiness/export', exportBillingReadiness);

// Get billing statistics summary
router.get('/stats', getBillingStats);

module.exports = router;
