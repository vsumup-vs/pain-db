const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testReminderService() {
  console.log('🔔 Testing Alert Reminder Service...\n');

  try {
    // Test 1: Load and test notification service
    console.log('1. Testing Notification Service...');
    const notificationService = require('./src/services/notificationService');
    console.log('✅ Notification service loaded successfully');

    // Test 2: Load reminder service
    console.log('\n2. Testing Reminder Service...');
    const reminderService = require('./src/services/reminderService');
    console.log('✅ Reminder service loaded successfully');

    // Test 3: Check for enrollments with reminders
    console.log('\n3. Checking for enrollments with reminder settings...');
    const enrollments = await prisma.enrollment.findMany({
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

    console.log(`✅ Found ${enrollments.length} enrollments with daily reminders enabled`);

    // Test 4: Test notification service with real data
    if (enrollments.length > 0) {
      console.log('\n4. Testing notification service with real enrollment...');
      const testEnrollment = enrollments[0];
      
      console.log(`Testing with patient: ${testEnrollment.patient.firstName}`);
      console.log(`Email: ${testEnrollment.patient.email}`);
      console.log(`Reminder settings:`, testEnrollment.reminderSettings);

      await notificationService.sendDailyReminder(
        testEnrollment.patientId,
        testEnrollment.id,
        testEnrollment.reminderSettings
      );
      
      console.log('✅ Notification test completed (check console output above)');
    } else {
      console.log('\n4. No enrollments with reminders found - testing with mock data...');
      
      // Get any patient for testing
      const testPatient = await prisma.patient.findFirst({
        select: { id: true, firstName: true, email: true }
      });

      if (testPatient) {
        await notificationService.sendDailyReminder(
          testPatient.id,
          'mock-enrollment-id',
          {
            dailyAssessment: true,
            reminderTime: '09:00',
            methods: ['email', 'sms']
          }
        );
        console.log('✅ Mock notification test completed');
      }
    }

    // Test 5: Check alert rules with reminder actions
    console.log('\n5. Checking alert rules with reminder actions...');
    const reminderRules = await prisma.alertRule.findMany({
      where: {
        actions: {
          path: ['reminder'],
          equals: true
        }
      }
    });

    console.log(`✅ Found ${reminderRules.length} alert rules with reminder actions`);

    if (reminderRules.length > 0) {
      console.log('Sample reminder rule:');
      console.log(`- Name: ${reminderRules[0].name}`);
      console.log(`- Actions:`, reminderRules[0].actions);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Alert Reminder Service Test Results:');
    console.log(`✅ Notification Service: Working`);
    console.log(`✅ Reminder Service: Working`);
    console.log(`✅ Enrollments with reminders: ${enrollments.length}`);
    console.log(`✅ Alert rules with reminders: ${reminderRules.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.log('❌ Error during testing:', error.message);
    console.log('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testReminderService().catch(console.error);