const { PrismaClient } = require('@prisma/client');
const { scheduleInitialAssessments } = require('../src/services/assessmentScheduler');

const prisma = new PrismaClient();

async function fixAllMissingAssessments() {
  try {
    console.log('Finding enrollments with missing scheduled assessments...\n');

    // Get all active enrollments
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        careProgram: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${activeEnrollments.length} active enrollments`);

    const enrollmentsToFix = [];

    // Find enrollments without scheduled assessments
    for (const enrollment of activeEnrollments) {
      const assessmentCount = await prisma.scheduledAssessment.count({
        where: {
          enrollmentId: enrollment.id
        }
      });

      if (assessmentCount === 0 && enrollment.conditionPresetId) {
        enrollmentsToFix.push(enrollment);
      }
    }

    if (enrollmentsToFix.length === 0) {
      console.log('\n✅ All active enrollments have scheduled assessments!');
      return;
    }

    console.log(`\n⚠️  Found ${enrollmentsToFix.length} enrollments without scheduled assessments\n`);

    let successCount = 0;
    let errorCount = 0;

    // Fix each enrollment
    for (const enrollment of enrollmentsToFix) {
      try {
        console.log(`Processing: ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
        console.log(`  Program: ${enrollment.careProgram.name}`);
        console.log(`  Enrollment ID: ${enrollment.id}`);

        const createdAssessments = await scheduleInitialAssessments(
          enrollment.id,
          enrollment.conditionPresetId,
          enrollment.clinicianId
        );

        console.log(`  ✅ Created ${createdAssessments.length} scheduled assessments`);
        createdAssessments.forEach(a => {
          console.log(`     - ${a.template.name} (${a.frequency}) due ${a.dueDate.toISOString()}`);
        });
        console.log('');

        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to create assessments: ${error.message}\n`);
        errorCount++;
      }
    }

    console.log('=====================================');
    console.log('Summary:');
    console.log(`  Total enrollments processed: ${enrollmentsToFix.length}`);
    console.log(`  ✅ Successfully fixed: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log('=====================================');

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllMissingAssessments();
