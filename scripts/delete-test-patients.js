const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestPatients() {
  try {
    const testNames = ['Eligible', 'NearReadings', 'NearTime', 'NotEligible'];

    for (const name of testNames) {
      const patients = await prisma.patient.findMany({
        where: {
          lastName: name
        }
      });

      for (const patient of patients) {
        console.log(`Deleting patient: ${patient.firstName} ${patient.lastName}`);

        // Delete related data first
        await prisma.observation.deleteMany({ where: { patientId: patient.id } });
        await prisma.timeLog.deleteMany({ where: { patientId: patient.id } });
        await prisma.assessmentCompletion.deleteMany({ where: { patientId: patient.id } });
        await prisma.patientMedication.deleteMany({ where: { patientId: patient.id } });
        await prisma.enrollment.deleteMany({ where: { patientId: patient.id } });
        await prisma.alert.deleteMany({ where: { patientId: patient.id } });

        // Delete patient
        await prisma.patient.delete({ where: { id: patient.id } });
        console.log('  ✅ Deleted');
      }
    }

    console.log('\n✅ All test patients deleted successfully');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

deleteTestPatients();
