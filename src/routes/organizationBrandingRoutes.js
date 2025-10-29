const express = require('express');
const router = express.Router();
const organizationBrandingController = require('../controllers/organizationBrandingController');
const { requireAuth } = require('../middleware/auth');
const rbacService = require('../services/rbacService');

/**
 * Organization Branding Routes
 * Handles logo upload, branding configuration, and retrieval
 *
 * All routes require authentication
 * Upload/Update/Delete routes require ORG_ADMIN or ORG_SETTINGS_MANAGE permission
 */

/**
 * GET /api/organizations/:organizationId/branding
 * Get organization branding configuration
 * Accessible by all users in the organization
 */
router.get('/:organizationId/branding',
  requireAuth,
  organizationBrandingController.getBranding
);

/**
 * POST /api/organizations/:organizationId/branding/logo
 * Upload organization logo
 * Requires ORG_SETTINGS_MANAGE permission
 *
 * Multipart/form-data:
 * - logo: File (JPEG, PNG, GIF, SVG, WebP, max 5MB)
 */
router.post('/:organizationId/branding/logo',
  requireAuth,
  rbacService.requirePermission('ORG_SETTINGS_MANAGE'),
  organizationBrandingController.upload.single('logo'),
  organizationBrandingController.uploadLogo
);

/**
 * PUT /api/organizations/:organizationId/branding
 * Update organization branding configuration
 * Requires ORG_SETTINGS_MANAGE permission
 *
 * Body:
 * - copyright: string (optional) - Custom copyright text
 * - showPoweredBy: boolean (optional) - Show "Powered by VitalEdge" in footer
 * - primaryColor: string (optional) - Primary theme color (hex code)
 * - secondaryColor: string (optional) - Secondary theme color (hex code)
 */
router.put('/:organizationId/branding',
  requireAuth,
  rbacService.requirePermission('ORG_SETTINGS_MANAGE'),
  organizationBrandingController.updateBranding
);

/**
 * DELETE /api/organizations/:organizationId/branding/logo
 * Delete organization logo
 * Requires ORG_SETTINGS_MANAGE permission
 */
router.delete('/:organizationId/branding/logo',
  requireAuth,
  rbacService.requirePermission('ORG_SETTINGS_MANAGE'),
  organizationBrandingController.deleteLogo
);

module.exports = router;
