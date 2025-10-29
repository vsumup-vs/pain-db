const { PrismaClient } = require('../generated/prisma');
const notificationService = require('../src/services/notificationService');

const prisma = new PrismaClient();

async function testMailtrapEmail() {
  console.log('🧪 Testing Mailtrap email configuration...\n');

  try {
    // Get a test patient and clinician from the database
    const patient = await prisma.patient.findFirst({
      include: {
        organization: true
      }
    });

    const clinician = await prisma.clinician.findFirst({
      include: {
        organization: true
      }
    });

    if (!patient || !clinician) {
      console.error('❌ No patient or clinician found in database for testing');
      console.log('Please run seed scripts first: npm run seed');
      return;
    }

    console.log(`📧 Sending test email to: ${clinician.email}`);
    console.log(`   Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`   Clinician: ${clinician.firstName} ${clinician.lastName}\n`);

    // Create a mock alert for testing
    const mockAlert = {
      id: 'test-alert-id',
      severity: 'HIGH',
      message: 'Test alert for Mailtrap email verification',
      riskScore: 8.5,
      triggeredAt: new Date(),
      slaBreachTime: new Date(Date.now() + 3600000) // 1 hour from now
    };

    // Send test alert notification
    const result = await notificationService.sendAlertNotification(
      mockAlert,
      clinician,
      patient
    );

    console.log('\n✅ Email sending result:', JSON.stringify(result, null, 2));
    console.log('\n📬 Check your Mailtrap inbox at: https://mailtrap.io/inboxes');
    console.log('   You should see an email with subject: "HIGH Alert: ' + patient.firstName + ' ' + patient.lastName + '"');

  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testMailtrapEmail();
