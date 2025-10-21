const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAlertResolutionTimeLog() {
  console.log('🔍 Verifying Alert Resolution TimeLog...\n');

  // Get the most recent TimeLog (should be from your alert resolution)
  const recentTimeLogs = await prisma.timeLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      clinician: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      enrollment: {
        select: {
          id: true,
          billingProgram: {
            select: {
              name: true,
              code: true
            }
          }
        }
      }
    }
  });

  console.log('📋 Recent TimeLogs (last 5):\n');

  recentTimeLogs.forEach((log, index) => {
    console.log(`${index + 1}. TimeLog ID: ${log.id}`);
    console.log(`   Patient: ${log.patient.firstName} ${log.patient.lastName}`);
    console.log(`   Clinician: ${log.clinician.firstName} ${log.clinician.lastName}`);
    console.log(`   Duration: ${log.duration} minutes`);
    console.log(`   CPT Code: ${log.cptCode || 'None'}`);
    console.log(`   Billable: ${log.billable ? 'Yes' : 'No'}`);
    console.log(`   Source: ${log.source || 'MANUAL'}`);
    console.log(`   Auto-started: ${log.autoStarted ? 'Yes' : 'No'}`);
    console.log(`   Enrollment ID: ${log.enrollmentId || 'NOT LINKED ❌'}`);
    if (log.enrollment?.billingProgram) {
      console.log(`   Billing Program: ${log.enrollment.billingProgram.name} (${log.enrollment.billingProgram.code})`);
    }
    console.log(`   Created: ${log.createdAt}`);
    console.log(`   Notes: ${log.notes || 'None'}`);
    console.log('');
  });

  // Check for duplicates in the last 5 minutes (same patient, clinician, duration)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentGrouped = await prisma.timeLog.groupBy({
    by: ['patientId', 'clinicianId', 'duration', 'cptCode'],
    where: {
      createdAt: { gte: fiveMinutesAgo }
    },
    _count: true,
    having: {
      _count: { gt: 1 }
    }
  });

  if (recentGrouped.length > 0) {
    console.log('⚠️  DUPLICATES DETECTED in last 5 minutes:');
    recentGrouped.forEach(group => {
      console.log(`   Patient: ${group.patientId}, Duration: ${group.duration}min, CPT: ${group.cptCode}, Count: ${group._count}`);
    });
  } else {
    console.log('✅ No duplicate TimeLogs detected in last 5 minutes\n');
  }

  // Check if most recent TimeLog has enrollmentId
  const mostRecent = recentTimeLogs[0];
  if (mostRecent) {
    console.log('🎯 Most Recent TimeLog Analysis:');
    console.log(`   Has enrollmentId: ${mostRecent.enrollmentId ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has CPT code: ${mostRecent.cptCode ? '✅ YES' : '❌ NO'}`);
    console.log(`   Is billable: ${mostRecent.billable ? '✅ YES' : '❌ NO'}`);
    console.log(`   Auto-started: ${mostRecent.autoStarted ? '✅ YES (from timer)' : '❌ NO (manual entry)'}`);
    console.log(`   Source: ${mostRecent.source || 'MANUAL'}`);
  }

  await prisma.$disconnect();
}

verifyAlertResolutionTimeLog().catch(console.error);
