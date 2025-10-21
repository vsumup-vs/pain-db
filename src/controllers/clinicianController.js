const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new clinician
const createClinician = async (req, res) => {
  try {
    console.log('Creating clinician with data:', req.body);
    
    const {
      npi,
      firstName,
      lastName,
      email,
      phone,
      specialization,
      licenseNumber,
      department,
      address,
      emergencyContact,
      credentials
    } = req.body;

    // Check if email already exists
    const existingEmail = await prisma.clinician.findUnique({
      where: { email }
    });

    if (existingEmail) {
      console.log('Email already exists:', email);
      return res.status(409).json({
        error: 'Clinician with this email already exists'
      });
    }

    // Check if license number already exists
    const existingLicense = await prisma.clinician.findFirst({
      where: { licenseNumber }
    });

    if (existingLicense) {
      console.log('License number already exists:', licenseNumber);
      return res.status(409).json({
        error: 'Clinician with this license number already exists'
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

    // Check organization type - block PLATFORM organizations from creating clinicians
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

    // Block PLATFORM organizations from creating clinicians (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Clinician management is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    const clinician = await prisma.clinician.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        npi,
        firstName,
        lastName,
        email,
        phone,
        specialization,
        licenseNumber,
        department,
        address,
        emergencyContact,
        credentials
      }
    });

    console.log('Clinician created successfully:', clinician.id);
    res.status(201).json({
      message: 'Clinician created successfully',
      data: clinician
    });
  } catch (error) {
    console.error('Error creating clinician:', error);
    res.status(500).json({
      error: 'Internal server error while creating clinician'
    });
  }
};

// Get all clinicians with pagination and filtering
const getAllClinicians = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      specialization,
      department,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination parameters
    const errors = [];
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        errors: errors
      });
    }

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

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
      organizationId // SECURITY: Always filter by organization
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (specialization) {
      where.specialization = { contains: specialization, mode: 'insensitive' };
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }
    
    const [clinicians, total] = await Promise.all([
      prisma.clinician.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.clinician.count({ where })
    ]);

    res.json({
      data: clinicians,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching clinicians:', error);
    res.status(500).json({
      error: 'Internal server error while fetching clinicians'
    });
  }
};

// Get overall clinician statistics
const getOverallClinicianStats = async (req, res) => {
  try {
    // Use raw SQL for the most expensive query (active count)
    const [activeCountResult, total, bySpecialization, byDepartment] = await Promise.all([
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT c.id) as active_count
        FROM "clinicians" c
        INNER JOIN "enrollments" e ON c.id = e."clinicianId"
        WHERE e.status = 'ACTIVE'
      `,
      prisma.clinician.count(),
      prisma.clinician.groupBy({
        by: ['specialization'],
        _count: true
      }),
      prisma.clinician.groupBy({
        by: ['department'],
        _count: true,
        where: {
          department: {
            not: null
          }
        }
      })
    ]);

    const active = Number(activeCountResult[0].active_count);

    const specializationMap = bySpecialization.reduce((acc, stat) => {
      acc[stat.specialization] = stat._count;
      return acc;
    }, {});

    const departmentMap = byDepartment.reduce((acc, stat) => {
      acc[stat.department] = stat._count;
      return acc;
    }, {});

    res.json({
      data: {
        total,
        active,
        bySpecialization: specializationMap,
        byDepartment: departmentMap
      }
    });
  } catch (error) {
    console.error('Error fetching overall clinician stats:', error);
    res.status(500).json({
      error: 'Internal server error while fetching clinician statistics'
    });
  }
};

// Get a single clinician by ID
const getClinicianById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid clinician ID format'
      });
    }

    const clinician = await prisma.clinician.findUnique({
      where: { id },
      include: {
        enrollments: {
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
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!clinician) {
      return res.status(404).json({
        error: 'Clinician not found'
      });
    }

    res.json({
      data: clinician
    });
  } catch (error) {
    console.error('Error fetching clinician:', error);
    res.status(500).json({
      error: 'Internal server error while fetching clinician'
    });
  }
};

// Update a clinician
const updateClinician = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid clinician ID format'
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Check if clinician exists
    const existingClinician = await prisma.clinician.findUnique({
      where: { id }
    });

    if (!existingClinician) {
      return res.status(404).json({
        error: 'Clinician not found'
      });
    }

    // Check for email uniqueness if email is being updated
    if (updateData.email && updateData.email !== existingClinician.email) {
      const emailExists = await prisma.clinician.findUnique({
        where: { email: updateData.email }
      });

      if (emailExists) {
        return res.status(400).json({
          error: 'Email already exists'
        });
      }
    }

    const updatedClinician = await prisma.clinician.update({
      where: { id },
      data: updateData
    });

    res.json({
      data: updatedClinician,
      message: 'Clinician updated successfully'
    });
  } catch (error) {
    console.error('Error updating clinician:', error);
    res.status(500).json({
      error: 'Internal server error while updating clinician'
    });
  }
};

// Delete a clinician
const deleteClinician = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid clinician ID format'
      });
    }

    // Check if clinician exists
    const existingClinician = await prisma.clinician.findUnique({
      where: { id },
      include: {
        enrollments: true
      }
    });

    if (!existingClinician) {
      return res.status(404).json({
        error: 'Clinician not found'
      });
    }

    // Check if clinician has active enrollments
    const activeEnrollments = existingClinician.enrollments.filter(
      enrollment => enrollment.status === 'ACTIVE'
    );

    if (activeEnrollments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete clinician with active enrollments. Please transfer or deactivate enrollments first.',
        activeEnrollments: activeEnrollments.length
      });
    }

    // Use transaction to handle deletion
    await prisma.$transaction(async (tx) => {
      // Update enrollments to completed status
      await tx.enrollment.updateMany({
        where: { clinicianId: id },
        data: { status: 'COMPLETED' }
      });

      // Delete the clinician
      await tx.clinician.delete({
        where: { id }
      });
    });

    res.json({
      message: 'Clinician deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting clinician:', error);
    res.status(500).json({
      error: 'Internal server error while deleting clinician'
    });
  }
};

// Get clinician statistics and workload
const getClinicianStats = async (req, res) => {
  try {
    const { id } = req.params;

    const clinician = await prisma.clinician.findUnique({
      where: { id }
    });

    if (!clinician) {
      return res.status(404).json({
        error: 'Clinician not found'
      });
    }

    const [totalPatients, activeEnrollments, totalObservations, recentAlerts] = await Promise.all([
      prisma.enrollment.count({
        where: { clinicianId: id }
      }),
      prisma.enrollment.count({
        where: {
          clinicianId: id,
          status: 'ACTIVE'
        }
      }),
      prisma.observation.count({
        where: {
          patient: {
            enrollments: {
              some: {
                clinicianId: id,
                status: 'ACTIVE'
              }
            }
          }
        }
      }),
      prisma.alert.count({
        where: {
          patient: {
            enrollments: {
              some: {
                clinicianId: id,
                status: 'ACTIVE'
              }
            }
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    // Get patient distribution by enrollment status
    const enrollmentStats = await prisma.enrollment.groupBy({
      by: ['status'],
      where: { clinicianId: id },
      _count: true
    });

    res.json({
      data: {
        clinicianId: id,
        workload: {
          totalPatients,
          activeEnrollments,
          totalObservations,
          recentAlerts
        },
        enrollmentDistribution: enrollmentStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching clinician stats:', error);
    res.status(500).json({
      error: 'Internal server error while fetching clinician statistics'
    });
  }
};

// Get clinicians by specialization
const getCliniciansBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;

    const clinicians = await prisma.clinician.findMany({
      where: {
        specialization: {
          contains: specialization,
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
      orderBy: {
        lastName: 'asc'
      }
    });

    res.json({
      data: clinicians,
      count: clinicians.length
    });
  } catch (error) {
    console.error('Error fetching clinicians by specialization:', error);
    res.status(500).json({
      error: 'Internal server error while fetching clinicians'
    });
  }
};

module.exports = {
  createClinician,
  getAllClinicians,
  getClinicianById,
  updateClinician,
  deleteClinician,
  getClinicianStats,
  getOverallClinicianStats,
  getCliniciansBySpecialization
};