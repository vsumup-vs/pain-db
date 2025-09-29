const cron = require('node-cron');
const { PrismaClient } = require('../../generated/prisma');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

// Daily cron job to send reminders at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily reminder job...');
  
  try {
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        status: 'active',
        reminderSettings: {
          path: ['dailyAssessment'],
          equals: true
        }
      },
      include: { 
        patient: {
          select: {
            id: true,
            firstName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    console.log(`Found ${activeEnrollments.length} enrollments with daily reminders enabled`);

    for (const enrollment of activeEnrollments) {
      await notificationService.sendDailyReminder(
        enrollment.patientId,
        enrollment.id,
        enrollment.reminderSettings
      );
    }

    console.log('Daily reminder job completed');
  } catch (error) {
    console.error('Error in daily reminder job:', error);
  }
});

console.log('Daily reminder scheduler initialized');

module.exports = {};