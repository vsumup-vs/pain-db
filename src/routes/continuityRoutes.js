/**
 * Smart Assessment Continuity Routes
 * 
 * Routes for the Smart Assessment Continuity System (Phase 1)
 */

const express = require('express');
const router = express.Router();
const EnhancedAssessmentController = require('../controllers/enhancedAssessmentController');
const EnhancedObservationController = require('../controllers/enhancedObservationController');

// Initialize controllers
const assessmentController = new EnhancedAssessmentController();
const observationController = new EnhancedObservationController();

// Assessment continuity routes
router.post('/assessments/with-continuity', 
  assessmentController.createAssessmentWithContinuity.bind(assessmentController)
);

router.get('/patients/:patientId/continuity-suggestions', 
  assessmentController.getContinuitySuggestions.bind(assessmentController)
);

router.get('/patients/:patientId/continuity-history', 
  assessmentController.getContinuityHistory.bind(assessmentController)
);

// Observation context routes
router.post('/observations/with-context', 
  observationController.createObservationWithContext.bind(observationController)
);

router.get('/patients/:patientId/observations/context', 
  observationController.getObservationsWithContext.bind(observationController)
);

router.patch('/observations/:observationId/review', 
  observationController.updateProviderReview.bind(observationController)
);

module.exports = router;