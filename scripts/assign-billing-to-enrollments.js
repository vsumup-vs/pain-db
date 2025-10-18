/**
 * Assign billing programs to existing enrollments for testing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Assigning billing programs to existing enrollments...\n');

  try {
    // Get billing programs
    const rpmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RPM_2025' }
    });

    const rtmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RTM_2025' }
    });

    const ccmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_CCM_2025' }
    });

    if (!rpmProgram || !rtmProgram || !ccmProgram) {
      console.log('❌ Billing programs not found. Run seed script first.');
      return;
    }

    // Get active enrollments without billing programs
    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingProgramId: null,
        status: 'ACTIVE'
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        careProgram: { select: { name: true, type: true } }
      },
      take: 10
    });

    if (enrollments.length === 0) {
      console.log('❌ No active enrollments without billing programs found.');
      return;
    }

    console.log(`Found ${enrollments.length} enrollments to update\n`);

    let updated = 0;

    for (const enrollment of enrollments) {
      let billingProgramId = null;

      // Assign billing program based on care program type
      if (enrollment.careProgram.type === 'RPM') {
        billingProgramId = rpmProgram.id;
      } else if (enrollment.careProgram.type === 'RTM') {
        billingProgramId = rtmProgram.id;
      } else if (enrollment.careProgram.type === 'CCM') {
        billingProgramId = ccmProgram.id;
      }

      if (billingProgramId) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            billingProgramId,
            billingEligibility: {
              eligible: true,
              eligibilityDate: new Date().toISOString(),
              insurance: { type: 'Medicare Part B' },
              chronicConditions: ['E11.9'], // Type 2 Diabetes
              verifiedBy: 'system',
              verifiedAt: new Date().toISOString()
            }
          }
        });

        console.log(`✅ Updated: ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
        console.log(`   Program: ${enrollment.careProgram.name} → ${billingProgramId === rpmProgram.id ? 'RPM' : billingProgramId === rtmProgram.id ? 'RTM' : 'CCM'}`);
        updated++;
      }
    }

    console.log(`\n✅ Updated ${updated} enrollments with billing programs`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
