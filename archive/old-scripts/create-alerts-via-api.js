/**
 * Create test alerts via direct database insertion
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAlerts() {
  try {
    console.log('🚨 Creating test alerts...\n');

    const organization = await prisma.organization.findFirst({
      where: { name: 'Test Clinic - Triage Queue' }
    });

    // Get user and clinician for task assignments
    const user = await prisma.user.findFirst({
      where: { email: 'user@vsumup.com' }
    });

    const clinician = await prisma.clinician.findFirst({
      where: {
        organizationId: organization.id,
        email: 'dr.smith@testclinic.com'
      }
    });

    if (!user) {
      throw new Error('User not found. Please ensure user@vsumup.com exists.');
    }

    if (!clinician) {
      throw new Error('Clinician not found. Please run setup-test-data.js first.');
    }

    const patients = await prisma.patient.findMany({
      where: { organizationId: organization.id },
      take: 3
    });

    const alertRule = await prisma.alertRule.findFirst({
      where: { isActive: true }
    });

    if (!alertRule) {
      console.log('⚠️  No alert rules found. Creating a default rule...');
      const rule = await prisma.alertRule.create({
        data: {
          name: 'Test High Alert',
          description: 'Test alert rule for E2E testing',
          severity: 'HIGH',
          priority: 2,
          isActive: true,
          conditions: { type: 'test' },
          actions: { notify: true },
          cooldownMinutes: 60
        }
      });
      console.log(`✅ Created alert rule: ${rule.name}\n`);
    }

    const rule = await prisma.alertRule.findFirst({ where: { isActive: true } });

    console.log(`Using alert rule: ${rule.name}`);
    console.log(`Creating alerts for ${patients.length} patients...\n`);

    const alerts = [];
    const tasks = [];

    for (const patient of patients) {
      const severity = ['CRITICAL', 'HIGH', 'MEDIUM'][patients.indexOf(patient)];

      const alert = await prisma.alert.create({
        data: {
          patientId: patient.id,
          ruleId: rule.id,
          organizationId: organization.id,
          severity,
          status: 'PENDING',
          message: `Test ${severity} alert for ${patient.firstName} ${patient.lastName}`,
          triggeredAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          data: { test: true, value: Math.floor(Math.random() * 10) }
        }
      });
      alerts.push(alert);

      const task = await prisma.task.create({
        data: {
          patientId: patient.id,
          organizationId: organization.id,
          title: `Follow up on ${severity.toLowerCase()} alert`,
          description: `Review alert and contact patient ${patient.firstName}`,
          taskType: 'FOLLOW_UP_CALL',
          priority: severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
          alertId: alert.id,
          assignedToId: user.id,
          assignedById: user.id
        }
      });
      tasks.push(task);

      console.log(`✅ Created ${severity} alert for ${patient.firstName} ${patient.lastName}`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 TEST ALERTS CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════');
    console.log(`\n📊 Created:`);
    console.log(`   🚨 Alerts: ${alerts.length}`);
    console.log(`   📋 Tasks: ${tasks.length}`);
    console.log(`\n🌐 Test in frontend:`);
    console.log(`   1. Login at http://localhost:5173`);
    console.log(`   2. Navigate to Alerts page`);
    console.log(`   3. You should see ${alerts.length} pending alerts`);
    console.log(`   4. Test claim, acknowledge, resolve`);
    console.log(`   5. Navigate to Tasks page`);
    console.log(`   6. You should see ${tasks.length} pending tasks`);
    console.log(`═══════════════════════════════════════\n`);

  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createTestAlerts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createTestAlerts };
