const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function testEndpoints() {
  console.log('🧪 Testing individual endpoint queries...\n');

  try {
    // Test patient stats
    console.log('Testing patient stats queries...');
    const start1 = Date.now();
    const [totalPatients, totalObservations] = await Promise.all([
      prisma.patient.count(),
      prisma.observation.count()
    ]);
    console.log(`✅ Patient stats: ${Date.now() - start1}ms (${totalPatients} patients, ${totalObservations} observations)`);

    // Test clinician stats
    console.log('Testing clinician stats queries...');
    const start2 = Date.now();
    const [totalClinicians, activeEnrollments] = await Promise.all([
      prisma.clinician.count(),
      prisma.enrollment.findMany({
        where: { status: 'active' },
        select: { clinicianId: true },
        distinct: ['clinicianId']
      })
    ]);
    const activeCount = activeEnrollments.filter(e => e.clinicianId !== null).length;
    console.log(`✅ Clinician stats: ${Date.now() - start2}ms (${totalClinicians} total, ${activeCount} active)`);

    // Test alert stats
    console.log('Testing alert stats queries...');
    const start3 = Date.now();
    const [totalAlerts, activeAlerts] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { status: 'open' } })
    ]);
    console.log(`✅ Alert stats: ${Date.now() - start3}ms (${totalAlerts} total, ${activeAlerts} active)`);

    // Test the problematic alert severity query
    console.log('Testing alert severity query...');
    const start4 = Date.now();
    const severityStats = await prisma.alert.findMany({
      include: {
        rule: {
          select: { severity: true }
        }
      }
    });
    console.log(`⚠️  Alert severity query: ${Date.now() - start4}ms (${severityStats.length} alerts with includes)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoints();