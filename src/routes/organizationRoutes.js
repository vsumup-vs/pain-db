const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');

/**
 * Organization Management Routes
 *
 * Access Control:
 * - All routes require authentication
 * - SUPER_ADMIN: Full access to all organizations
 * - ORG_ADMIN: Limited to their own organizations
 */

// Permission check middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const permissions = user.permissions || [];
    const hasPermission = permissions.includes(permission) || permissions.includes('SYSTEM_ADMIN');

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: permission
      });
    }

    next();
  };
};

/**
 * GET /api/organizations
 * List all organizations
 * Access: SUPER_ADMIN sees all, ORG_ADMIN sees only their organizations
 */
router.get('/',
  organizationController.getAllOrganizations
);

/**
 * GET /api/organizations/platform-usage
 * Get platform-wide usage statistics
 * Access: Platform Admin only
 * NOTE: Must be before /:id route to avoid matching "platform-usage" as an ID
 */
router.get('/platform-usage',
  organizationController.getPlatformUsageStats
);

/**
 * GET /api/organizations/:id
 * Get single organization
 * Access: SUPER_ADMIN or users in the organization
 */
router.get('/:id',
  organizationController.getOrganization
);

/**
 * GET /api/organizations/:id/stats
 * Get organization statistics
 * Access: SUPER_ADMIN or users in the organization
 */
router.get('/:id/stats',
  organizationController.getOrganizationStats
);

/**
 * POST /api/organizations
 * Create new organization
 * Access: SUPER_ADMIN only
 */
router.post('/',
  requirePermission('ORG_CREATE'),
  organizationController.createOrganization
);

/**
 * PUT /api/organizations/:id
 * Update organization
 * Access: SUPER_ADMIN or ORG_ADMIN of the organization
 */
router.put('/:id',
  requirePermission('ORG_UPDATE'),
  organizationController.updateOrganization
);

/**
 * DELETE /api/organizations/:id
 * Delete organization
 * Access: SUPER_ADMIN only
 */
router.delete('/:id',
  requirePermission('ORG_DELETE'),
  organizationController.deleteOrganization
);

module.exports = router;
