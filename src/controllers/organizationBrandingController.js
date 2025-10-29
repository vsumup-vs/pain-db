const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const prisma = new PrismaClient();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: org-{orgId}-{timestamp}.{ext}
    const organizationId = req.params.organizationId || req.user.currentOrganization;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `org-${organizationId}-${timestamp}${ext}`);
  }
});

// File filter - only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, SVG, and WebP images are allowed.'), false);
  }
};

// Create multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * Upload organization logo
 * POST /api/organizations/:organizationId/branding/logo
 */
const uploadLogo = async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Verify user has permission for this organization
    if (req.user.currentOrganization !== organizationId && !req.user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions to update this organization' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate public URL for the logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update organization with new logo URL
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandingConfig: true
      }
    });

    res.json({
      message: 'Logo uploaded successfully',
      data: organization
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo', details: error.message });
  }
};

/**
 * Get organization branding
 * GET /api/organizations/:organizationId/branding
 */
const getBranding = async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Verify user has access to this organization
    if (req.user.currentOrganization !== organizationId && !req.user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions to view this organization' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandingConfig: true
      }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      data: {
        organizationId: organization.id,
        organizationName: organization.name,
        logoUrl: organization.logoUrl,
        brandingConfig: organization.brandingConfig || {
          copyright: `© ${new Date().getFullYear()} ${organization.name}. All rights reserved.`,
          showPoweredBy: true,
          primaryColor: null,
          secondaryColor: null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    res.status(500).json({ error: 'Failed to fetch branding', details: error.message });
  }
};

/**
 * Update organization branding config
 * PUT /api/organizations/:organizationId/branding
 */
const updateBranding = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { copyright, showPoweredBy, primaryColor, secondaryColor } = req.body;

    // Verify user has permission for this organization
    if (req.user.currentOrganization !== organizationId && !req.user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions to update this organization' });
    }

    // Build branding config
    const brandingConfig = {
      copyright: copyright || null,
      showPoweredBy: showPoweredBy !== undefined ? showPoweredBy : true,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null
    };

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        brandingConfig,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandingConfig: true
      }
    });

    res.json({
      message: 'Branding updated successfully',
      data: organization
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    res.status(500).json({ error: 'Failed to update branding', details: error.message });
  }
};

/**
 * Delete organization logo
 * DELETE /api/organizations/:organizationId/branding/logo
 */
const deleteLogo = async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Verify user has permission for this organization
    if (req.user.currentOrganization !== organizationId && !req.user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions to update this organization' });
    }

    // Get current organization to find old logo file
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { logoUrl: true }
    });

    if (organization && organization.logoUrl) {
      // Delete old logo file
      const oldLogoPath = path.join(__dirname, '../../public', organization.logoUrl);
      try {
        await fs.unlink(oldLogoPath);
      } catch (error) {
        console.warn('Could not delete old logo file:', error.message);
      }
    }

    // Update organization to remove logo
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandingConfig: true
      }
    });

    res.json({
      message: 'Logo deleted successfully',
      data: updatedOrganization
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Failed to delete logo', details: error.message });
  }
};

module.exports = {
  upload,
  uploadLogo,
  getBranding,
  updateBranding,
  deleteLogo
};
