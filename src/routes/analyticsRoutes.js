const express = require('express');
const router = express.Router();
const {
  getClinicianWorkflowAnalytics,
  getOrganizationWorkflowAnalytics,
  getPatientEngagementMetrics
} = require('../controllers/analyticsController');

// Get clinician workflow analytics (individual or current user)
// Query params: clinicianId (optional), startDate, endDate, timeframe (7d, 30d, 90d)
router.get('/clinician-workflow', getClinicianWorkflowAnalytics);

// Get organization-wide workflow analytics
// Query params: startDate, endDate, timeframe (7d, 30d, 90d)
router.get('/organization-workflow', getOrganizationWorkflowAnalytics);

// Get patient engagement metrics (individual patient or organization-wide)
// Query params: patientId (optional), startDate, endDate, timeframe (7d, 30d, 90d)
router.get('/patient-engagement', getPatientEngagementMetrics);

module.exports = router;
