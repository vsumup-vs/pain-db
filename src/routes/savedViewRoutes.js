const express = require('express');
const router = express.Router();
const savedViewController = require('../controllers/savedViewController');
const { requireAuth } = require('../middleware/auth');

/**
 * Saved Views Routes
 *
 * Endpoints for managing user-defined saved views and filters
 * All routes require authentication
 */

/**
 * GET /api/saved-views
 * Get all saved views for the current user
 * Query params:
 *   - viewType: Filter by view type (PATIENT_LIST, TRIAGE_QUEUE, etc.)
 *   - isShared: Filter by shared status (true/false)
 *
 * Returns: Array of saved views (own views + shared views)
 */
router.get('/', requireAuth, savedViewController.getSavedViews);

/**
 * GET /api/saved-views/:id
 * Get a specific saved view by ID
 *
 * Returns: Saved view object if user has access
 */
router.get('/:id', requireAuth, savedViewController.getSavedView);

/**
 * POST /api/saved-views
 * Create a new saved view
 *
 * Body:
 *   - name: string (required)
 *   - viewType: ViewType enum (required)
 *   - filters: JSON object (required)
 *   - description: string (optional)
 *   - displayConfig: JSON object (optional)
 *   - isShared: boolean (default: false)
 *   - sharedWithIds: string[] (default: [])
 *   - isDefault: boolean (default: false)
 *
 * Returns: Created saved view object
 */
router.post('/', requireAuth, savedViewController.createSavedView);

/**
 * PUT /api/saved-views/:id
 * Update an existing saved view (owner only)
 *
 * Body: (all fields optional)
 *   - name: string
 *   - description: string
 *   - filters: JSON object
 *   - displayConfig: JSON object
 *   - isShared: boolean
 *   - sharedWithIds: string[]
 *   - isDefault: boolean
 *
 * Returns: Updated saved view object
 */
router.put('/:id', requireAuth, savedViewController.updateSavedView);

/**
 * DELETE /api/saved-views/:id
 * Delete a saved view (owner only)
 *
 * Returns: Success message
 */
router.delete('/:id', requireAuth, savedViewController.deleteSavedView);

/**
 * POST /api/saved-views/:id/set-default
 * Set a view as the default for the current user
 * (Automatically unsets other default views of the same type)
 *
 * Returns: Updated saved view object
 */
router.post('/:id/set-default', requireAuth, savedViewController.setDefaultView);

/**
 * POST /api/saved-views/:id/use
 * Increment usage count when a view is used
 * (Updates usageCount and lastUsedAt)
 *
 * Returns: Updated saved view object
 */
router.post('/:id/use', requireAuth, savedViewController.incrementUsageCount);

module.exports = router;
