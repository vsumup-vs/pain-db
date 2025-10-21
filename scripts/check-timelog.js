const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeLog() {
  // Find John Smith's patient ID
  const johnSmith = await prisma.patient.findFirst({
    where: {
      firstName: 'John',
      lastName: 'Smith'
    }
  });

  if (!johnSmith) {
    console.log('❌ John Smith not found');
    return;
  }

  console.log('✅ John Smith found:', johnSmith.id);
  console.log('');

  // Get the most recent TimeLog for John Smith
  const timeLog = await prisma.timeLog.findFirst({
    where: {
      patientId: johnSmith.id
    },
    orderBy: {
      createdAt: 'desc'
    },
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
          lastName: true,
          email: true
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

  if (!timeLog) {
    console.log('❌ No TimeLog found for John Smith');
    return;
  }

  console.log('✅ TimeLog created successfully!');
  console.log('');
  console.log('=== TimeLog Details ===');
  console.log('ID:', timeLog.id);
  console.log('Patient:', timeLog.patient.firstName, timeLog.patient.lastName);
  console.log('Clinician:', timeLog.clinician?.firstName, timeLog.clinician?.lastName, '(' + timeLog.clinician?.email + ')');
  console.log('Duration:', timeLog.duration, 'minutes');
  console.log('CPT Code:', timeLog.cptCode);
  console.log('Activity:', timeLog.activity);
  console.log('Notes:', timeLog.notes?.substring(0, 100) + (timeLog.notes?.length > 100 ? '...' : ''));
  console.log('Billable:', timeLog.billable);
  console.log('Auto-started:', timeLog.autoStarted);
  console.log('Source:', timeLog.source);
  console.log('Logged at:', timeLog.loggedAt);
  console.log('');
  console.log('=== Billing Enrollment Linkage ===');
  console.log('enrollmentId:', timeLog.enrollmentId);

  if (timeLog.enrollmentId && timeLog.enrollment) {
    console.log('✅ LINKED to billing enrollment!');
    console.log('Billing Program:', timeLog.enrollment.billingProgram?.name || 'N/A');
    console.log('Program Code:', timeLog.enrollment.billingProgram?.code || 'N/A');
  } else if (timeLog.enrollmentId) {
    console.log('⚠️  enrollmentId set but enrollment not found');
  } else {
    console.log('❌ NOT LINKED to enrollment');
  }

  await prisma.$disconnect();
}

checkTimeLog().catch(console.error);
