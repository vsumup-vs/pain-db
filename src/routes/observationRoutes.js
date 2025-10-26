const express = require('express');
const router = express.Router();
const {
  observationValidations,
  commonValidations,
  handleValidationErrors,
  customValidations
} = require('../middleware/validation');
const {
  createObservation,
  getAllObservations,
  getObservationById,
  updateObservation,
  deleteObservation,
  getPatientObservationHistory,
  getObservationStats,
  bulkCreateObservations,
  getObservationsByEnrollment,
  // Review endpoints
  getUnreviewedObservations,
  reviewObservation,
  bulkReviewObservations,
  flagObservation
} = require('../controllers/observationController');

// Base routes with validation
router.post('/', createObservation);
router.get('/', commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getAllObservations);
router.get('/stats', getObservationStats);
router.post('/bulk', observationValidations.bulk, handleValidationErrors, bulkCreateObservations);
router.get('/:id', getObservationById);
router.put('/:id', updateObservation);
router.delete('/:id', deleteObservation);

// Patient-specific routes
router.get('/patient/:patientId/history', commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getPatientObservationHistory);

// Enrollment-specific routes
router.get('/enrollment/:enrollmentId', getObservationsByEnrollment);

// Review routes (RPM workflow)
router.get('/review/unreviewed', commonValidations.pagination, handleValidationErrors, getUnreviewedObservations);
router.post('/review/bulk', bulkReviewObservations);
router.post('/review/:id', reviewObservation);
router.post('/review/:id/flag', flagObservation);

module.exports = router;