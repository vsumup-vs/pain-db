const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { broadcastNewAlert } = require('./src/services/sseService');

async function createTestAlert() {
  try {
    console.log('\n🧪 Creating test alert assigned to clinician for SSE test...\n');

    // Get SSE test user and clinician
    const user = await prisma.user.findFirst({
      where: { email: 'sse-test@example.com' },
      include: {
        userOrganizations: {
          include: { organization: true }
        }
      }
    });

    const organizationId = user.userOrganizations[0].organizationId;

    const clinician = await prisma.clinician.findFirst({
      where: {
        organizationId,
        email: user.email
      }
    });

    if (!clinician) {
      console.error('❌ Clinician not found');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ Clinician found:', clinician.id);

    // Get a patient from the organization
    const patient = await prisma.patient.findFirst({
      where: { organizationId }
    });

    if (!patient) {
      console.error('❌ No patients found in organization');
      await prisma.$disconnect();
      return;
    }

    // Get or create alert rule
    let alertRule = await prisma.alertRule.findFirst({
      where: { organizationId }
    });

    if (!alertRule) {
      console.log('📝 Creating test alert rule...');
      alertRule = await prisma.alertRule.create({
        data: {
          organizationId,
          name: 'SSE Test Rule',
          description: 'Temporary rule for SSE testing',
          severity: 'HIGH',
          priority: 5,
          conditions: {
            type: 'TEST',
            message: 'Test alert for SSE'
          },
          actions: { notify: true }
        }
      });
      console.log('✅ Test alert rule created');
    }

    // Create test alert assigned to clinician
    const alert = await prisma.alert.create({
      data: {
        organizationId,
        patientId: patient.id,
        ruleId: alertRule.id,
        clinicianId: clinician.id,  // ← Assigned to clinician for SSE broadcast
        severity: 'HIGH',
        status: 'PENDING',
        message: `🧪 SSE TEST ALERT - Created at ${new Date().toLocaleTimeString()}`,
        data: {
          testAlert: true,
          createdBy: 'sse-test-script',
          assignedClinician: clinician.id
        },
        riskScore: 8.5,
        priorityRank: 1,
        triggeredAt: new Date()
      }
    });

    console.log('\n✅ Test alert created!');
    console.log(`Alert ID: ${alert.id}`);
    console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`Assigned to Clinician: ${clinician.id}`);
    console.log(`Severity: ${alert.severity}`);
    console.log(`Message: ${alert.message}`);
    console.log('');

    // Broadcast via SSE
    console.log('📡 Broadcasting alert via SSE to clinician...');
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
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

createTestAlert();
