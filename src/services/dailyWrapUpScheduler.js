/**
 * Daily Wrap-Up Scheduler (Phase 1b)
 *
 * Scheduled background job for:
 * - Daily wrap-up emails to clinicians (5 PM daily)
 *
 * Uses node-cron for scheduling
 */

const cron = require('node-cron');
const { sendAllDailyWrapUps } = require('./dailyWrapUpService');

// Track active scheduled jobs
const activeJobs = [];

/**
 * Start daily wrap-up scheduled job
 * Sends emails at 5 PM every day
 */
function startScheduledJobs() {
  console.log('📧 Starting daily wrap-up scheduled jobs...');

  // Daily wrap-up emails - 5 PM every day (17:00)
  // Cron: "0 17 * * *" = At 17:00 (5 PM) every day
  const dailyWrapUpJob = cron.schedule('0 17 * * *', async () => {
    console.log('[DailyWrapUpScheduler] Starting scheduled wrap-up emails...');

    try {
      const result = await sendAllDailyWrapUps();
      console.log('[DailyWrapUpScheduler] Wrap-up emails sent:', result);
    } catch (error) {
      console.error('[DailyWrapUpScheduler] Error sending wrap-up emails:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust timezone as needed
  });

  activeJobs.push({
    name: 'Daily Wrap-Up Emails',
    schedule: '5 PM daily',
    job: dailyWrapUpJob
  });

  console.log('✅ Daily wrap-up job scheduled:');
  console.log('  - Daily wrap-up emails: 5 PM every day');
}

/**
 * Stop all scheduled jobs
 */
function stopScheduledJobs() {
  console.log('🛑 Stopping daily wrap-up scheduled jobs...');

  activeJobs.forEach(({ name, job }) => {
    job.stop();
    console.log(`  - Stopped: ${name}`);
  });

  // Clear the jobs array
  activeJobs.length = 0;

  console.log('✅ All daily wrap-up jobs stopped');
}

/**
 * Get status of all scheduled jobs
 * @returns {Array} Array of job statuses
 */
function getJobStatus() {
  return activeJobs.map(({ name, schedule }) => ({
    name,
    schedule,
    status: 'running'
  }));
}

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  getJobStatus
};
