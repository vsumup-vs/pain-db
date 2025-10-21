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
    const targetClinicianId = clinicianId || currentUserId;

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

    // Fetch clinician info
    const clinician = await prisma.user.findUnique({
      where: { id: targetClinicianId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!clinician) {
      return res.status(404).json({
        success: false,
        error: 'Clinician not found'
      });
    }

    // 1. Alert Resolution Metrics
    const resolvedAlerts = await prisma.alert.findMany({
      where: {
        organizationId,
        resolvedById: targetClinicianId,
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
          assignedToId: targetClinicianId,
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
          assignedToId: targetClinicianId,
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
        assignedToId: targetClinicianId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now }
      }
    });

    // 3. Time Logging Analysis
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        clinicianId: targetClinicianId,
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
        resolvedById: targetClinicianId,
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
          resolvedById: targetClinicianId,
          resolvedAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      const dayTasks = await prisma.task.count({
        where: {
          organizationId,
          assignedToId: targetClinicianId,
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
          id: clinician.id,
          name: `${clinician.firstName} ${clinician.lastName}`,
          email: clinician.email
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
              assessmentFrequency: true
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
      enrollments.forEach(enrollment => {
        const frequency = enrollment.careProgram.assessmentFrequency;
        if (frequency === 'DAILY') {
          expectedAssessments += daysDiff;
        } else if (frequency === 'WEEKLY') {
          expectedAssessments += Math.floor(daysDiff / 7);
        } else if (frequency === 'BIWEEKLY') {
          expectedAssessments += Math.floor(daysDiff / 14);
        } else if (frequency === 'MONTHLY') {
          expectedAssessments += Math.floor(daysDiff / 30);
        }
      });

      const assessmentAdherenceRate = expectedAssessments > 0
        ? (completedAssessments / expectedAssessments) * 100
        : 0;

      // 2. Medication Adherence
      const activeMedications = await prisma.patientMedication.findMany({
        where: {
          patientId,
          status: 'ACTIVE',
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

      // Assessment adherence (40 points)
      engagementScore += (assessmentAdherenceRate / 100) * 40;

      // Medication adherence (30 points)
      engagementScore += (avgMedicationAdherence / 100) * 30;

      // Observation consistency (20 points)
      engagementScore += (observationConsistency / 100) * 20;

      // Bonus: No critical alerts (10 points)
      if (criticalAlerts === 0) {
        engagementScore += 10;
      } else if (criticalAlerts <= 2) {
        engagementScore += 5;
      }

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

        trendData.push({
          date: dayStart.toISOString().split('T')[0],
          assessments: dayAssessments,
          observations: dayObservations
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
            assessmentAdherenceRate: Math.round(assessmentAdherenceRate),
            medicationAdherenceRate: Math.round(avgMedicationAdherence),
            observationConsistency: Math.round(observationConsistency),
            totalAlerts: patientAlerts,
            criticalAlerts
          },
          assessmentMetrics: {
            expected: expectedAssessments,
            completed: completedAssessments,
            adherenceRate: Math.round(assessmentAdherenceRate),
            activePrograms: enrollments.length
          },
          medicationMetrics: {
            activeMedications: activeMedications.length,
            avgAdherenceRate: Math.round(avgMedicationAdherence),
            byMedication: medicationAdherence
          },
          observationMetrics: {
            total: observations.length,
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
        const assessments = await prisma.assessment.count({
          where: {
            patientId: patient.id,
            completedAt: {
              gte: start,
              lte: end
            }
          }
        });

        const observations = await prisma.observation.count({
          where: {
            patientId: patient.id,
            recordedAt: {
              gte: start,
              lte: end
            }
          }
        });

        // Simple engagement score based on activity
        const activityScore = Math.min(100, (assessments * 10) + (observations * 2));

        return {
          patientId: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          assessments,
          observations,
          engagementScore: Math.round(activityScore)
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
        patientEngagement: patientEngagement.slice(0, 10) // Top 10
      }
    });
  } catch (error) {
    console.error('Error fetching patient engagement metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching patient engagement metrics'
    });
  }
};

module.exports = {
  getClinicianWorkflowAnalytics,
  getOrganizationWorkflowAnalytics,
  getPatientEngagementMetrics
};
