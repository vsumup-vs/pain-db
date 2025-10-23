const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

/**
 * Get clinician workflow analytics (Phase 1b)
 * Provides performance metrics for individual clinicians
 */
const getClinicianWorkflowAnalytics = async (req, res) => {
  try {
    const { clinicianId, startDate, endDate, timeframe = '30d' } = req.query;
    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check organization type - block PLATFORM organizations from accessing analytics
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true
      }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from accessing patient-care analytics
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Analytics and reporting on patient care is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // If no clinicianId provided, use current user
    const targetUserId = clinicianId || currentUserId;

    // Calculate date range
    const now = new Date();
    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Use timeframe
      end = now;
      switch (timeframe) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Fetch user info
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Fetch the actual Clinician record linked to this User (match by email)
    const clinicianRecord = await prisma.clinician.findFirst({
      where: {
        email: user.email,
        organizationId
      },
      select: {
        id: true
      }
    });

    // Use Clinician ID for TimeLog queries (important!)
    // If no clinician record found, TimeLog queries will return empty (expected for non-clinician users)
    const actualClinicianId = clinicianRecord?.id;

    // 1. Alert Resolution Metrics
    const resolvedAlerts = await prisma.alert.findMany({
      where: {
        organizationId,
        resolvedById: targetUserId, // Alert.resolvedById is User ID
        resolvedAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        triggeredAt: true,
        resolvedAt: true,
        timeSpentMinutes: true,
        severity: true
      }
    });

    const totalAlertsResolved = resolvedAlerts.length;
    const totalTimeSpent = resolvedAlerts.reduce((sum, alert) => sum + (alert.timeSpentMinutes || 0), 0);

    // Calculate average resolution time (time from triggered to resolved)
    const resolutionTimes = resolvedAlerts
      .filter(alert => alert.triggeredAt && alert.resolvedAt)
      .map(alert => (alert.resolvedAt.getTime() - alert.triggeredAt.getTime()) / (60 * 1000)); // minutes

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    // Alerts by severity
    const alertsBySeverity = {
      CRITICAL: resolvedAlerts.filter(a => a.severity === 'CRITICAL').length,
      HIGH: resolvedAlerts.filter(a => a.severity === 'HIGH').length,
      MEDIUM: resolvedAlerts.filter(a => a.severity === 'MEDIUM').length,
      LOW: resolvedAlerts.filter(a => a.severity === 'LOW').length
    };

    // 2. Task Completion Metrics
    const [completedTasks, totalTasks] = await Promise.all([
      prisma.task.count({
        where: {
          organizationId,
          assignedToId: targetUserId, // Task.assignedToId is User ID
          status: 'COMPLETED',
          completedAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.task.count({
        where: {
          organizationId,
          assignedToId: targetUserId, // Task.assignedToId is User ID
          createdAt: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get overdue tasks
    const overdueTasks = await prisma.task.count({
      where: {
        organizationId,
        assignedToId: targetUserId, // Task.assignedToId is User ID
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now }
      }
    });

    // 3. Time Logging Analysis
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        clinicianId: actualClinicianId, // TimeLog.clinicianId is Clinician ID (CRITICAL FIX!)
        loggedAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        duration: true,
        activity: true,
        cptCode: true,
        billable: true,
        loggedAt: true
      }
    });

    const totalClinicalTime = timeLogs.reduce((sum, log) => sum + log.duration, 0);
    const billableTime = timeLogs.filter(log => log.billable).reduce((sum, log) => sum + log.duration, 0);
    const billablePercentage = totalClinicalTime > 0 ? (billableTime / totalClinicalTime) * 100 : 0;

    // Time by activity type
    const timeByActivity = {};
    timeLogs.forEach(log => {
      const activity = log.activity || 'Other';
      timeByActivity[activity] = (timeByActivity[activity] || 0) + log.duration;
    });

    // 4. Patient Interaction Metrics
    const uniquePatients = await prisma.alert.groupBy({
      by: ['patientId'],
      where: {
        organizationId,
        resolvedById: targetUserId, // Alert.resolvedById is User ID
        resolvedAt: {
          gte: start,
          lte: end
        }
      }
    });

    const totalPatientsServed = uniquePatients.length;
    const avgTimePerPatient = totalPatientsServed > 0 ? totalTimeSpent / totalPatientsServed : 0;

    // 5. Daily Performance Trend (last 7 days for chart)
    const trendDays = 7;
    const trendData = [];

    for (let i = trendDays - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAlerts = await prisma.alert.count({
        where: {
          organizationId,
          resolvedById: targetUserId, // Alert.resolvedById is User ID
          resolvedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      const dayTasks = await prisma.task.count({
        where: {
          organizationId,
          assignedToId: targetUserId, // Task.assignedToId is User ID
          status: 'COMPLETED',
          completedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      trendData.push({
        date: dayStart.toISOString().split('T')[0],
        alertsResolved: dayAlerts,
        tasksCompleted: dayTasks
      });
    }

    // 6. Calculate productivity score (0-100)
    // Based on: alerts resolved, task completion rate, avg resolution time, billable %
    let productivityScore = 0;

    // Alerts resolved (max 25 points)
    const alertsPerDay = totalAlertsResolved / ((end - start) / (24 * 60 * 60 * 1000));
    productivityScore += Math.min(alertsPerDay * 2.5, 25);

    // Task completion rate (max 25 points)
    productivityScore += (taskCompletionRate / 100) * 25;

    // Resolution time (max 25 points - lower is better)
    const targetResolutionTime = 30; // 30 minutes target
    if (avgResolutionTime > 0) {
      const resolutionScore = Math.max(0, 25 - (avgResolutionTime - targetResolutionTime));
      productivityScore += Math.max(0, Math.min(resolutionScore, 25));
    } else {
      productivityScore += 12.5; // Neutral score if no data
    }

    // Billable percentage (max 25 points)
    productivityScore += (billablePercentage / 100) * 25;

    // Return analytics data
    res.json({
      success: true,
      data: {
        clinician: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: timeframe
        },
        summary: {
          productivityScore: Math.round(productivityScore),
          totalAlertsResolved,
          avgResolutionTimeMinutes: Math.round(avgResolutionTime),
          taskCompletionRate: Math.round(taskCompletionRate),
          totalPatientsServed,
          avgTimePerPatientMinutes: Math.round(avgTimePerPatient)
        },
        alertMetrics: {
          total: totalAlertsResolved,
          bySeverity: alertsBySeverity,
          avgResolutionTimeMinutes: Math.round(avgResolutionTime),
          totalTimeSpentMinutes: totalTimeSpent
        },
        taskMetrics: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: Math.round(taskCompletionRate),
          overdue: overdueTasks
        },
        timeMetrics: {
          totalClinicalMinutes: totalClinicalTime,
          billableMinutes: billableTime,
          billablePercentage: Math.round(billablePercentage),
          byActivity: timeByActivity
        },
        patientMetrics: {
          uniquePatients: totalPatientsServed,
          avgTimePerPatientMinutes: Math.round(avgTimePerPatient)
        },
        trend: trendData
      }
    });
  } catch (error) {
    console.error('Error fetching clinician workflow analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching analytics'
    });
  }
};

/**
 * Get organization-wide workflow analytics (Phase 1b)
 * Aggregate metrics across all clinicians
 */
const getOrganizationWorkflowAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, timeframe = '30d' } = req.query;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check organization type - block PLATFORM organizations from accessing analytics
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true
      }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from accessing patient-care analytics
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Analytics and reporting on patient care is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Calculate date range
    const now = new Date();
    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = now;
      switch (timeframe) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Get all clinicians in organization
    const clinicians = await prisma.userOrganization.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ['CLINICIAN', 'ORG_ADMIN'] }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Aggregate metrics by clinician
    const clinicianPerformance = await Promise.all(
      clinicians.map(async (clinician) => {
        const resolvedAlerts = await prisma.alert.count({
          where: {
            organizationId,
            resolvedById: clinician.userId,
            resolvedAt: {
              gte: start,
              lte: end
            }
          }
        });

        const completedTasks = await prisma.task.count({
          where: {
            organizationId,
            assignedToId: clinician.userId,
            status: 'COMPLETED',
            completedAt: {
              gte: start,
              lte: end
            }
          }
        });

        const totalTime = await prisma.timeLog.aggregate({
          where: {
            clinicianId: clinician.userId,
            loggedAt: {
              gte: start,
              lte: end
            }
          },
          _sum: {
            duration: true
          }
        });

        return {
          clinicianId: clinician.userId,
          name: `${clinician.user.firstName} ${clinician.user.lastName}`,
          alertsResolved: resolvedAlerts,
          tasksCompleted: completedTasks,
          totalTimeMinutes: totalTime._sum.duration || 0
        };
      })
    );

    // Sort by alerts resolved
    clinicianPerformance.sort((a, b) => b.alertsResolved - a.alertsResolved);

    // Organization totals
    const totalAlertsResolved = clinicianPerformance.reduce((sum, c) => sum + c.alertsResolved, 0);
    const totalTasksCompleted = clinicianPerformance.reduce((sum, c) => sum + c.tasksCompleted, 0);
    const totalClinicalTime = clinicianPerformance.reduce((sum, c) => sum + c.totalTimeMinutes, 0);

    res.json({
      success: true,
      data: {
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: timeframe
        },
        summary: {
          totalClinicians: clinicians.length,
          totalAlertsResolved,
          totalTasksCompleted,
          totalClinicalTimeMinutes: totalClinicalTime,
          avgAlertsPerClinician: Math.round(totalAlertsResolved / clinicians.length),
          avgTasksPerClinician: Math.round(totalTasksCompleted / clinicians.length)
        },
        clinicianPerformance: clinicianPerformance.slice(0, 10) // Top 10
      }
    });
  } catch (error) {
    console.error('Error fetching organization workflow analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching organization analytics'
    });
  }
};

/**
 * Get patient engagement metrics (Phase 1b)
 * Tracks patient adherence, assessment completion, medication adherence, observation submission
 */
const getPatientEngagementMetrics = async (req, res) => {
  try {
    const { patientId, startDate, endDate, timeframe = '30d' } = req.query;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check organization type - block PLATFORM organizations from accessing analytics
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true
      }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from accessing patient-care analytics
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Analytics and reporting on patient care is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Calculate date range
    const now = new Date();
    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = now;
      switch (timeframe) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // If specific patient requested
    if (patientId) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          organizationId
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }

      // Get patient enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: {
          patientId,
          status: 'ACTIVE'
        },
        include: {
          careProgram: {
            select: {
              name: true,
              settings: true
            }
          }
        }
      });

      // 1. Assessment Adherence
      const totalAssessments = await prisma.assessment.count({
        where: {
          patientId,
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      const completedAssessments = await prisma.assessment.count({
        where: {
          patientId,
          completedAt: {
            gte: start,
            lte: end
          }
        }
      });

      // Calculate expected assessments based on program frequency
      const daysDiff = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
      let expectedAssessments = 0;

      if (enrollments.length > 0) {
        enrollments.forEach(enrollment => {
          // Get assessment frequency from settings if available, default to WEEKLY
          const frequency = enrollment.careProgram.settings?.assessmentFrequency || 'WEEKLY';
          if (frequency === 'DAILY' || frequency === 'daily') {
            expectedAssessments += daysDiff;
          } else if (frequency === 'WEEKLY' || frequency === 'weekly') {
            expectedAssessments += Math.floor(daysDiff / 7);
          } else if (frequency === 'BIWEEKLY' || frequency === 'biweekly') {
            expectedAssessments += Math.floor(daysDiff / 14);
          } else if (frequency === 'MONTHLY' || frequency === 'monthly') {
            expectedAssessments += Math.floor(daysDiff / 30);
          } else {
            // If frequency is not recognized, default to weekly
            expectedAssessments += Math.floor(daysDiff / 7);
          }
        });
      } else {
        // If no active enrollments, assume weekly frequency
        expectedAssessments = Math.floor(daysDiff / 7);
      }

      const assessmentAdherenceRate = expectedAssessments > 0
        ? (completedAssessments / expectedAssessments) * 100
        : 0;

      // 2. Medication Adherence
      const activeMedications = await prisma.patientMedication.findMany({
        where: {
          patientId,
          isActive: true,
          startDate: { lte: end },
          OR: [
            { endDate: null },
            { endDate: { gte: start } }
          ]
        },
        select: {
          id: true,
          drug: {
            select: {
              brandName: true,
              genericName: true
            }
          }
        }
      });

      const medicationAdherence = await Promise.all(
        activeMedications.map(async (med) => {
          const adherenceLogs = await prisma.medicationAdherence.findMany({
            where: {
              medicationId: med.id,
              takenAt: {
                gte: start,
                lte: end
              }
            }
          });

          const totalDoses = adherenceLogs.length;
          const takenDoses = adherenceLogs.filter(log => log.taken).length;
          const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

          return {
            medicationId: med.id,
            medicationName: med.drug.brandName || med.drug.genericName,
            totalDoses,
            takenDoses,
            adherenceRate: Math.round(adherenceRate)
          };
        })
      );

      const avgMedicationAdherence = medicationAdherence.length > 0
        ? medicationAdherence.reduce((sum, med) => sum + med.adherenceRate, 0) / medicationAdherence.length
        : 0;

      // 3. Observation Submission Pattern
      const observations = await prisma.observation.findMany({
        where: {
          patientId,
          recordedAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          recordedAt: true,
          metric: {
            select: {
              displayName: true,
              category: true
            }
          }
        },
        orderBy: {
          recordedAt: 'asc'
        }
      });

      // Group observations by day
      const observationsByDay = {};
      observations.forEach(obs => {
        const day = obs.recordedAt.toISOString().split('T')[0];
        if (!observationsByDay[day]) {
          observationsByDay[day] = 0;
        }
        observationsByDay[day]++;
      });

      const daysWithObservations = Object.keys(observationsByDay).length;
      const observationConsistency = daysDiff > 0 ? (daysWithObservations / daysDiff) * 100 : 0;

      // 4. Alert Generation (patient-triggered alerts indicate issues)
      const patientAlerts = await prisma.alert.count({
        where: {
          patientId,
          triggeredAt: {
            gte: start,
            lte: end
          }
        }
      });

      const criticalAlerts = await prisma.alert.count({
        where: {
          patientId,
          severity: 'CRITICAL',
          triggeredAt: {
            gte: start,
            lte: end
          }
        }
      });

      // 5. Calculate engagement score (0-100)
      let engagementScore = 0;

      // Cap individual rates at 100% to prevent over-scoring
      const cappedAssessmentRate = Math.min(assessmentAdherenceRate, 100);
      const cappedMedicationRate = Math.min(avgMedicationAdherence, 100);
      const cappedObservationRate = Math.min(observationConsistency, 100);

      // Assessment adherence (40 points)
      engagementScore += (cappedAssessmentRate / 100) * 40;

      // Medication adherence (30 points)
      engagementScore += (cappedMedicationRate / 100) * 30;

      // Observation consistency (20 points)
      engagementScore += (cappedObservationRate / 100) * 20;

      // Bonus: No critical alerts (10 points)
      if (criticalAlerts === 0) {
        engagementScore += 10;
      } else if (criticalAlerts <= 2) {
        engagementScore += 5;
      }

      // Cap final engagement score at 100
      engagementScore = Math.min(engagementScore, 100);

      // 6. Daily engagement trend (last 7 days)
      const trendDays = 7;
      const trendData = [];

      for (let i = trendDays - 1; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayAssessments = await prisma.assessment.count({
          where: {
            patientId,
            completedAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        });

        const dayObservations = await prisma.observation.count({
          where: {
            patientId,
            recordedAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        });

        // Calculate daily engagement score
        // Expected 1 assessment per day (or based on program frequency, simplified to 1 for daily trend)
        const dayAssessmentScore = dayAssessments > 0 ? 40 : 0;

        // Medication adherence for the day (simplified - assume adherent if any observations)
        const dayMedicationScore = dayObservations > 0 ? 30 : 0;

        // Observation consistency (20 points if any observations)
        const dayObservationScore = dayObservations > 0 ? 20 : 0;

        // Bonus: No critical alerts (10 points)
        const dayCriticalAlerts = await prisma.alert.count({
          where: {
            patientId,
            severity: 'CRITICAL',
            triggeredAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        });

        const dayAlertBonus = dayCriticalAlerts === 0 ? 10 : 0;

        const dayEngagementScore = dayAssessmentScore + dayMedicationScore + dayObservationScore + dayAlertBonus;

        trendData.push({
          date: dayStart.toISOString().split('T')[0],
          assessments: dayAssessments,
          observations: dayObservations,
          engagementScore: dayEngagementScore
        });
      }

      return res.json({
        success: true,
        data: {
          patient: {
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            medicalRecordNumber: patient.medicalRecordNumber
          },
          timeframe: {
            start: start.toISOString(),
            end: end.toISOString(),
            label: timeframe
          },
          summary: {
            engagementScore: Math.round(engagementScore),
            assessmentAdherenceRate: Math.min(Math.round(assessmentAdherenceRate), 100),
            medicationAdherenceRate: Math.min(Math.round(avgMedicationAdherence), 100),
            observationConsistency: Math.min(Math.round(observationConsistency), 100),
            totalAlerts: patientAlerts,
            criticalAlerts
          },
          assessmentMetrics: {
            expected: expectedAssessments,
            completed: completedAssessments,
            adherenceRate: Math.min(Math.round(assessmentAdherenceRate), 100),
            activePrograms: enrollments.length
          },
          medicationMetrics: {
            activeMedications: activeMedications.length,
            avgAdherenceRate: Math.min(Math.round(avgMedicationAdherence), 100),
            byMedication: medicationAdherence
          },
          observationMetrics: {
            totalObservations: observations.length,
            daysWithSubmissions: daysWithObservations,
            totalDays: daysDiff,
            consistencyRate: Math.round(observationConsistency)
          },
          alertMetrics: {
            total: patientAlerts,
            critical: criticalAlerts
          },
          trend: trendData
        }
      });
    }

    // Organization-wide patient engagement summary
    const allPatients = await prisma.patient.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    const patientEngagement = await Promise.all(
      allPatients.slice(0, 20).map(async (patient) => {
        // Get enrollments for assessment expectations
        const enrollments = await prisma.enrollment.findMany({
          where: {
            patientId: patient.id,
            OR: [
              { endDate: null },
              { endDate: { gte: start } }
            ]
          }
        });

        // Calculate assessment adherence
        const completedAssessments = await prisma.assessment.count({
          where: {
            patientId: patient.id,
            completedAt: {
              gte: start,
              lte: end
            }
          }
        });

        const expectedAssessments = Math.max(enrollments.length * 4, 1); // Assume 4 assessments per enrollment in timeframe
        const assessmentAdherenceRate = Math.min((completedAssessments / expectedAssessments) * 100, 100);

        // Calculate medication adherence
        const activeMedications = await prisma.patientMedication.findMany({
          where: {
            patientId: patient.id,
            OR: [
              { endDate: null },
              { endDate: { gte: start } }
            ]
          },
          include: {
            drug: {
              select: {
                brandName: true,
                genericName: true
              }
            }
          }
        });

        const medicationAdherenceData = await Promise.all(
          activeMedications.map(async (med) => {
            const adherenceLogs = await prisma.medicationAdherence.findMany({
              where: {
                patientMedicationId: med.id,
                takenAt: {
                  gte: start,
                  lte: end
                }
              },
              select: {
                adherenceScore: true
              }
            });

            // Calculate average adherence score for this medication
            if (adherenceLogs.length === 0) return 0;

            const avgScore = adherenceLogs.reduce((sum, log) => sum + (log.adherenceScore || 0), 0) / adherenceLogs.length;
            return avgScore;
          })
        );

        const avgMedicationAdherence = medicationAdherenceData.length > 0
          ? medicationAdherenceData.reduce((sum, rate) => sum + rate, 0) / medicationAdherenceData.length
          : 0;

        // Calculate observation metrics
        const observations = await prisma.observation.findMany({
          where: {
            patientId: patient.id,
            recordedAt: {
              gte: start,
              lte: end
            }
          },
          select: {
            recordedAt: true
          }
        });

        const observationsByDay = {};
        observations.forEach(obs => {
          const day = obs.recordedAt.toISOString().split('T')[0];
          observationsByDay[day] = (observationsByDay[day] || 0) + 1;
        });

        const daysWithObservations = Object.keys(observationsByDay).length;
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const observationConsistency = daysDiff > 0 ? Math.min((daysWithObservations / daysDiff) * 100, 100) : 0;

        // Calculate engagement score (0-100)
        const cappedAssessmentRate = Math.min(assessmentAdherenceRate, 100);
        const cappedMedicationRate = Math.min(avgMedicationAdherence, 100);
        const cappedObservationRate = Math.min(observationConsistency, 100);

        let engagementScore = 0;
        engagementScore += (cappedAssessmentRate / 100) * 40; // 40 points
        engagementScore += (cappedMedicationRate / 100) * 30;  // 30 points
        engagementScore += (cappedObservationRate / 100) * 20; // 20 points

        // Bonus for low critical alerts
        const criticalAlerts = await prisma.alert.count({
          where: {
            patientId: patient.id,
            severity: 'CRITICAL',
            triggeredAt: {
              gte: start,
              lte: end
            }
          }
        });

        if (criticalAlerts === 0) {
          engagementScore += 10;
        } else if (criticalAlerts <= 2) {
          engagementScore += 5;
        }

        engagementScore = Math.min(engagementScore, 100);

        return {
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          engagementScore: Math.round(engagementScore),
          assessmentAdherence: {
            completed: completedAssessments,
            expected: expectedAssessments,
            adherenceRate: Math.round(assessmentAdherenceRate)
          },
          medicationAdherence: {
            overallRate: Math.round(avgMedicationAdherence)
          },
          observationMetrics: {
            totalObservations: observations.length,
            daysWithSubmissions: daysWithObservations,
            consistencyRate: Math.round(observationConsistency)
          }
        };
      })
    );

    // Sort by engagement score
    patientEngagement.sort((a, b) => b.engagementScore - a.engagementScore);

    res.json({
      success: true,
      data: {
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: timeframe
        },
        summary: {
          totalPatients: allPatients.length,
          avgEngagementScore: Math.round(
            patientEngagement.reduce((sum, p) => sum + p.engagementScore, 0) / patientEngagement.length
          ),
          highlyEngaged: patientEngagement.filter(p => p.engagementScore >= 70).length,
          atRisk: patientEngagement.filter(p => p.engagementScore < 40).length
        },
        topPatients: patientEngagement.slice(0, 20) // Top 20 patients
      }
    });
  } catch (error) {
    console.error('Error fetching patient engagement metrics:', error);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.query);
    console.error('User:', req.user);
    console.error('Organization ID:', req.organizationId);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching patient engagement metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getClinicianWorkflowAnalytics,
  getOrganizationWorkflowAnalytics,
  getPatientEngagementMetrics
};
