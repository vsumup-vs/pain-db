const { PrismaClient } = require('@prisma/client');
const { scheduleInitialAssessments } = require('../src/services/assessmentScheduler');

const prisma = new PrismaClient();

async function fixMichaelChenAssessments() {
  try {
    console.log('Fixing Michael Chen missing scheduled assessments...\n');

    // Michael Chen's enrollment details
    const enrollmentId = 'cmh1xl6xd005l7kz218xcw5p9';
    const conditionPresetId = 'cmguqf8og002m7k66b9zmymgx';

    // Get the enrollment to find the clinician who scheduled it
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        patient: true,
        clinician: true,
        careProgram: true
      }
    });

    if (!enrollment) {
      console.error('ERROR: Enrollment not found');
      return;
    }

    console.log('Enrollment details:');
    console.log('- Patient:', enrollment.patient.firstName, enrollment.patient.lastName);
    console.log('- Care Program:', enrollment.careProgram.name);
    console.log('- Started:', enrollment.startDate.toISOString());
    console.log('- Status:', enrollment.status);
    console.log('- Clinician:', enrollment.clinician.firstName, enrollment.clinician.lastName);
    console.log('');

    // Check if assessments already exist
    const existingAssessments = await prisma.scheduledAssessment.findMany({
      where: {
        enrollmentId: enrollmentId
      }
    });

    if (existingAssessments.length > 0) {
      console.log(`WARNING: ${existingAssessments.length} scheduled assessments already exist for this enrollment`);
      console.log('Existing assessments:');
      existingAssessments.forEach(a => {
        console.log(`- ID: ${a.id}, Status: ${a.status}, Due: ${a.dueDate.toISOString()}`);
      });
      console.log('\nAborting to avoid duplicates.');
      return;
    }

    console.log('No existing assessments found. Creating initial assessments...\n');

    // Create scheduled assessments using the service function
    const createdAssessments = await scheduleInitialAssessments(
      enrollmentId,
      conditionPresetId,
      enrollment.clinicianId
    );

    console.log('\n✅ SUCCESS!');
    console.log(`Created ${createdAssessments.length} scheduled assessments for Michael Chen`);
    console.log('\nAssessments created:');
    createdAssessments.forEach(a => {
      console.log(`- ${a.template.name}`);
      console.log(`  ID: ${a.id}`);
      console.log(`  Frequency: ${a.frequency}`);
      console.log(`  Due: ${a.dueDate.toISOString()}`);
      console.log(`  Status: ${a.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMichaelChenAssessments();
