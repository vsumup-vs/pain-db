const express = require('express');
const router = express.Router();
const platformOrganizationController = require('../controllers/platformOrganizationController');
const { requireAuth } = require('../middleware/auth');
const {
  requirePlatformAdmin,
  requirePlatformPermission,
  blockPlatformOrganization
} = require('../middleware/platformAuth');

/**
 * Platform Admin Routes
 *
 * All routes require:
 * 1. Authentication (requireAuth)
 * 2. Platform admin access (requirePlatformAdmin)
 * 3. Specific platform permissions for certain operations
 *
 * These routes are for platform administrators to manage client organizations,
 * subscriptions, billing, and support tickets.
 */

// Apply authentication and platform admin check to all platform routes
router.use(requireAuth);
router.use(requirePlatformAdmin);

/**
 * Organization Management Routes
 * Base path: /api/platform/organizations
 */

/**
 * GET /api/platform/organizations
 * List all client organizations with pagination, filtering, and sorting
 * Permission: PLATFORM_ORG_READ
 */
router.get(
  '/organizations',
  requirePlatformPermission('PLATFORM_ORG_READ'),
  platformOrganizationController.getAllOrganizations
);

/**
 * POST /api/platform/organizations
 * Create a new client organization
 * Permission: PLATFORM_ORG_CREATE
 */
router.post(
  '/organizations',
  requirePlatformPermission('PLATFORM_ORG_CREATE'),
  platformOrganizationController.createOrganization
);

/**
 * GET /api/platform/organizations/:id
 * Get detailed organization information
 * Permission: PLATFORM_ORG_READ
 */
router.get(
  '/organizations/:id',
  requirePlatformPermission('PLATFORM_ORG_READ'),
  platformOrganizationController.getOrganizationById
);

/**
 * PUT /api/platform/organizations/:id
 * Update organization details, subscription, or billing settings
 * Permission: PLATFORM_ORG_UPDATE
 */
router.put(
  '/organizations/:id',
  requirePlatformPermission('PLATFORM_ORG_UPDATE'),
  platformOrganizationController.updateOrganization
);

/**
 * DELETE /api/platform/organizations/:id
 * Soft delete an organization (set isActive to false)
 * Permission: PLATFORM_ORG_DELETE
 */
router.delete(
  '/organizations/:id',
  requirePlatformPermission('PLATFORM_ORG_DELETE'),
  platformOrganizationController.deleteOrganization
);

/**
 * GET /api/platform/organizations/:id/usage
 * Get detailed usage statistics for an organization
 * Permission: PLATFORM_ORG_READ
 */
router.get(
  '/organizations/:id/usage',
  requirePlatformPermission('PLATFORM_ORG_READ'),
  platformOrganizationController.getOrganizationUsage
);

/**
 * Future Platform Routes (to be implemented):
 *
 * Billing Management:
 * - GET /api/platform/billing/invoices
 * - POST /api/platform/billing/invoices
 * - GET /api/platform/billing/invoices/:id
 * - PUT /api/platform/billing/invoices/:id
 *
 * Support Ticket Management:
 * - GET /api/platform/support/tickets
 * - GET /api/platform/support/tickets/:id
 * - PUT /api/platform/support/tickets/:id
 * - POST /api/platform/support/tickets/:id/responses
 *
 * User Management:
 * - GET /api/platform/users
 * - POST /api/platform/users
 * - GET /api/platform/users/:id
 * - PUT /api/platform/users/:id
 * - DELETE /api/platform/users/:id
 *
 * Analytics:
 * - GET /api/platform/analytics/overview
 * - GET /api/platform/analytics/usage
 * - GET /api/platform/analytics/revenue
 *
 * Platform Settings:
 * - GET /api/platform/settings
 * - PUT /api/platform/settings
 */

module.exports = router;
