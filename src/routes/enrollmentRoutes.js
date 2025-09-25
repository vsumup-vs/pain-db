const express = require('express');
const router = express.Router();
const {
  enrollmentValidations,
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
  createEnrollment,
  createBulkEnrollments,
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
router.post('/bulk-create', createBulkEnrollments);
router.get('/', getAllEnrollments);
router.get('/stats', getEnrollmentStats);
router.get('/:id', getEnrollmentById);
router.put('/:id', updateEnrollment);
router.delete('/:id', deleteEnrollment);
router.put('/:id/deactivate', deactivateEnrollment);
router.patch('/:id/transfer', transferEnrollment);

module.exports = router;