const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJohnDoe() {
  const patient = await prisma.patient.findFirst({
    where: { firstName: 'John', lastName: 'Doe' },
    include: {
      enrollments: {
        include: {
          careProgram: true,
          billingProgram: true
        }
      }
    }
  });

  if (!patient) {
    console.log('❌ Patient not found');
    return;
  }

  console.log('👤 Patient: John Doe');
  console.log('ID:', patient.id);
  console.log('Organization ID:', patient.organizationId);
  console.log('');
  console.log('📋 Current Enrollments:');

  if (patient.enrollments.length === 0) {
    console.log('  ❌ No enrollments found');
  } else {
    patient.enrollments.forEach((enr, i) => {
      console.log(`  ${i + 1}. Enrollment ID: ${enr.id}`);
      console.log(`     Care Program: ${enr.careProgram.name}`);
      console.log(`     Status: ${enr.status}`);
      console.log(`     Billing Program: ${enr.billingProgram?.name || 'NOT ASSIGNED ❌'}`);
      console.log('');
    });
  }

  // Also check available billing programs
  console.log('💰 Available Billing Programs:');
  const billingPrograms = await prisma.billingProgram.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      programType: true
    }
  });

  billingPrograms.forEach((bp, i) => {
    console.log(`  ${i + 1}. ${bp.name}`);
    console.log(`     Code: ${bp.code}`);
    console.log(`     Type: ${bp.programType}`);
    console.log(`     ID: ${bp.id}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkJohnDoe().catch(console.error);
