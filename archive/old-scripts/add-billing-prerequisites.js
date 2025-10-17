#!/usr/bin/env node

/**
 * Add Billing Prerequisites
 *
 * Adds the missing prerequisite data for billing eligibility:
 * - Insurance information (Medicare Part B)
 * - Chronic condition diagnoses (ICD-10 codes)
 * - Informed consent records
 *
 * This will make the enrollments eligible for billing.
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

  console.log(`✅ Found organization: ${org.name} (${org.id})\n`);

  // Get all enrollments with billing programs
  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: org.id,
      billingProgramId: { not: null }
    },
    include: {
      patient: true,
      clinician: true,
      billingProgram: {
        include: {
          eligibilityRules: true
        }
      }
    }
  });

  console.log(`✅ Found ${enrollments.length} enrollments to process\n`);

  for (const enrollment of enrollments) {
    console.log(`\n=== Processing ${enrollment.patient.firstName} ${enrollment.patient.lastName} ===`);
    console.log(`Program: ${enrollment.billingProgram.name}`);

    // 1. Add Medicare Part B insurance
    console.log('  📋 Adding Medicare Part B insurance...');

    // Check if insurance already exists
    let insurance = await prisma.patientInsurance.findFirst({
      where: {
        patientId: enrollment.patientId,
        insuranceProvider: 'Medicare'
      }
    });

    if (!insurance) {
      insurance = await prisma.patientInsurance.create({
        data: {
          patientId: enrollment.patientId,
          insuranceProvider: 'Medicare',
          planName: 'Medicare Part B',
          policyNumber: `MCARE-${enrollment.patient.medicalRecordNumber}`,
          groupNumber: 'PART-B',
          isPrimary: true,
          coverageStartDate: new Date('2024-01-01'),
          isActive: true
        }
      });
      console.log('     ✅ Created Medicare Part B coverage');
    } else {
      console.log('     ℹ️  Medicare coverage already exists');
    }

    // 2. Add chronic condition diagnosis
    console.log('  🏥 Adding chronic condition diagnosis...');

    // Determine appropriate diagnosis based on program type
    let diagnosisCode, diagnosisDescription;

    if (enrollment.billingProgram.code.includes('RPM')) {
      // For RPM: Use hypertension or diabetes
      diagnosisCode = 'I10';
      diagnosisDescription = 'Essential (primary) hypertension';
    } else if (enrollment.billingProgram.code.includes('RTM')) {
      // For RTM: Use musculoskeletal condition
      diagnosisCode = 'M79.3';
      diagnosisDescription = 'Panniculitis, unspecified';
    } else if (enrollment.billingProgram.code.includes('CCM')) {
      // For CCM: Use multiple chronic conditions
      diagnosisCode = 'E11.9';
      diagnosisDescription = 'Type 2 diabetes mellitus without complications';
    } else {
      diagnosisCode = 'Z00.00';
      diagnosisDescription = 'Encounter for general adult medical examination without abnormal findings';
    }

    // Check if diagnosis already exists
    let diagnosis = await prisma.patientDiagnosis.findFirst({
      where: {
        patientId: enrollment.patientId,
        icd10Code: diagnosisCode
      }
    });

    if (!diagnosis) {
      diagnosis = await prisma.patientDiagnosis.create({
        data: {
          patientId: enrollment.patientId,
          organizationId: org.id,
          icd10Code: diagnosisCode,
          description: diagnosisDescription,
          diagnosisDate: new Date('2024-06-01'),
          diagnosedBy: enrollment.clinicianId,
          isPrimary: true,
          isActive: true,
          severity: 'MODERATE',
          status: 'ACTIVE'
        }
      });
      console.log(`     ✅ Added diagnosis: ${diagnosisCode} - ${diagnosisDescription}`);
    } else {
      console.log(`     ℹ️  Diagnosis already exists: ${diagnosisCode}`);
    }

    // 3. Add informed consent
    console.log('  📝 Adding informed consent...');

    // Check if consent already exists
    let consent = await prisma.patientConsent.findFirst({
      where: {
        patientId: enrollment.patientId,
        consentType: 'RPM_MONITORING'
      }
    });

    if (!consent) {
      consent = await prisma.patientConsent.create({
        data: {
          patientId: enrollment.patientId,
          organizationId: org.id,
          consentType: 'RPM_MONITORING',
          consentText: 'I consent to remote patient monitoring services, including the transmission of my health data to my healthcare provider for monitoring and treatment purposes.',
          consentedAt: new Date('2025-09-15'),
          consentMethod: 'ELECTRONIC',
          isActive: true,
          documentUrl: null
        }
      });
      console.log('     ✅ Added informed consent for remote monitoring');
    } else {
      console.log('     ℹ️  Consent already exists');
    }

    console.log(`  ✅ Prerequisites complete for ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
  }

  // Summary
  console.log('\n\n📊 Summary:');

  const insuranceCount = await prisma.patientInsurance.count({
    where: {
      patientId: { in: enrollments.map(e => e.patientId) }
    }
  });

  const diagnosisCount = await prisma.patientDiagnosis.count({
    where: {
      patientId: { in: enrollments.map(e => e.patientId) }
    }
  });

  const consentCount = await prisma.patientConsent.count({
    where: {
      patientId: { in: enrollments.map(e => e.patientId) }
    }
  });

  console.log(`  - Insurance records: ${insuranceCount}`);
  console.log(`  - Diagnosis records: ${diagnosisCount}`);
  console.log(`  - Consent records: ${consentCount}`);

  console.log('\n🎉 Billing prerequisites added successfully!');
  console.log('\n💡 Now refresh the Billing Readiness page to see eligible patients.\n');
}

main()
  .catch(e => {
    console.error('❌ Error adding billing prerequisites:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
