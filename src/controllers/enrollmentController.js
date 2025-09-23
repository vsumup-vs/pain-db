const { PrismaClient } = require('../../generated/prisma');

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
      notes
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

    const enrollment = await prisma.enrollment.create({
      data: {
        patientId,
        clinicianId,
        presetId,
        diagnosisCode,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status,
        consentAt: consentAt ? new Date(consentAt) : null
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

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully',
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

    // Build where clause for filtering
    const where = {};
    
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

module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  deactivateEnrollment,
  transferEnrollment,
  getEnrollmentStats
};