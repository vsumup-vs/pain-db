const express = require('express');
const router = express.Router();
const {
  clinicianValidations,
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
  createClinician,
  getAllClinicians,
  getClinicianById,
  updateClinician,
  deleteClinician,
  getClinicianStats,
  getOverallClinicianStats,
  getCliniciansBySpecialization
} = require('../controllers/clinicianController');

// Clinician CRUD routes with validation
// Note: Specific routes must come before parameterized routes
router.post('/', clinicianValidations.create, handleValidationErrors, createClinician);
router.get('/', commonValidations.pagination, handleValidationErrors, getAllClinicians);
router.get('/stats', getOverallClinicianStats);
router.get('/specialization/:specialization', getCliniciansBySpecialization);
router.get('/:id', getClinicianById);
router.get('/:id/stats', getClinicianStats);
router.put('/:id', clinicianValidations.update, handleValidationErrors, updateClinician);
router.delete('/:id', deleteClinician);

module.exports = router;