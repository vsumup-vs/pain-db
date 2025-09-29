const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function optimizeStats() {
  console.log('🚀 Creating optimized stats queries...\n');

  try {
    // Test the slow query that's causing issues
    console.log('Testing slow clinician stats query...');
    const start = Date.now();
    
    // This is the problematic query
    const activeClinicianCount = await prisma.clinician.count({
      where: {
        enrollments: {
          some: {
            status: 'active'
          }
        }
      }
    });
    
    const duration = Date.now() - start;
    console.log(`❌ Slow query took ${duration}ms for ${activeClinicianCount} active clinicians`);

    // Let's try a faster approach using raw SQL with correct table names
    console.log('\nTesting optimized approach...');
    const start2 = Date.now();
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT c.id) as active_clinicians
      FROM "clinicians" c
      INNER JOIN "enrollments" e ON c.id = e."clinician_id"
      WHERE e.status = 'active'
    `;
    
    const duration2 = Date.now() - start2;
    console.log(`✅ Optimized query took ${duration2}ms for ${result[0].active_clinicians} active clinicians`);

    // Test other stats
    console.log('\nTesting other stats queries...');
    const statsStart = Date.now();
    
    const [totalPatients, totalClinicians, totalAlerts] = await Promise.all([
      prisma.patient.count(),
      prisma.clinician.count(),
      prisma.alert.count()
    ]);
    
    const statsEnd = Date.now() - statsStart;
    console.log(`📊 Basic stats took ${statsEnd}ms - Patients: ${totalPatients}, Clinicians: ${totalClinicians}, Alerts: ${totalAlerts}`);

    // Test the optimized Prisma approach (without raw SQL)
    console.log('\nTesting optimized Prisma approach...');
    const start3 = Date.now();
    
    const activeEnrollments = await prisma.enrollment.findMany({
      where: { status: 'active' },
      select: { clinicianId: true },
      distinct: ['clinicianId']
    });
    
    const activeCount = activeEnrollments.filter(e => e.clinicianId !== null).length;
    const duration3 = Date.now() - start3;
    console.log(`✅ Optimized Prisma approach took ${duration3}ms for ${activeCount} active clinicians`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

optimizeStats();