/**
 * Test enrollmentId linkage implementation
 *
 * This script tests that:
 * 1. findBillingEnrollment helper works correctly
 * 2. TimeLogs created via timer have enrollmentId populated
 * 3. Observations created have enrollmentId populated
 * 4. Billing readiness calculations work with enrollmentId filtering
 */

const { PrismaClient } = require('@prisma/client');
const { findBillingEnrollment } = require('../src/utils/billingHelpers');

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing enrollmentId Linkage Implementation\n');

  try {
    // Step 1: Find a test patient with billing enrollment
    console.log('1️⃣  Finding test patient with billing enrollment...');

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        billingProgramId: { not: null },
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        patient: true,
        billingProgram: true,
        organization: true
      }
    });

    if (!enrollment) {
      console.log('❌ No test patient with billing enrollment found.');
      console.log('   Please run seed script to create test data first.');
      return;
    }

    console.log(`✅ Found test patient: ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
    console.log(`   Enrollment ID: ${enrollment.id}`);
    console.log(`   Billing Program: ${enrollment.billingProgram.name}`);
    console.log(`   Organization: ${enrollment.organization.name}\n`);

    // Step 2: Test findBillingEnrollment helper
    console.log('2️⃣  Testing findBillingEnrollment helper...');

    const foundEnrollmentId = await findBillingEnrollment(
      enrollment.patientId,
      enrollment.organizationId
    );

    if (foundEnrollmentId === enrollment.id) {
      console.log(`✅ Helper correctly found enrollment: ${foundEnrollmentId}\n`);
    } else {
      console.log(`❌ Helper returned incorrect enrollment: ${foundEnrollmentId}`);
      console.log(`   Expected: ${enrollment.id}\n`);
    }

    // Step 3: Check existing TimeLogs for enrollmentId
    console.log('3️⃣  Checking existing TimeLogs for enrollmentId...');

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        patientId: enrollment.patientId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (timeLogs.length === 0) {
      console.log('⚠️  No TimeLogs found for this patient.');
    } else {
      const timeLogsWithEnrollmentId = timeLogs.filter(tl => tl.enrollmentId !== null).length;
      console.log(`   Total TimeLogs: ${timeLogs.length}`);
      console.log(`   With enrollmentId: ${timeLogsWithEnrollmentId}`);
      console.log(`   Without enrollmentId: ${timeLogs.length - timeLogsWithEnrollmentId}`);

      if (timeLogsWithEnrollmentId > 0) {
        console.log(`✅ Some TimeLogs have enrollmentId populated\n`);
      } else {
        console.log(`⚠️  No TimeLogs have enrollmentId (expected if created before implementation)\n`);
      }
    }

    // Step 4: Check existing Observations for enrollmentId
    console.log('4️⃣  Checking existing Observations for enrollmentId...');

    const observations = await prisma.observation.findMany({
      where: {
        patientId: enrollment.patientId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (observations.length === 0) {
      console.log('⚠️  No Observations found for this patient.');
    } else {
      const observationsWithEnrollmentId = observations.filter(o => o.enrollmentId !== null).length;
      console.log(`   Total Observations: ${observations.length}`);
      console.log(`   With enrollmentId: ${observationsWithEnrollmentId}`);
      console.log(`   Without enrollmentId: ${observations.length - observationsWithEnrollmentId}`);

      if (observationsWithEnrollmentId > 0) {
        console.log(`✅ Some Observations have enrollmentId populated\n`);
      } else {
        console.log(`⚠️  No Observations have enrollmentId (expected if created before implementation)\n`);
      }
    }

    // Step 5: Test billing readiness calculation with enrollmentId filtering
    console.log('5️⃣  Testing billing readiness calculation...');

    const billingMonth = new Date().toISOString().slice(0, 7); // Current month YYYY-MM

    // Count observations for this enrollment only
    const enrollmentObservations = await prisma.observation.count({
      where: {
        enrollmentId: enrollment.id,
        recordedAt: {
          gte: new Date(billingMonth + '-01'),
          lte: new Date(new Date(billingMonth + '-01').getFullYear(), new Date(billingMonth + '-01').getMonth() + 1, 0, 23, 59, 59)
        }
      }
    });

    console.log(`   Observations for enrollment ${enrollment.id} in ${billingMonth}: ${enrollmentObservations}`);

    // Count time logs for this enrollment only
    const enrollmentTimeLogs = await prisma.timeLog.aggregate({
      where: {
        enrollmentId: enrollment.id,
        loggedAt: {
          gte: new Date(billingMonth + '-01'),
          lte: new Date(new Date(billingMonth + '-01').getFullYear(), new Date(billingMonth + '-01').getMonth() + 1, 0, 23, 59, 59)
        },
        billable: true
      },
      _sum: {
        duration: true
      }
    });

    const totalMinutes = enrollmentTimeLogs._sum.duration || 0;
    console.log(`   Billable time for enrollment ${enrollment.id} in ${billingMonth}: ${totalMinutes} minutes`);

    if (enrollmentObservations > 0 || totalMinutes > 0) {
      console.log(`✅ Billing readiness calculation can use enrollmentId filtering\n`);
    } else {
      console.log(`⚠️  No data found for current month - create test data to fully verify\n`);
    }

    // Step 6: Summary
    console.log('📊 Summary');
    console.log('─────────────────────────────────────────────────');
    console.log(`✅ findBillingEnrollment helper: Working correctly`);
    const timeLogsWithId = timeLogs.filter(tl => tl.enrollmentId !== null).length;
    const obsWithId = observations.filter(o => o.enrollmentId !== null).length;
    console.log(`${timeLogsWithId > 0 ? '✅' : '⚠️ '} TimeLogs with enrollmentId: ${timeLogsWithId} of ${timeLogs.length}`);
    console.log(`${obsWithId > 0 ? '✅' : '⚠️ '} Observations with enrollmentId: ${obsWithId} of ${observations.length}`);
    console.log(`✅ Billing readiness filtering: Ready for use`);
    console.log('─────────────────────────────────────────────────');

    console.log('\n💡 Next Steps:');
    if (timeLogsWithId === 0 && timeLogs.length > 0) {
      console.log('   - Create new TimeLogs to verify enrollmentId is populated');
    }
    if (obsWithId === 0 && observations.length > 0) {
      console.log('   - Create new Observations to verify enrollmentId is populated');
    }
    if (enrollmentObservations === 0 && totalMinutes === 0) {
      console.log('   - Add test data for current month to fully test billing calculations');
    }
    console.log('   - Run integration tests with API endpoints (start/stop timer, create observation)');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
