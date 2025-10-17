/**
 * Alert Scheduler Service (Phase 1a - Alert Evaluation Engine)
 *
 * Scheduled background jobs for:
 * - Hourly missed assessment checks
 * - Every 6 hours medication adherence checks
 * - Daily trend evaluation
 *
 * Uses node-cron for scheduling
 */

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { evaluateObservation, calculateSLABreachTime } = require('./alertEvaluationService');
const { calculateRiskScore, calculateMedicationAdherence } = require('./riskScoringService');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

// Track active scheduled jobs
const activeJobs = [];

/**
 * Start all scheduled alert evaluation jobs
 */
function startScheduledJobs() {
  console.log('🔄 Starting alert evaluation scheduled jobs...');

  // Job 1: Missed assessment checks (every hour)
  const missedAssessmentJob = cron.schedule('0 * * * *', async () => {
    try {
      console.log('⏰ Running missed assessment check...');
      const alertsCreated = await evaluateMissedAssessments();
      console.log(`✅ Missed assessment check complete: ${alertsCreated} alerts created`);
    } catch (error) {
      console.error('❌ Error in missed assessment check:', error);
    }
  }, {
    timezone: 'America/New_York' // Adjust based on deployment
  });

  // Job 2: Medication adherence checks (every 6 hours)
  const medicationAdherenceJob = cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('⏰ Running medication adherence check...');
      const alertsCreated = await evaluateMedicationAdherenceAlerts();
      console.log(`✅ Medication adherence check complete: ${alertsCreated} alerts created`);
    } catch (error) {
      console.error('❌ Error in medication adherence check:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  // Job 3: Daily trend evaluation (every day at 2 AM)
  const trendEvaluationJob = cron.schedule('0 2 * * *', async () => {
    try {
      console.log('⏰ Running daily trend evaluation...');
      const alertsCreated = await evaluateDailyTrends();
      console.log(`✅ Daily trend evaluation complete: ${alertsCreated} alerts created`);
    } catch (error) {
      console.error('❌ Error in daily trend evaluation:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  // Job 4: Stale alert cleanup (every day at 3 AM)
  const staleAlertCleanupJob = cron.schedule('0 3 * * *', async () => {
    try {
      console.log('⏰ Running stale alert cleanup...');
      const cleaned = await cleanupStaleAlerts();
      console.log(`✅ Stale alert cleanup complete: ${cleaned} alerts auto-resolved`);
    } catch (error) {
      console.error('❌ Error in stale alert cleanup:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  // Job 5: Assessment reminders (twice daily at 9 AM and 6 PM)
  const assessmentReminderJob = cron.schedule('0 9,18 * * *', async () => {
    try {
      console.log('⏰ Running assessment reminder check...');
      const remindersSent = await sendAssessmentReminders();
      console.log(`✅ Assessment reminders sent: ${remindersSent} reminders`);
    } catch (error) {
      console.error('❌ Error sending assessment reminders:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  // Job 6: Reactivate snoozed alerts (every 5 minutes)
  const reactivateSnoozedAlertsJob = cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('⏰ Checking for expired snoozed alerts...');
      const reactivated = await reactivateSnoozedAlerts();
      if (reactivated > 0) {
        console.log(`✅ Reactivated ${reactivated} snoozed alerts`);
      }
    } catch (error) {
      console.error('❌ Error reactivating snoozed alerts:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  // Job 7: Check SLA breaches and auto-escalate (every 1 minute) - Phase 1b
  const slaEscalationJob = cron.schedule('* * * * *', async () => {
    try {
      console.log('⏰ Checking for SLA breaches...');
      const escalated = await checkAndEscalateSLABreaches();
      if (escalated > 0) {
        console.log(`✅ Escalated ${escalated} alerts for SLA breach`);
      }
    } catch (error) {
      console.error('❌ Error checking SLA breaches:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  activeJobs.push(missedAssessmentJob, medicationAdherenceJob, trendEvaluationJob, staleAlertCleanupJob, assessmentReminderJob, reactivateSnoozedAlertsJob, slaEscalationJob);

  console.log('✅ All alert evaluation jobs scheduled:');
  console.log('  - Missed assessments: Every hour');
  console.log('  - Medication adherence: Every 6 hours');
  console.log('  - Trend evaluation: Daily at 2 AM');
  console.log('  - Stale alert cleanup: Daily at 3 AM');
  console.log('  - Assessment reminders: Twice daily at 9 AM and 6 PM');
  console.log('  - Reactivate snoozed alerts: Every 5 minutes');
  console.log('  - SLA breach escalation: Every minute');
}

/**
 * Stop all scheduled jobs
 */
function stopScheduledJobs() {
  console.log('🛑 Stopping alert evaluation scheduled jobs...');
  activeJobs.forEach(job => job.stop());
  activeJobs.length = 0;
  console.log('✅ All alert evaluation jobs stopped');
}

/**
 * Evaluate missed assessments for all active enrollments
 * Creates alerts for patients who haven't submitted required assessments
 */
async function evaluateMissedAssessments() {
  try {
    let alertsCreated = 0;

    // Get all active enrollments with their condition presets
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        patient: true,
        clinician: true,
        conditionPreset: {
          include: {
            templates: {
              include: {
                template: true
              }
            }
          }
        }
      }
    });

    // Get or create missed assessment alert rule
    const missedAssessmentRule = await getOrCreateMissedAssessmentAlertRule();

    for (const enrollment of enrollments) {
      if (!enrollment.conditionPreset || !enrollment.conditionPreset.templates.length) {
        continue;
      }

      // Check each required template
      for (const presetTemplate of enrollment.conditionPreset.templates) {
        if (!presetTemplate.isRequired) continue;

        const template = presetTemplate.template;

        // Parse frequency (e.g., "daily", "weekly", "monthly")
        const frequency = presetTemplate.frequency || 'weekly';
        const expectedHours = getExpectedHoursFromFrequency(frequency);

        // Get last assessment for this template
        const lastAssessment = await prisma.assessment.findFirst({
          where: {
            patientId: enrollment.patientId,
            templateId: template.id,
            completedAt: {
              not: null
            }
          },
          orderBy: {
            completedAt: 'desc'
          }
        });

        // Check if assessment is overdue
        const now = new Date();
        const lastCompletedAt = lastAssessment?.completedAt || enrollment.startDate;
        const hoursSinceLastAssessment = (now - new Date(lastCompletedAt)) / (1000 * 60 * 60);

        if (hoursSinceLastAssessment > expectedHours) {
          // Check if we already have a recent alert for this
          const recentAlert = await prisma.alert.findFirst({
            where: {
              patientId: enrollment.patientId,
              ruleId: missedAssessmentRule.id,
              status: 'PENDING',
              data: {
                path: ['templateId'],
                equals: template.id
              },
              triggeredAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          });

          if (!recentAlert) {
            // Calculate risk score
            const daysOverdue = Math.floor(hoursSinceLastAssessment / 24);
            const riskScore = Math.min(10, 5 + daysOverdue); // Base 5, +1 per day overdue

            // Create alert
            await prisma.alert.create({
              data: {
                organizationId: enrollment.organizationId,
                ruleId: missedAssessmentRule.id,
                patientId: enrollment.patientId,
                clinicianId: enrollment.clinicianId,
                severity: daysOverdue >= 3 ? 'HIGH' : daysOverdue >= 1 ? 'MEDIUM' : 'LOW',
                status: 'PENDING',
                message: `Missed ${template.name} assessment (${daysOverdue} days overdue)`,
                data: {
                  templateId: template.id,
                  templateName: template.name,
                  frequency,
                  lastCompletedAt,
                  daysOverdue,
                  enrollmentId: enrollment.id
                },
                riskScore,
                slaBreachTime: calculateSLABreachTime(daysOverdue >= 3 ? 'HIGH' : 'MEDIUM')
              }
            });

            alertsCreated++;
            console.log(`📋 Created missed assessment alert: ${template.name} for patient ${enrollment.patient.firstName} ${enrollment.patient.lastName} (${daysOverdue} days overdue)`);
          }
        }
      }
    }

    return alertsCreated;

  } catch (error) {
    console.error('Error evaluating missed assessments:', error);
    throw error;
  }
}

/**
 * Evaluate medication adherence for all active patients
 * Creates alerts for patients with low adherence rates
 */
async function evaluateMedicationAdherenceAlerts() {
  try {
    let alertsCreated = 0;

    // Get all active patient medications
    const activeMedications = await prisma.patientMedication.findMany({
      where: {
        isActive: true,
        endDate: {
          OR: [
            { equals: null },
            { gte: new Date() }
          ]
        }
      },
      include: {
        patient: {
          include: {
            enrollments: {
              where: {
                status: 'ACTIVE'
              },
              include: {
                clinician: true
              }
            }
          }
        },
        drug: true
      }
    });

    // Get or create medication adherence alert rule
    const adherenceRule = await getOrCreateMedicationAdherenceAlertRule();

    for (const medication of activeMedications) {
      // Calculate adherence for last 30 days
      const adherence = await calculateMedicationAdherence(medication.patientId, 30);

      if (adherence.overallAdherence < 80) { // Threshold: 80%
        // Check if we already have a recent alert
        const recentAlert = await prisma.alert.findFirst({
          where: {
            patientId: medication.patientId,
            ruleId: adherenceRule.id,
            status: 'PENDING',
            data: {
              path: ['medicationId'],
              equals: medication.id
            },
            triggeredAt: {
              gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // Last 48 hours
            }
          }
        });

        if (!recentAlert) {
          const primaryEnrollment = medication.patient.enrollments[0];

          // Calculate risk score based on adherence
          const riskScore = Math.max(3, Math.min(10, 10 - (adherence.overallAdherence / 10)));
          const severity = adherence.overallAdherence < 50 ? 'HIGH' : adherence.overallAdherence < 70 ? 'MEDIUM' : 'LOW';

          await prisma.alert.create({
            data: {
              organizationId: primaryEnrollment?.organizationId || medication.patient.organizationId,
              ruleId: adherenceRule.id,
              patientId: medication.patientId,
              clinicianId: primaryEnrollment?.clinicianId || null,
              severity,
              status: 'PENDING',
              message: `Low medication adherence: ${medication.drug.name} (${Math.round(adherence.overallAdherence)}%)`,
              data: {
                medicationId: medication.id,
                drugName: medication.drug.name,
                adherencePercentage: adherence.overallAdherence,
                dosagesMissed: adherence.totalDosesMissed,
                daysEvaluated: 30
              },
              riskScore,
              slaBreachTime: calculateSLABreachTime(severity)
            }
          });

          alertsCreated++;
          console.log(`💊 Created medication adherence alert: ${medication.drug.name} for patient ${medication.patient.firstName} ${medication.patient.lastName} (${Math.round(adherence.overallAdherence)}% adherence)`);
        }
      }
    }

    return alertsCreated;

  } catch (error) {
    console.error('Error evaluating medication adherence:', error);
    throw error;
  }
}

/**
 * Evaluate daily trends for all patients
 * Looks for concerning trends in vital signs over the past 7 days
 */
async function evaluateDailyTrends() {
  try {
    let alertsCreated = 0;

    // Get all active enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        patient: true,
        clinician: true
      }
    });

    // Get or create trend alert rule
    const trendRule = await getOrCreateTrendAlertRule();

    for (const enrollment of enrollments) {
      // Get observations from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentObservations = await prisma.observation.findMany({
        where: {
          patientId: enrollment.patientId,
          recordedAt: {
            gte: sevenDaysAgo
          }
        },
        include: {
          metric: true
        },
        orderBy: {
          recordedAt: 'asc'
        }
      });

      // Group by metric
      const observationsByMetric = {};
      for (const obs of recentObservations) {
        const metricKey = obs.metric.key;
        if (!observationsByMetric[metricKey]) {
          observationsByMetric[metricKey] = [];
        }
        observationsByMetric[metricKey].push(obs);
      }

      // Analyze trends for each metric
      for (const [metricKey, observations] of Object.entries(observationsByMetric)) {
        if (observations.length < 3) continue; // Need at least 3 points for trend

        const trend = calculateTrend(observations);

        if (trend.isConcerning) {
          // Check if we already have a recent alert for this metric
          const recentAlert = await prisma.alert.findFirst({
            where: {
              patientId: enrollment.patientId,
              ruleId: trendRule.id,
              status: 'PENDING',
              data: {
                path: ['metricKey'],
                equals: metricKey
              },
              triggeredAt: {
                gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // Last 48 hours
              }
            }
          });

          if (!recentAlert) {
            const metric = observations[0].metric;

            await prisma.alert.create({
              data: {
                organizationId: enrollment.organizationId,
                ruleId: trendRule.id,
                patientId: enrollment.patientId,
                clinicianId: enrollment.clinicianId,
                severity: trend.severity,
                status: 'PENDING',
                message: `Concerning ${trend.direction} trend in ${metric.displayName}`,
                data: {
                  metricKey,
                  metricName: metric.displayName,
                  trend: trend.direction,
                  changePercentage: trend.changePercentage,
                  dataPoints: observations.length,
                  earliestValue: trend.earliestValue,
                  latestValue: trend.latestValue
                },
                riskScore: trend.riskScore,
                slaBreachTime: calculateSLABreachTime(trend.severity)
              }
            });

            alertsCreated++;
            console.log(`📈 Created trend alert: ${metric.displayName} showing ${trend.direction} trend for patient ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
          }
        }
      }
    }

    return alertsCreated;

  } catch (error) {
    console.error('Error evaluating daily trends:', error);
    throw error;
  }
}

/**
 * Clean up stale alerts (older than 72 hours with no action)
 */
async function cleanupStaleAlerts() {
  try {
    const staleDate = new Date();
    staleDate.setHours(staleDate.getHours() - 72);

    const result = await prisma.alert.updateMany({
      where: {
        status: 'PENDING',
        triggeredAt: {
          lt: staleDate
        }
      },
      data: {
        status: 'DISMISSED',
        resolvedAt: new Date(),
        resolutionNotes: 'Auto-resolved: Alert expired after 72 hours without action'
      }
    });

    return result.count;

  } catch (error) {
    console.error('Error cleaning up stale alerts:', error);
    throw error;
  }
}

/**
 * Helper: Calculate trend from observations
 */
function calculateTrend(observations) {
  if (observations.length < 3) {
    return { isConcerning: false };
  }

  // Extract numeric values
  const values = observations.map(obs => {
    let val = obs.value;
    if (typeof val === 'object' && val !== null && val.value !== undefined) {
      val = val.value;
    }
    return Number(val);
  }).filter(v => !isNaN(v));

  if (values.length < 3) {
    return { isConcerning: false };
  }

  const earliestValue = values[0];
  const latestValue = values[values.length - 1];
  const changePercentage = ((latestValue - earliestValue) / earliestValue) * 100;

  // Determine if trend is concerning (>15% change in either direction)
  const isConcerning = Math.abs(changePercentage) > 15;

  if (!isConcerning) {
    return { isConcerning: false };
  }

  const direction = changePercentage > 0 ? 'increasing' : 'decreasing';
  const severity = Math.abs(changePercentage) > 30 ? 'HIGH' : 'MEDIUM';
  const riskScore = Math.min(10, 5 + (Math.abs(changePercentage) / 10));

  return {
    isConcerning: true,
    direction,
    changePercentage: Math.round(changePercentage * 10) / 10,
    earliestValue,
    latestValue,
    severity,
    riskScore
  };
}

/**
 * Helper: Get expected hours from frequency string
 */
function getExpectedHoursFromFrequency(frequency) {
  const frequencies = {
    'hourly': 1,
    'every 4 hours': 4,
    'every 6 hours': 6,
    'every 8 hours': 8,
    'every 12 hours': 12,
    'daily': 24,
    'twice daily': 12,
    'weekly': 168,
    'biweekly': 336,
    'monthly': 720
  };

  return frequencies[frequency.toLowerCase()] || 168; // Default to weekly
}

/**
 * Helper: Get or create platform-level alert rules
 */
async function getOrCreateMissedAssessmentAlertRule() {
  let rule = await prisma.alertRule.findFirst({
    where: {
      organizationId: null,
      name: 'Missed Assessment Alert'
    }
  });

  if (!rule) {
    rule = await prisma.alertRule.create({
      data: {
        organizationId: null,
        name: 'Missed Assessment Alert',
        description: 'Alert triggered when a patient misses a required assessment',
        conditions: {
          type: 'missed_assessment',
          metric: 'assessment_completion'
        },
        actions: {
          notify: 'clinician',
          create_task: false
        },
        isActive: true,
        isStandardized: true,
        category: 'Compliance',
        severity: 'MEDIUM',
        priority: 3,
        clinicalEvidence: {
          source: 'Platform Standard',
          rationale: 'Regular assessments are critical for monitoring patient progress'
        }
      }
    });
  }

  return rule;
}

async function getOrCreateMedicationAdherenceAlertRule() {
  let rule = await prisma.alertRule.findFirst({
    where: {
      organizationId: null,
      name: 'Low Medication Adherence'
    }
  });

  if (!rule) {
    rule = await prisma.alertRule.create({
      data: {
        organizationId: null,
        name: 'Low Medication Adherence',
        description: 'Alert triggered when medication adherence falls below 80%',
        conditions: {
          type: 'medication_adherence',
          operator: 'lt',
          value: 80
        },
        actions: {
          notify: 'clinician',
          create_task: true
        },
        isActive: true,
        isStandardized: true,
        category: 'Medication',
        severity: 'MEDIUM',
        priority: 4,
        clinicalEvidence: {
          source: 'WHO Guidelines',
          rationale: 'Medication adherence below 80% is associated with poor outcomes'
        }
      }
    });
  }

  return rule;
}

async function getOrCreateTrendAlertRule() {
  let rule = await prisma.alertRule.findFirst({
    where: {
      organizationId: null,
      name: 'Concerning Vital Sign Trend'
    }
  });

  if (!rule) {
    rule = await prisma.alertRule.create({
      data: {
        organizationId: null,
        name: 'Concerning Vital Sign Trend',
        description: 'Alert triggered when vital signs show concerning trends over 7 days',
        conditions: {
          type: 'trend_analysis',
          operator: 'change_percentage',
          value: 15
        },
        actions: {
          notify: 'clinician',
          create_task: false
        },
        isActive: true,
        isStandardized: true,
        category: 'Vitals',
        severity: 'MEDIUM',
        priority: 5,
        clinicalEvidence: {
          source: 'Clinical Best Practices',
          rationale: 'Significant changes in vital signs may indicate deteriorating condition'
        }
      }
    });
  }

  return rule;
}

/**
 * Send assessment reminders to patients who have assessments coming due
 * Sends reminders 24 hours before assessment is due based on frequency
 */
async function sendAssessmentReminders() {
  try {
    let remindersSent = 0;

    // Get all active enrollments with condition presets
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        conditionPreset: {
          include: {
            templates: {
              where: {
                isRequired: true
              },
              include: {
                template: true
              }
            }
          }
        }
      }
    });

    for (const enrollment of enrollments) {
      if (!enrollment.conditionPreset || !enrollment.conditionPreset.templates.length) {
        continue;
      }

      // Check each required template
      for (const presetTemplate of enrollment.conditionPreset.templates) {
        const template = presetTemplate.template;
        const frequency = presetTemplate.frequency || 'weekly';
        const expectedHours = getExpectedHoursFromFrequency(frequency);

        // Get last assessment for this template
        const lastAssessment = await prisma.assessment.findFirst({
          where: {
            patientId: enrollment.patientId,
            templateId: template.id,
            completedAt: {
              not: null
            }
          },
          orderBy: {
            completedAt: 'desc'
          }
        });

        // Calculate when next assessment is due
        const now = new Date();
        const lastCompletedAt = lastAssessment?.completedAt || enrollment.startDate;
        const hoursSinceLastAssessment = (now - new Date(lastCompletedAt)) / (1000 * 60 * 60);
        const hoursUntilDue = expectedHours - hoursSinceLastAssessment;

        // Send reminder if assessment is due within 24 hours (but not yet overdue)
        const shouldRemind = hoursUntilDue > 0 && hoursUntilDue <= 24;

        if (shouldRemind) {
          // Check if we already sent a reminder recently (within last 12 hours)
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
          const recentReminder = await prisma.assessmentReminder.findFirst({
            where: {
              patientId: enrollment.patientId,
              templateId: template.id,
              enrollmentId: enrollment.id,
              sentAt: {
                gte: twelveHoursAgo
              }
            }
          });

          if (!recentReminder && enrollment.patient.email) {
            try {
              // Send reminder notification
              await notificationService.sendAssessmentReminder(
                enrollment.patient,
                enrollment,
                template
              );

              // Log the reminder
              await prisma.assessmentReminder.create({
                data: {
                  patientId: enrollment.patientId,
                  templateId: template.id,
                  enrollmentId: enrollment.id,
                  sentAt: new Date(),
                  dueAt: new Date(new Date(lastCompletedAt).getTime() + expectedHours * 60 * 60 * 1000),
                  reminderType: 'UPCOMING'
                }
              });

              remindersSent++;
              console.log(`📧 Sent assessment reminder: ${template.name} to ${enrollment.patient.firstName} ${enrollment.patient.lastName} (due in ${Math.round(hoursUntilDue)} hours)`);
            } catch (reminderError) {
              console.error(`Failed to send reminder for template ${template.id}:`, reminderError);
            }
          }
        }
      }
    }

    return remindersSent;

  } catch (error) {
    console.error('Error sending assessment reminders:', error);
    throw error;
  }
}

/**
 * Reactivate snoozed alerts whose snooze period has expired (Phase 1b)
 * Checks every 5 minutes for alerts where snoozedUntil < now
 */
async function reactivateSnoozedAlerts() {
  try {
    const sseService = require('./sseService');
    const now = new Date();

    // Find all alerts with expired snooze
    const expiredSnoozedAlerts = await prisma.alert.findMany({
      where: {
        snoozedUntil: {
          lt: now // Snooze time has passed
        },
        status: {
          notIn: ['RESOLVED', 'DISMISSED'] // Don't reactivate resolved/dismissed alerts
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        rule: {
          select: {
            id: true,
            name: true,
            severity: true
          }
        }
      }
    });

    // Reactivate each alert
    for (const alert of expiredSnoozedAlerts) {
      const updatedAlert = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          snoozedUntil: null,
          snoozedById: null,
          snoozedAt: null
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          rule: {
            select: {
              id: true,
              name: true,
              severity: true
            }
          }
        }
      });

      // Broadcast SSE update for reactivated alert
      try {
        sseService.broadcastAlertUpdate(updatedAlert);
        console.log(`🔔 Reactivated snoozed alert ${alert.id}: ${alert.rule.name} for patient ${alert.patient.firstName} ${alert.patient.lastName}`);
      } catch (sseError) {
        console.error('Failed to broadcast SSE alert reactivation:', sseError);
      }
    }

    return expiredSnoozedAlerts.length;

  } catch (error) {
    console.error('Error reactivating snoozed alerts:', error);
    throw error;
  }
}

/**
 * Check for SLA breaches and automatically escalate alerts (Phase 1b)
 * Runs every minute to check alerts where slaBreachTime < now
 */
async function checkAndEscalateSLABreaches() {
  try {
    const sseService = require('./sseService');
    const now = new Date();

    // Find all PENDING alerts where SLA is breached and not already escalated
    const breachedAlerts = await prisma.alert.findMany({
      where: {
        status: {
          in: ['PENDING', 'ACKNOWLEDGED'] // Escalate even acknowledged alerts if SLA breached
        },
        slaBreachTime: {
          lt: now // SLA breach time has passed
        },
        isEscalated: false, // Not yet escalated
        isSuppressed: false // Don't escalate suppressed alerts
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        rule: {
          select: {
            id: true,
            name: true,
            severity: true
          }
        }
      }
    });

    let escalatedCount = 0;

    for (const alert of breachedAlerts) {
      // Determine escalation target based on organization hierarchy
      // For now, we'll escalate to the organization admin
      // TODO: Implement proper escalation hierarchy (supervisor lookup)

      // Find an ORG_ADMIN for this organization
      const orgAdmin = await prisma.userOrganization.findFirst({
        where: {
          organizationId: alert.organizationId,
          role: 'ORG_ADMIN',
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!orgAdmin) {
        console.warn(`No ORG_ADMIN found for organization ${alert.organizationId}, cannot escalate alert ${alert.id}`);
        continue;
      }

      // Calculate time since SLA breach
      const minutesSinceBreach = Math.floor((now - alert.slaBreachTime) / (60 * 1000));

      // Update alert with escalation details and create audit log
      const [updatedAlert] = await prisma.$transaction([
        prisma.alert.update({
          where: { id: alert.id },
          data: {
            isEscalated: true,
            escalatedAt: now,
            escalatedToId: orgAdmin.userId,
            escalationLevel: 1, // First escalation
            escalationReason: `Automatic escalation: SLA breach (${minutesSinceBreach} minutes overdue)`
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            rule: {
              select: {
                id: true,
                name: true,
                severity: true
              }
            },
            escalatedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }),
        // Create audit log for automatic escalation
        prisma.auditLog.create({
          data: {
            userId: orgAdmin.userId, // System action on behalf of org admin
            organizationId: alert.organizationId,
            action: 'ALERT_ESCALATED',
            resource: 'Alert',
            resourceId: alert.id,
            oldValues: {
              isEscalated: false,
              escalationLevel: null
            },
            newValues: {
              isEscalated: true,
              escalatedAt: now,
              escalatedToId: orgAdmin.userId,
              escalationLevel: 1,
              escalationReason: `Automatic escalation: SLA breach (${minutesSinceBreach} minutes overdue)`
            },
            metadata: {
              patientId: alert.patientId,
              ruleId: alert.ruleId,
              severity: alert.severity,
              escalationLevel: 1,
              escalatedToEmail: orgAdmin.user.email,
              minutesSinceBreach,
              autoEscalated: true
            },
            hipaaRelevant: true
          }
        })
      ]);

      // Broadcast SSE update
      try {
        sseService.broadcastAlertUpdate(updatedAlert);
      } catch (sseError) {
        console.error('Failed to broadcast SSE alert escalation:', sseError);
      }

      // TODO: Send escalation notification email to escalatedTo user
      // await notificationService.sendEscalationNotification(updatedAlert, orgAdmin.user, minutesSinceBreach);

      escalatedCount++;
      console.log(`🚨 Auto-escalated alert ${alert.id}: ${alert.rule.name} for patient ${alert.patient.firstName} ${alert.patient.lastName} to ${orgAdmin.user.firstName} ${orgAdmin.user.lastName} (${minutesSinceBreach} min overdue)`);
    }

    return escalatedCount;

  } catch (error) {
    console.error('Error checking and escalating SLA breaches:', error);
    throw error;
  }
}

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  evaluateMissedAssessments,
  evaluateMedicationAdherenceAlerts,
  evaluateDailyTrends,
  cleanupStaleAlerts,
  sendAssessmentReminders,
  reactivateSnoozedAlerts,
  checkAndEscalateSLABreaches
};
