/**
 * Basic Assessment Routes
 *
 * Routes for creating and managing completed assessments with responses
 */

const express = require('express');
const router = express.Router();
const {
  createAssessment,
  getAssessmentById,
  getAssessmentsByPatient
} = require('../controllers/assessmentController');

/**
 * Create a new completed assessment with responses
 * POST /api/assessments
 *
 * Body:
 * {
 *   patientId: string,
 *   clinicianId: string,
 *   templateId: string,
 *   enrollmentId?: string,
 *   conditionPresetId?: string,
 *   responses: { [metricDefinitionId: string]: any },
 *   notes?: string
 * }
 */
router.post('/', createAssessment);

/**
 * Get assessment by ID
 * GET /api/assessments/:id
 */
router.get('/:id', getAssessmentById);

/**
 * Get all assessments for a patient
 * GET /api/assessments/patient/:patientId
 */
router.get('/patient/:patientId', getAssessmentsByPatient);

module.exports = router;
