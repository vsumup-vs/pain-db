const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  getClinicianDailySummary,
  generateEmailHTML,
  sendDailyWrapUp
} = require('../src/services/dailyWrapUpService');
const fs = require('fs');
const path = require('path');

/**
 * Test Daily Wrap-Up Report Generation
 * Usage: node scripts/test-daily-wrapup.js [clinicianId] [date]
 */

async function testDailyWrapUp() {
  try {
    console.log('\n📧 Testing Daily Wrap-Up Report\n');
    console.log('='.repeat(80));

    // Get command line arguments
    const clinicianIdArg = process.argv[2];
    const dateArg = process.argv[3];

    let clinicianId = clinicianIdArg;
    let testDate = dateArg ? new Date(dateArg) : new Date();

    // If no clinician ID provided, find first active clinician
    if (!clinicianId) {
      console.log('\nNo clinician ID provided, finding first active clinician...');

      const clinician = await prisma.clinician.findFirst();

      if (!clinician) {
        console.error('❌ No clinicians found in database!');
        process.exit(1);
      }

      clinicianId = clinician.id;
      console.log(`✅ Found clinician: ${clinician.firstName} ${clinician.lastName} (${clinician.email})`);
    }

    console.log(`\n📊 Generating summary for clinician: ${clinicianId}`);
    console.log(`📅 Date: ${testDate.toLocaleDateString()}\n`);

    // Step 1: Get daily summary
    console.log('Step 1: Fetching daily activity summary...');
    const summary = await getClinicianDailySummary(clinicianId, testDate);

    console.log('\n✅ Summary generated successfully!\n');
    console.log('Summary Details:');
    console.log('  Clinician:', summary.clinician.name);
    console.log('  Email:', summary.clinician.email);
    console.log('  Date:', summary.date);
    console.log('\nActivity Stats:');
    console.log('  Alerts Handled:', summary.summary.alertsHandled);
    console.log('  Avg Resolution Time:', summary.summary.avgResolutionTime, 'minutes');
    console.log('  Assessments Completed:', summary.summary.assessmentsCompleted);
    console.log('  Billable Time:', summary.summary.billableTime.formatted);
    console.log('  Alerts Snoozed:', summary.summary.alertsSnoozed);

    if (Object.keys(summary.summary.cptCodes).length > 0) {
      console.log('\nCPT Codes Logged:');
      Object.entries(summary.summary.cptCodes).forEach(([code, count]) => {
        console.log(`  ${code}: ${count} times`);
      });
    }

    console.log('\nFollow-Up Items:', summary.followUp.totalItems);
    console.log('  Overdue Assessments:', summary.followUp.overdueAssessments.length);
    console.log('  Snoozed Alerts Resuming:', summary.followUp.snoozedAlerts.length);
    console.log('  Tasks Due Tomorrow:', summary.followUp.tasksDueTomorrow.length);

    // Step 2: Generate HTML email
    console.log('\n\nStep 2: Generating HTML email...');
    const html = generateEmailHTML(summary);

    // Save HTML to file for preview
    const outputDir = path.join(__dirname, '../test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const filename = `daily-wrapup-${clinicianId}-${testDate.toISOString().split('T')[0]}.html`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, html);
    console.log(`✅ HTML email saved to: ${filepath}`);
    console.log('\n📧 You can open this file in a browser to preview the email!');

    // Step 3: Optionally send actual email
    console.log('\n\n='.repeat(80));
    console.log('Would you like to send this email? (Set SEND_TEST_EMAIL=true)');

    if (process.env.SEND_TEST_EMAIL === 'true') {
      console.log('\n\nStep 3: Sending test email...');

      const result = await sendDailyWrapUp(clinicianId, testDate);

      if (result.success) {
        console.log(`✅ Email sent successfully to ${result.email}!`);
        console.log('Summary:', result.summary);
      } else {
        console.error(`❌ Failed to send email: ${result.reason || result.error}`);
      }
    } else {
      console.log('\nTo send actual email, run:');
      console.log(`SEND_TEST_EMAIL=true node scripts/test-daily-wrapup.js ${clinicianId} ${testDate.toISOString().split('T')[0]}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Error testing daily wrap-up:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDailyWrapUp()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
