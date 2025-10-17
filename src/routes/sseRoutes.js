/**
 * SSE (Server-Sent Events) Routes for Real-Time Updates
 *
 * Provides endpoint for establishing SSE connections for real-time alert notifications.
 *
 * Phase 1b: Real-Time Alert Updates
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const sseService = require('../services/sseService');

/**
 * GET /api/sse/alerts
 * Establish SSE connection for real-time alert notifications
 *
 * Requires authentication. Keeps connection open to stream alert updates.
 */
router.get('/alerts', requireAuth, (req, res) => {
  const userId = req.user.userId;

  // Initialize SSE connection
  sseService.initializeConnection(req, res, userId);
});

/**
 * GET /api/sse/status
 * Get SSE service status (for monitoring/debugging)
 */
router.get('/status', requireAuth, (req, res) => {
  const connectionCount = sseService.getConnectionCount();
  const activeUsers = sseService.getActiveUsers();

  res.json({
    active: true,
    connections: connectionCount,
    activeUsers: activeUsers.length,
    users: activeUsers
  });
});

module.exports = router;
