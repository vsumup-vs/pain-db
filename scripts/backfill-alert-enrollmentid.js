const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillAlertEnrollmentIds() {
  console.log('🔍 Searching for alerts without enrollmentId...\n');

  const alerts = await prisma.alert.findMany({
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  console.log(`Found ${alerts.length} total alerts\n`);

  let updated = 0;
  let skipped = 0;
  let noEnrollment = 0;

  for (const alert of alerts) {
    // Check if enrollmentId already exists in data
    if (alert.data?.enrollmentId) {
      console.log(`⏭️  Alert ${alert.id} already has enrollmentId: ${alert.data.enrollmentId}`);
      skipped++;
      continue;
    }

    // Find active enrollment with billing program
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: alert.patientId,
        organizationId: alert.organizationId,
        billingProgramId: { not: null },
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      orderBy: { startDate: 'desc' }
    });

    if (enrollment) {
      // Update alert.data with enrollmentId
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          data: {
            ...alert.data,
            enrollmentId: enrollment.id
          }
        }
      });
      console.log(`✅ Updated alert ${alert.id} (${alert.patient.firstName} ${alert.patient.lastName}) with enrollmentId: ${enrollment.id}`);
      updated++;
    } else {
      console.log(`❌ No billing enrollment found for alert ${alert.id} (patient: ${alert.patient.firstName} ${alert.patient.lastName})`);
      noEnrollment++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated} alerts`);
  console.log(`   ⏭️  Skipped (already had enrollmentId): ${skipped} alerts`);
  console.log(`   ❌ No billing enrollment: ${noEnrollment} alerts`);
  console.log(`   📋 Total processed: ${alerts.length} alerts`);

  await prisma.$disconnect();
}

backfillAlertEnrollmentIds().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
