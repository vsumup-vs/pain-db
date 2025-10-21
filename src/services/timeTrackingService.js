/**
 * Time Tracking Service - Auto-Start/Stop Time Tracking (Phase 1a)
 *
 * Features:
 * - Automatic timer start when engaging with patient
 * - Timer state management in-memory (per user session)
 * - "Stop & Document" workflow for time log creation
 * - Optional manual time adjustments
 *
 * Success Metric: >90% of clinical time captured automatically
 */

const { PrismaClient } = require('@prisma/client');
const { findBillingEnrollment } = require('../utils/billingHelpers');
const prisma = new PrismaClient();

// In-memory timer storage (keyed by userId-patientId)
// In production, consider Redis for distributed systems
const activeTimers = new Map();

/**
 * Timer State Structure:
 * {
 *   userId: string,
 *   patientId: string,
 *   startedAt: Date,
 *   activity: string (default: 'Patient engagement'),
 *   source: 'alert' | 'task' | 'manual',
 *   sourceId: string (alertId or taskId)
 * }
 */

/**
 * Generate unique timer key
 */
function getTimerKey(userId, patientId) {
  return `${userId}:${patientId}`;
}

/**
 * Auto-start timer when user engages with patient
 * Triggers: Alert claim, task start, manual start
 */
async function startTimer({ userId, patientId, activity = 'Patient engagement', source = 'manual', sourceId = null }) {
  const timerKey = getTimerKey(userId, patientId);

  // Check if timer already running
  if (activeTimers.has(timerKey)) {
    const existing = activeTimers.get(timerKey);
    return {
      success: false,
      message: 'Timer already running for this patient',
      timer: existing
    };
  }

  // Create new timer
  const timer = {
    userId,
    patientId,
    startedAt: new Date(),
    activity,
    source, // 'alert', 'task', 'manual'
    sourceId
  };

  activeTimers.set(timerKey, timer);

  return {
    success: true,
    message: 'Timer started successfully',
    timer
  };
}

/**
 * Stop timer and create TimeLog entry
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.patientId - Patient ID
 * @param {string} params.clinicianId - Clinician ID
 * @param {string} params.organizationId - Organization ID (required for billing enrollment lookup)
 * @param {string} params.enrollmentId - Optional enrollment ID (if not provided, will auto-detect)
 * @param {string} params.cptCode - CPT code for billing
 * @param {string} params.notes - Notes for time log
 * @param {boolean} params.billable - Whether this time is billable
 */
async function stopTimer({ userId, patientId, clinicianId, organizationId, enrollmentId = null, cptCode = null, notes = '', billable = true }) {
  const timerKey = getTimerKey(userId, patientId);

  // Check if timer exists
  if (!activeTimers.has(timerKey)) {
    return {
      success: false,
      message: 'No active timer found for this patient'
    };
  }

  const timer = activeTimers.get(timerKey);
  const endTime = new Date();
  const durationMs = endTime - timer.startedAt;
  const durationMinutes = Math.round(durationMs / 60000); // Convert to minutes

  // Minimum 1 minute
  const finalDuration = Math.max(1, durationMinutes);

  // Create TimeLog entry
  try {
    // Auto-detect billing enrollment if not provided
    let finalEnrollmentId = enrollmentId;
    if (!finalEnrollmentId && organizationId) {
      finalEnrollmentId = await findBillingEnrollment(patientId, organizationId);
    }

    // Convert CPT code string to enum format if provided
    let cptCodeEnum = null;
    if (cptCode) {
      cptCodeEnum = `CODE_${cptCode}`;
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        patientId,
        clinicianId,
        enrollmentId: finalEnrollmentId, // Link to billing enrollment for accurate billing
        activity: timer.activity,
        duration: finalDuration,
        cptCode: cptCodeEnum, // Use enum format
        notes,
        billable,
        loggedAt: timer.startedAt,
        autoStarted: true, // Mark as auto-started
        source: 'AUTO', // Source is AUTO
        startedAt: timer.startedAt // Track original start time
      }
    });

    // Remove timer from active timers
    activeTimers.delete(timerKey);

    return {
      success: true,
      message: 'Timer stopped and time logged successfully',
      timeLog,
      duration: finalDuration
    };
  } catch (error) {
    console.error('Error creating time log:', error);
    return {
      success: false,
      message: 'Failed to create time log',
      error: error.message
    };
  }
}

/**
 * Get active timer for user-patient pair
 */
function getActiveTimer(userId, patientId) {
  const timerKey = getTimerKey(userId, patientId);
  const timer = activeTimers.get(timerKey);

  if (!timer) {
    return { active: false };
  }

  // Calculate elapsed time
  const now = new Date();
  const elapsedMs = now - timer.startedAt;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);

  return {
    active: true,
    timer,
    elapsed: {
      minutes: elapsedMinutes,
      seconds: elapsedSeconds,
      totalMinutes: Math.round(elapsedMs / 60000)
    }
  };
}

/**
 * Get all active timers for a user (across all patients)
 */
function getUserActiveTimers(userId) {
  const userTimers = [];

  for (const [key, timer] of activeTimers.entries()) {
    if (timer.userId === userId) {
      const now = new Date();
      const elapsedMs = now - timer.startedAt;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      userTimers.push({
        ...timer,
        elapsedMinutes
      });
    }
  }

  return userTimers;
}

/**
 * Cancel active timer without creating time log
 */
function cancelTimer(userId, patientId) {
  const timerKey = getTimerKey(userId, patientId);

  if (!activeTimers.has(timerKey)) {
    return {
      success: false,
      message: 'No active timer found'
    };
  }

  activeTimers.delete(timerKey);

  return {
    success: true,
    message: 'Timer cancelled successfully'
  };
}

/**
 * Manually adjust time log (after creation)
 * Source changes to 'ADJUSTED'
 */
async function adjustTimeLog({ timeLogId, duration, notes, cptCode, userId }) {
  try {
    // Check if time log exists
    const existingLog = await prisma.timeLog.findUnique({
      where: { id: timeLogId }
    });

    if (!existingLog) {
      return {
        success: false,
        message: 'Time log not found'
      };
    }

    // Update time log with adjustment
    const updated = await prisma.timeLog.update({
      where: { id: timeLogId },
      data: {
        duration,
        notes: notes || existingLog.notes,
        cptCode: cptCode || existingLog.cptCode,
        source: 'ADJUSTED' // Mark as manually adjusted
      }
    });

    // Create audit log for adjustment
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TIME_LOG_ADJUSTED',
        resource: 'TimeLog',
        resourceId: timeLogId,
        oldValues: {
          duration: existingLog.duration,
          notes: existingLog.notes,
          cptCode: existingLog.cptCode
        },
        newValues: {
          duration,
          notes,
          cptCode
        },
        hipaaRelevant: true
      }
    });

    return {
      success: true,
      message: 'Time log adjusted successfully',
      timeLog: updated
    };
  } catch (error) {
    console.error('Error adjusting time log:', error);
    return {
      success: false,
      message: 'Failed to adjust time log',
      error: error.message
    };
  }
}

/**
 * Cleanup stale timers (timers running > 12 hours)
 * Should be run periodically via cron job
 */
function cleanupStaleTimers() {
  const staleThreshold = 12 * 60 * 60 * 1000; // 12 hours in ms
  const now = new Date();
  let cleanedCount = 0;

  for (const [key, timer] of activeTimers.entries()) {
    const elapsed = now - timer.startedAt;
    if (elapsed > staleThreshold) {
      activeTimers.delete(key);
      cleanedCount++;
      console.log(`Cleaned up stale timer: ${key} (elapsed: ${Math.round(elapsed / 3600000)} hours)`);
    }
  }

  return {
    success: true,
    message: `Cleaned up ${cleanedCount} stale timers`,
    count: cleanedCount
  };
}

module.exports = {
  startTimer,
  stopTimer,
  getActiveTimer,
  getUserActiveTimers,
  cancelTimer,
  adjustTimeLog,
  cleanupStaleTimers
};
