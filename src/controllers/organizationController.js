const { prisma } = require('../services/db');
const auditService = require('../services/auditService');

/**
 * Get all organizations
 * SUPER_ADMIN: sees all organizations
 * ORG_ADMIN: sees only their organizations
 */
exports.getAllOrganizations = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, isActive } = req.query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // SUPER_ADMIN sees all, others see only their organizations
    if (req.user.role !== 'SUPER_ADMIN') {
      const userOrgIds = req.user.organizations.map(org => org.organizationId);
      where.id = { in: userOrgIds };
    }

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              userOrganizations: true,
              patients: true,
              clinicians: true,
              carePrograms: true
            }
          }
        }
      }),
      prisma.organization.count({ where })
    ]);

    res.json({
      data: organizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      error: 'Failed to fetch organizations',
      code: 'ORG_FETCH_FAILED'
    });
  }
};

/**
 * Get single organization
 */
exports.getOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userOrganizations: true,
            patients: true,
            clinicians: true,
            carePrograms: true,
            enrollments: true
          }
        },
        carePrograms: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Check access: SUPER_ADMIN or user belongs to this org
    if (req.user.role !== 'SUPER_ADMIN') {
      const hasAccess = req.user.organizations.some(
        org => org.organizationId === id
      );

      if (!hasAccess) {
        await auditService.log({
          action: 'UNAUTHORIZED_ORG_ACCESS',
          userId: req.user.userId,
          organizationId: req.user.currentOrganization,
          metadata: { attemptedOrgId: id },
          ipAddress: req.ip,
          hipaaRelevant: true
        });

        return res.status(403).json({
          error: 'Access denied to this organization',
          code: 'ORG_ACCESS_DENIED'
        });
      }
    }

    res.json({ data: organization });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      error: 'Failed to fetch organization',
      code: 'ORG_FETCH_FAILED'
    });
  }
};

/**
 * Create organization (SUPER_ADMIN only)
 */
exports.createOrganization = async (req, res) => {
  try {
    const {
      name,
      type,
      email,
      phone,
      address,
      website,
      isActive = true,
      settings
    } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        error: 'Name and type are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if organization name already exists
    const existing = await prisma.organization.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Organization with this name already exists',
        code: 'ORG_NAME_EXISTS'
      });
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        type,
        email,
        phone,
        address,
        website,
        isActive,
        settings: settings || {}
      }
    });

    // Audit log
    await auditService.log({
      action: 'ORGANIZATION_CREATED',
      userId: req.user.userId,
      organizationId: organization.id,
      metadata: {
        organizationName: name,
        type
      },
      ipAddress: req.ip,
      hipaaRelevant: true
    });

    res.status(201).json({
      data: organization,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({
      error: 'Failed to create organization',
      code: 'ORG_CREATE_FAILED',
      details: error.message
    });
  }
};

/**
 * Update organization
 */
exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      email,
      phone,
      address,
      website,
      isActive,
      settings
    } = req.body;

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Check access
    if (req.user.role !== 'SUPER_ADMIN') {
      const hasAccess = req.user.organizations.some(
        org => org.organizationId === id && org.role === 'ORG_ADMIN'
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to update this organization',
          code: 'ORG_UPDATE_DENIED'
        });
      }
    }

    // Check for name conflicts if name is being changed
    if (name && name !== existing.name) {
      const nameConflict = await prisma.organization.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return res.status(400).json({
          error: 'Organization with this name already exists',
          code: 'ORG_NAME_EXISTS'
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (website !== undefined) updateData.website = website;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (settings !== undefined) updateData.settings = settings;

    // Update organization
    const organization = await prisma.organization.update({
      where: { id },
      data: updateData
    });

    // Audit log
    await auditService.log({
      action: 'ORGANIZATION_UPDATED',
      userId: req.user.userId,
      organizationId: id,
      metadata: {
        organizationName: organization.name,
        updatedFields: Object.keys(updateData)
      },
      oldValues: existing,
      newValues: organization,
      ipAddress: req.ip,
      hipaaRelevant: true
    });

    res.json({
      data: organization,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      error: 'Failed to update organization',
      code: 'ORG_UPDATE_FAILED',
      details: error.message
    });
  }
};

/**
 * Delete organization (SUPER_ADMIN only)
 * With safeguards - cannot delete if has users, patients, etc.
 */
exports.deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userOrganizations: true,
            patients: true,
            clinicians: true,
            carePrograms: true,
            enrollments: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Prevent deletion if organization has data
    const hasData =
      organization._count.userOrganizations > 0 ||
      organization._count.patients > 0 ||
      organization._count.clinicians > 0 ||
      organization._count.carePrograms > 0 ||
      organization._count.enrollments > 0;

    if (hasData) {
      return res.status(400).json({
        error: 'Cannot delete organization with existing users, patients, or programs',
        code: 'ORG_HAS_DATA',
        details: {
          users: organization._count.userOrganizations,
          patients: organization._count.patients,
          clinicians: organization._count.clinicians,
          programs: organization._count.carePrograms,
          enrollments: organization._count.enrollments
        }
      });
    }

    // Delete organization
    await prisma.organization.delete({
      where: { id }
    });

    // Audit log
    await auditService.log({
      action: 'ORGANIZATION_DELETED',
      userId: req.user.userId,
      organizationId: id,
      metadata: {
        organizationName: organization.name,
        type: organization.type
      },
      oldValues: organization,
      ipAddress: req.ip,
      hipaaRelevant: true
    });

    res.json({
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({
      error: 'Failed to delete organization',
      code: 'ORG_DELETE_FAILED',
      details: error.message
    });
  }
};

/**
 * Get organization statistics
 */
exports.getOrganizationStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user.role !== 'SUPER_ADMIN') {
      const hasAccess = req.user.organizations.some(
        org => org.organizationId === id
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ORG_ACCESS_DENIED'
        });
      }
    }

    const stats = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            userOrganizations: true,
            patients: true,
            clinicians: true,
            carePrograms: true,
            enrollments: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    res.json({ data: stats });
  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch organization statistics',
      code: 'ORG_STATS_FAILED'
    });
  }
};
