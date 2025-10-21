const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

/**
 * Get all care programs for an organization
 * GET /api/care-programs
 */
const getAllCarePrograms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      type,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: 'Page must be a positive integer'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: 'Limit must be a positive integer between 1 and 1000'
      });
    }

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    // Build where clause
    const where = {
      organizationId // SECURITY: Always filter by organization
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get care programs and total count
    const [carePrograms, total] = await Promise.all([
      prisma.careProgram.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      }),
      prisma.careProgram.count({ where })
    ]);

    res.json({
      data: carePrograms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching care programs:', error);
    res.status(500).json({
      error: 'Internal server error while fetching care programs'
    });
  }
};

/**
 * Get a single care program by ID
 * GET /api/care-programs/:id
 */
const getCareProgramById = async (req, res) => {
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

    const careProgram = await prisma.careProgram.findFirst({
      where: {
        id,
        organizationId // SECURITY: Ensure user can only access their org's programs
      },
      include: {
        enrollments: {
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
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!careProgram) {
      return res.status(404).json({
        error: 'Care program not found'
      });
    }

    res.json({
      data: careProgram
    });
  } catch (error) {
    console.error('Error fetching care program:', error);
    res.status(500).json({
      error: 'Internal server error while fetching care program'
    });
  }
};

/**
 * Create a new care program
 * POST /api/care-programs
 */
const createCareProgram = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      isActive = true,
      settings
    } = req.body;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        error: 'Missing required fields: name and type are required'
      });
    }

    // Validate program type
    const validTypes = ['PAIN_MANAGEMENT', 'DIABETES', 'HYPERTENSION', 'MENTAL_HEALTH', 'CARDIAC_REHAB', 'GENERAL_WELLNESS'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid program type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Check for duplicate name within organization
    const existingProgram = await prisma.careProgram.findFirst({
      where: {
        organizationId,
        name
      }
    });

    if (existingProgram) {
      return res.status(409).json({
        error: 'A care program with this name already exists in your organization'
      });
    }

    // Create care program
    const careProgram = await prisma.careProgram.create({
      data: {
        organizationId,
        name,
        type,
        description,
        isActive,
        settings
      }
    });

    console.log('Care program created:', careProgram.id);
    res.status(201).json({
      message: 'Care program created successfully',
      data: careProgram
    });
  } catch (error) {
    console.error('Error creating care program:', error);
    res.status(500).json({
      error: 'Internal server error while creating care program'
    });
  }
};

/**
 * Update a care program
 * PUT /api/care-programs/:id
 */
const updateCareProgram = async (req, res) => {
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

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Check if care program exists and belongs to user's organization
    const existingProgram = await prisma.careProgram.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingProgram) {
      return res.status(404).json({
        error: 'Care program not found'
      });
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== existingProgram.name) {
      const duplicateName = await prisma.careProgram.findFirst({
        where: {
          organizationId,
          name: updateData.name,
          id: { not: id }
        }
      });

      if (duplicateName) {
        return res.status(409).json({
          error: 'A care program with this name already exists in your organization'
        });
      }
    }

    // Update care program
    const updatedProgram = await prisma.careProgram.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Care program updated successfully',
      data: updatedProgram
    });
  } catch (error) {
    console.error('Error updating care program:', error);
    res.status(500).json({
      error: 'Internal server error while updating care program'
    });
  }
};

/**
 * Delete a care program
 * DELETE /api/care-programs/:id
 */
const deleteCareProgram = async (req, res) => {
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

    // Check if care program exists and belongs to user's organization
    const existingProgram = await prisma.careProgram.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        enrollments: true
      }
    });

    if (!existingProgram) {
      return res.status(404).json({
        error: 'Care program not found'
      });
    }

    // Check if program has active enrollments
    const activeEnrollments = existingProgram.enrollments.filter(
      enrollment => enrollment.status === 'ACTIVE'
    );

    if (activeEnrollments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete care program with active enrollments. Please end or transfer enrollments first.',
        activeEnrollments: activeEnrollments.length
      });
    }

    // Delete care program (cascade will handle enrollments)
    await prisma.careProgram.delete({
      where: { id }
    });

    res.json({
      message: 'Care program deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting care program:', error);
    res.status(500).json({
      error: 'Internal server error while deleting care program'
    });
  }
};

/**
 * Get care program statistics
 * GET /api/care-programs/stats
 */
const getCareProgramStats = async (req, res) => {
  try {
    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const [total, active, byType] = await Promise.all([
      prisma.careProgram.count({
        where: { organizationId }
      }),
      prisma.careProgram.count({
        where: {
          organizationId,
          isActive: true
        }
      }),
      prisma.careProgram.groupBy({
        by: ['type'],
        where: { organizationId },
        _count: true
      })
    ]);

    const typeMap = byType.reduce((acc, stat) => {
      acc[stat.type] = stat._count;
      return acc;
    }, {});

    res.json({
      data: {
        total,
        active,
        inactive: total - active,
        byType: typeMap
      }
    });
  } catch (error) {
    console.error('Error fetching care program stats:', error);
    res.status(500).json({
      error: 'Internal server error while fetching care program statistics'
    });
  }
};

module.exports = {
  getAllCarePrograms,
  getCareProgramById,
  createCareProgram,
  updateCareProgram,
  deleteCareProgram,
  getCareProgramStats
};
