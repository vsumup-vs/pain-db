const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for existing billing enrollments...\n');

  try {
    // Count billing programs
    const billingProgramCount = await prisma.billingProgram.count();
    console.log(`Billing Programs: ${billingProgramCount}`);

    if (billingProgramCount > 0) {
      const programs = await prisma.billingProgram.findMany({
        select: { id: true, name: true, code: true, isActive: true }
      });
      programs.forEach(p => {
        console.log(`  - ${p.name} (${p.code}) ${p.isActive ? '✓' : '✗'}`);
      });
    }

    // Count enrollments with billing
    const enrollmentCount = await prisma.enrollment.count({
      where: {
        billingProgramId: { not: null }
      }
    });
    console.log(`\nEnrollments with billing: ${enrollmentCount}`);

    if (enrollmentCount > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          billingProgramId: { not: null }
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          billingProgram: { select: { name: true, code: true } },
          organization: { select: { name: true } }
        },
        take: 5
      });

      console.log('\nSample enrollments:');
      enrollments.forEach(e => {
        console.log(`  - ${e.patient.firstName} ${e.patient.lastName}`);
        console.log(`    Program: ${e.billingProgram.name}`);
        console.log(`    Org: ${e.organization.name}`);
        console.log(`    Status: ${e.status}\n`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
