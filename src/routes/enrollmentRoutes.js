const express = require('express');
const router = express.Router();
const {
  enrollmentValidations,
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  deactivateEnrollment,
  transferEnrollment,
  getEnrollmentStats
} = require('../controllers/enrollmentController');

// Enrollment CRUD routes with validation
router.post('/', enrollmentValidations.create, handleValidationErrors, createEnrollment);
router.get('/', getAllEnrollments);
router.get('/stats', getEnrollmentStats);
router.get('/:id', commonValidations.id, handleValidationErrors, getEnrollmentById);
router.put('/:id', commonValidations.id, enrollmentValidations.update, handleValidationErrors, updateEnrollment);
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteEnrollment);
router.put('/:id/deactivate', commonValidations.id, handleValidationErrors, deactivateEnrollment);
router.patch('/:id/transfer', commonValidations.id, handleValidationErrors, transferEnrollment);

module.exports = router;