const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAllEnrollments() {
  try {
    const organization = await prisma.organization.findFirst();
    const clinician = await prisma.clinician.findFirst();
    const careProgram = await prisma.careProgram.findFirst();
    const conditionPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Chronic Pain Management' }
    });

    // Get all patients without active enrollments
    const allPatients = await prisma.patient.findMany();
    const existingEnrollmentPatientIds = await prisma.enrollment.findMany({
      select: { patientId: true }
    });
    const enrolledPatientIds = new Set(existingEnrollmentPatientIds.map(e => e.patientId));

    const patientsWithoutEnrollment = allPatients.filter(p => !enrolledPatientIds.has(p.id));

    console.log(`Found ${patientsWithoutEnrollment.length} patients without enrollments`);

    for (const patient of patientsWithoutEnrollment) {
      const enrollment = await prisma.enrollment.create({
        data: {
          organizationId: organization.id,
          patientId: patient.id,
          clinicianId: clinician.id,
          careProgramId: careProgram.id,
          conditionPresetId: conditionPreset.id,
          status: 'ACTIVE',
          startDate: new Date()
        }
      });
      console.log(`✅ Created enrollment for ${patient.firstName} ${patient.lastName}`);
    }

    const totalEnrollments = await prisma.enrollment.count();
    console.log(`\n📊 Total enrollments: ${totalEnrollments}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAllEnrollments();
