const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarol() {
  try {
    // Find Carol's enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        patient: {
          firstName: 'Carol',
          lastName: 'NearTime'
        }
      },
      include: {
        patient: true,
        billingProgram: {
          include: {
            cptCodes: true
          }
        }
      }
    });

    if (!enrollment) {
      console.log('❌ Carol enrollment not found');
      return;
    }

    console.log('=== CAROL ENROLLMENT ===');
    console.log('ID:', enrollment.id);
    console.log('Patient:', enrollment.patient.firstName, enrollment.patient.lastName);
    console.log('Billing Program:', enrollment.billingProgram.code);
    console.log('Billing Eligibility:', JSON.stringify(enrollment.billingEligibility, null, 2));

    // Check observations
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31T23:59:59.999Z');

    const observations = await prisma.observation.findMany({
      where: {
        enrollmentId: enrollment.id,
        recordedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        recordedAt: 'asc'
      }
    });

    console.log('\n=== OBSERVATIONS ===');
    console.log('Total observations:', observations.length);

    const uniqueDates = new Set(
      observations.map(obs => obs.recordedAt.toISOString().split('T')[0])
    );
    console.log('Unique dates:', uniqueDates.size);

    if (observations.length > 0) {
      console.log('First observation:', observations[0].recordedAt);
      console.log('Last observation:', observations[observations.length - 1].recordedAt);
    }

    // Check time logs
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        enrollmentId: enrollment.id,
        billable: true,
        loggedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    console.log('\n=== TIME LOGS ===');
    console.log('Total time logs:', timeLogs.length);

    const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    console.log('Total minutes:', totalMinutes);

    if (timeLogs.length > 0) {
      console.log('Time log details:');
      timeLogs.forEach(log => {
        console.log(' -', log.duration, 'minutes on', log.loggedAt.toISOString().split('T')[0], 'CPT:', log.cptCode);
      });
    }

    console.log('\n=== CPT CODES IN PROGRAM ===');
    enrollment.billingProgram.cptCodes.forEach(code => {
      console.log(' -', code.code, ':', code.category, '-', code.description);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

checkCarol();
