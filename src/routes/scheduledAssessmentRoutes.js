const express = require('express');
const router = express.Router();
const scheduledAssessmentController = require('../controllers/scheduledAssessmentController');

/**
 * Scheduled Assessment Management Routes
 *
 * All routes require authentication and organization context
 */

// Get all scheduled assessments with filtering
// Query params: status, patientId, enrollmentId, priority, overdue, page, limit
// Example: GET /api/scheduled-assessments?status=PENDING&overdue=true&page=1&limit=50
router.get(
  '/',
  scheduledAssessmentController.getAllScheduledAssessments
);

// Get single scheduled assessment by ID
// Example: GET /api/scheduled-assessments/sched-123
router.get(
  '/:id',
  scheduledAssessmentController.getScheduledAssessmentById
);

// Get pending assessments for a specific patient
// Example: GET /api/scheduled-assessments/patient/patient-123/pending
router.get(
  '/patient/:patientId/pending',
  scheduledAssessmentController.getPendingAssessmentsForPatient
);

// Create new scheduled assessment
// Body: { patientId, enrollmentId, templateId, conditionPresetId, frequency, dueDate, priority, isRequired, notes }
// Example: POST /api/scheduled-assessments
router.post(
  '/',
  scheduledAssessmentController.createScheduledAssessment
);

// Update scheduled assessment
// Body: { frequency, dueDate, priority, isRequired, notes, status }
// Example: PUT /api/scheduled-assessments/sched-123
router.put(
  '/:id',
  scheduledAssessmentController.updateScheduledAssessment
);

// Start scheduled assessment (mark as IN_PROGRESS)
// Example: POST /api/scheduled-assessments/sched-123/start
router.post(
  '/:id/start',
  scheduledAssessmentController.startScheduledAssessment
);

// Complete scheduled assessment (link to actual Assessment)
// Body: { assessmentId }
// Example: POST /api/scheduled-assessments/sched-123/complete
router.post(
  '/:id/complete',
  scheduledAssessmentController.completeScheduledAssessment
);

// Cancel scheduled assessment
// Body: { reason } (optional)
// Example: POST /api/scheduled-assessments/sched-123/cancel
router.post(
  '/:id/cancel',
  scheduledAssessmentController.cancelScheduledAssessment
);

// Delete scheduled assessment (only if not completed)
// Example: DELETE /api/scheduled-assessments/sched-123
router.delete(
  '/:id',
  scheduledAssessmentController.deleteScheduledAssessment
);

module.exports = router;
