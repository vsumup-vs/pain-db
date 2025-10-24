const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();

/**
 * Assessment Scheduler Service
 *
 * Background service that:
 * 1. Checks for overdue assessments and updates their status
 * 2. Creates recurring scheduled assessments based on frequency
 * 3. Sends notification reminders (future: integrate with notification service)
 */

// Store active cron jobs for graceful shutdown
const activeJobs = [];

/**
 * Check for overdue assessments and update their status
 * Runs every 30 minutes
 */
const checkOverdueAssessments = async () => {
  try {
    console.log('[AssessmentScheduler] Checking for overdue assessments...');

    const now = new Date();

    // Find all assessments that are past their due date but still PENDING or IN_PROGRESS
    const overdueAssessments = await prisma.scheduledAssessment.updateMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: {
          lt: now
        }
      },
      data: {
        status: 'OVERDUE'
      }
    });

    if (overdueAssessments.count > 0) {
      console.log(`[AssessmentScheduler] Marked ${overdueAssessments.count} assessments as OVERDUE`);
    }

    return overdueAssessments.count;
  } catch (error) {
    console.error('[AssessmentScheduler] Error checking overdue assessments:', error);
    return 0;
  }
};

/**
 * Create next scheduled assessment for recurring assessments
 * Called when an assessment is completed
 */
const scheduleNextRecurringAssessment = async (completedScheduledAssessmentId) => {
  try {
    const completedAssessment = await prisma.scheduledAssessment.findUnique({
      where: { id: completedScheduledAssessmentId },
      include: {
        enrollment: true
      }
    });

    if (!completedAssessment) {
      console.error('[AssessmentScheduler] Completed assessment not found');
      return null;
    }

    // Only create next assessment if frequency is not AS_NEEDED
    if (completedAssessment.frequency === 'AS_NEEDED') {
      console.log('[AssessmentScheduler] Skipping recurring schedule for AS_NEEDED assessment');
      return null;
    }

    // Calculate next due date based on frequency
    const nextDueDate = calculateNextDueDate(completedAssessment.dueDate, completedAssessment.frequency);

    // Check if enrollment is still active
    if (completedAssessment.enrollment.status !== 'ACTIVE') {
      console.log('[AssessmentScheduler] Skipping recurring schedule - enrollment is not active');
      return null;
    }

    // Create next scheduled assessment
    const nextAssessment = await prisma.scheduledAssessment.create({
      data: {
        organizationId: completedAssessment.organizationId,
        patientId: completedAssessment.patientId,
        enrollmentId: completedAssessment.enrollmentId,
        templateId: completedAssessment.templateId,
        conditionPresetId: completedAssessment.conditionPresetId,
        frequency: completedAssessment.frequency,
        dueDate: nextDueDate,
        scheduledBy: completedAssessment.scheduledBy,
        priority: completedAssessment.priority,
        isRequired: completedAssessment.isRequired,
        status: 'PENDING'
      }
    });

    console.log(`[AssessmentScheduler] Created next recurring assessment (ID: ${nextAssessment.id}) due ${nextDueDate.toISOString()}`);

    return nextAssessment;
  } catch (error) {
    console.error('[AssessmentScheduler] Error scheduling next recurring assessment:', error);
    return null;
  }
};

/**
 * Calculate next due date based on frequency
 * If the calculated date is in the past (patient completed late),
 * it catches up to today + interval instead of creating an overdue assessment
 */
const calculateNextDueDate = (currentDueDate, frequency) => {
  const nextDate = new Date(currentDueDate);
  const now = new Date();

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'BIWEEKLY':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'AS_NEEDED':
      // No automatic next date
      return null;
    default:
      console.warn(`[AssessmentScheduler] Unknown frequency: ${frequency}`);
      return null;
  }

  // If calculated date is in the past, catch up to current date + interval
  if (nextDate < now) {
    console.log(`[AssessmentScheduler] Calculated due date ${nextDate.toISOString()} is in the past. Catching up to current date + interval.`);

    const catchUpDate = new Date(now);

    switch (frequency) {
      case 'DAILY':
        catchUpDate.setDate(catchUpDate.getDate() + 1);
        break;
      case 'WEEKLY':
        catchUpDate.setDate(catchUpDate.getDate() + 7);
        break;
      case 'BIWEEKLY':
        catchUpDate.setDate(catchUpDate.getDate() + 14);
        break;
      case 'MONTHLY':
        catchUpDate.setMonth(catchUpDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        catchUpDate.setMonth(catchUpDate.getMonth() + 3);
        break;
    }

    console.log(`[AssessmentScheduler] Next assessment rescheduled to ${catchUpDate.toISOString()}`);
    return catchUpDate;
  }

  return nextDate;
};

/**
 * Send reminder notifications for upcoming assessments
 * Runs daily at 8 AM
 */
const sendAssessmentReminders = async () => {
  try {
    console.log('[AssessmentScheduler] Checking for assessments needing reminders...');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find assessments due within 24 hours that haven't been notified recently
    const upcomingAssessments = await prisma.scheduledAssessment.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: {
          lte: tomorrow
        },
        OR: [
          { lastNotificationAt: null },
          {
            lastNotificationAt: {
              lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Not notified in last 24 hours
            }
          }
        ]
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        template: {
          select: {
            name: true
          }
        },
        enrollment: {
          select: {
            careProgram: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    let sentCount = 0;

    for (const assessment of upcomingAssessments) {
      // TODO: Integrate with notification service
      // For now, just update the notification counter
      await prisma.scheduledAssessment.update({
        where: { id: assessment.id },
        data: {
          notificationsSent: assessment.notificationsSent + 1,
          lastNotificationAt: now
        }
      });

      console.log(`[AssessmentScheduler] Reminder: ${assessment.patient.firstName} ${assessment.patient.lastName} - ${assessment.template.name} (Due: ${assessment.dueDate.toLocaleDateString()})`);

      sentCount++;
    }

    if (sentCount > 0) {
      console.log(`[AssessmentScheduler] Sent ${sentCount} assessment reminders`);
    }

    return sentCount;
  } catch (error) {
    console.error('[AssessmentScheduler] Error sending assessment reminders:', error);
    return 0;
  }
};

/**
 * Initialize assessment scheduler with cron jobs
 */
const initializeScheduler = () => {
  console.log('[AssessmentScheduler] Initializing assessment scheduler...');

  // Check for overdue assessments every 30 minutes
  const overdueJob = cron.schedule('*/30 * * * *', async () => {
    await checkOverdueAssessments();
  });
  activeJobs.push(overdueJob);

  // Send reminders daily at 8 AM
  const reminderJob = cron.schedule('0 8 * * *', async () => {
    await sendAssessmentReminders();
  });
  activeJobs.push(reminderJob);

  // Run overdue check immediately on startup
  setTimeout(async () => {
    await checkOverdueAssessments();
  }, 5000);

  console.log('[AssessmentScheduler] Scheduler initialized successfully');
  console.log('[AssessmentScheduler] - Overdue check: Every 30 minutes');
  console.log('[AssessmentScheduler] - Reminder notifications: Daily at 8 AM');
};

/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
const stopScheduledJobs = () => {
  console.log('[AssessmentScheduler] Stopping scheduled jobs...');
  activeJobs.forEach(job => job.stop());
  activeJobs.length = 0;
  console.log('[AssessmentScheduler] All jobs stopped');
};

/**
 * Manually trigger overdue check (for testing)
 */
const manualOverdueCheck = async () => {
  console.log('[AssessmentScheduler] Manual overdue check triggered');
  return await checkOverdueAssessments();
};

/**
 * Manually trigger reminder notifications (for testing)
 */
const manualReminderCheck = async () => {
  console.log('[AssessmentScheduler] Manual reminder check triggered');
  return await sendAssessmentReminders();
};

/**
 * Get scheduler statistics
 */
const getSchedulerStats = async () => {
  try {
    const [pending, overdue, inProgress, completed, cancelled] = await Promise.all([
      prisma.scheduledAssessment.count({ where: { status: 'PENDING' } }),
      prisma.scheduledAssessment.count({ where: { status: 'OVERDUE' } }),
      prisma.scheduledAssessment.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.scheduledAssessment.count({ where: { status: 'COMPLETED' } }),
      prisma.scheduledAssessment.count({ where: { status: 'CANCELLED' } })
    ]);

    return {
      pending,
      overdue,
      inProgress,
      completed,
      cancelled,
      total: pending + overdue + inProgress + completed + cancelled
    };
  } catch (error) {
    console.error('[AssessmentScheduler] Error getting scheduler stats:', error);
    return null;
  }
};

/**
 * Create initial scheduled assessments when patient is enrolled in care program
 * Called after enrollment creation to automatically schedule assessments based on condition preset
 *
 * @param {string} enrollmentId - The enrollment ID
 * @param {string} conditionPresetId - The condition preset ID
 * @param {string} scheduledBy - Clinician ID who created the enrollment
 * @returns {Promise<Array>} Array of created scheduled assessments
 */
const scheduleInitialAssessments = async (enrollmentId, conditionPresetId, scheduledBy) => {
  try {
    console.log(`[AssessmentScheduler] Creating initial assessments for enrollment ${enrollmentId}`);

    // Get enrollment details
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        careProgram: true,
        patient: true
      }
    });

    if (!enrollment) {
      console.error('[AssessmentScheduler] Enrollment not found');
      return [];
    }

    // Get condition preset with assessment templates
    const preset = await prisma.conditionPreset.findUnique({
      where: { id: conditionPresetId },
      include: {
        templates: {
          include: {
            template: true
          }
        }
      }
    });

    if (!preset || !preset.templates || preset.templates.length === 0) {
      console.log('[AssessmentScheduler] No assessment templates found in condition preset');
      return [];
    }

    // Get default frequency from care program settings or use WEEKLY as default
    // Ensure uppercase to match Prisma enum (DAILY, WEEKLY, etc.)
    const defaultFrequency = (enrollment.careProgram?.settings?.assessmentFrequency || 'WEEKLY').toUpperCase();

    // Calculate initial due date (tomorrow at 9 AM)
    const initialDueDate = new Date();
    initialDueDate.setDate(initialDueDate.getDate() + 1);
    initialDueDate.setHours(9, 0, 0, 0);

    // Create scheduled assessment for each template
    const createdAssessments = [];

    for (const presetTemplate of preset.templates) {
      try {
        const scheduledAssessment = await prisma.scheduledAssessment.create({
          data: {
            organizationId: enrollment.organizationId,
            patientId: enrollment.patientId,
            enrollmentId: enrollment.id,
            templateId: presetTemplate.template.id,
            conditionPresetId: preset.id,
            frequency: defaultFrequency,
            dueDate: initialDueDate,
            scheduledBy: scheduledBy,
            priority: presetTemplate.isRequired ? 1 : 0,
            isRequired: presetTemplate.isRequired || true,
            status: 'PENDING',
            notes: `Initial assessment for ${enrollment.careProgram.name} enrollment`
          },
          include: {
            template: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        createdAssessments.push(scheduledAssessment);

        console.log(
          `[AssessmentScheduler] Created scheduled assessment: ${scheduledAssessment.template.name} (${scheduledAssessment.frequency}) due ${initialDueDate.toISOString()}`
        );
      } catch (error) {
        console.error(
          `[AssessmentScheduler] Failed to create scheduled assessment for template ${presetTemplate.template.id}:`,
          error
        );
        // Continue with other templates even if one fails
      }
    }

    console.log(
      `[AssessmentScheduler] Successfully created ${createdAssessments.length} scheduled assessments for enrollment ${enrollmentId}`
    );

    return createdAssessments;
  } catch (error) {
    console.error('[AssessmentScheduler] Error scheduling initial assessments:', error);
    return [];
  }
};

module.exports = {
  initializeScheduler,
  stopScheduledJobs,
  checkOverdueAssessments,
  scheduleNextRecurringAssessment,
  calculateNextDueDate,
  sendAssessmentReminders,
  manualOverdueCheck,
  manualReminderCheck,
  getSchedulerStats,
  scheduleInitialAssessments
};
