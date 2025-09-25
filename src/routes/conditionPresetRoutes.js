const express = require('express');
const router = express.Router();
const {
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
  getAllConditionPresets,
  getConditionPresetById,
  createConditionPreset,
  updateConditionPreset,
  deleteConditionPreset,
  getConditionPresetStats
} = require('../controllers/conditionPresetController');

// Condition preset CRUD routes
router.get('/', commonValidations.pagination, handleValidationErrors, getAllConditionPresets);
router.get('/stats', getConditionPresetStats);
router.get('/:id', commonValidations.id, handleValidationErrors, getConditionPresetById);
router.post('/', createConditionPreset);
router.put('/:id', commonValidations.id, handleValidationErrors, updateConditionPreset);
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteConditionPreset);

module.exports = router;