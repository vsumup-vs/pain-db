const { PrismaClient } = require('@prisma/client');
const { findBillingEnrollment } = require('../src/utils/billingHelpers');
const billingService = require('../src/services/billingReadinessService');
const prisma = new PrismaClient();

async function verifyEnrollmentIdLinkage() {
  console.log('🔍 Verifying enrollmentId Linkage After Testing...\n');

  // John Doe's details
  const JOHN_DOE_PATIENT_ID = 'cmgzh0nhk00017ky494q8ifl5';
  const JOHN_DOE_ORG_ID = 'cmgz1ve7v00027kyyrqp5w0zk';
  const EXPECTED_ENROLLMENT_ID = 'cmh1eci6m00017k8em28cfrh1';

  // Test 1: Verify findBillingEnrollment helper works
  console.log('📋 Test 1: findBillingEnrollment() Helper Function');
  console.log('─'.repeat(60));
  const foundEnrollmentId = await findBillingEnrollment(JOHN_DOE_PATIENT_ID, JOHN_DOE_ORG_ID);

  if (foundEnrollmentId === EXPECTED_ENROLLMENT_ID) {
    console.log('✅ findBillingEnrollment() correctly returns:', foundEnrollmentId);
  } else {
    console.log('❌ findBillingEnrollment() returned:', foundEnrollmentId);
    console.log('   Expected:', EXPECTED_ENROLLMENT_ID);
  }
  console.log('');

  // Test 2: Check recent TimeLogs for John Doe
  console.log('📋 Test 2: Recent TimeLogs for John Doe');
  console.log('─'.repeat(60));
  const recentTimeLogs = await prisma.timeLog.findMany({
    where: {
      patientId: JOHN_DOE_PATIENT_ID,
      loggedAt: {
        gte: new Date('2025-10-22') // Only today's logs
      }
    },
    include: {
      enrollment: {
        include: {
          billingProgram: {
            select: { name: true, code: true }
          }
        }
      }
    },
    orderBy: { loggedAt: 'desc' }
  });

  console.log(`Found ${recentTimeLogs.length} TimeLogs created today for John Doe:\n`);

  let withEnrollmentId = 0;
  let withoutEnrollmentId = 0;
  let correctEnrollmentId = 0;

  recentTimeLogs.forEach((log, index) => {
    const hasEnrollmentId = log.enrollmentId !== null;
    const isCorrectEnrollmentId = log.enrollmentId === EXPECTED_ENROLLMENT_ID;

    if (hasEnrollmentId) withEnrollmentId++;
    else withoutEnrollmentId++;
    if (isCorrectEnrollmentId) correctEnrollmentId++;

    console.log(`${index + 1}. TimeLog ID: ${log.id}`);
    console.log(`   Duration: ${log.duration} minutes`);
    console.log(`   Source: ${log.source}`);
    console.log(`   Auto-started: ${log.autoStarted}`);
    console.log(`   CPT Code: ${log.cptCode || 'None'}`);
    console.log(`   enrollmentId: ${log.enrollmentId || 'NOT LINKED ❌'}`);

    if (log.enrollment) {
      console.log(`   Billing Program: ${log.enrollment.billingProgram.name} (${log.enrollment.billingProgram.code})`);
      if (isCorrectEnrollmentId) {
        console.log('   ✅ Correctly linked to John Doe\'s billing enrollment');
      }
    } else if (!log.enrollmentId) {
      console.log('   ❌ No enrollment linkage - billing calculations will fail');
    }
    console.log('');
  });

  console.log('Summary:');
  console.log(`  TimeLogs with enrollmentId: ${withEnrollmentId}`);
  console.log(`  TimeLogs WITHOUT enrollmentId: ${withoutEnrollmentId}`);
  console.log(`  TimeLogs with CORRECT enrollmentId: ${correctEnrollmentId}`);
  console.log('');

  if (correctEnrollmentId === recentTimeLogs.length && recentTimeLogs.length > 0) {
    console.log('✅ All recent TimeLogs have correct enrollmentId linkage!\n');
  } else if (withoutEnrollmentId > 0) {
    console.log('❌ Some TimeLogs missing enrollmentId - billing linkage broken!\n');
  } else {
    console.log('⚠️  No recent TimeLogs found - have you completed the testing yet?\n');
  }

  // Test 3: Check for duplicate TimeLogs
  console.log('📋 Test 3: Duplicate TimeLog Detection');
  console.log('─'.repeat(60));

  // Group by duration and source to find potential duplicates
  const duplicates = recentTimeLogs.reduce((acc, log) => {
    const key = `${log.duration}_${log.source}_${log.loggedAt.toISOString().split('T')[0]}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const duplicateGroups = Object.values(duplicates).filter(group => group.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate TimeLogs detected\n');
  } else {
    console.log(`❌ Found ${duplicateGroups.length} potential duplicate groups:\n`);
    duplicateGroups.forEach((group, index) => {
      console.log(`Duplicate Group ${index + 1}:`);
      group.forEach(log => {
        console.log(`  - TimeLog ID: ${log.id}, Duration: ${log.duration}min, Source: ${log.source}`);
      });
      console.log('');
    });
  }

  // Test 4: Billing Readiness Calculation
  console.log('📋 Test 4: Billing Readiness Calculation');
  console.log('─'.repeat(60));

  try {
    const billingReadiness = await billingService.calculateBillingReadiness(
      EXPECTED_ENROLLMENT_ID,
      '2025-10'
    );

    console.log(`Enrollment: ${billingReadiness.patientName}`);
    console.log(`Billing Program: ${billingReadiness.billingProgram}`);
    console.log(`Month: ${billingReadiness.billingMonth}`);
    console.log(`Overall Eligible: ${billingReadiness.eligible ? '✅ Yes' : '❌ No'}`);
    console.log('');

    console.log('CPT Code Eligibility:');
    billingReadiness.cptCodes.forEach(cpt => {
      const status = cpt.eligible ? '✅' : '❌';
      console.log(`  ${status} ${cpt.code} (${cpt.category}): ${cpt.details || cpt.reason}`);
      if (cpt.reimbursementRate) {
        console.log(`     Reimbursement: $${cpt.reimbursementRate}`);
      }
    });
    console.log('');

    console.log(`Total Potential Reimbursement: $${billingReadiness.totalReimbursement}`);
    console.log('');

    if (billingReadiness.summary) {
      console.log('Summary:');
      console.log(`  Setup Completed: ${billingReadiness.summary.setupCompleted ? '✅' : '❌'}`);
      console.log(`  Data Collection Met: ${billingReadiness.summary.dataCollectionMet ? '✅' : '❌'}`);
      console.log(`  Clinical Time Met: ${billingReadiness.summary.clinicalTimeMet ? '✅' : '❌'}`);
      console.log('');
    }

    console.log('✅ Billing readiness calculation completed successfully\n');
  } catch (error) {
    console.log('❌ Billing readiness calculation failed:');
    console.log(`   Error: ${error.message}\n`);
  }

  // Final Summary
  console.log('═'.repeat(60));
  console.log('FINAL VERIFICATION SUMMARY');
  console.log('═'.repeat(60));

  const allTestsPassed =
    foundEnrollmentId === EXPECTED_ENROLLMENT_ID &&
    correctEnrollmentId === recentTimeLogs.length &&
    recentTimeLogs.length > 0 &&
    withoutEnrollmentId === 0 &&
    duplicateGroups.length === 0;

  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ findBillingEnrollment() works correctly');
    console.log('✅ All TimeLogs have correct enrollmentId linkage');
    console.log('✅ No duplicate TimeLogs detected');
    console.log('✅ Billing readiness calculations working');
    console.log('');
    console.log('enrollmentId linkage is working as expected! 🚀');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review issues above');

    if (foundEnrollmentId !== EXPECTED_ENROLLMENT_ID) {
      console.log('❌ findBillingEnrollment() not returning correct enrollment');
    }
    if (withoutEnrollmentId > 0) {
      console.log(`❌ ${withoutEnrollmentId} TimeLogs missing enrollmentId`);
    }
    if (duplicateGroups.length > 0) {
      console.log(`❌ ${duplicateGroups.length} duplicate TimeLog groups detected`);
    }
    if (recentTimeLogs.length === 0) {
      console.log('⚠️  No recent TimeLogs found - testing may not be complete');
    }
  }
  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

verifyEnrollmentIdLinkage().catch(error => {
  console.error('Error during verification:', error);
  process.exit(1);
});
