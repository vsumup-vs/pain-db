const { PrismaClient } = require('./generated/prisma');

async function quickReminderTest() {
  console.log('🔔 Quick Alert Reminder Service Test\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test 1: Check Prisma connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Test 2: Load services
    console.log('\n2. Loading reminder services...');
    
    try {
      const reminderService = require('./src/services/reminderService');
      console.log('✅ Reminder service loaded');
    } catch (error) {
      console.log('❌ Reminder service error:', error.message);
    }

    try {
      const notificationService = require('./src/services/notificationService');
      console.log('✅ Notification service loaded');
    } catch (error) {
      console.log('❌ Notification service error:', error.message);
    }

    try {
      const schedulerService = require('./src/services/schedulerService');
      console.log('✅ Scheduler service loaded');
    } catch (error) {
      console.log('❌ Scheduler service error:', error.message);
    }

    // Test 3: Check for enrollments with reminder settings
    console.log('\n3. Checking enrollments with reminder settings...');
    const enrollmentsWithReminders = await prisma.enrollment.findMany({
      where: {
        status: 'active',
        reminderSettings: {
          not: null
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            email: true
          }
        }
      }
    });

    console.log(`✅ Found ${enrollmentsWithReminders.length} enrollments with reminder settings`);
    
    if (enrollmentsWithReminders.length > 0) {
      console.log('\nEnrollment details:');
      enrollmentsWithReminders.forEach((enrollment, index) => {
        console.log(`  ${index + 1}. Patient: ${enrollment.patient.firstName}`);
        console.log(`     Email: ${enrollment.patient.email}`);
        console.log(`     Reminder settings:`, enrollment.reminderSettings);
      });
    }

    // Test 4: Check for alert rules with reminder actions
    console.log('\n4. Checking alert rules with reminder actions...');
    const reminderAlertRules = await prisma.alertRule.findMany({
      where: {
        actions: {
          path: ['reminder'],
          equals: true
        }
      }
    });

    console.log(`✅ Found ${reminderAlertRules.length} alert rules with reminder actions`);

    if (reminderAlertRules.length > 0) {
      console.log('\nReminder alert rules:');
      reminderAlertRules.forEach((rule, index) => {
        console.log(`  ${index + 1}. ${rule.name}`);
        console.log(`     Severity: ${rule.severity}`);
        console.log(`     Actions:`, rule.actions);
      });
    }

    // Test 5: Check recent alerts
    console.log('\n5. Checking recent alerts...');
    const recentAlerts = await prisma.alert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        rule: {
          select: {
            name: true,
            actions: true
          }
        },
        enrollment: {
          select: {
            id: true,
            patient: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    console.log(`✅ Found ${recentAlerts.length} recent alerts`);
    if (recentAlerts.length > 0) {
      recentAlerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. Alert from rule: ${alert.rule.name}`);
        console.log(`     Patient: ${alert.enrollment.patient.firstName} ${alert.enrollment.patient.lastName}`);
        console.log(`     Triggered: ${alert.triggeredAt}`);
      });
    }

    if (recentAlerts.length > 0) {
      console.log('\nRecent alerts:');
      recentAlerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. Rule: ${alert.alertRule.name}`);
        console.log(`     Status: ${alert.status}`);
        console.log(`     Created: ${alert.createdAt.toISOString()}`);
      });
    }

    console.log('\n✅ Quick reminder test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
quickReminderTest().catch(console.error);