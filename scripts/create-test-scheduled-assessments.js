const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAssessments() {
  console.log('📋 Creating Test Scheduled Assessments...\n');

  try {
    // Get sample data
    const patients = await prisma.patient.findMany({ take: 3 });
    const enrollments = await prisma.enrollment.findMany({ take: 3 });
    const templates = await prisma.assessmentTemplate.findMany({ take: 4 });
    const clinicians = await prisma.clinician.findMany({ take: 1 });

    if (patients.length === 0 || enrollments.length === 0 || templates.length === 0) {
      console.log('❌ Insufficient data. Please seed database first.');
      return;
    }

    const organizationId = patients[0].organizationId;
    const clinicianId = clinicians.length > 0 ? clinicians[0].id : null;

    // Create test assessments with different statuses and due dates
    const now = new Date();
    const testAssessments = [
      // 1. OVERDUE assessment (due 2 days ago)
      {
        organizationId,
        patientId: patients[0].id,
        enrollmentId: enrollments[0].id,
        templateId: templates[0].id,
        frequency: 'WEEKLY',
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'OVERDUE',
        priority: 2, // Urgent
        isRequired: true,
        scheduledBy: clinicianId,
        notes: 'TEST: Overdue weekly pain assessment'
      },
      // 2. PENDING assessment (due today)
      {
        organizationId,
        patientId: patients[0].id,
        enrollmentId: enrollments[0].id,
        templateId: templates[1].id,
        frequency: 'DAILY',
        dueDate: now,
        status: 'PENDING',
        priority: 1, // High
        isRequired: true,
        scheduledBy: clinicianId,
        notes: 'TEST: Daily symptom tracker due today'
      },
      // 3. PENDING assessment (due tomorrow)
      {
        organizationId,
        patientId: patients[1]?.id || patients[0].id,
        enrollmentId: enrollments[1]?.id || enrollments[0].id,
        templateId: templates[2]?.id || templates[0].id,
        frequency: 'WEEKLY',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'PENDING',
        priority: 0, // Normal
        isRequired: true,
        scheduledBy: clinicianId,
        notes: 'TEST: Weekly assessment due tomorrow'
      },
      // 4. PENDING assessment (due in 3 days)
      {
        organizationId,
        patientId: patients[2]?.id || patients[0].id,
        enrollmentId: enrollments[2]?.id || enrollments[0].id,
        templateId: templates[3]?.id || templates[0].id,
        frequency: 'MONTHLY',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // In 3 days
        status: 'PENDING',
        priority: 0,
        isRequired: false,
        scheduledBy: clinicianId,
        notes: 'TEST: Optional monthly assessment'
      },
      // 5. IN_PROGRESS assessment (started but not completed)
      {
        organizationId,
        patientId: patients[0].id,
        enrollmentId: enrollments[0].id,
        templateId: templates[1].id,
        frequency: 'DAILY',
        dueDate: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        status: 'IN_PROGRESS',
        priority: 1,
        isRequired: true,
        scheduledBy: clinicianId,
        notes: 'TEST: In-progress assessment to test continue workflow'
      }
    ];

    console.log(`Creating ${testAssessments.length} test scheduled assessments...\n`);

    for (const assessment of testAssessments) {
      const created = await prisma.scheduledAssessment.create({
        data: assessment,
        include: {
          patient: { select: { firstName: true, lastName: true } },
          template: { select: { name: true } }
        }
      });

      console.log(`✅ Created: ${created.template.name} for ${created.patient.firstName} ${created.patient.lastName}`);
      console.log(`   Status: ${created.status} | Due: ${created.dueDate.toLocaleDateString()} | Priority: ${created.priority === 2 ? 'URGENT' : created.priority === 1 ? 'HIGH' : 'NORMAL'}\n`);
    }

    // Summary
    console.log('\n📊 Test Data Summary:');
    const statusCounts = await prisma.scheduledAssessment.groupBy({
      by: ['status'],
      _count: true
    });

    statusCounts.forEach(({ status, _count }) => {
      console.log(`   ${status}: ${_count}`);
    });

    console.log('\n✅ Test scheduled assessments created successfully!');
    console.log('\n🧪 You can now test:');
    console.log('   1. View assessments in PatientContextPanel');
    console.log('   2. See pending assessment badges in TriageQueue');
    console.log('   3. Open dedicated Assessments page (/assessments)');
    console.log('   4. Start and complete assessments using AssessmentModal');
    console.log('   5. Watch status transitions (PENDING → IN_PROGRESS → COMPLETED)');

  } catch (error) {
    console.error('❌ Error creating test assessments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestAssessments()
  .catch(console.error)
  .finally(() => process.exit(0));
