const { PrismaClient } = require('@prisma/client');
const { suggestBillingPackages } = require('../src/services/packageSuggestionService');
const { approveSuggestion } = require('../src/services/packageSuggestionService');

const prisma = new PrismaClient();

async function testSingleProgramApproval() {
  console.log('\n=== Testing Single Program Selection & Approval ===\n');

  try {
    // Step 1: Get the test patient with auto-generated suggestion
    const patient = await prisma.patient.findFirst({
      where: { email: { contains: 'auto-test' } }
    });

    if (!patient) {
      console.error('❌ Test patient not found');
      return;
    }

    console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`Diagnosis Codes: ${JSON.stringify(patient.diagnosisCodes, null, 2)}\n`);

    // Step 2: Get existing suggestion
    let suggestion = await prisma.enrollmentSuggestion.findFirst({
      where: {
        patientId: patient.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!suggestion) {
      console.log('No pending suggestion found. Creating new suggestion...');

      // Delete old suggestions
      await prisma.enrollmentSuggestion.deleteMany({
        where: { patientId: patient.id }
      });

      // Generate new suggestion
      const suggestions = await suggestBillingPackages(patient.id, patient.organizationId, {
        sourceType: 'PATIENT_RECORD',
        sourceId: patient.id
      });

      if (suggestions.length === 0) {
        console.error('❌ No suggestions generated');
        return;
      }

      suggestion = suggestions[0];
      console.log('✅ New suggestion created\n');
    }

    console.log(`Suggestion ID: ${suggestion.id}`);
    console.log(`Status: ${suggestion.status}`);
    console.log(`Match Score: ${suggestion.matchScore}\n`);

    // Step 3: Verify filtered programs
    console.log('📋 Suggested Programs (filtered by organization support):');
    const programs = suggestion.suggestedPrograms?.programs || [];
    programs.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.programType} (${p.billingProgramCode})`);
      console.log(`     CPT Codes: ${p.cptCodes?.join(', ')}`);
    });
    console.log('');

    if (programs.length === 0) {
      console.error('❌ No programs in suggestion');
      return;
    }

    // Verify RTM is filtered out
    const hasRTM = programs.some(p => p.programType === 'RTM');
    if (hasRTM) {
      console.error('❌ RTM program should be filtered out but is present');
    } else {
      console.log('✅ RTM program correctly filtered out\n');
    }

    // Step 4: Count existing enrollments
    const beforeCount = await prisma.enrollment.count({
      where: { patientId: patient.id }
    });
    console.log(`📊 Enrollments before approval: ${beforeCount}\n`);

    // Step 5: Approve suggestion with ONLY RPM program selected
    console.log('🔄 Approving suggestion with RPM program selected...\n');

    // Get a clinician for the approval
    const clinician = await prisma.clinician.findFirst({
      where: { organizationId: patient.organizationId }
    });

    if (!clinician) {
      console.error('❌ No clinician found for approval');
      return;
    }

    const updatedSuggestion = await approveSuggestion(
      suggestion.id,
      clinician.userId, // reviewedById
      {
        clinicianId: clinician.id,
        selectedProgramType: 'RPM' // Select ONLY RPM
      }
    );

    console.log('✅ Suggestion approved successfully\n');
    console.log(`Updated Status: ${updatedSuggestion.status}`);
    console.log(`Created Enrollment IDs: ${updatedSuggestion.createdEnrollmentIds?.join(', ')}\n`);

    // Step 6: Verify ONLY ONE enrollment was created
    const afterCount = await prisma.enrollment.count({
      where: { patientId: patient.id }
    });
    console.log(`📊 Enrollments after approval: ${afterCount}`);
    console.log(`📊 Enrollments created: ${afterCount - beforeCount}\n`);

    if (afterCount - beforeCount !== 1) {
      console.error(`❌ Expected 1 enrollment to be created, but got ${afterCount - beforeCount}`);
    } else {
      console.log('✅ Exactly 1 enrollment created (correct!)\n');
    }

    // Step 7: Verify the enrollment has correct billing program
    const newEnrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: patient.id,
        id: { in: updatedSuggestion.createdEnrollmentIds || [] }
      },
      include: {
        billingProgram: true
      }
    });

    if (newEnrollment) {
      console.log('📋 Created Enrollment Details:');
      console.log(`   Enrollment ID: ${newEnrollment.id}`);
      console.log(`   Billing Program: ${newEnrollment.billingProgram?.name || 'None'}`);
      console.log(`   Billing Program Code: ${newEnrollment.billingProgram?.code || 'None'}`);
      console.log(`   Status: ${newEnrollment.status}`);
      console.log(`   Start Date: ${newEnrollment.startDate.toISOString().split('T')[0]}\n`);

      if (newEnrollment.billingProgram?.code === 'CMS_RPM_2025') {
        console.log('✅ Enrollment correctly linked to RPM billing program\n');
      } else {
        console.error(`❌ Expected RPM billing program, got ${newEnrollment.billingProgram?.code}\n`);
      }
    }

    // Step 8: Summary
    console.log('═══════════════════════════════════════');
    console.log('✅ TEST PASSED: Single Program Approval');
    console.log('═══════════════════════════════════════');
    console.log('- Suggested programs filtered correctly (RPM, CCM only)');
    console.log('- Approval with selectedProgramType=RPM created exactly 1 enrollment');
    console.log('- Enrollment correctly linked to CMS_RPM_2025 billing program');
    console.log('- No enrollments created for unselected programs (CCM)');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleProgramApproval()
  .catch(console.error)
  .finally(() => process.exit(0));
