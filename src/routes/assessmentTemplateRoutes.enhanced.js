
const express = require('express');
const router = express.Router();
const {
  getAllAssessmentTemplates,
  getStandardizedTemplates,
  getCustomTemplates,
  getTemplateCategories,
  getTemplateById
} = require('../controllers/assessmentTemplateController.enhanced');

// Enhanced routes with standardization support
router.get('/', getAllAssessmentTemplates);
router.get('/standardized', getStandardizedTemplates);
router.get('/custom', getCustomTemplates);
router.get('/categories', getTemplateCategories);
router.get('/:id', getTemplateById);

module.exports = router;
