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
router.post('/', observationValidations.create, customValidations.validateMetricValue, handleValidationErrors, createObservation);
router.get('/', commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getAllObservations);
router.get('/stats', getObservationStats);
router.post('/bulk', observationValidations.bulk, handleValidationErrors, bulkCreateObservations);
router.get('/:id', commonValidations.id, handleValidationErrors, getObservationById);
router.put('/:id', commonValidations.id, observationValidations.update, customValidations.validateMetricValue, handleValidationErrors, updateObservation);
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteObservation);

// Patient-specific routes
router.get('/patient/:patientId/history', commonValidations.id, commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getPatientObservationHistory);

// Enrollment-specific routes
router.get('/enrollment/:enrollmentId', commonValidations.id, commonValidations.pagination, commonValidations.dateRange, handleValidationErrors, getObservationsByEnrollment);

module.exports = router;