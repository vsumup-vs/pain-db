const auditService = require('../services/auditService');

/**
 * Middleware to validate and inject organization context into requests
 * This ensures all data access is scoped to the user's current organization
 */
function injectOrganizationContext(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const { currentOrganization, organizations, role, permissions } = req.user;

    // SUPER_ADMIN bypasses organization validation - they can access all organizations
    const isSuperAdmin = role === 'SUPER_ADMIN' || (permissions && permissions.includes('SYSTEM_ADMIN'));

    if (isSuperAdmin) {
      // SUPER_ADMIN has access to all organizations - set organizationId to null
      // Controllers should handle null organizationId to fetch data across all organizations
      req.organizationId = currentOrganization || null;
      req.isSuperAdmin = true;
      return next();
    }

    // For non-SUPER_ADMIN users, verify organization access
    const hasAccess = organizations.some(
      org => org.organizationId === currentOrganization
    );

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Invalid organization context',
        code: 'ORG_ACCESS_DENIED',
        message: 'You do not have access to the current organization'
      });
    }

    // Inject organizationId into request for easy access in controllers
    req.organizationId = currentOrganization;
    req.isSuperAdmin = false;

    next();
  } catch (error) {
    console.error('Organization context error:', error);
    return res.status(500).json({
      error: 'Organization context validation failed',
      code: 'ORG_CONTEXT_ERROR'
    });
  }
}

/**
 * Middleware to log potential cross-organization access attempts
 */
function auditOrganizationAccess(req, res, next) {
  const originalJson = res.json;

  res.json = function(data) {
    // Log if there was a permission/access error
    if (res.statusCode === 403 || res.statusCode === 401) {
      auditService.log({
        action: 'CROSS_ORG_ACCESS_ATTEMPT',
        userId: req.user?.userId,
        organizationId: req.organizationId,
        metadata: {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          requestedResource: req.params.id || req.query
        },
        ipAddress: req.ip,
        hipaaRelevant: true
      }).catch(err => console.error('Audit log error:', err));
    }

    originalJson.call(this, data);
  };

  next();
}

module.exports = {
  injectOrganizationContext,
  auditOrganizationAccess
};
