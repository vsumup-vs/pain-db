const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { broadcastNewAlert } = require('./src/services/sseService');

async function createTestAlert() {
  try {
    console.log('\n🧪 Creating test alert for SSE browser test...\n');

    // Get test data
    const user = await prisma.user.findFirst({
      where: { email: 'sse-test@example.com' },
      include: {
        userOrganizations: {
          include: { organization: true }
        }
      }
    });

    if (!user || !user.userOrganizations[0]) {
      console.error('❌ Test user not found or has no organization');
      await prisma.$disconnect();
      return;
    }

    const organizationId = user.userOrganizations[0].organizationId;

    // Get a patient from the organization
    const patient = await prisma.patient.findFirst({
      where: { organizationId }
    });

    if (!patient) {
      console.error('❌ No patients found in organization');
      await prisma.$disconnect();
      return;
    }

    // Try to get an alert rule, create one if needed
    let alertRule = await prisma.alertRule.findFirst({
      where: { organizationId }
    });

    if (!alertRule) {
      console.log('📝 No alert rule found, creating a test rule...');
      alertRule = await prisma.alertRule.create({
        data: {
          organizationId,
          name: 'SSE Test Rule',
          description: 'Temporary rule for SSE testing',
          severity: 'HIGH',
          priority: 5,
          isActive: true,
          conditions: {
            type: 'TEST',
            message: 'Test alert for SSE'
          },
          actions: { notify: true }
        }
      });
      console.log('✅ Test alert rule created');
    }

    // Create test alert
    const alert = await prisma.alert.create({
      data: {
        organizationId,
        patientId: patient.id,
        ruleId: alertRule.id,
        severity: 'HIGH',
        status: 'PENDING',
        message: `🧪 SSE TEST ALERT - Created at ${new Date().toLocaleTimeString()}`,
        data: {
          testAlert: true,
          createdBy: 'browser-test-script'
        },
        riskScore: 7.5,
        priorityRank: 1,
        triggeredAt: new Date()
      }
    });

    console.log('✅ Test alert created!');
    console.log(`Alert ID: ${alert.id}`);
    console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`Severity: ${alert.severity}`);
    console.log(`Message: ${alert.message}`);
    console.log('');

    // Broadcast via SSE
    console.log('📡 Broadcasting alert via SSE...');
    broadcastNewAlert(alert);

    console.log('');
    console.log('👀 Check your browser:');
    console.log('   - You should see a toast notification appear');
    console.log('   - Alert should appear in triage queue');
    console.log('   - No page refresh needed!');
    console.log('');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

createTestAlert();
