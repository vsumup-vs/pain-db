const express = require('express');
const router = express.Router();
const packageSuggestionController = require('../controllers/packageSuggestionController');

/**
 * Package Suggestion Routes
 *
 * Automatic billing package suggestion based on diagnosis codes.
 */

// Billing Package Template Management
router.get('/billing/packages', packageSuggestionController.listBillingPackageTemplates);
router.get('/billing/packages/:code', packageSuggestionController.getBillingPackageTemplate);

// Package Suggestion
router.post('/billing/suggest-package', packageSuggestionController.suggestBillingPackagesForPatient);

// Patient-Specific Suggestions
router.get('/patients/:patientId/suggestions', packageSuggestionController.getPatientSuggestions);

// Suggestion Workflow (Approve/Reject)
router.post('/suggestions/:suggestionId/approve', packageSuggestionController.approveSuggestion);
router.post('/suggestions/:suggestionId/reject', packageSuggestionController.rejectSuggestion);

// Suggestion History
router.get('/suggestions/history', packageSuggestionController.getSuggestionHistory);

module.exports = router;
