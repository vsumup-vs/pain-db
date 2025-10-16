const express = require('express');
const {
  getEncounterNotes,
  getEncounterNote,
  createEncounterNote,
  updateEncounterNote,
  attestEncounterNote,
  deleteEncounterNote
} = require('../controllers/encounterNoteController');

const router = express.Router();

/**
 * Encounter Note Routes
 *
 * Smart documentation templates with auto-population
 * SOAP format encounter notes with attestation workflow
 *
 * Phase 1a: Workflow Optimizer - Task 4
 */

// GET /api/encounter-notes - Get all encounter notes with filtering
router.get('/', getEncounterNotes);

// GET /api/encounter-notes/:id - Get single encounter note
router.get('/:id', getEncounterNote);

// POST /api/encounter-notes - Create new encounter note with auto-population
router.post('/', createEncounterNote);

// PUT /api/encounter-notes/:id - Update encounter note (only if not locked)
router.put('/:id', updateEncounterNote);

// POST /api/encounter-notes/:id/attest - Attest and lock encounter note
router.post('/:id/attest', attestEncounterNote);

// DELETE /api/encounter-notes/:id - Delete encounter note (only if not locked)
router.delete('/:id', deleteEncounterNote);

module.exports = router;
