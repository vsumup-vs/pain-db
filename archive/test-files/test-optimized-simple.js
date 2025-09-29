const { PrismaClient } = require('./generated/prisma');

const prisma = global.prisma || new PrismaClient();

async function testOptimizedQueries() {
  console.log('🚀 Testing optimized dashboard queries directly...\n');

  try {
    // Test 1: Optimized recent patients (what the new endpoint does)
    console.log('Testing optimized recent patients query...');
    const start1 = Date.now();
    const recentPatients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true
      }
    });
    const time1 = Date.now() - start1;
    console.log(`✅ Optimized recent patients: ${time1}ms (${recentPatients.length} patients)`);

    // Test 2: Original heavy patients query (what was causing slowness)
    console.log('Testing original heavy patients query...');
    const start2 = Date.now();
    const heavyPatients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        enrollments: {
          include: {
            clinician: {
              select: {
                id: true,
                npi: true,
                createdAt: true
              }
            }
          }
        }
      }
    });
    const time2 = Date.now() - start2;
    console.log(`⚠️  Original heavy patients: ${time2}ms (${heavyPatients.length} patients)`);

    // Test 3: Optimized recent alerts
    console.log('Testing optimized recent alerts query...');
    const start3 = Date.now();
    const recentAlerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        rule: {
          select: { 
            name: true, 
            severity: true 
          }
        },
        enrollment: {
          select: { 
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
    const time3 = Date.now() - start3;
    console.log(`✅ Optimized recent alerts: ${time3}ms (${recentAlerts.length} alerts)`);

    // Test 4: Original heavy alerts query
    console.log('Testing original heavy alerts query...');
    const start4 = Date.now();
    const heavyAlerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        rule: {
          select: { id: true, name: true, severity: true }
        },
        enrollment: {
          select: { 
            id: true, 
            patient: {
              select: { id: true, mrn: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });
    const time4 = Date.now() - start4;
    console.log(`⚠️  Original heavy alerts: ${time4}ms (${heavyAlerts.length} alerts)`);

    // Test 5: All stats queries in parallel
    console.log('Testing all stats queries in parallel...');
    const start5 = Date.now();
    const [patientsCount, cliniciansCount, alertsCount] = await Promise.all([
      prisma.patient.count(),
      prisma.clinician.count(),
      prisma.alert.count()
    ]);
    const time5 = Date.now() - start5;
    console.log(`✅ All stats (parallel): ${time5}ms`);

    console.log('\n📊 Performance Summary:');
    console.log(`Optimized patients: ${time1}ms`);
    console.log(`Heavy patients: ${time2}ms`);
    console.log(`Optimized alerts: ${time3}ms`);
    console.log(`Heavy alerts: ${time4}ms`);
    console.log(`Stats queries: ${time5}ms`);
    
    const improvement1 = time2 > 0 ? Math.round(((time2 - time1) / time2) * 100) : 0;
    const improvement2 = time4 > 0 ? Math.round(((time4 - time3) / time4) * 100) : 0;
    
    console.log(`\n🎯 Performance improvements:`);
    console.log(`Patients: ${improvement1}% faster`);
    console.log(`Alerts: ${improvement2}% faster`);

    // Simulate total dashboard load time
    const totalOptimized = time1 + time3 + time5;
    const totalHeavy = time2 + time4 + time5;
    
    console.log(`\n⏱️  Dashboard loading simulation:`);
    console.log(`Optimized approach: ${totalOptimized}ms`);
    console.log(`Original approach: ${totalHeavy}ms`);
    console.log(`Overall improvement: ${Math.round(((totalHeavy - totalOptimized) / totalHeavy) * 100)}% faster`);

    if (totalOptimized < 200) {
      console.log('\n🎉 EXCELLENT! Dashboard should load in under 200ms');
    } else if (totalOptimized < 500) {
      console.log('\n✅ GOOD! Dashboard should load in under 500ms');
    } else {
      console.log('\n⚠️  Still needs optimization');
    }

  } catch (error) {
    console.error('❌ Error testing queries:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOptimizedQueries();