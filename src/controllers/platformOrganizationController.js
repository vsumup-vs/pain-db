const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Platform Organization Controller
 *
 * CRUD operations for platform admins to manage client organizations
 * Includes subscription management, usage tracking, and billing
 */

/**
 * GET /api/platform/organizations
 * List all client organizations with pagination, filtering, and sorting
 */
async function getAllOrganizations(req, res) {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      status, // TRIAL, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
      tier, // BASIC, PRO, ENTERPRISE, CUSTOM
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where = {
      type: { not: 'PLATFORM' } // Exclude PLATFORM organizations (internal use)
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.subscriptionStatus = status;
    }

    if (tier) {
      where.subscriptionTier = tier;
    }

    // Execute query with counts
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          type: true,
          email: true,
          phone: true,
          address: true,
          website: true,
          isActive: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
          trialEndsAt: true,
          maxUsers: true,
          maxPatients: true,
          maxClinicians: true,
          billingContactName: true,
          billingContactEmail: true,
          billingContactPhone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              userOrganizations: true,
              patients: true,
              clinicians: true
            }
          }
        }
      }),
      prisma.organization.count({ where })
    ]);

    // Add usage percentages to each organization
    const organizationsWithUsage = organizations.map(org => ({
      ...org,
      usage: {
        users: org._count.userOrganizations,
        usersPercentage: org.maxUsers ? Math.round((org._count.userOrganizations / org.maxUsers) * 100) : null,
        patients: org._count.patients,
        patientsPercentage: org.maxPatients ? Math.round((org._count.patients / org.maxPatients) * 100) : null,
        clinicians: org._count.clinicians,
        cliniciansPercentage: org.maxClinicians ? Math.round((org._count.clinicians / org.maxClinicians) * 100) : null
      }
    }));

    res.json({
      success: true,
      data: organizationsWithUsage,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizations',
      message: error.message
    });
  }
}

/**
 * POST /api/platform/organizations
 * Create a new client organization with subscription settings
 */
async function createOrganization(req, res) {
  try {
    const {
      name,
      type,
      email,
      phone,
      address,
      website,
      domain,
      subscriptionTier = 'TRIAL',
      subscriptionStatus = 'TRIAL',
      maxUsers,
      maxPatients,
      maxClinicians,
      billingContact,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Check if organization with this email already exists
    const existingOrg = await prisma.organization.findFirst({
      where: { email }
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: 'Organization with this email already exists'
      });
    }

    // Check if domain is already taken
    if (domain) {
      const existingDomain = await prisma.organization.findFirst({
        where: { domain }
      });

      if (existingDomain) {
        return res.status(409).json({
          success: false,
          error: 'Domain already taken'
        });
      }
    }

    // Calculate subscription dates
    const subscriptionStartDate = new Date();
    let subscriptionEndDate = null;

    // If trial, set end date to 30 days from now
    if (subscriptionStatus === 'TRIAL') {
      subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        type: type || 'CLINIC',
        email,
        phone,
        address,
        website,
        domain,
        isActive: true,
        subscriptionTier,
        subscriptionStatus,
        subscriptionStartDate,
        subscriptionEndDate,
        maxUsers: maxUsers || null,
        maxPatients: maxPatients || null,
        maxClinicians: maxClinicians || null,
        billingContact,
        onboardedBy: req.user.userId, // Platform admin who created this org
        settings: {
          timezone: 'UTC',
          features: {},
          notifications: {}
        }
      },
      include: {
        _count: {
          select: {
            userOrganizations: true,
            patients: true,
            clinicians: true
          }
        }
      }
    });

    // Create initial subscription history entry
    await prisma.subscriptionHistory.create({
      data: {
        organizationId: organization.id,
        previousTier: null,
        newTier: subscriptionTier,
        previousStatus: null,
        newStatus: subscriptionStatus,
        changeReason: 'Initial organization creation',
        changedBy: req.user.userId
      }
    });

    res.status(201).json({
      success: true,
      data: organization,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization',
      message: error.message
    });
  }
}

/**
 * GET /api/platform/organizations/:id
 * Get detailed organization information including usage stats
 */
async function getOrganizationById(req, res) {
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
            supportTickets: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Don't allow viewing PLATFORM organization details through this endpoint
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        error: 'Cannot access PLATFORM organization through this endpoint'
      });
    }

    // Get recent invoices
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: id },
      orderBy: { issueDate: 'desc' },
      take: 5
    });

    // Get active support tickets
    const activeSupportTickets = await prisma.supportTicket.count({
      where: {
        organizationId: id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });

    // Calculate usage percentages
    const usage = {
      users: {
        current: organization._count.userOrganizations,
        max: organization.maxUsers,
        percentage: organization.maxUsers
          ? Math.round((organization._count.userOrganizations / organization.maxUsers) * 100)
          : null
      },
      patients: {
        current: organization._count.patients,
        max: organization.maxPatients,
        percentage: organization.maxPatients
          ? Math.round((organization._count.patients / organization.maxPatients) * 100)
          : null
      },
      clinicians: {
        current: organization._count.clinicians,
        max: organization.maxClinicians,
        percentage: organization.maxClinicians
          ? Math.round((organization._count.clinicians / organization.maxClinicians) * 100)
          : null
      },
      carePrograms: organization._count.carePrograms,
      supportTickets: organization._count.supportTickets
    };

    res.json({
      success: true,
      data: {
        ...organization,
        usage,
        recentInvoices: invoices,
        activeSupportTickets
      }
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization',
      message: error.message
    });
  }
}

/**
 * PUT /api/platform/organizations/:id
 * Update organization details, subscription, or billing settings
 */
async function updateOrganization(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      email,
      phone,
      address,
      website,
      domain,
      isActive,
      subscriptionTier,
      subscriptionStatus,
      subscriptionEndDate,
      maxUsers,
      maxPatients,
      maxClinicians,
      billingContact,
      billingCycle,
      paymentMethod,
      notes
    } = req.body;

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id }
    });

    if (!existingOrg) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Don't allow updating PLATFORM organization through this endpoint
    if (existingOrg.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        error: 'Cannot update PLATFORM organization through this endpoint'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingOrg.email) {
      const emailTaken = await prisma.organization.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });

      if (emailTaken) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken by another organization'
        });
      }
    }

    // Check if domain is being changed and if it's already taken
    if (domain && domain !== existingOrg.domain) {
      const domainTaken = await prisma.organization.findFirst({
        where: {
          domain,
          id: { not: id }
        }
      });

      if (domainTaken) {
        return res.status(409).json({
          success: false,
          error: 'Domain already taken'
        });
      }
    }

    // Track subscription changes for history
    const subscriptionChanged =
      (subscriptionTier && subscriptionTier !== existingOrg.subscriptionTier) ||
      (subscriptionStatus && subscriptionStatus !== existingOrg.subscriptionStatus);

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (website !== undefined) updateData.website = website;
    if (domain !== undefined) updateData.domain = domain;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (subscriptionTier !== undefined) updateData.subscriptionTier = subscriptionTier;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionEndDate !== undefined) updateData.subscriptionEndDate = new Date(subscriptionEndDate);
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (maxPatients !== undefined) updateData.maxPatients = maxPatients;
    if (maxClinicians !== undefined) updateData.maxClinicians = maxClinicians;
    if (billingContact !== undefined) updateData.billingContact = billingContact;
    if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

    // Update organization
    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            userOrganizations: true,
            patients: true,
            clinicians: true
          }
        }
      }
    });

    // Create subscription history entry if subscription changed
    if (subscriptionChanged) {
      await prisma.subscriptionHistory.create({
        data: {
          organizationId: id,
          previousTier: existingOrg.subscriptionTier,
          newTier: subscriptionTier || existingOrg.subscriptionTier,
          previousStatus: existingOrg.subscriptionStatus,
          newStatus: subscriptionStatus || existingOrg.subscriptionStatus,
          changeReason: notes || 'Subscription updated by platform admin',
          changedBy: req.user.userId
        }
      });
    }

    res.json({
      success: true,
      data: organization,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization',
      message: error.message
    });
  }
}

/**
 * DELETE /api/platform/organizations/:id
 * Soft delete an organization (set isActive to false)
 */
async function deleteOrganization(req, res) {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Don't allow deleting PLATFORM organization
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete PLATFORM organization'
      });
    }

    // Soft delete by setting isActive to false
    await prisma.organization.update({
      where: { id },
      data: {
        isActive: false,
        subscriptionStatus: 'CANCELLED'
      }
    });

    // Create subscription history entry
    await prisma.subscriptionHistory.create({
      data: {
        organizationId: id,
        previousTier: organization.subscriptionTier,
        newTier: organization.subscriptionTier,
        previousStatus: organization.subscriptionStatus,
        newStatus: 'CANCELLED',
        changeReason: 'Organization deleted by platform admin',
        changedBy: req.user.userId
      }
    });

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization',
      message: error.message
    });
  }
}

/**
 * GET /api/platform/organizations/:id/usage
 * Get detailed usage statistics for an organization
 */
async function getOrganizationUsage(req, res) {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        maxUsers: true,
        maxPatients: true,
        maxClinicians: true,
        _count: {
          select: {
            userOrganizations: true,
            patients: true,
            clinicians: true,
            carePrograms: true,
            supportTickets: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Get active users
    const activeUsers = await prisma.userOrganization.count({
      where: {
        organizationId: id,
        isActive: true
      }
    });

    // Get active patients
    const activePatients = await prisma.patient.count({
      where: {
        organizationId: id,
        isActive: true
      }
    });

    // Get active clinicians
    const activeClinicians = await prisma.clinician.count({
      where: {
        organizationId: id,
        isActive: true
      }
    });

    // Get active enrollments
    const activeEnrollments = await prisma.enrollment.count({
      where: {
        organizationId: id,
        status: 'ACTIVE'
      }
    });

    // Get recent alerts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAlerts = await prisma.alert.count({
      where: {
        organizationId: id,
        triggeredAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Get active support tickets
    const activeSupportTickets = await prisma.supportTicket.count({
      where: {
        organizationId: id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });

    // Calculate usage percentages and limits
    const usage = {
      users: {
        total: organization._count.userOrganizations,
        active: activeUsers,
        max: organization.maxUsers,
        percentage: organization.maxUsers
          ? Math.round((organization._count.userOrganizations / organization.maxUsers) * 100)
          : null,
        remaining: organization.maxUsers
          ? organization.maxUsers - organization._count.userOrganizations
          : null,
        atLimit: organization.maxUsers
          ? organization._count.userOrganizations >= organization.maxUsers
          : false
      },
      patients: {
        total: organization._count.patients,
        active: activePatients,
        max: organization.maxPatients,
        percentage: organization.maxPatients
          ? Math.round((organization._count.patients / organization.maxPatients) * 100)
          : null,
        remaining: organization.maxPatients
          ? organization.maxPatients - organization._count.patients
          : null,
        atLimit: organization.maxPatients
          ? organization._count.patients >= organization.maxPatients
          : false
      },
      clinicians: {
        total: organization._count.clinicians,
        active: activeClinicians,
        max: organization.maxClinicians,
        percentage: organization.maxClinicians
          ? Math.round((organization._count.clinicians / organization.maxClinicians) * 100)
          : null,
        remaining: organization.maxClinicians
          ? organization.maxClinicians - organization._count.clinicians
          : null,
        atLimit: organization.maxClinicians
          ? organization._count.clinicians >= organization.maxClinicians
          : false
      },
      carePrograms: organization._count.carePrograms,
      enrollments: {
        active: activeEnrollments
      },
      alerts: {
        last30Days: recentAlerts
      },
      supportTickets: {
        active: activeSupportTickets
      }
    };

    res.json({
      success: true,
      data: {
        organizationId: id,
        organizationName: organization.name,
        subscriptionTier: organization.subscriptionTier,
        usage
      }
    });
  } catch (error) {
    console.error('Error fetching organization usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization usage',
      message: error.message
    });
  }
}

module.exports = {
  getAllOrganizations,
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsage
};
