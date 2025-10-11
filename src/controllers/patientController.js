const { PrismaClient } = require('@prisma/client');

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
      insuranceInfo
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
        insuranceInfo
      }
    });

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
      limit = 10,
      search,
      gender,
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
          }
        }
      }),
      prisma.patient.count({ where })
    ]);

    res.json({
      data: patients,
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
      enrollment => enrollment.status === 'active'
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
          status: 'active'
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

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientStats,
  getGeneralPatientStats,
  getRecentPatients
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