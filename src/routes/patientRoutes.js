const express = require('express');
const router = express.Router();
const {
  createPatient,
  getAllPatients,  // Changed from getPatients to getAllPatients
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientStats
} = require('../controllers/patientController');

const {
  handleValidationErrors,
  commonValidations,
  patientValidations,
  customValidations
} = require('../middleware/validation');

const { sanitizeInput } = require('../middleware/sanitization');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiting');

// Apply general middleware
router.use(generalLimiter);
router.use(sanitizeInput);

// Create a new patient
router.post('/', 
  strictLimiter,
  ...patientValidations.create,
  customValidations.validateAge,
  handleValidationErrors,
  createPatient
);

// Get all patients with filtering and pagination
router.get('/', 
  ...commonValidations.pagination,
  customValidations.validateDateRange,
  handleValidationErrors,
  getAllPatients  // Changed from getPatients to getAllPatients
);

// Get patient statistics
router.get('/:id/stats', 
  commonValidations.id,
  handleValidationErrors,
  getPatientStats
);

// Get patient by ID
router.get('/:id', 
  commonValidations.id,
  handleValidationErrors,
  getPatientById
);

// Update patient
router.put('/:id', 
  strictLimiter,
  commonValidations.id,
  ...patientValidations.update,
  customValidations.validateAge,
  handleValidationErrors,
  updatePatient
);

// Delete patient
router.delete('/:id', 
  strictLimiter,
  commonValidations.id,
  handleValidationErrors,
  deletePatient
);

module.exports = router;