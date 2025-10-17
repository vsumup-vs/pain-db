#!/usr/bin/env node

/**
 * Add Billing Prerequisites (Simple Version)
 *
 * Updates patient insuranceInfo JSON and enrollment billingEligibility JSON
 * to satisfy the eligibility rules.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding billing prerequisites...\n');

  // Get Default Healthcare Organization
  const org = await prisma.organization.findFirst({
    where: { name: 'Default Healthcare Organization' }
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  console.log(`✅ Found organization: ${org.name}\n`);

  // Get all enrollments with billing programs
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: org.id,
      billingProgramId: { not: null }
    },
    include: {
      patient: true,
      billingProgram: {
        include: {
          eligibilityRules: true
        }
      }
    }
  });

  console.log(`✅ Found ${enrollments.length} enrollments to process\n`);

  for (const enrollment of enrollments) {
    console.log(`Processing ${enrollment.patient.firstName} ${enrollment.patient.lastName}...`);

    // 1. Update patient insurance info
    const insuranceInfo = {
      type: 'Medicare Part B',
      provider: 'Medicare',
      policyNumber: `MCARE-${enrollment.patient.medicalRecordNumber || 'UNKNOWN'}`,
      groupNumber: 'PART-B',
      isPrimary: true,
      effectiveDate: '2024-01-01'
    };

    await prisma.patient.update({
      where: { id: enrollment.patientId },
      data: { insuranceInfo }
    });

    console.log('  ✅ Added Medicare Part B insurance');

    // 2. Update enrollment billing eligibility
    const billingEligibility = {
      eligible: true,  // Patient has consented
      chronicConditions: [
        {
          icd10Code: enrollment.billingProgram.code.includes('RTM') ? 'M79.3' : 'I10',
          description: enrollment.billingProgram.code.includes('RTM')
            ? 'Panniculitis, unspecified'
            : 'Essential (primary) hypertension',
          diagnosisDate: '2024-06-01',
          isPrimary: true
        }
      ],
      insurance: {
        type: 'Medicare Part B',
        verified: true,
        verifiedDate: '2025-09-01'
      },
      consentDate: '2025-09-15',
      consentMethod: 'Electronic'
    };

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { billingEligibility }
    });

    console.log('  ✅ Added chronic condition and consent');
    console.log('');
  }

  console.log('🎉 Billing prerequisites added successfully!');
  console.log('\n💡 Refresh the Billing Readiness page to see eligible patients.\n');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
