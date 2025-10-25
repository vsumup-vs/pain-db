const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBillingEnrollment() {
  console.log('🏥 Creating Billing Enrollment for John Doe...\n');

  // Get John Doe
  const patient = await prisma.patient.findFirst({
    where: { firstName: 'John', lastName: 'Doe' }
  });

  if (!patient) {
    console.log('❌ Patient John Doe not found');
    return;
  }

  console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`);
  console.log(`   ID: ${patient.id}`);
  console.log(`   Organization: ${patient.organizationId}\n`);

  // Find Sarah Johnson (clinician)
  const clinician = await prisma.clinician.findFirst({
    where: { email: 'sarah.johnson@clinictest.com' }
  });

  if (!clinician) {
    console.log('❌ Clinician Sarah Johnson not found');
    return;
  }

  console.log(`✅ Found clinician: ${clinician.firstName} ${clinician.lastName}`);
  console.log(`   ID: ${clinician.id}\n`);

  // Find a care program (any active program for this organization)
  const careProgram = await prisma.careProgram.findFirst({
    where: {
      organizationId: patient.organizationId,
      isActive: true
    }
  });

  if (!careProgram) {
    console.log('❌ No active care program found for this organization');
    return;
  }

  console.log(`✅ Found care program: ${careProgram.name}`);
  console.log(`   ID: ${careProgram.id}`);
  console.log(`   Type: ${careProgram.type}\n`);

  // Find a condition preset for diabetes (common RPM condition)
  let conditionPreset = await prisma.conditionPreset.findFirst({
    where: {
      OR: [
        { organizationId: patient.organizationId },
        { organizationId: null } // Standardized presets
      ],
      name: { contains: 'Diabetes', mode: 'insensitive' }
    }
  });

  if (!conditionPreset) {
    console.log('⚠️  No Diabetes condition preset found, using any available preset...');
    conditionPreset = await prisma.conditionPreset.findFirst({
      where: {
        OR: [
          { organizationId: patient.organizationId },
          { organizationId: null }
        ]
      }
    });
    if (!conditionPreset) {
      console.log('❌ No condition presets found');
      return;
    }
    console.log(`✅ Using condition preset: ${conditionPreset.name}\n`);
  } else {
    console.log(`✅ Found condition preset: ${conditionPreset.name}`);
    console.log(`   ID: ${conditionPreset.id}\n`);
  }

  // Find CMS RPM 2025 billing program
  const billingProgram = await prisma.billingProgram.findFirst({
    where: { code: 'CMS_RPM_2025' }
  });

  if (!billingProgram) {
    console.log('❌ CMS RPM 2025 billing program not found');
    return;
  }

  console.log(`✅ Found billing program: ${billingProgram.name}`);
  console.log(`   ID: ${billingProgram.id}`);
  console.log(`   Code: ${billingProgram.code}\n`);

  // Create the enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      clinicianId: clinician.id,
      careProgramId: careProgram.id,
      conditionPresetId: conditionPreset.id,
      billingProgramId: billingProgram.id,
      status: 'ACTIVE',
      startDate: new Date(),
      billingEligibility: {
        eligible: true,
        eligibilityDate: new Date().toISOString(),
        chronicConditions: ['E11.9'], // Type 2 Diabetes ICD-10 code
        eligibilityCriteria: {
          requiresDeviceData: true,
          deviceType: 'glucometer',
          minReadingsPerMonth: 16
        },
        verifiedBy: clinician.id,
        verifiedAt: new Date().toISOString()
      },
      notes: 'Test enrollment for billing eligibility verification'
    }
  });

  console.log('✅ ENROLLMENT CREATED SUCCESSFULLY!\n');
  console.log('📋 Enrollment Details:');
  console.log(`   ID: ${enrollment.id}`);
  console.log(`   Patient: John Doe (${enrollment.patientId})`);
  console.log(`   Clinician: Sarah Johnson (${enrollment.clinicianId})`);
  console.log(`   Care Program: ${careProgram.name}`);
  console.log(`   Billing Program: ${billingProgram.name}`);
  console.log(`   Status: ${enrollment.status}`);
  console.log(`   Start Date: ${enrollment.startDate}`);
  console.log('');
  console.log('✅ Now John Doe has a billing enrollment!');
  console.log('✅ Future TimeLogs and Observations will automatically link to this enrollment');

  await prisma.$disconnect();
}

createBillingEnrollment().catch(console.error);
