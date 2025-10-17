const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEnrollmentOrganizations() {
  try {
    console.log('🔧 Fixing enrollment organizations...');

    const enrollments = await prisma.enrollment.findMany({
      include: { patient: true }
    });

    console.log(`Found ${enrollments.length} enrollments to update`);

    for (const enrollment of enrollments) {
      if (enrollment.organizationId !== enrollment.patient.organizationId) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { organizationId: enrollment.patient.organizationId }
        });
        console.log(`✅ Updated enrollment for patient ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
      } else {
        console.log(`✓ Enrollment already correct for ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
      }
    }

    console.log('\n✅ All enrollment organizations fixed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEnrollmentOrganizations();
