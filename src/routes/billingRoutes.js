/**
 * Billing Routes
 *
 * API routes for configurable billing readiness calculations and billing program management.
 *
 * All endpoints use the NEW CONFIGURABLE billing service (reads criteria from database).
 */

const express = require('express');
const router = express.Router();
const {
  getEnrollmentBillingReadiness,
  getOrganizationBillingReadiness,
  getOrganizationBillingSummary,
  getBillingPrograms,
  getBillingProgramByCode,
  getOrganizationBillingPrograms,
  exportBillingSummaryCSV,
  getAvailableCPTCodes
} = require('../controllers/billingController');

// ============================================================================
// Billing Readiness Endpoints
// ============================================================================

// Get billing readiness for a specific enrollment
// GET /api/billing/readiness/:enrollmentId/:billingMonth
// Example: /api/billing/readiness/enrollment-abc123/2025-10
router.get('/readiness/:enrollmentId/:billingMonth', getEnrollmentBillingReadiness);

// Get billing readiness for all enrollments in an organization
// GET /api/billing/organization/:organizationId/:billingMonth
// Example: /api/billing/organization/org-123/2025-10
router.get('/organization/:organizationId/:billingMonth', getOrganizationBillingReadiness);

// Get billing summary for an organization (with financial projections)
// GET /api/billing/summary/:organizationId/:billingMonth
// Example: /api/billing/summary/org-123/2025-10
router.get('/summary/:organizationId/:billingMonth', getOrganizationBillingSummary);

// Export billing summary to CSV
// GET /api/billing/export/:organizationId/:billingMonth
// Example: /api/billing/export/org-123/2025-10
router.get('/export/:organizationId/:billingMonth', exportBillingSummaryCSV);

// Get available CPT codes for an enrollment (contextual filtering)
// GET /api/billing/available-cpt-codes/:enrollmentId/:billingMonth?duration=25
// Example: /api/billing/available-cpt-codes/enrollment-abc123/2025-10?duration=25
// Returns CPT codes filtered by billing program, eligibility, and prerequisites
// Optional duration parameter provides auto-recommendation
router.get('/available-cpt-codes/:enrollmentId/:billingMonth', getAvailableCPTCodes);

// ============================================================================
// Billing Program Management Endpoints
// ============================================================================

// Get all billing programs (with optional filters)
// GET /api/billing/programs?region=US&programType=RPM&isActive=true&effectiveNow=true
router.get('/programs', getBillingPrograms);

// Get a specific billing program by code
// GET /api/billing/programs/:code
// Example: /api/billing/programs/CMS_RPM_2025
router.get('/programs/:code', getBillingProgramByCode);

// Get billing programs available for a specific organization (region-filtered)
// GET /api/billing/programs/organization/:organizationId
router.get('/programs/organization/:organizationId', getOrganizationBillingPrograms);

module.exports = router;
