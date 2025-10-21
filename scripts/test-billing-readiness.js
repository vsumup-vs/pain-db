const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateBillingReadiness, generateBillingSummary } = require('../src/services/billingReadinessService');

async function testBillingReadiness() {
  console.log('🧪 Testing Billing Readiness Calculations\n');
  console.log('='.repeat(80));

  // Get enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      patient: {
        firstName: { in: ['William', 'Jennifer'] }
      }
    },
    include: {
      patient: true,
      billingProgram: true
    }
  });

  console.log(`\nFound ${enrollments.length} enrollments to test\n`);

  // Test each enrollment
  for (const enrollment of enrollments) {
    console.log(`\n👤 Testing: ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
    console.log(`   Enrollment ID: ${enrollment.id}`);
    console.log(`   Billing Program: ${enrollment.billingProgram?.name || 'NOT SET'}`);

    try {
      const result = await calculateBillingReadiness(enrollment.id, '2025-10');

      console.log(`\n   ✅ Billing Readiness for October 2025:`);
      console.log(`   Overall Eligible: ${result.eligible}`);
      console.log(`   Program: ${result.billingProgramCode}`);

      if (result.eligibilityRules) {
        console.log(`\n   Eligibility Rules:`);
        result.eligibilityRules.forEach(rule => {
          console.log(`   ${rule.passed ? '✓' : '✗'} ${rule.ruleName}: ${rule.reason || 'Passed'}`);
        });
      }

      console.log(`\n   CPT Codes:`);
      result.cptCodes.forEach(cpt => {
        const status = cpt.eligible ? '✓' : '✗';
        console.log(`   ${status} ${cpt.code} - ${cpt.description}`);
        console.log(`      ${cpt.details || cpt.reason || 'N/A'}`);
        if (cpt.reimbursementRate) {
          console.log(`      Reimbursement: $${cpt.reimbursementRate}`);
        }
      });

      console.log(`\n   Total Reimbursement: $${result.totalReimbursement}`);
      console.log(`   Summary: ${result.summary.eligibleCPTCodes} of ${result.summary.totalCPTCodes} CPT codes eligible`);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(error.stack);
    }

    console.log('\n' + '-'.repeat(80));
  }

  // Test organization summary
  console.log('\n\n📊 Testing Organization Billing Summary\n');

  try {
    const orgId = enrollments[0].patient.organizationId;
    const summary = await generateBillingSummary(orgId, '2025-10');

    console.log(`Organization ID: ${summary.organizationId}`);
    console.log(`Billing Month: ${summary.billingMonth}`);
    console.log(`\nSummary:`);
    console.log(`  Total Enrollments: ${summary.summary.totalEnrollments}`);
    console.log(`  Eligible: ${summary.summary.eligibleEnrollments}`);
    console.log(`  Not Eligible: ${summary.summary.notEligibleEnrollments}`);
    console.log(`  Eligibility Rate: ${summary.summary.eligibilityRate}%`);
    console.log(`  Total Reimbursement: $${summary.summary.totalReimbursement}`);

    console.log(`\nBy Program:`);
    Object.entries(summary.byProgram).forEach(([code, data]) => {
      console.log(`  ${code}: ${data.count} enrollments, $${data.totalReimbursement}`);
    });

  } catch (error) {
    console.error(`❌ Error generating summary: ${error.message}`);
    console.error(error.stack);
  }

  await prisma.$disconnect();
}

testBillingReadiness().catch(console.error);
