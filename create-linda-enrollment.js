const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createLindaEnrollment() {
  try {
    const organization = await prisma.organization.findFirst();
    const clinician = await prisma.clinician.findFirst();
    const careProgram = await prisma.careProgram.findFirst();
    const conditionPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Chronic Pain Management' }
    });
    const linda = await prisma.patient.findFirst({
      where: { firstName: 'Linda' }
    });

    if (!linda) {
      console.error('❌ Linda not found');
      return;
    }

    console.log('Creating enrollment for Linda LowRisk...');
    
    const enrollment = await prisma.enrollment.create({
      data: {
        organizationId: organization.id,
        patientId: linda.id,
        clinicianId: clinician.id,
        careProgramId: careProgram.id,
        conditionPresetId: conditionPreset.id,
        status: 'ACTIVE',
        startDate: new Date()
      }
    });

    console.log(`✅ Created enrollment for Linda LowRisk (ID: ${enrollment.id})`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createLindaEnrollment();
