/**
 * Time Tracking Controller - Auto-Start/Stop Time Tracking (Phase 1a)
 *
 * Endpoints:
 * - POST /api/time-tracking/start - Start timer for patient
 * - POST /api/time-tracking/stop - Stop timer and create time log
 * - GET /api/time-tracking/active - Get active timer for patient
 * - GET /api/time-tracking/active/all - Get all active timers for user
 * - POST /api/time-tracking/cancel - Cancel timer without logging
 * - PATCH /api/time-tracking/adjust/:id - Adjust existing time log
 */

const timeTrackingService = require('../services/timeTrackingService');
const { body, param, validationResult } = require('express-validator');

/**
 * POST /api/time-tracking/start
 * Start timer for patient engagement
 */
const startTimer = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('activity').optional().isString(),
  body('source').optional().isIn(['alert', 'task', 'manual']),
  body('sourceId').optional().isString(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { patientId, activity, source, sourceId } = req.body;
    const userId = req.user.id;

    try {
      const result = await timeTrackingService.startTimer({
        userId,
        patientId,
        activity,
        source,
        sourceId
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error starting timer:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to start timer',
        error: error.message
      });
    }
  }
];

/**
 * POST /api/time-tracking/stop
 * Stop timer and create time log
 */
const stopTimer = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('clinicianId').notEmpty().withMessage('Clinician ID is required'),
  body('cptCode').optional().isString(),
  body('notes').optional().isString(),
  body('billable').optional().isBoolean(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { patientId, clinicianId, cptCode, notes, billable } = req.body;
    const userId = req.user.id;
    const organizationId = req.user.currentOrganization; // Extract organization from authenticated user

    try {
      const result = await timeTrackingService.stopTimer({
        userId,
        patientId,
        clinicianId,
        organizationId, // Pass organization ID for billing enrollment lookup
        cptCode,
        notes,
        billable: billable !== false // Default true
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error stopping timer:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to stop timer',
        error: error.message
      });
    }
  }
];

/**
 * GET /api/time-tracking/active?patientId=xxx
 * Get active timer for specific patient
 */
const getActiveTimer = async (req, res) => {
  const { patientId } = req.query;
  const userId = req.user.id;

  if (!patientId) {
    return res.status(400).json({
      success: false,
      message: 'Patient ID is required'
    });
  }

  try {
    const result = timeTrackingService.getActiveTimer(userId, patientId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting active timer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get active timer',
      error: error.message
    });
  }
};

/**
 * GET /api/time-tracking/active/all
 * Get all active timers for current user
 */
const getAllActiveTimers = async (req, res) => {
  const userId = req.user.id;

  try {
    const timers = timeTrackingService.getUserActiveTimers(userId);
    return res.status(200).json({ success: true, data: timers });
  } catch (error) {
    console.error('Error getting active timers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get active timers',
      error: error.message
    });
  }
};

/**
 * POST /api/time-tracking/cancel
 * Cancel timer without creating time log
 */
const cancelTimer = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { patientId } = req.body;
    const userId = req.user.id;

    try {
      const result = timeTrackingService.cancelTimer(userId, patientId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error cancelling timer:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel timer',
        error: error.message
      });
    }
  }
];

/**
 * PATCH /api/time-tracking/adjust/:id
 * Adjust existing time log (manual correction)
 */
const adjustTimeLog = [
  param('id').notEmpty().withMessage('Time log ID is required'),
  body('duration').notEmpty().isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
  body('notes').optional().isString(),
  body('cptCode').optional().isString(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { duration, notes, cptCode } = req.body;
    const userId = req.user.id;

    try {
      const result = await timeTrackingService.adjustTimeLog({
        timeLogId: id,
        duration,
        notes,
        cptCode,
        userId
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error adjusting time log:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to adjust time log',
        error: error.message
      });
    }
  }
];

module.exports = {
  startTimer,
  stopTimer,
  getActiveTimer,
  getAllActiveTimers,
  cancelTimer,
  adjustTimeLog
};
