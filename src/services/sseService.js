/**
 * Server-Sent Events (SSE) Service for Real-Time Alert Updates
 *
 * Provides instant alert notifications to connected clinicians without page refresh.
 * Uses native SSE (EventSource API) for efficient one-way server-to-client communication.
 *
 * Phase 1b: Real-Time Alert Updates
 */

// Store active SSE connections: Map<userId, Set<Response objects>>
const connections = new Map();

/**
 * Initialize SSE connection for a clinician
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {String} userId - User ID from authenticated request
 */
function initializeConnection(req, res, userId) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Store connection
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId).add(res);

  console.log(`✅ SSE connection established for user ${userId} (total: ${connections.get(userId).size})`);

  // Send initial connection confirmation
  sendEvent(res, 'connected', {
    message: 'Real-time alert updates connected',
    timestamp: new Date().toISOString()
  });

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeConnection(userId, res);
    console.log(`❌ SSE connection closed for user ${userId}`);
  });

  // Handle errors
  res.on('error', (error) => {
    console.error(`SSE error for user ${userId}:`, error);
    clearInterval(heartbeatInterval);
    removeConnection(userId, res);
  });
}

/**
 * Send an event to a specific response stream
 * @param {Object} res - Express response object
 * @param {String} event - Event type
 * @param {Object} data - Event data
 */
function sendEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    console.error('Error sending SSE event:', error);
  }
}

/**
 * Remove a connection from the connections map
 * @param {String} userId - User ID
 * @param {Object} res - Express response object
 */
function removeConnection(userId, res) {
  if (connections.has(userId)) {
    connections.get(userId).delete(res);
    if (connections.get(userId).size === 0) {
      connections.delete(userId);
    }
  }
}

/**
 * Broadcast a new alert to all connected clinicians in the organization
 * @param {Object} alert - Alert object with organizationId, clinicianId, severity, etc.
 */
function broadcastNewAlert(alert) {
  try {
    // If alert is assigned to a specific clinician, send to them
    if (alert.clinicianId) {
      sendAlertToUser(alert.clinicianId, alert);
    }

    // Also send to all org admins and supervisors (for visibility)
    // This would require fetching org admins, but for now we'll skip
    // to keep it simple and only notify the assigned clinician

    console.log(`📡 Broadcast new alert ${alert.id} to clinician ${alert.clinicianId}`);
  } catch (error) {
    console.error('Error broadcasting alert:', error);
  }
}

/**
 * Send alert notification to a specific user
 * @param {String} userId - User ID (clinician)
 * @param {Object} alert - Alert object
 */
function sendAlertToUser(userId, alert) {
  if (!connections.has(userId)) {
    console.log(`No active SSE connections for user ${userId}`);
    return;
  }

  const userConnections = connections.get(userId);
  console.log(`📨 Sending alert to ${userConnections.size} connection(s) for user ${userId}`);

  userConnections.forEach(res => {
    sendEvent(res, 'alert', {
      id: alert.id,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      patientId: alert.patientId,
      riskScore: alert.riskScore,
      slaBreachTime: alert.slaBreachTime,
      triggeredAt: alert.triggeredAt,
      data: alert.data
    });
  });
}

/**
 * Broadcast alert status update (acknowledged, resolved, dismissed)
 * @param {Object} alert - Updated alert object
 */
function broadcastAlertUpdate(alert) {
  try {
    if (alert.clinicianId) {
      sendAlertUpdateToUser(alert.clinicianId, alert);
    }

    console.log(`📡 Broadcast alert update ${alert.id} to clinician ${alert.clinicianId}`);
  } catch (error) {
    console.error('Error broadcasting alert update:', error);
  }
}

/**
 * Send alert update to a specific user
 * @param {String} userId - User ID (clinician)
 * @param {Object} alert - Updated alert object
 */
function sendAlertUpdateToUser(userId, alert) {
  if (!connections.has(userId)) {
    return;
  }

  const userConnections = connections.get(userId);

  userConnections.forEach(res => {
    sendEvent(res, 'alert-update', {
      id: alert.id,
      status: alert.status,
      resolvedAt: alert.resolvedAt,
      resolutionNotes: alert.resolutionNotes,
      acknowledgedBy: alert.acknowledgedBy
    });
  });
}

/**
 * Get count of active connections (for monitoring)
 * @returns {Number} Total number of active connections
 */
function getConnectionCount() {
  let totalConnections = 0;
  connections.forEach(userConnections => {
    totalConnections += userConnections.size;
  });
  return totalConnections;
}

/**
 * Get active users with connections (for monitoring)
 * @returns {Array} Array of user IDs with active connections
 */
function getActiveUsers() {
  return Array.from(connections.keys());
}

module.exports = {
  initializeConnection,
  broadcastNewAlert,
  broadcastAlertUpdate,
  sendAlertToUser,
  sendAlertUpdateToUser,
  getConnectionCount,
  getActiveUsers
};
