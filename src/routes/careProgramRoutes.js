const express = require('express');
const router = express.Router();
const {
  getAllCarePrograms,
  getCareProgramById,
  createCareProgram,
  updateCareProgram,
  deleteCareProgram,
  getCareProgramStats
} = require('../controllers/careProgramController');

/**
 * Care Programs Routes
 *
 * All routes require authentication and organization context
 * (middleware applied in index.js)
 */

// GET /api/care-programs/stats - Get statistics
router.get('/stats', getCareProgramStats);

// GET /api/care-programs - Get all care programs for organization
router.get('/', getAllCarePrograms);

// GET /api/care-programs/:id - Get care program by ID
router.get('/:id', getCareProgramById);

// POST /api/care-programs - Create new care program
router.post('/', createCareProgram);

// PUT /api/care-programs/:id - Update care program
router.put('/:id', updateCareProgram);

// DELETE /api/care-programs/:id - Delete care program
router.delete('/:id', deleteCareProgram);

module.exports = router;
