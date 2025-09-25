const express = require('express');
const router = express.Router();
const {
  createPatient,
  getAllPatients,  // Changed from getPatients to getAllPatients
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientStats,
  getGeneralPatientStats,
  getRecentPatients
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

// Get general patient statistics (for dashboard)
router.get('/stats', 
  getGeneralPatientStats
);

// Get recent patients (optimized for dashboard)
router.get('/recent', 
  getRecentPatients
);

// Get patient statistics by ID
router.get('/:id/stats', 
  getPatientStats
);

// Get patient by ID
router.get('/:id', 
  getPatientById
);

// Update patient
router.put('/:id', 
  strictLimiter,
  updatePatient
);

// Delete patient
router.delete('/:id', 
  strictLimiter,
  deletePatient
);

module.exports = router;