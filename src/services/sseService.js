/**
 * Server-Sent Events (SSE) Service for Real-Time Alert Updates
 *
 * Provides instant alert notifications to connected clinicians without page refresh.
 * Uses native SSE (EventSource API) for efficient one-way server-to-client communication.
 *
 * Phase 1b: Real-Time Alert Updates
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store active SSE connections: Map<userId, Set<Response objects>>
const connections = new Map();

// Store clinician ID to user ID mapping for alert broadcasts
const clinicianToUser = new Map();

/**
 * Initialize SSE connection for a clinician
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {String} userId - User ID from authenticated request
 */
async function initializeConnection(req, res, userId) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Look up clinician ID for this user (for alert broadcasting)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (user) {
      const clinician = await prisma.clinician.findFirst({
        where: { email: user.email },
        select: { id: true }
      });

      if (clinician) {
        clinicianToUser.set(clinician.id, userId);
        console.log(`🔗 Mapped clinician ${clinician.id} → user ${userId}`);
      }
    }
  } catch (err) {
    console.error('⚠️  Error looking up clinician for SSE mapping:', err.message);
  }

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

    // Also remove clinician → user ID mapping
    for (const [clinicianId, mappedUserId] of clinicianToUser.entries()) {
      if (mappedUserId === userId) {
        clinicianToUser.delete(clinicianId);
        console.log(`🔗 Removed clinician mapping for ${clinicianId}`);
        break;
      }
    }

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
 * Enrich alert with computed fields (same logic as alertController.js)
 * @param {Object} alert - Raw alert object
 * @param {String} userId - User ID for isClaimedByMe check
 * @returns {Object} - Alert with computed fields
 */
function enrichAlertWithComputedFields(alert, userId) {
  const now = new Date();

  // Calculate time remaining until SLA breach
  const timeRemainingMs = alert.slaBreachTime ? new Date(alert.slaBreachTime).getTime() - now.getTime() : null;
  const timeRemainingMinutes = timeRemainingMs ? Math.floor(timeRemainingMs / (60 * 1000)) : null;

  // Determine SLA status
  let slaStatusValue = 'ok';
  if (timeRemainingMs !== null) {
    if (timeRemainingMs < 0) {
      slaStatusValue = 'breached';
    } else if (timeRemainingMs < 30 * 60 * 1000) { // Less than 30 minutes
      slaStatusValue = 'approaching';
    }
  }

  // Risk level label based on score
  let riskLevel = 'low';
  if (alert.riskScore >= 8) {
    riskLevel = 'critical';
  } else if (alert.riskScore >= 6) {
    riskLevel = 'high';
  } else if (alert.riskScore >= 4) {
    riskLevel = 'medium';
  }

  return {
    ...alert,
    computed: {
      timeRemainingMinutes,
      slaStatus: slaStatusValue,
      riskLevel,
      isClaimed: !!alert.claimedById,
      isClaimedByMe: alert.claimedById === userId
    }
  };
}

/**
 * Broadcast a new alert to all connected clinicians in the organization
 * @param {Object} alert - Alert object with organizationId, clinicianId, severity, etc.
 */
function broadcastNewAlert(alert) {
  try {
    // If alert is assigned to a specific clinician, send to them
    if (alert.clinicianId) {
      // Look up user ID from clinician ID
      const userId = clinicianToUser.get(alert.clinicianId);

      if (userId) {
        sendAlertToUser(userId, alert);
        console.log(`📡 Broadcast new alert ${alert.id} to clinician ${alert.clinicianId} (user ${userId})`);
      } else {
        console.log(`⚠️  No SSE connection found for clinician ${alert.clinicianId}`);
      }
    }

    // Also send to all org admins and supervisors (for visibility)
    // This would require fetching org admins, but for now we'll skip
    // to keep it simple and only notify the assigned clinician
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

  // Enrich alert with computed fields before sending
  const enrichedAlert = enrichAlertWithComputedFields(alert, userId);

  userConnections.forEach(res => {
    sendEvent(res, 'alert', enrichedAlert);
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
