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
  createPatient
);

// Get all patients with pagination and search
router.get('/', 
  ...commonValidations.pagination,
  customValidations.validateDateRange,
  handleValidationErrors,
  getAllPatients  // Changed from getPatients to getAllPatients
);

// Get patient statistics by ID
router.get('/:id/stats', 
  getPatientStats
);

// Get patient by ID
router.get('/:id', 
  getPatientById
);

// Update patient by ID
router.put('/:id', 
  strictLimiter,
  updatePatient
);

// Delete patient by ID
router.delete('/:id', 
  strictLimiter,
  deletePatient
);

module.exports = router;