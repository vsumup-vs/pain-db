const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestEnrollments() {
  try {
    console.log('🌱 Creating test enrollments...');

    // Get necessary IDs
    const organization = await prisma.organization.findFirst();
    const clinician = await prisma.clinician.findFirst();
    const patients = await prisma.patient.findMany({ take: 3 });
    const conditionPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Chronic Pain Management' }
    });

    if (!organization) {
      console.error('❌ No organization found');
      return;
    }

    if (!clinician) {
      console.error('❌ No clinician found');
      return;
    }

    if (!conditionPreset) {
      console.error('❌ No condition preset found');
      return;
    }

    console.log(`✅ Found organization: ${organization.name}`);
    console.log(`✅ Found clinician: ${clinician.firstName} ${clinician.lastName}`);
    console.log(`✅ Found condition preset: ${conditionPreset.name}`);
    console.log(`✅ Found ${patients.length} patients`);

    // Create or get Care Program
    let careProgram = await prisma.careProgram.findFirst({
      where: { name: 'Pain Management' }
    });

    if (!careProgram) {
      console.log('📋 Creating Care Program...');
      careProgram = await prisma.careProgram.create({
        data: {
          organizationId: organization.id,
          name: 'Pain Management',
          type: 'PAIN_MANAGEMENT',
          description: 'Chronic pain management program',
          isActive: true
        }
      });
      console.log(`✅ Created care program: ${careProgram.name}`);
    } else {
      console.log(`✅ Found existing care program: ${careProgram.name}`);
    }

    // Create enrollments for each patient
    for (const patient of patients) {
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

      console.log(`✅ Created enrollment for ${patient.firstName} ${patient.lastName} (ID: ${enrollment.id})`);
    }

    console.log('\n✅ All enrollments created successfully!');

    // Verify
    const enrollmentCount = await prisma.enrollment.count();
    console.log(`\n📊 Total enrollments: ${enrollmentCount}`);

  } catch (error) {
    console.error('❌ Error creating enrollments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestEnrollments();
