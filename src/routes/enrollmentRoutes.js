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
router.post('/', createEnrollment);
router.get('/', getAllEnrollments);
router.get('/stats', getEnrollmentStats);
router.get('/:id', getEnrollmentById);
router.put('/:id', updateEnrollment);
router.delete('/:id', deleteEnrollment);
router.put('/:id/deactivate', deactivateEnrollment);
router.patch('/:id/transfer', transferEnrollment);

module.exports = router;