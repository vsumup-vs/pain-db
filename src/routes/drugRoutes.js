const express = require('express');
const router = express.Router();
const {
  getDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  deleteDrug,
  getDrugClasses
} = require('../controllers/drugController');

// Drug routes
router.get('/', getDrugs);
router.get('/classes', getDrugClasses);
router.get('/:id', getDrugById);
router.post('/', createDrug);
router.put('/:id', updateDrug);
router.delete('/:id', deleteDrug);

module.exports = router;