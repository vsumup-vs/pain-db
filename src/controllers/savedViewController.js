const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all saved views for current user
 * GET /api/saved-views
 * Query params: viewType, isShared
 */
async function getSavedViews(req, res) {
  try {
    const userId = req.user.userId;
    const organizationId = req.user.currentOrganization;
    const { viewType, isShared } = req.query;

    const where = {
      OR: [
        { userId }, // User's own views
        { isShared: true, organizationId }, // Shared views in their org
        { isTemplate: true, organizationId } // Templates in their org
      ]
    };

    if (viewType) {
      where.viewType = viewType;
    }

    if (isShared !== undefined) {
      where.isShared = isShared === 'true';
    }

    const savedViews = await prisma.savedView.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' }, // Default views first
        { usageCount: 'desc' }, // Most used next
        { name: 'asc' } // Alphabetical
      ]
    });

    console.log(`[Backend API] getSavedViews - userId: ${userId}, organizationId: ${organizationId}, viewType: ${viewType}`);
    console.log(`[Backend API] getSavedViews - returning ${savedViews.length} views`);
    if (savedViews.length > 0) {
      console.log(`[Backend API] First view:`, {
        id: savedViews[0].id,
        name: savedViews[0].name,
        isDefault: savedViews[0].isDefault,
        isShared: savedViews[0].isShared,
        viewType: savedViews[0].viewType
      });
    }

    res.json(savedViews);
  } catch (error) {
    console.error('Error fetching saved views:', error);
    res.status(500).json({ error: 'Failed to fetch saved views' });
  }
}

/**
 * Get single saved view by ID
 * GET /api/saved-views/:id
 */
async function getSavedView(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const organizationId = req.user.currentOrganization;

    const savedView = await prisma.savedView.findFirst({
      where: {
        id,
        OR: [
          { userId }, // User's own view
          { isShared: true, organizationId }, // Shared view in their org
          { sharedWithIds: { has: userId } } // Explicitly shared with them
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!savedView) {
      return res.status(404).json({ error: 'Saved view not found' });
    }

    res.json(savedView);
  } catch (error) {
    console.error('Error fetching saved view:', error);
    res.status(500).json({ error: 'Failed to fetch saved view' });
  }
}

/**
 * Create new saved view
 * POST /api/saved-views
 * Body: { name, description, viewType, filters, displayConfig, isShared, sharedWithIds }
 */
async function createSavedView(req, res) {
  try {
    const userId = req.user.userId;
    const organizationId = req.user.currentOrganization;
    const {
      name,
      description,
      viewType,
      filters,
      displayConfig,
      isShared = false,
      sharedWithIds = [],
      isDefault = false
    } = req.body;

    // Validation
    if (!name || !viewType || !filters) {
      return res.status(400).json({
        error: 'Missing required fields: name, viewType, filters'
      });
    }

    // Valid ViewType enum values
    const validViewTypes = ['PATIENT_LIST', 'TRIAGE_QUEUE', 'ASSESSMENT_LIST', 'ENROLLMENT_LIST', 'ALERT_LIST', 'TASK_LIST'];
    if (!validViewTypes.includes(viewType)) {
      return res.status(400).json({
        error: `Invalid viewType. Must be one of: ${validViewTypes.join(', ')}`
      });
    }

    // If setting as default, unset other default views of this type
    if (isDefault) {
      await prisma.savedView.updateMany({
        where: {
          userId,
          viewType,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const savedView = await prisma.savedView.create({
      data: {
        userId,
        organizationId,
        name,
        description,
        viewType,
        filters,
        displayConfig: displayConfig || {},
        isShared,
        sharedWithIds,
        isDefault,
        usageCount: 0
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(savedView);
  } catch (error) {
    console.error('Error creating saved view:', error);
    res.status(500).json({ error: 'Failed to create saved view' });
  }
}

/**
 * Update existing saved view
 * PUT /api/saved-views/:id
 * Body: { name, description, filters, displayConfig, isShared, sharedWithIds }
 */
async function updateSavedView(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      name,
      description,
      filters,
      displayConfig,
      isShared,
      sharedWithIds,
      isDefault
    } = req.body;

    // Check if view exists and belongs to user
    const existingView = await prisma.savedView.findFirst({
      where: { id, userId }
    });

    if (!existingView) {
      return res.status(404).json({
        error: 'Saved view not found or you do not have permission to update it'
      });
    }

    // If setting as default, unset other default views of this type
    if (isDefault && !existingView.isDefault) {
      await prisma.savedView.updateMany({
        where: {
          userId,
          viewType: existingView.viewType,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (filters !== undefined) updateData.filters = filters;
    if (displayConfig !== undefined) updateData.displayConfig = displayConfig;
    if (isShared !== undefined) updateData.isShared = isShared;
    if (sharedWithIds !== undefined) updateData.sharedWithIds = sharedWithIds;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const savedView = await prisma.savedView.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json(savedView);
  } catch (error) {
    console.error('Error updating saved view:', error);
    res.status(500).json({ error: 'Failed to update saved view' });
  }
}

/**
 * Delete saved view
 * DELETE /api/saved-views/:id
 */
async function deleteSavedView(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if view exists and belongs to user
    const existingView = await prisma.savedView.findFirst({
      where: { id, userId }
    });

    if (!existingView) {
      return res.status(404).json({
        error: 'Saved view not found or you do not have permission to delete it'
      });
    }

    await prisma.savedView.delete({
      where: { id }
    });

    res.json({ message: 'Saved view deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved view:', error);
    res.status(500).json({ error: 'Failed to delete saved view' });
  }
}

/**
 * Set a view as default for user
 * POST /api/saved-views/:id/set-default
 */
async function setDefaultView(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if view exists and user has access
    const view = await prisma.savedView.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isShared: true, organizationId: req.user.currentOrganization }
        ]
      }
    });

    if (!view) {
      return res.status(404).json({ error: 'Saved view not found' });
    }

    // Unset other default views of this type for this user
    await prisma.savedView.updateMany({
      where: {
        userId,
        viewType: view.viewType,
        isDefault: true
      },
      data: {
        isDefault: false
      }
    });

    // Set this view as default
    const updatedView = await prisma.savedView.update({
      where: { id },
      data: { isDefault: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json(updatedView);
  } catch (error) {
    console.error('Error setting default view:', error);
    res.status(500).json({ error: 'Failed to set default view' });
  }
}

/**
 * Increment usage count when view is used
 * POST /api/saved-views/:id/use
 */
async function incrementUsageCount(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if view exists and user has access
    const view = await prisma.savedView.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isShared: true, organizationId: req.user.currentOrganization },
          { sharedWithIds: { has: userId } }
        ]
      }
    });

    if (!view) {
      return res.status(404).json({ error: 'Saved view not found' });
    }

    const updatedView = await prisma.savedView.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json(updatedView);
  } catch (error) {
    console.error('Error incrementing usage count:', error);
    res.status(500).json({ error: 'Failed to increment usage count' });
  }
}

module.exports = {
  getSavedViews,
  getSavedView,
  createSavedView,
  updateSavedView,
  deleteSavedView,
  setDefaultView,
  incrementUsageCount
};
