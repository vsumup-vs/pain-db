const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function diagnoseIssue() {
  try {
    console.log('🔍 Diagnosing application loading issue...\n');

    // Test basic database connectivity
    console.log('1. Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    // Test each stats endpoint that the dashboard calls
    console.log('\n2. Testing stats queries...');
    
    try {
      const patientStats = await prisma.patient.count();
      console.log(`✅ Patient stats: ${patientStats} patients`);
    } catch (error) {
      console.log(`❌ Patient stats failed: ${error.message}`);
    }

    try {
      const clinicianStats = await prisma.clinician.count();
      console.log(`✅ Clinician stats: ${clinicianStats} clinicians`);
    } catch (error) {
      console.log(`❌ Clinician stats failed: ${error.message}`);
    }

    try {
      const alertStats = await prisma.alert.count();
      console.log(`✅ Alert stats: ${alertStats} alerts`);
    } catch (error) {
      console.log(`❌ Alert stats failed: ${error.message}`);
    }

    // Check for recent bulk upload data
    console.log('\n3. Checking recent data...');
    const recentPatients = await prisma.patient.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${recentPatients.length} patients created in last 24 hours`);

    const recentEnrollments = await prisma.enrollment.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${recentEnrollments.length} enrollments created in last 24 hours`);

    // Test a simple API-like query that the dashboard would make
    console.log('\n4. Testing dashboard-like queries...');
    
    const dashboardData = await Promise.all([
      prisma.patient.count(),
      prisma.clinician.count({ where: { enrollments: { some: { status: 'active' } } } }),
      prisma.alert.count({ where: { status: 'open' } })
    ]);

    console.log(`✅ Dashboard query successful: ${dashboardData[0]} patients, ${dashboardData[1]} active clinicians, ${dashboardData[2]} open alerts`);

    // Check for any slow queries that might be causing issues
    console.log('\n5. Testing potentially slow queries...');
    
    const start = Date.now();
    const recentPatientsWithDetails = await prisma.patient.findMany({
      take: 5,
      include: {
        enrollments: {
          include: {
            clinician: true,
            preset: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const queryTime = Date.now() - start;
    
    console.log(`✅ Complex patient query completed in ${queryTime}ms`);
    console.log(`   Found ${recentPatientsWithDetails.length} patients with full details`);

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseIssue();