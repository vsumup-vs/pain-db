
const express = require('express');
const router = express.Router();
const {
  getAllAssessmentTemplates,
  getStandardizedTemplates,
  getCustomTemplates,
  getTemplateCategories,
  getTemplateById,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate
} = require('../controllers/assessmentTemplateController.enhanced');

// Enhanced routes with standardization support
router.get('/', getAllAssessmentTemplates);
router.get('/standardized', getStandardizedTemplates);
router.get('/custom', getCustomTemplates);
router.get('/categories', getTemplateCategories);
router.get('/:id', getTemplateById);

// CRUD operations
router.post('/', createAssessmentTemplate);
router.put('/:id', updateAssessmentTemplate);
router.delete('/:id', deleteAssessmentTemplate);

module.exports = router;
