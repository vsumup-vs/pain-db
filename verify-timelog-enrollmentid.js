const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRecentTimeLog() {
  const recentLog = await prisma.timeLog.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      clinician: { select: { firstName: true, lastName: true } },
      enrollment: { 
        include: { 
          billingProgram: { select: { name: true, code: true } } 
        } 
      }
    }
  });

  if (!recentLog) {
    console.log('❌ No TimeLogs found');
    return;
  }

  console.log('\n📋 Most Recent TimeLog:');
  console.log('Patient:', `${recentLog.patient.firstName} ${recentLog.patient.lastName}`);
  console.log('Clinician:', `${recentLog.clinician.firstName} ${recentLog.clinician.lastName}`);
  console.log('Duration:', `${recentLog.duration} minutes`);
  console.log('CPT Code:', recentLog.cptCode || 'None');
  console.log('Logged At:', recentLog.loggedAt);
  
  if (recentLog.enrollmentId) {
    console.log('\n✅ enrollmentId LINKED:', recentLog.enrollmentId);
    if (recentLog.enrollment?.billingProgram) {
      console.log('   Billing Program:', recentLog.enrollment.billingProgram.name);
      console.log('   Program Code:', recentLog.enrollment.billingProgram.code);
    }
  } else {
    console.log('\n⚠️  enrollmentId NOT LINKED (null)');
  }
}

verifyRecentTimeLog()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
