/**
 * Time Tracking Routes - Auto-Start/Stop Time Tracking (Phase 1a)
 */

const express = require('express');
const router = express.Router();
const timeTrackingController = require('../controllers/timeTrackingController');

// Start timer
router.post('/start', timeTrackingController.startTimer);

// Stop timer and create time log
router.post('/stop', timeTrackingController.stopTimer);

// Get active timer for specific patient
router.get('/active', timeTrackingController.getActiveTimer);

// Get all active timers for current user
router.get('/active/all', timeTrackingController.getAllActiveTimers);

// Cancel timer without logging
router.post('/cancel', timeTrackingController.cancelTimer);

// Adjust existing time log
router.patch('/adjust/:id', timeTrackingController.adjustTimeLog);

module.exports = router;
