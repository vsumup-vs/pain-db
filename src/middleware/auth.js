const jwtService = require('../services/jwtService');
const rbacService = require('../services/rbacService');
const auditService = require('../services/auditService');
const { prisma } = require('../services/db');

/**
 * Enhanced authentication middleware with RBAC support
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.authToken ||
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers['x-auth-token'];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // Verify and decode token
    const decoded = await jwtService.verifyToken(token);
    
    // Fetch fresh user data with organizations and roles
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'User account not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Attach user context to request
    req.user = {
      ...decoded,
      userData: user,
      organizations: user.userOrganizations
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
}

/**
 * Require specific permission
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasPermission = await rbacService.hasPermission(
        req.user.userId,
        permission,
        req.user.currentOrganization
      );

      if (!hasPermission) {
        await auditService.log({
          action: 'ACCESS_DENIED',
          userId: req.user.userId,
          organizationId: req.user.currentOrganization,
          metadata: { 
            permission,
            endpoint: req.path,
            method: req.method
          },
          ipAddress: req.ip
        });

        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permission
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Permission verification failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Require access to specific care program
 */
function requireProgramAccess(programId = null) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Use programId from parameter or request body/params
      const targetProgramId = programId || req.body.programId || req.params.programId;
      
      if (!targetProgramId) {
        return res.status(400).json({ 
          error: 'Program ID required',
          code: 'PROGRAM_ID_MISSING'
        });
      }

      const hasAccess = await rbacService.hasProgramAccess(
        req.user.userId,
        targetProgramId,
        req.user.currentOrganization
      );

      if (!hasAccess) {
        await auditService.log({
          action: 'PROGRAM_ACCESS_DENIED',
          userId: req.user.userId,
          organizationId: req.user.currentOrganization,
          metadata: { 
            programId: targetProgramId,
            endpoint: req.path
          },
          ipAddress: req.ip
        });

        return res.status(403).json({ 
          error: 'Program access denied',
          code: 'PROGRAM_ACCESS_DENIED',
          programId: targetProgramId
        });
      }

      req.programId = targetProgramId;
      next();
    } catch (error) {
      console.error('Program access check error:', error);
      return res.status(500).json({ 
        error: 'Program access verification failed',
        code: 'PROGRAM_ACCESS_ERROR'
      });
    }
  };
}

/**
 * Require specific role
 */
function requireRole(role) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasRole = await rbacService.hasRole(
        req.user.userId,
        role,
        req.user.currentOrganization
      );

      if (!hasRole) {
        await auditService.log({
          action: 'ROLE_ACCESS_DENIED',
          userId: req.user.userId,
          organizationId: req.user.currentOrganization,
          metadata: { 
            requiredRole: role,
            endpoint: req.path
          },
          ipAddress: req.ip
        });

        return res.status(403).json({ 
          error: 'Role access denied',
          code: 'ROLE_ACCESS_DENIED',
          required: role
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ 
        error: 'Role verification failed',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
}

/**
 * Require organization membership
 */
function requireOrganization(organizationId = null) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const targetOrgId = organizationId || req.body.organizationId || req.params.organizationId;
      
      if (!targetOrgId) {
        return res.status(400).json({ 
          error: 'Organization ID required',
          code: 'ORGANIZATION_ID_MISSING'
        });
      }

      const isMember = req.user.organizations.some(
        org => org.organizationId === targetOrgId
      );

      if (!isMember) {
        await auditService.log({
          action: 'ORGANIZATION_ACCESS_DENIED',
          userId: req.user.userId,
          metadata: { 
            organizationId: targetOrgId,
            endpoint: req.path
          },
          ipAddress: req.ip
        });

        return res.status(403).json({ 
          error: 'Organization access denied',
          code: 'ORGANIZATION_ACCESS_DENIED',
          organizationId: targetOrgId
        });
      }

      req.organizationId = targetOrgId;
      next();
    } catch (error) {
      console.error('Organization check error:', error);
      return res.status(500).json({ 
        error: 'Organization verification failed',
        code: 'ORGANIZATION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.authToken ||
                  req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers['x-auth-token'];
    
    if (token) {
      try {
        const decoded = await jwtService.verifyToken(token);
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: {
            userOrganizations: {
              include: {
                organization: true
              }
            }
          }
        });

        if (user && user.isActive) {
          req.user = {
            ...decoded,
            userData: user,
            organizations: user.userOrganizations
          };
        }
      } catch (error) {
        // Token invalid, but continue without authentication
        console.warn('Optional auth token invalid:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if optional auth fails
  }
}

module.exports = {
  requireAuth,
  requirePermission,
  requireProgramAccess,
  requireRole,
  requireOrganization,
  optionalAuth
};