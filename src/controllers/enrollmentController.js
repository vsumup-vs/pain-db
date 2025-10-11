const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new enrollment
const createEnrollment = async (req, res) => {
  try {
    const {
      patientId,
      clinicianId,
      presetId,
      diagnosisCode,
      startDate,
      endDate,
      status = 'active',
      consentAt,
      notes,
      // New reminder configuration
      reminderSettings = {
        dailyAssessment: true,
        reminderTime: "09:00",
        methods: ["email"],
        timezone: "America/New_York"
      }
    } = req.body;

    // Validate required fields
    if (!patientId || !clinicianId || !presetId || !diagnosisCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, clinicianId, presetId, and diagnosisCode are required'
      });
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if clinician exists
    const clinician = await prisma.clinician.findUnique({
      where: { id: clinicianId }
    });

    if (!clinician) {
      return res.status(404).json({
        success: false,
        message: 'Clinician not found'
      });
    }

    // Check if preset exists
    const preset = await prisma.conditionPreset.findUnique({
      where: { id: presetId }
    });

    if (!preset) {
      return res.status(404).json({
        success: false,
        message: 'Condition preset not found'
      });
    }

    // Check if active enrollment already exists between this patient and clinician
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        patientId,
        clinicianId,
        status: 'active'
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'active enrollment already exists between this patient and clinician'
      });
    }

    // Add this at the top with other imports
    const { setupDailyReminderRule } = require('../services/reminderService');
    
    // In the createEnrollment function, update the enrollment creation:
    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        patientId,
        clinicianId,
        presetId,
        diagnosisCode,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status,
        consentAt: consentAt ? new Date(consentAt) : null,
        reminderSettings // Add this line
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
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        },
        preset: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Auto-setup daily reminder alert rule
    await setupDailyReminderRule(enrollment.id, reminderSettings);

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully with daily reminders configured',
      data: enrollment
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating enrollment'
    });
  }
};

// Get all enrollments with pagination and filtering
const getAllEnrollments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      patientId,
      clinicianId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Build where clause for filtering
    const where = {
      organizationId  // SECURITY: Always filter by organization
    };
    
    if (status) {
      where.status = status;
    }
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (clinicianId) {
      where.clinicianId = clinicianId;
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              dateOfBirth: true
            }
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
              department: true
            }
          }
        }
      }),
      prisma.enrollment.count({ where })
    ]);

    res.json({
      data: enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      error: 'Internal server error while fetching enrollments'
    });
  }
};

// Get a single enrollment by ID
const getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
            department: true,
            email: true,
            phone: true
          }
        },
        preset: {
          select: {
            id: true,
            name: true
          }
        },
        observations: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
          include: {
            metricDefinition: true
          }
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching enrollment'
    });
  }
};

// Update an enrollment
const updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert dates if provided
    if (updateData.enrollmentDate) {
      updateData.enrollmentDate = new Date(updateData.enrollmentDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.patientId; // Prevent changing patient
    delete updateData.clinicianId; // Prevent changing clinician

    // Check if enrollment exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { id }
    });

    if (!existingEnrollment) {
      return res.status(404).json({
        error: 'Enrollment not found'
      });
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
    });

    res.json({
      message: 'Enrollment updated successfully',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({
      error: 'Internal server error while updating enrollment'
    });
  }
};

// Delete an enrollment
const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if enrollment exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            observations: true,
            alerts: true
          }
        }
      }
    });

    if (!existingEnrollment) {
      return res.status(404).json({
        error: 'Enrollment not found'
      });
    }

    // Check if there are recent observations (within last 30 days)
    const recentObservations = existingEnrollment.patient.observations.filter(
      obs => new Date(obs.recordedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentObservations.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete enrollment with recent observations. Consider deactivating instead.',
        recentObservations: recentObservations.length
      });
    }

    await prisma.enrollment.delete({
      where: { id }
    });

    res.json({
      message: 'Enrollment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({
      error: 'Internal server error while deleting enrollment'
    });
  }
};

// Deactivate an enrollment (safer than deletion)
const deactivateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { endDate, reason } = req.body || {};

    const enrollment = await prisma.enrollment.findUnique({
      where: { id }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is already ended'
      });
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        status: 'ended',
        endDate: endDate ? new Date(endDate) : new Date()
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
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Enrollment deactivated successfully',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Error deactivating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deactivating enrollment'
    });
  }
};

// Transfer patient to another clinician
const transferEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newClinicianId, reason, transferDate } = req.body;

    if (!newClinicianId) {
      return res.status(400).json({
        error: 'newClinicianId is required for transfer'
      });
    }

    // Check if enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        patient: true,
        clinician: true
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        error: 'Enrollment not found'
      });
    }

    // Check if new clinician exists
    const newClinician = await prisma.clinician.findUnique({
      where: { id: newClinicianId }
    });

    if (!newClinician) {
      return res.status(404).json({
        error: 'New clinician not found'
      });
    }

    // Check if active enrollment already exists with new clinician
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: enrollment.patientId,
        clinicianId: newClinicianId,
        status: 'active' // Fixed: Changed from 'ACTIVE' to 'active'
      }
    });

    if (existingEnrollment) {
      return res.status(409).json({
        error: 'Active enrollment already exists between patient and new clinician'
      });
    }

    // Use transaction to handle transfer
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate current enrollment
      const deactivatedEnrollment = await tx.enrollment.update({
        where: { id },
        data: {
          status: 'ended', // Fixed: Changed from 'TRANSFERRED' to 'ended'
          endDate: transferDate ? new Date(transferDate) : new Date(),
          notes: enrollment.notes ? 
            `${enrollment.notes}\n\nTransferred to ${newClinician.firstName} ${newClinician.lastName}: ${reason || 'No reason provided'}` : 
            `Transferred to ${newClinician.firstName} ${newClinician.lastName}: ${reason || 'No reason provided'}`
        }
      });

      // Create new enrollment with new clinician
      const newEnrollment = await tx.enrollment.create({
        data: {
          patientId: enrollment.patientId,
          clinicianId: newClinicianId,
          enrollmentDate: transferDate ? new Date(transferDate) : new Date(),
          status: 'active', // Fixed: Use 'active' instead of 'ACTIVE'
          notes: `Transferred from ${enrollment.clinician.firstName} ${enrollment.clinician.lastName}: ${reason || 'No reason provided'}`,
          treatmentPlan: enrollment.treatmentPlan,
          goals: enrollment.goals,
          expectedDuration: enrollment.expectedDuration
        }
      });

      return { deactivatedEnrollment, newEnrollment };
    });

    res.json({
      message: 'Enrollment transferred successfully',
      data: {
        previousEnrollment: result.deactivatedEnrollment,
        newEnrollment: result.newEnrollment
      }
    });
  } catch (error) {
    console.error('Error transferring enrollment:', error);
    res.status(500).json({
      error: 'Internal server error while transferring enrollment'
    });
  }
};

// Get enrollment statistics
const getEnrollmentStats = async (req, res) => {
  try {
    const [totalEnrollments, activeEnrollments, pausedEnrollments, endedEnrollments] = await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: 'active' } }),
      prisma.enrollment.count({ where: { status: 'paused' } }),
      prisma.enrollment.count({ where: { status: 'ended' } })
    ]);

    // Get enrollment distribution by clinician
    const clinicianDistribution = await prisma.enrollment.groupBy({
      by: ['clinicianId'],
      where: { status: 'active' },
      _count: { clinicianId: true },
      orderBy: {
        _count: {
          clinicianId: 'desc'
        }
      },
      take: 10
    });

    // Get clinician details for distribution
    const clinicianIds = clinicianDistribution.map(item => item.clinicianId).filter(id => id !== null);
    const clinicians = await prisma.clinician.findMany({
      where: { id: { in: clinicianIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true
      }
    });

    const distributionWithNames = clinicianDistribution.map(item => {
      const clinician = clinicians.find(c => c.id === item.clinicianId);
      return {
        clinician,
        activeEnrollments: item._count.clinicianId
      };
    });

    res.json({
      data: {
        overview: {
          total: totalEnrollments,
          active: activeEnrollments,
          paused: pausedEnrollments,
          ended: endedEnrollments
        },
        clinicianDistribution: distributionWithNames
      }
    });
  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    res.status(500).json({
      error: 'Internal server error while fetching enrollment statistics'
    });
  }
};

// Add this new function before the module.exports
const createBulkEnrollments = async (req, res) => {
  try {
    const { enrollments } = req.body;

    if (!enrollments || !Array.isArray(enrollments)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: enrollments array is required'
      });
    }

    const results = {
      success: true,
      created: {
        enrollments: 0,
        patients: 0,
        clinicians: 0
      },
      found: {
        patients: 0,
        clinicians: 0,
        carePrograms: 0
      },
      data: [],
      warnings: [],
      errors: []
    };

    for (const enrollmentData of enrollments) {
      try {
        const { enrollment, patient, clinician, careProgram } = enrollmentData;

        // Handle patient creation/finding
        let patientRecord;
        if (patient.action === 'create_or_find') {
          // Try to find existing patient first
          patientRecord = await prisma.patient.findFirst({
            where: {
              OR: [
                { email: patient.identifiers.email },
                { mrn: patient.identifiers.mrn }
              ].filter(Boolean)
            }
          });

          if (patientRecord) {
            results.found.patients++;
          } else {
            // Create new patient
            patientRecord = await prisma.patient.create({
              data: {
                firstName: patient.data.firstName,
                lastName: patient.data.lastName,
                email: patient.data.email,
                phone: patient.data.phone,
                dateOfBirth: patient.data.dateOfBirth ? new Date(patient.data.dateOfBirth) : null,
                gender: patient.data.gender,
                address: patient.data.address,
                emergencyContact: patient.data.emergencyContact,
                medicalHistory: patient.data.medicalHistory,
                insuranceInfo: patient.data.insuranceInfo,
                mrn: patient.data.mrn
              }
            });
            results.created.patients++;
          }
        }

        // Handle clinician creation/finding
        let clinicianRecord;
        if (clinician.action === 'find_or_create') {
          // Try to find existing clinician first
          clinicianRecord = await prisma.clinician.findFirst({
            where: {
              OR: [
                { email: clinician.identifiers.email },
                { npi: clinician.identifiers.npi }
              ].filter(Boolean)
            }
          });

          if (clinicianRecord) {
            results.found.clinicians++;
          } else {
            // Create new clinician
            clinicianRecord = await prisma.clinician.create({
              data: {
                firstName: clinician.data.firstName,
                lastName: clinician.data.lastName,
                email: clinician.data.email,
                phone: clinician.data.phone,
                npi: clinician.data.npi,
                specialization: clinician.data.specialization,
                licenseNumber: clinician.data.licenseNumber,
                department: clinician.data.department,
                credentials: clinician.data.credentials
              }
            });
            results.created.clinicians++;
          }
        }

        // Handle care program finding
        let presetRecord;
        if (careProgram.action === 'find_by_name') {
          presetRecord = await prisma.conditionPreset.findFirst({
            where: { name: careProgram.identifier }
          });

          if (presetRecord) {
            results.found.carePrograms++;
          } else {
            results.warnings.push(`Care program "${careProgram.identifier}" not found`);
            continue; // Skip this enrollment
          }
        }

        // Check if active enrollment already exists
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: {
            patientId: patientRecord.id,
            clinicianId: clinicianRecord.id,
            status: 'active'
          }
        });

        if (existingEnrollment) {
          results.warnings.push(`Active enrollment already exists for patient ${patientRecord.email} and clinician ${clinicianRecord.email}`);
          continue;
        }

        // Create enrollment
        const newEnrollment = await prisma.enrollment.create({
          data: {
            patientId: patientRecord.id,
            clinicianId: clinicianRecord.id,
            presetId: presetRecord.id,
            diagnosisCode: enrollment.diagnosisCode,
            startDate: enrollment.startDate ? new Date(enrollment.startDate) : new Date(),
            endDate: enrollment.endDate ? new Date(enrollment.endDate) : null,
            status: 'active',
            notes: enrollment.notes
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
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            preset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        results.created.enrollments++;
        results.data.push({
          enrollmentId: newEnrollment.id,
          patientId: patientRecord.id,
          clinicianId: clinicianRecord.id,
          presetId: presetRecord.id
        });

      } catch (error) {
        console.error('Error processing enrollment:', error);
        results.errors.push(`Failed to process enrollment: ${error.message}`);
      }
    }

    res.status(201).json(results);

  } catch (error) {
    console.error('Error creating bulk enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating bulk enrollments'
    });
  }
};

// Get enrollment with filtered metric definitions based on condition preset and assessment templates
const getEnrollmentWithFilteredMetrics = async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Fetch enrollment details including the condition preset
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
            department: true,
            email: true,
            phone: true
          }
        },
        preset: {
          include: {
            // Step 2: Get associated assessment templates for that preset
            templates: {
              include: {
                template: {
                  include: {
                    items: {
                      include: {
                        metricDefinition: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Step 3: Filter metric definitions to only show those included in the relevant templates
    const relevantMetricIds = new Set();
    
    if (enrollment.preset?.templates) {
      enrollment.preset.templates.forEach(presetTemplate => {
        presetTemplate.template.items.forEach(item => {
          relevantMetricIds.add(item.metricDefinitionId);
        });
      });
    }

    // Step 4: Get the filtered metric definitions
    const filteredMetricDefinitions = await prisma.metricDefinition.findMany({
      where: {
        id: {
          in: Array.from(relevantMetricIds)
        }
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    // Prepare response with contextual information
    const response = {
      enrollment: {
        id: enrollment.id,
        patientId: enrollment.patientId,
        clinicianId: enrollment.clinicianId,
        presetId: enrollment.presetId,
        diagnosisCode: enrollment.diagnosisCode,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        status: enrollment.status,
        notes: enrollment.notes,
        patient: enrollment.patient,
        clinician: enrollment.clinician,
        preset: {
          id: enrollment.preset.id,
          name: enrollment.preset.name,
          templateCount: enrollment.preset.templates?.length || 0
        }
      },
      assessmentTemplates: enrollment.preset?.templates?.map(pt => ({
        id: pt.template.id,
        name: pt.template.name,
        description: pt.template.description,
        itemCount: pt.template.items?.length || 0,
        isStandardized: pt.template.isStandardized,
        category: pt.template.category
      })) || [],
      filteredMetricDefinitions,
      context: {
        totalAvailableMetrics: filteredMetricDefinitions.length,
        conditionPreset: enrollment.preset?.name,
        filteringApplied: true,
        message: `Showing ${filteredMetricDefinitions.length} metrics relevant to ${enrollment.preset?.name} condition preset`
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching enrollment with filtered metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching enrollment details'
    });
  }
};

module.exports = {
  createEnrollment,
  createBulkEnrollments,
  getAllEnrollments,
  getEnrollmentById,
  getEnrollmentWithFilteredMetrics, // Add the new method
  updateEnrollment,
  deleteEnrollment,
  deactivateEnrollment,
  transferEnrollment,
  getEnrollmentStats
};