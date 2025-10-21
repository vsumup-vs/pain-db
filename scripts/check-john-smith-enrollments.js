const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnrollments() {
  // Find John Smith
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

  console.log('✅ John Smith found:', johnSmith.id);
  console.log('Organization:', johnSmith.organizationId);
  console.log('');

  // Find all enrollments for John Smith
  const enrollments = await prisma.enrollment.findMany({
    where: {
      patientId: johnSmith.id
    },
    include: {
      careProgram: true,
      billingProgram: {
        select: {
          code: true,
          name: true
        }
      }
    }
  });

  console.log('=== John Smith Enrollments ===');
  console.log('Total Enrollments:', enrollments.length);
  console.log('');

  enrollments.forEach((enrollment, index) => {
    console.log(`Enrollment ${index + 1}:`);
    console.log('  ID:', enrollment.id);
    console.log('  Status:', enrollment.status);
    console.log('  Start Date:', enrollment.startDate);
    console.log('  End Date:', enrollment.endDate);
    console.log('  Care Program:', enrollment.careProgram?.name || 'N/A');
    console.log('  Billing Program:', enrollment.billingProgram?.name || 'NONE');
    console.log('  Billing Program Code:', enrollment.billingProgram?.code || 'NONE');
    console.log('  billingProgramId:', enrollment.billingProgramId || 'NULL');
    console.log('');
  });

  // Now check the SSE TestUser organization
  console.log('=== SSE TestUser Info ===');
  const sseUser = await prisma.clinician.findFirst({
    where: {
      email: 'sse-test@example.com'
    },
    include: {
      organization: true
    }
  });

  if (sseUser) {
    console.log('SSE TestUser Organization:', sseUser.organizationId);
    console.log('Organization Name:', sseUser.organization?.name);
  } else {
    console.log('❌ SSE TestUser not found');
  }

  await prisma.$disconnect();
}

checkEnrollments().catch(console.error);
