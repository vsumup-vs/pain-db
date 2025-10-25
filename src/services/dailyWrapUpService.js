const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationService = require('./notificationService');

/**
 * Daily Wrap-Up Report Service
 * Generates end-of-day summary emails for clinicians
 */

/**
 * Get clinician's daily activity summary
 * @param {string} clinicianId - Clinician ID
 * @param {Date} date - Date to summarize (defaults to today)
 * @returns {Object} Daily activity summary
 */
async function getClinicianDailySummary(clinicianId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Get clinician info
    const clinician = await prisma.clinician.findUnique({
      where: { id: clinicianId }
    });

    if (!clinician) {
      throw new Error(`Clinician ${clinicianId} not found`);
    }

    // 1. Alerts handled today
    const alertsHandled = await prisma.alert.findMany({
      where: {
        resolvedById: clinicianId,
        resolvedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        severity: true,
        status: true,
        resolvedAt: true,
        triggeredAt: true,
        patient: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const totalAlertsHandled = alertsHandled.length;

    // Count by severity
    const alertsBySeverity = {
      CRITICAL: alertsHandled.filter(a => a.severity === 'CRITICAL').length,
      HIGH: alertsHandled.filter(a => a.severity === 'HIGH').length,
      MEDIUM: alertsHandled.filter(a => a.severity === 'MEDIUM').length,
      LOW: alertsHandled.filter(a => a.severity === 'LOW').length
    };

    // Calculate average resolution time
    const resolutionTimes = alertsHandled.map(a => {
      const created = new Date(a.triggeredAt);
      const resolved = new Date(a.resolvedAt);
      return (resolved - created) / (1000 * 60); // minutes
    });

    const avgResolutionTime = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 0;

    // 2. Alerts snoozed today
    const alertsSnoozed = await prisma.alert.count({
      where: {
        snoozedById: clinicianId,
        snoozedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 3. Assessments completed today
    const assessmentsCompleted = await prisma.assessment.findMany({
      where: {
        clinicianId,
        completedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        template: { select: { name: true } },
        patient: { select: { firstName: true, lastName: true } }
      }
    });

    // 4. Billable time logged today
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        clinicianId,
        loggedAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        billable: true
      },
      select: {
        duration: true,
        cptCode: true,
        activity: true
      }
    });

    const totalBillableMinutes = timeLogs.reduce((sum, log) => sum + log.duration, 0);
    const billableHours = Math.floor(totalBillableMinutes / 60);
    const billableMinutesRemainder = totalBillableMinutes % 60;

    // Group by CPT code
    const cptCodes = {};
    timeLogs.forEach(log => {
      if (log.cptCode) {
        cptCodes[log.cptCode] = (cptCodes[log.cptCode] || 0) + 1;
      }
    });

    // 5. Patients needing follow-up tomorrow
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Find overdue assessments
    const overdueAssessments = await prisma.scheduledAssessment.findMany({
      where: {
        status: { in: ['OVERDUE', 'PENDING'] },
        dueDate: {
          gte: tomorrow,
          lte: tomorrowEnd
        },
        enrollment: {
          clinicianId
        }
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        template: { select: { name: true } }
      },
      take: 10
    });

    // Find snoozed alerts resuming tomorrow
    const snoozedAlerts = await prisma.alert.findMany({
      where: {
        snoozedById: clinicianId,
        snoozedUntil: {
          gte: tomorrow,
          lte: tomorrowEnd
        }
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        rule: { select: { name: true } }
      },
      take: 10
    });

    // Find tasks due tomorrow
    const tasksDueTomorrow = await prisma.task.findMany({
      where: {
        assignedToId: clinicianId,
        dueDate: {
          gte: tomorrow,
          lte: tomorrowEnd
        },
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      include: {
        patient: { select: { firstName: true, lastName: true } }
      },
      take: 10
    });

    return {
      clinician: {
        id: clinician.id,
        name: `${clinician.firstName} ${clinician.lastName}`,
        email: clinician.email,
        npiNumber: clinician.licenseNumber
      },
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      summary: {
        alertsHandled: totalAlertsHandled,
        alertsBySeverity,
        avgResolutionTime,
        alertsSnoozed,
        assessmentsCompleted: assessmentsCompleted.length,
        billableTime: {
          totalMinutes: totalBillableMinutes,
          hours: billableHours,
          minutes: billableMinutesRemainder,
          formatted: `${billableHours}h ${billableMinutesRemainder}m`
        },
        cptCodes
      },
      details: {
        alertsHandled: alertsHandled.slice(0, 5), // Top 5 for email
        assessmentsCompleted: assessmentsCompleted.slice(0, 5),
        timeLogs: timeLogs.slice(0, 10)
      },
      followUp: {
        overdueAssessments,
        snoozedAlerts,
        tasksDueTomorrow,
        totalItems: overdueAssessments.length + snoozedAlerts.length + tasksDueTomorrow.length
      }
    };
  } catch (error) {
    console.error(`[DailyWrapUp] Error getting summary for clinician ${clinicianId}:`, error);
    throw error;
  }
}

/**
 * Generate HTML email from daily summary
 * @param {Object} summary - Daily summary object
 * @returns {string} HTML email content
 */
function generateEmailHTML(summary) {
  const { clinician, date, summary: stats, followUp } = summary;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Summary - ${date}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      font-size: 24px;
      margin-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .greeting {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #2563eb;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    .stat-unit {
      font-size: 14px;
      color: #6b7280;
      margin-left: 4px;
    }
    .follow-up-item {
      padding: 10px;
      margin: 8px 0;
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
    }
    .patient-name {
      font-weight: 600;
      color: #1f2937;
    }
    .item-detail {
      font-size: 14px;
      color: #6b7280;
      margin-top: 3px;
    }
    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .severity-critical { background: #fee2e2; color: #991b1b; }
    .severity-high { background: #fed7aa; color: #9a3412; }
    .severity-medium { background: #fef3c7; color: #92400e; }
    .severity-low { background: #e0e7ff; color: #3730a3; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .no-items {
      color: #10b981;
      font-style: italic;
      padding: 10px;
      background: #d1fae5;
      border-radius: 4px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Daily Summary</h1>
    <p class="greeting">Good evening Dr. ${clinician.name},</p>
    <p class="greeting">Here's your summary for <strong>${date}</strong>:</p>

    <h2>📈 Today's Activity</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Alerts Handled</div>
        <div class="stat-value">${stats.alertsHandled}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Resolution Time</div>
        <div class="stat-value">${stats.avgResolutionTime}<span class="stat-unit">min</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Assessments Completed</div>
        <div class="stat-value">${stats.assessmentsCompleted}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Billable Time</div>
        <div class="stat-value">${stats.billableTime.formatted}</div>
      </div>
    </div>

    ${stats.alertsHandled > 0 ? `
    <h2>🔔 Alerts Breakdown</h2>
    <p>
      ${stats.alertsBySeverity.CRITICAL > 0 ? `<span class="severity-badge severity-critical">Critical: ${stats.alertsBySeverity.CRITICAL}</span> ` : ''}
      ${stats.alertsBySeverity.HIGH > 0 ? `<span class="severity-badge severity-high">High: ${stats.alertsBySeverity.HIGH}</span> ` : ''}
      ${stats.alertsBySeverity.MEDIUM > 0 ? `<span class="severity-badge severity-medium">Medium: ${stats.alertsBySeverity.MEDIUM}</span> ` : ''}
      ${stats.alertsBySeverity.LOW > 0 ? `<span class="severity-badge severity-low">Low: ${stats.alertsBySeverity.LOW}</span>` : ''}
    </p>
    ${stats.alertsSnoozed > 0 ? `<p>Snoozed: <strong>${stats.alertsSnoozed}</strong> alerts</p>` : ''}
    ` : ''}

    ${Object.keys(stats.cptCodes).length > 0 ? `
    <h2>💰 Billing Activity</h2>
    <p>CPT Codes Logged: ${Object.entries(stats.cptCodes).map(([code, count]) => `<strong>${code}</strong> (×${count})`).join(', ')}</p>
    ` : ''}

    <h2>📋 Follow-Up Needed Tomorrow</h2>
    ${followUp.totalItems === 0 ? `
      <div class="no-items">✅ Great job! No urgent follow-ups for tomorrow.</div>
    ` : `
      ${followUp.overdueAssessments.length > 0 ? `
        <p><strong>Overdue Assessments:</strong></p>
        ${followUp.overdueAssessments.map(a => `
          <div class="follow-up-item">
            <span class="patient-name">${a.patient.firstName} ${a.patient.lastName}</span>
            <div class="item-detail">${a.template.name}</div>
          </div>
        `).join('')}
      ` : ''}

      ${followUp.snoozedAlerts.length > 0 ? `
        <p><strong>Snoozed Alerts Resuming:</strong></p>
        ${followUp.snoozedAlerts.map(a => `
          <div class="follow-up-item">
            <span class="patient-name">${a.patient.firstName} ${a.patient.lastName}</span>
            <div class="item-detail">${a.rule.name}</div>
          </div>
        `).join('')}
      ` : ''}

      ${followUp.tasksDueTomorrow.length > 0 ? `
        <p><strong>Tasks Due:</strong></p>
        ${followUp.tasksDueTomorrow.map(t => `
          <div class="follow-up-item">
            <span class="patient-name">${t.patient?.firstName} ${t.patient?.lastName}</span>
            <div class="item-detail">${t.taskType}: ${t.title}</div>
          </div>
        `).join('')}
      ` : ''}
    `}

    <div class="footer">
      <p>Have a great evening! 🌙</p>
      <p><strong>VitalEdge Clinical Platform</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">Generated with Claude Code</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send daily wrap-up email to a single clinician
 * @param {string} clinicianId - Clinician ID
 * @param {Date} date - Date to summarize
 * @returns {Promise<Object>} Email send result
 */
async function sendDailyWrapUp(clinicianId, date = new Date()) {
  try {
    console.log(`[DailyWrapUp] Generating summary for clinician ${clinicianId}...`);

    // Get daily summary
    const summary = await getClinicianDailySummary(clinicianId, date);

    if (!summary.clinician.email) {
      console.warn(`[DailyWrapUp] No email found for clinician ${clinicianId}, skipping`);
      return { success: false, reason: 'No email address' };
    }

    // Generate HTML email
    const html = generateEmailHTML(summary);

    // Send email
    const subject = `Daily Summary - ${summary.date}`;

    const result = await notificationService.sendEmail({
      to: summary.clinician.email,
      subject,
      html,
      text: `Daily summary for ${summary.date}. View in HTML-compatible email client.`
    });

    console.log(`[DailyWrapUp] Email sent to ${summary.clinician.email}`);

    return {
      success: true,
      clinicianId,
      email: summary.clinician.email,
      date: summary.date,
      summary: summary.summary
    };
  } catch (error) {
    console.error(`[DailyWrapUp] Error sending wrap-up for clinician ${clinicianId}:`, error);
    return {
      success: false,
      clinicianId,
      error: error.message
    };
  }
}

/**
 * Send daily wrap-up emails to all active clinicians in an organization
 * @param {string} organizationId - Organization ID
 * @param {Date} date - Date to summarize
 * @returns {Promise<Array>} Array of send results
 */
async function sendOrganizationDailyWrapUps(organizationId, date = new Date()) {
  try {
    console.log(`[DailyWrapUp] Sending wrap-ups for organization ${organizationId}...`);

    // Get all clinicians
    const clinicians = await prisma.clinician.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    console.log(`[DailyWrapUp] Found ${clinicians.length} active clinicians`);

    const results = [];

    // Send wrap-up to each clinician
    for (const clinician of clinicians) {
      const result = await sendDailyWrapUp(clinician.id, date);
      results.push(result);

      // Small delay to avoid overwhelming email server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[DailyWrapUp] Sent ${successCount}/${clinicians.length} wrap-ups successfully`);

    return results;
  } catch (error) {
    console.error(`[DailyWrapUp] Error sending organization wrap-ups:`, error);
    throw error;
  }
}

/**
 * Send daily wrap-ups to all organizations
 * Used by cron job
 * @param {Date} date - Date to summarize
 * @returns {Promise<Object>} Summary of all sends
 */
async function sendAllDailyWrapUps(date = new Date()) {
  try {
    console.log('[DailyWrapUp] Starting daily wrap-up job...');

    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log(`[DailyWrapUp] Found ${organizations.length} active organizations`);

    const allResults = [];

    for (const org of organizations) {
      console.log(`[DailyWrapUp] Processing organization: ${org.name}`);
      const results = await sendOrganizationDailyWrapUps(org.id, date);
      allResults.push(...results);
    }

    const summary = {
      totalSent: allResults.filter(r => r.success).length,
      totalFailed: allResults.filter(r => !r.success).length,
      organizations: organizations.length,
      timestamp: new Date().toISOString()
    };

    console.log('[DailyWrapUp] Job complete:', summary);

    return summary;
  } catch (error) {
    console.error('[DailyWrapUp] Error in daily wrap-up job:', error);
    throw error;
  }
}

module.exports = {
  getClinicianDailySummary,
  generateEmailHTML,
  sendDailyWrapUp,
  sendOrganizationDailyWrapUps,
  sendAllDailyWrapUps
};
