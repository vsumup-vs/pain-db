const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestAssessments() {
  console.log('\n📋 Scheduled Assessments Available for Testing\n');
  console.log('='.repeat(80));

  const assessments = await prisma.scheduledAssessment.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE'] }
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      template: { select: { name: true } },
      enrollment: {
        include: {
          careProgram: { select: { name: true, type: true } }
        }
      }
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  });

  if (assessments.length === 0) {
    console.log('⚠️  No pending assessments found. Let me create some test assessments...\n');
    return null;
  }

  assessments.forEach((assessment, idx) => {
    console.log(`\n${idx + 1}. ${assessment.template.name}`);
    console.log(`   Patient: ${assessment.patient.firstName} ${assessment.patient.lastName}`);
    console.log(`   Program: ${assessment.enrollment.careProgram.name} (${assessment.enrollment.careProgram.type})`);
    console.log(`   Status: ${assessment.status}`);
    console.log(`   Due Date: ${assessment.dueDate.toLocaleDateString()}`);
    console.log(`   ID: ${assessment.id}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Found ' + assessments.length + ' assessments ready for testing\n');

  // Check for completed assessments
  const completed = await prisma.assessment.count({
    where: {
      completedAt: { not: null }
    }
  });

  console.log(`📊 Completed Assessments: ${completed}\n`);

  return assessments;
}

checkTestAssessments()
  .then(() => process.exit(0))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
