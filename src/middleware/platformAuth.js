const auditService = require('../services/auditService');
const rbacService = require('../services/rbacService');

/**
 * Platform Admin Authentication Middleware
 *
 * Middleware functions for platform-level operations restricted to platform administrators
 */

/**
 * Require platform admin access
 * Verifies that the user has isPlatformAdmin flag set to true
 */
async function requirePlatformAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user is a platform admin
    if (!req.user.isPlatformAdmin) {
      // Log unauthorized access attempt
      await auditService.log({
        action: 'PLATFORM_ACCESS_DENIED',
        userId: req.user.userId,
        organizationId: req.user.currentOrganization,
        metadata: {
          endpoint: req.path,
          method: req.method,
          reason: 'Not a platform admin'
        },
        ipAddress: req.ip,
        hipaaRelevant: false
      });

      return res.status(403).json({
        error: 'Platform administrator access required',
        code: 'PLATFORM_ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Platform admin check error:', error);
    return res.status(500).json({
      error: 'Platform admin verification failed',
      code: 'PLATFORM_ADMIN_CHECK_ERROR'
    });
  }
}

/**
 * Require specific platform permission
 * @param {string} permission - Platform permission required (e.g., 'PLATFORM_ORG_CREATE')
 */
function requirePlatformPermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Platform admins must have the isPlatformAdmin flag
      if (!req.user.isPlatformAdmin) {
        await auditService.log({
          action: 'PLATFORM_PERMISSION_DENIED',
          userId: req.user.userId,
          organizationId: req.user.currentOrganization,
          metadata: {
            permission,
            endpoint: req.path,
            method: req.method,
            reason: 'Not a platform admin'
          },
          ipAddress: req.ip,
          hipaaRelevant: false
        });

        return res.status(403).json({
          error: 'Platform administrator access required',
          code: 'PLATFORM_ADMIN_REQUIRED'
        });
      }

      // Get user's permissions from JWT token
      const userPermissions = req.user.permissions || [];

      // Check if user has the required platform permission
      const hasPermission = rbacService.hasPermission(userPermissions, permission);

      if (!hasPermission) {
        await auditService.log({
          action: 'PLATFORM_PERMISSION_DENIED',
          userId: req.user.userId,
          organizationId: req.user.currentOrganization,
          metadata: {
            permission,
            endpoint: req.path,
            method: req.method,
            userPermissions,
            reason: 'Missing required permission'
          },
          ipAddress: req.ip,
          hipaaRelevant: false
        });

        return res.status(403).json({
          error: 'Insufficient platform permissions',
          code: 'PLATFORM_PERMISSION_DENIED',
          required: permission
        });
      }

      next();
    } catch (error) {
      console.error('Platform permission check error:', error);
      return res.status(500).json({
        error: 'Platform permission verification failed',
        code: 'PLATFORM_PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Block PLATFORM organization from accessing clinical endpoints
 * This middleware ensures PLATFORM organizations cannot create patients, clinicians, enrollments, etc.
 */
async function blockPlatformOrganization(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get organization ID from request context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if this is a PLATFORM organization
    const { prisma } = require('../services/db');
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

    // Block PLATFORM organizations from clinical operations
    if (organization.type === 'PLATFORM') {
      await auditService.log({
        action: 'PLATFORM_ORG_BLOCKED',
        userId: req.user.userId,
        organizationId: organization.id,
        metadata: {
          endpoint: req.path,
          method: req.method,
          organizationType: 'PLATFORM',
          reason: 'PLATFORM organizations cannot perform clinical operations'
        },
        ipAddress: req.ip,
        hipaaRelevant: false
      });

      return res.status(403).json({
        success: false,
        message: 'This operation is not available for platform organizations. Platform organizations can only manage users, organizations, billing, and support - not clinical data.',
        code: 'PLATFORM_ORG_BLOCKED'
      });
    }

    next();
  } catch (error) {
    console.error('Platform organization block check error:', error);
    return res.status(500).json({
      error: 'Organization type verification failed',
      code: 'ORG_TYPE_CHECK_ERROR'
    });
  }
}

module.exports = {
  requirePlatformAdmin,
  requirePlatformPermission,
  blockPlatformOrganization
};
