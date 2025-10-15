const express = require('express');
const router = express.Router();
const {
  commonValidations,
  handleValidationErrors
} = require('../middleware/validation');
const {
  getAllAlertRules,
  getAlertRuleById,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getRuleTemplates,
  getAlertRuleStats,
  customizeRule
} = require('../controllers/alertRuleController');

// Alert rule CRUD routes
router.get('/', commonValidations.pagination, handleValidationErrors, getAllAlertRules);
router.get('/stats', getAlertRuleStats);
router.get('/templates', getRuleTemplates);
router.get('/:id', commonValidations.id, handleValidationErrors, getAlertRuleById);
router.post('/', createAlertRule);
router.post('/:id/customize', commonValidations.id, handleValidationErrors, customizeRule);
router.put('/:id', commonValidations.id, handleValidationErrors, updateAlertRule);
router.delete('/:id', commonValidations.id, handleValidationErrors, deleteAlertRule);

module.exports = router;