const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestData() {
  console.log('🔍 Checking Assessment Test Data...\n');

  // Check scheduled assessments
  const assessments = await prisma.scheduledAssessment.findMany({
    include: {
      patient: { select: { firstName: true, lastName: true } },
      template: { select: { name: true } }
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  });

  console.log(`📋 Scheduled Assessments: ${assessments.length} total\n`);

  if (assessments.length > 0) {
    console.log('Sample assessments:');
    assessments.forEach((a, idx) => {
      console.log(`\n${idx + 1}. ${a.template?.name || 'Unknown Template'}`);
      console.log(`   Patient: ${a.patient?.firstName} ${a.patient?.lastName}`);
      console.log(`   Status: ${a.status}`);
      console.log(`   Due: ${new Date(a.dueDate).toLocaleString()}`);
      console.log(`   Priority: ${a.priority || 'MEDIUM'}`);
      console.log(`   Frequency: ${a.frequency}`);
      console.log(`   ID: ${a.id}`);
    });
  } else {
    console.log('⚠️  No scheduled assessments found.');
  }

  // Check available resources
  console.log('\n\n📊 Available Resources:');

  const patientCount = await prisma.patient.count();
  const templateCount = await prisma.assessmentTemplate.count();
  const enrollmentCount = await prisma.enrollment.count();
  const orgCount = await prisma.organization.count();

  console.log(`  - Organizations: ${orgCount}`);
  console.log(`  - Patients: ${patientCount}`);
  console.log(`  - Assessment Templates: ${templateCount}`);
  console.log(`  - Enrollments: ${enrollmentCount}`);

  // Get sample IDs for creating test data
  if (patientCount > 0 && templateCount > 0 && enrollmentCount > 0) {
    console.log('\n\n✅ You have the necessary data to create test assessments!');

    const samplePatient = await prisma.patient.findFirst();
    const sampleEnrollment = await prisma.enrollment.findFirst();
    const sampleTemplate = await prisma.assessmentTemplate.findFirst();

    console.log('\nSample IDs you can use:');
    console.log(`  - Patient ID: ${samplePatient.id}`);
    console.log(`  - Enrollment ID: ${sampleEnrollment.id}`);
    console.log(`  - Template ID: ${sampleTemplate.id}`);
    console.log(`  - Organization ID: ${samplePatient.organizationId}`);
  } else {
    console.log('\n\n⚠️  Missing required data. Please seed the database first.');
  }

  await prisma.$disconnect();
}

checkTestData().catch(console.error).finally(() => process.exit(0));
