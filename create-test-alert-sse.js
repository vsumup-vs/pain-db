const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { broadcastNewAlert } = require('./src/services/sseService');

async function createTestAlert() {
  try {
    console.log('\n🧪 Creating SSE test alert...\n');

    // Use the enrollment we just created
    const enrollmentId = 'cmgw8suaw00017ktyr8teciko';
    const clinicianId = 'cmgvzkncn00017knxxb48s3wa';
    const ruleId = 'cmgvxx3wt00017kglh8mqo5yw';

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        patient: true,
        organization: true
      }
    });

    if (!enrollment) {
      console.error('❌ Enrollment not found');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ Enrollment found:', enrollmentId);
    console.log('   Patient:', enrollment.patient.firstName, enrollment.patient.lastName);
    console.log('   Clinician:', clinicianId);

    // Create test alert assigned to clinician
    const alert = await prisma.alert.create({
      data: {
        organizationId: enrollment.organizationId,
        patientId: enrollment.patientId,
        ruleId: ruleId,
        clinicianId: clinicianId,  // ← Assigned to clinician for SSE broadcast
        severity: 'HIGH',
        status: 'PENDING',
        message: `🧪 SSE TEST ALERT - Created at ${new Date().toLocaleTimeString()}`,
        data: {
          testAlert: true,
          createdBy: 'sse-test-script',
          assignedClinician: clinicianId,
          enrollmentId: enrollmentId
        },
        riskScore: 8.5,
        priorityRank: 1,
        triggeredAt: new Date()
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        rule: { select: { name: true } }
      }
    });

    console.log('\n✅ Test alert created!');
    console.log(`Alert ID: ${alert.id}`);
    console.log(`Patient: ${alert.patient.firstName} ${alert.patient.lastName}`);
    console.log(`Assigned to Clinician: ${alert.clinicianId}`);
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
