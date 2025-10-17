const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  try {
    const testLastNames = ['Eligible', 'NearReadings', 'NearTime', 'NotEligible'];

    for (const lastName of testLastNames) {
      // Find all patients with this last name, ordered by creation date
      const patients = await prisma.patient.findMany({
        where: { lastName },
        orderBy: { createdAt: 'desc' }
      });

      if (patients.length > 1) {
        console.log(`\nFound ${patients.length} '${lastName}' patients`);

        // Keep the newest one, delete the rest
        const [newest, ...oldOnes] = patients;
        console.log(`Keeping newest: ${newest.firstName} ${newest.lastName} (ID: ${newest.id})`);

        for (const oldPatient of oldOnes) {
          console.log(`Deleting old: ${oldPatient.firstName} ${oldPatient.lastName} (ID: ${oldPatient.id})`);

          // Delete related data
          await prisma.observation.deleteMany({ where: { patientId: oldPatient.id } });
          await prisma.timeLog.deleteMany({ where: { patientId: oldPatient.id } });
          await prisma.assessment.deleteMany({ where: { patientId: oldPatient.id } });
          await prisma.patientMedication.deleteMany({ where: { patientId: oldPatient.id } });
          await prisma.enrollment.deleteMany({ where: { patientId: oldPatient.id } });
          await prisma.alert.deleteMany({ where: { patientId: oldPatient.id } });

          // Delete patient
          await prisma.patient.delete({ where: { id: oldPatient.id } });
        }

        console.log(`✅ Deleted ${oldOnes.length} duplicate(s)`);
      } else if (patients.length === 1) {
        console.log(`\n✓ Only 1 '${lastName}' patient found (no duplicates)`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

cleanupDuplicates();
