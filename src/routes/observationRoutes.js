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
  getObservationsByEnrollment
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

module.exports = router;