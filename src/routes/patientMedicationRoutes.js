const express = require('express');
const router = express.Router();
const {
  getPatientMedications,
  getPatientMedicationsById,
  createPatientMedication,
  updatePatientMedication,
  deactivatePatientMedication
} = require('../controllers/patientMedicationController');

// Patient medication routes
router.get('/', getPatientMedications);
router.get('/patient/:patientId', getPatientMedicationsById);
router.post('/', createPatientMedication);
router.put('/:id', updatePatientMedication);
router.patch('/:id/deactivate', deactivatePatientMedication);

module.exports = router;