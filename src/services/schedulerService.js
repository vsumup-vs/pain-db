const cron = require('node-cron');
const { PrismaClient } = require('../../generated/prisma');
const notificationService = require('./notificationService');
const { evaluateMissedAssessments, evaluateMedicationAdherence } = require('./alertEvaluationService');

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

// Hourly cron job to check for missed assessments (runs at :00 of every hour)
cron.schedule('0 * * * *', async () => {
  console.log('Running missed assessments check...');

  try {
    const alertsTriggered = await evaluateMissedAssessments();
    console.log(`Missed assessments check completed: ${alertsTriggered} alert(s) triggered`);
  } catch (error) {
    console.error('Error in missed assessments check:', error);
  }
});

console.log('Missed assessments checker initialized (hourly)');

// Every 6 hours - medication adherence check (runs at 00:00, 06:00, 12:00, 18:00)
cron.schedule('0 */6 * * *', async () => {
  console.log('Running medication adherence check...');

  try {
    const alertsTriggered = await evaluateMedicationAdherence();
    console.log(`Medication adherence check completed: ${alertsTriggered} alert(s) triggered`);
  } catch (error) {
    console.error('Error in medication adherence check:', error);
  }
});

console.log('Medication adherence checker initialized (every 6 hours)');

module.exports = {};