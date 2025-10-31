const { PrismaClient } = require('@prisma/client');
const { suggestBillingPackages } = require('../services/packageSuggestionService');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new patient
const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      medications,
      insuranceInfo,
      diagnosisCodes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: 'Validation failed: firstName, lastName, and email are required'
      });
    }

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check organization type - block PLATFORM organizations from creating patients
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
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from creating patients (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Patient creation is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Check if patient with email already exists IN THIS ORGANIZATION
    const existingPatient = await prisma.patient.findFirst({
      where: {
        email,
        organizationId  // SECURITY: Scope check to current organization
      }
    });

    if (existingPatient) {
      return res.status(409).json({
        error: 'Patient with this email already exists in your organization'
      });
    }

    const patient = await prisma.patient.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        emergencyContact,
        medicalHistory,
        allergies,
        medications,
        insuranceInfo,
        diagnosisCodes
      }
    });

    // Automatically generate billing package suggestions if diagnosis codes provided
    if (diagnosisCodes && Array.isArray(diagnosisCodes) && diagnosisCodes.length > 0) {
      try {
        await suggestBillingPackages(patient.id, organizationId, {
          sourceType: 'PATIENT_RECORD',
          sourceId: patient.id
        });
        console.log(`Generated billing package suggestions for patient ${patient.id}`);
      } catch (suggestionError) {
        // Log error but don't fail patient creation
        console.error('Error generating billing suggestions:', suggestionError);
      }
    }

    res.status(201).json({
      message: 'Patient created successfully',
      data: patient
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      error: 'Internal server error while creating patient'
    });
  }
};

// Get all patients with pagination and filtering
const getAllPatients = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50, // Increased from 10 for better performance and UX
      search,
      gender,
      status,
      ageMin,
      ageMax,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for filtering
    const where = {
      organizationId  // SECURITY: Always filter by organization
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (gender) {
      where.gender = gender;
    }

    // Status filtering - filter by enrollment status (not a direct Patient field)
    if (status) {
      where.enrollments = {
        some: {
          status: status
        }
      };
    }

    // Age filtering - calculate date of birth range
    if (ageMin || ageMax) {
      const today = new Date();
      where.dateOfBirth = {};

      if (ageMin) {
        // Max date of birth (for minimum age)
        const maxDob = new Date(today.getFullYear() - parseInt(ageMin), today.getMonth(), today.getDate());
        where.dateOfBirth.lte = maxDob;
      }

      if (ageMax) {
        // Min date of birth (for maximum age)
        const minDob = new Date(today.getFullYear() - parseInt(ageMax) - 1, today.getMonth(), today.getDate());
        where.dateOfBirth.gte = minDob;
      }
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          enrollments: {
            include: {
              clinician: {
                select: {
                  id: true,
                  createdAt: true
                }
              }
            }
          },
          _count: {
            select: {
              observations: true,
              enrollments: true
            }
          }
        }
      }),
      prisma.patient.count({ where })
    ]);

    // Calculate alert counts for each patient
    const patientsWithCounts = await Promise.all(
      patients.map(async (patient) => {
        const alertCount = await prisma.alert.count({
          where: {
            patientId: patient.id,
            organizationId: req.user.currentOrganization, // Ensure org-level isolation
            status: { in: ['PENDING', 'ACKNOWLEDGED'] } // Only active alerts
          }
        });

        return {
          ...patient,
          observationCount: patient._count.observations,
          activeAlertCount: alertCount
        };
      })
    );

    res.json({
      data: patientsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      error: 'Internal server error while fetching patients'
    });
  }
};

// Get a single patient by ID
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id,
        organizationId  // SECURITY: Verify patient belongs to user's organization
      },
      include: {
        enrollments: {
          include: {
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                specialization: true,
                createdAt: true
              }
            },
            alerts: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                rule: {
                  select: {
                    id: true,
                    name: true,
                    severity: true
                  }
                }
              }
            }
          }
        },
        observations: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
          include: {
            metricDefinition: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found or access denied'
      });
    }

    res.json({
      data: patient
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      error: 'Internal server error while fetching patient'
    });
  }
};

// Update a patient
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Convert dateOfBirth to Date if provided
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.organizationId;  // SECURITY: Prevent organization switching

    // Check if patient exists and belongs to user's organization
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id,
        organizationId  // SECURITY: Verify ownership
      }
    });

    if (!existingPatient) {
      return res.status(404).json({
        error: 'Patient not found or access denied'
      });
    }

    // Check for email uniqueness if email is being updated
    if (updateData.email && updateData.email !== existingPatient.email) {
      const emailExists = await prisma.patient.findFirst({
        where: {
          email: updateData.email,
          organizationId  // SECURITY: Check within same organization
        }
      });

      if (emailExists) {
        return res.status(409).json({
          error: 'Email already exists for another patient in your organization'
        });
      }
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData
    });

    // Automatically generate billing package suggestions if diagnosis codes were added/modified
    if (updateData.diagnosisCodes && Array.isArray(updateData.diagnosisCodes) && updateData.diagnosisCodes.length > 0) {
      // Check if diagnosis codes actually changed
      const oldCodes = JSON.stringify(existingPatient.diagnosisCodes || []);
      const newCodes = JSON.stringify(updateData.diagnosisCodes);

      if (oldCodes !== newCodes) {
        try {
          await suggestBillingPackages(id, organizationId, {
            sourceType: 'PATIENT_RECORD',
            sourceId: id
          });
          console.log(`Generated billing package suggestions for updated patient ${id}`);
        } catch (suggestionError) {
          // Log error but don't fail patient update
          console.error('Error generating billing suggestions:', suggestionError);
        }
      }
    }

    res.json({
      message: 'Patient updated successfully',
      data: updatedPatient
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      error: 'Internal server error while updating patient'
    });
  }
};

// Delete a patient
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if patient exists and belongs to user's organization
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id,
        organizationId  // SECURITY: Verify ownership
      },
      include: {
        enrollments: {
          include: {
            alerts: true
          }
        },
        observations: true
      }
    });

    if (!existingPatient) {
      return res.status(404).json({
        error: 'Patient not found or access denied'
      });
    }

    // Check if patient has active enrollments
    const activeEnrollments = existingPatient.enrollments.filter(
      enrollment => enrollment.status === 'ACTIVE'
    );

    if (activeEnrollments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete patient with active enrollments. Please deactivate enrollments first.',
        activeEnrollments: activeEnrollments.length
      });
    }

    // Use transaction to delete related data
    await prisma.$transaction(async (tx) => {
      // Delete alerts through enrollments
      for (const enrollment of existingPatient.enrollments) {
        await tx.alert.deleteMany({
          where: { enrollmentId: enrollment.id }
        });
      }

      // Delete related observations
      await tx.observation.deleteMany({
        where: { patientId: id }
      });

      // Delete related timelogs
      await tx.timeLog.deleteMany({
        where: { patientId: id }
      });

      // Delete related messages
      await tx.message.deleteMany({
        where: { patientId: id }
      });

      // Delete enrollments
      await tx.enrollment.deleteMany({
        where: { patientId: id }
      });

      // Finally delete the patient
      await tx.patient.delete({
        where: { id }
      });
    });

    res.json({
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      error: 'Internal server error while deleting patient'
    });
  }
};

// Get patient statistics
const getPatientStats = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    // First get patient enrollments to use for alert counting
    const patientEnrollments = await prisma.enrollment.findMany({
      where: { patientId: id },
      select: { id: true }
    });

    const [observationCount, alertCount, activeEnrollments] = await Promise.all([
      prisma.observation.count({
        where: { 
          patientId: id
        }
      }),
      // Use enrollment IDs directly instead of nested relation
      patientEnrollments.length > 0 ? prisma.alert.count({
        where: { 
          enrollmentId: {
            in: patientEnrollments.map(e => e.id)
          }
        }
      }) : 0,
      prisma.enrollment.count({
        where: {
          patientId: id,
          status: 'ACTIVE'
        }
      })
    ]);

    // Get recent pain levels - use metricKey field directly instead of relation
    const recentObservations = await prisma.observation.findMany({
      where: {
        patientId: id,
        metricKey: {
          contains: 'pain',
          mode: 'insensitive'
        }
      },
      orderBy: { recordedAt: 'desc' },
      take: 7,
      include: {
        metricDefinition: {
          select: { unit: true }
        }
      }
    });

    res.json({
      data: {
        patientId: id,
        totalObservations: observationCount,
        totalAlerts: alertCount,
        activeEnrollments,
        recentPainLevels: recentObservations.map(obs => ({
          value: obs.valueNumeric || obs.valueText || obs.valueCode,
          recordedAt: obs.recordedAt,
          unit: obs.metricDefinition?.unit
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({
      error: 'Internal server error while fetching patient statistics'
    });
  }
};

// Get general patient statistics (for dashboard)
const getGeneralPatientStats = async (req, res) => {
  try {
    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // SECURITY: Only count patients and observations for current organization
    const [totalPatients, totalObservations] = await Promise.all([
      prisma.patient.count({
        where: { organizationId }
      }),
      prisma.observation.count({
        where: { organizationId }
      })
    ]);

    res.json({
      data: {
        total: totalPatients,
        totalObservations
      }
    });
  } catch (error) {
    console.error('Error fetching general patient stats:', error);
    res.status(500).json({
      error: 'Internal server error while fetching patient statistics'
    });
  }
};

// Optimized version for dashboard - no heavy includes
const getRecentPatients = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const patients = await prisma.patient.findMany({
      where: { organizationId },  // SECURITY: Filter by organization
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        medicalRecordNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true
      }
    });

    res.json({
      data: patients
    });
  } catch (error) {
    console.error('Error fetching recent patients:', error);
    res.status(500).json({
      error: 'Internal server error while fetching recent patients'
    });
  }
};

// Get comprehensive patient context (for Patient Context Panel - Phase 1a)
const getPatientContext = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query; // Default to 30-day window

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if patient exists and belongs to user's organization
    const patient = await prisma.patient.findFirst({
      where: {
        id,
        organizationId // SECURITY: Verify patient belongs to user's organization
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        email: true,
        phone: true,
        medicalRecordNumber: true,
        emergencyContact: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found or access denied'
      });
    }

    // Calculate date range for trends
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Fetch all data in parallel
    const [
      vitalsTrends,
      activeMedications,
      conditions,
      recentAssessments,
      activeAlerts,
      recentObservations
    ] = await Promise.all([
      // Vitals trends (last N days, grouped by metric)
      prisma.observation.findMany({
        where: {
          patientId: id,
          organizationId,
          recordedAt: { gte: startDate },
          metric: {
            category: {
              in: [
                'Vital Signs',
                'Cardiac',
                'Diabetes',
                'Respiratory',
                'Pain Assessment',
                'Mental Health',
                'Functional',
                'Functional Status'
              ]
            }
          }
        },
        include: {
          metric: {
            select: {
              id: true,
              key: true,
              displayName: true,
              unit: true,
              valueType: true,
              normalRange: true
            }
          }
        },
        orderBy: { recordedAt: 'desc' },
        take: 200 // Last 200 vital readings
      }),

      // Active medications with adherence
      prisma.patientMedication.findMany({
        where: {
          patientId: id,
          isActive: true
        },
        include: {
          drug: {
            select: {
              id: true,
              name: true,
              genericName: true,
              dosageForm: true,
              strength: true
            }
          },
          medicationAdherence: {
            where: {
              takenAt: { gte: startDate }
            },
            select: {
              adherenceScore: true,
              takenAt: true
            }
          }
        },
        orderBy: { startDate: 'desc' }
      }),

      // Active conditions (from enrollments)
      prisma.enrollment.findMany({
        where: {
          patientId: id,
          organizationId,
          status: 'ACTIVE'
        },
        include: {
          careProgram: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          conditionPreset: {
            select: {
              id: true,
              name: true,
              description: true,
              diagnoses: {
                select: {
                  icd10: true,
                  label: true,
                  isPrimary: true
                }
              }
            }
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true
            }
          }
        }
      }),

      // Recent assessments
      prisma.assessment.findMany({
        where: {
          patientId: id
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: 5
      }),

      // Recent alerts (including resolved for context)
      prisma.alert.findMany({
        where: {
          patientId: id,
          organizationId
        },
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              severity: true,
              category: true
            }
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { triggeredAt: 'desc' },
        take: 20  // Get more alerts to show resolution history
      }),

      // Most recent observations (any type)
      prisma.observation.findMany({
        where: {
          patientId: id,
          organizationId
        },
        include: {
          metric: {
            select: {
              displayName: true,
              unit: true,
              valueType: true
            }
          }
        },
        orderBy: { recordedAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate medication adherence percentages
    const medicationsWithAdherence = activeMedications.map(med => {
      const adherenceRecords = med.medicationAdherence || [];
      const averageAdherence = adherenceRecords.length > 0
        ? adherenceRecords.reduce((sum, record) => sum + (record.adherenceScore || 0), 0) / adherenceRecords.length
        : null;

      return {
        id: med.id,
        drug: med.drug,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        startDate: med.startDate,
        adherencePercentage: averageAdherence ? Math.round(averageAdherence * 100) : null,
        recentAdherenceCount: adherenceRecords.length
      };
    });

    // Group vitals by metric for trend visualization
    const vitalsTrendsByMetric = vitalsTrends.reduce((acc, obs) => {
      const metricKey = obs.metric.key;
      if (!acc[metricKey]) {
        acc[metricKey] = {
          metric: obs.metric,
          readings: []
        };
      }
      acc[metricKey].readings.push({
        value: obs.value,
        recordedAt: obs.recordedAt,
        source: obs.source
      });
      return acc;
    }, {});

    // Get last reading timestamp for each vital
    const lastReadings = Object.entries(vitalsTrendsByMetric).reduce((acc, [key, data]) => {
      if (data.readings.length > 0) {
        acc[key] = {
          displayName: data.metric.displayName,
          lastReading: data.readings[0].recordedAt,
          value: data.readings[0].value,
          unit: data.metric.unit
        };
      }
      return acc;
    }, {});

    res.json({
      data: {
        patient: {
          ...patient,
          age: patient.dateOfBirth ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null
        },
        vitals: {
          trends: vitalsTrendsByMetric,
          lastReadings,
          totalReadings: vitalsTrends.length
        },
        medications: {
          active: medicationsWithAdherence,
          totalActive: activeMedications.length
        },
        conditions: conditions.map(enrollment => ({
          enrollmentId: enrollment.id,
          billingProgramId: enrollment.billingProgramId,
          program: enrollment.careProgram,
          condition: enrollment.conditionPreset,
          clinician: enrollment.clinician,
          startDate: enrollment.startDate,
          status: enrollment.status
        })),
        assessments: {
          recent: recentAssessments.map(assessment => ({
            id: assessment.id,
            template: assessment.template,
            completedAt: assessment.completedAt,
            score: assessment.score
          })),
          totalRecent: recentAssessments.length
        },
        alerts: {
          recent: activeAlerts.map(alert => ({
            id: alert.id,
            ruleId: alert.ruleId,
            rule: alert.rule,
            severity: alert.severity,
            status: alert.status,
            message: alert.message,
            triggeredAt: alert.triggeredAt,
            riskScore: alert.riskScore,
            resolutionNotes: alert.resolutionNotes,
            resolvedAt: alert.resolvedAt,
            resolvedBy: alert.clinician,
            acknowledgedAt: alert.acknowledgedAt
          })),
          totalActive: activeAlerts.filter(a => a.status !== 'RESOLVED').length,
          totalRecent: activeAlerts.length
        },
        recentActivity: {
          observations: recentObservations.map(obs => ({
            metric: obs.metric,
            value: obs.value,
            recordedAt: obs.recordedAt,
            source: obs.source
          }))
        },
        summary: {
          totalActiveConditions: conditions.length,
          totalActiveMedications: activeMedications.length,
          totalActiveAlerts: activeAlerts.filter(a => a.status !== 'RESOLVED').length,
          lastObservation: recentObservations.length > 0 ? recentObservations[0].recordedAt : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching patient context:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({
      error: 'Internal server error while fetching patient context'
    });
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientStats,
  getGeneralPatientStats,
  getRecentPatients,
  getPatientContext
};


// Add this function for testing
const testPatients = async (req, res) => {
  try {
    // Simple query without includes
    const count = await prisma.patient.count();
    const patients = await prisma.patient.findMany({ take: 1 });
    
    res.json({
      message: 'Test successful',
      count,
      sample: patients
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
};