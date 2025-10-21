const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignBillingProgram() {
  // First, find available billing programs
  const billingPrograms = await prisma.billingProgram.findMany({
    where: {
      isActive: true,
      programType: 'RPM' // John is in "Remote Patient Monitoring - Diabetes"
    },
    select: {
      id: true,
      code: true,
      name: true,
      programType: true
    }
  });

  console.log('=== Available RPM Billing Programs ===');
  billingPrograms.forEach((program, index) => {
    console.log(`${index + 1}. ${program.name} (${program.code})`);
    console.log(`   ID: ${program.id}`);
    console.log('');
  });

  if (billingPrograms.length === 0) {
    console.log('❌ No RPM billing programs found');
    return;
  }

  // Use the first RPM billing program (should be CMS_RPM_2025)
  const billingProgramId = billingPrograms[0].id;

  // Find John Smith's enrollment
  const johnSmith = await prisma.patient.findFirst({
    where: {
      firstName: 'John',
      lastName: 'Smith'
    }
  });

  if (!johnSmith) {
    console.log('❌ John Smith not found');
    return;
  }

  // Update the enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      patientId: johnSmith.id,
      status: 'ACTIVE'
    }
  });

  if (!enrollment) {
    console.log('❌ No active enrollment found for John Smith');
    return;
  }

  console.log('=== Updating John Smith Enrollment ===');
  console.log('Enrollment ID:', enrollment.id);
  console.log('Assigning Billing Program:', billingPrograms[0].name);
  console.log('');

  const updated = await prisma.enrollment.update({
    where: {
      id: enrollment.id
    },
    data: {
      billingProgramId: billingProgramId,
      billingEligibility: {
        eligible: true,
        eligibilityDate: new Date(),
        chronicConditions: ['J44.9'], // COPD (from the alert)
        eligibilityCriteria: {
          requiresDeviceData: true,
          deviceType: 'pulse oximeter',
          minReadingsPerMonth: 16
        },
        insurance: {
          type: 'Medicare Part B'
        },
        verifiedAt: new Date()
      }
    },
    include: {
      billingProgram: true
    }
  });

  console.log('✅ Enrollment updated successfully!');
  console.log('Billing Program:', updated.billingProgram?.name);
  console.log('Billing Program ID:', updated.billingProgramId);

  await prisma.$disconnect();
}

assignBillingProgram().catch(console.error);
