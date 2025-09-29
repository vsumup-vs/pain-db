const { PrismaClient } = require('../../generated/prisma');

const prisma = new PrismaClient();

async function setupDailyReminderRule(enrollmentId, reminderSettings) {
  try {
    if (!reminderSettings.dailyAssessment) {
      return; // No reminder needed
    }

    // Create a daily reminder alert rule for this specific enrollment
    const alertRule = await prisma.alertRule.create({
      data: {
        name: `Daily Reminder - Enrollment ${enrollmentId}`,
        severity: 'low',
        window: '1d',
        expression: {
          condition: 'daily_reminder',
          enrollmentId: enrollmentId,
          reminderTime: reminderSettings.reminderTime || '09:00'
        },
        actions: {
          notify: ['patient'],
          reminder: true,
          methods: reminderSettings.methods || ['email']
        },
        cooldown: '23h'
      }
    });

    console.log(`Daily reminder rule created for enrollment ${enrollmentId}`);
    return alertRule;
  } catch (error) {
    console.error('Error setting up daily reminder rule:', error);
    throw error;
  }
}

module.exports = {
  setupDailyReminderRule
};