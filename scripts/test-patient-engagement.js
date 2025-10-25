const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPatientEngagement() {
  try {
    console.log('Testing patient engagement metrics...');

    const patientId = 'cmh1xl78a00b97kz2aewjvwvq';
    const timeframe = '30d';

    // Calculate date range
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = now;

    console.log(`Date range: ${start.toISOString()} to ${end.toISOString()}`);

    // Test 1: Check if patient exists
    console.log('\n1. Checking if patient exists...');
    const patient = await prisma.patient.findFirst({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        organizationId: true
      }
    });
    console.log('Patient:', patient);

    if (!patient) {
      console.log('❌ Patient not found!');
      return;
    }

    // Test 2: Check assessments
    console.log('\n2. Checking assessments...');
    const assessments = await prisma.assessment.findMany({
      where: {
        patientId,
        createdAt: { gte: start, lte: end }
      },
      take: 5
    });
    console.log(`Found ${assessments.length} assessments`);

    // Test 3: Check completed assessments
    console.log('\n3. Checking completed assessments...');
    const completedAssessments = await prisma.assessment.count({
      where: {
        patientId,
        completedAt: { gte: start, lte: end }
      }
    });
    console.log(`Completed assessments: ${completedAssessments}`);

    // Test 4: Check enrollments
    console.log('\n4. Checking enrollments...');
    const enrollments = await prisma.enrollment.findMany({
      where: {
        patientId,
        status: 'ACTIVE'
      },
      include: {
        careProgram: {
          select: {
            name: true,
            settings: true
          }
        }
      }
    });
    console.log(`Found ${enrollments.length} active enrollments`);

    // Test 5: Check observations with metric relationship
    console.log('\n5. Checking observations with metric...');
    try {
      const observations = await prisma.observation.findMany({
        where: {
          patientId,
          recordedAt: { gte: start, lte: end }
        },
        include: {
          metric: {
            select: {
              displayName: true,
              category: true
            }
          }
        },
        take: 5
      });
      console.log(`Found ${observations.length} observations`);
    } catch (error) {
      console.error('❌ Error querying observations:', error.message);
    }

    // Test 6: Check medications
    console.log('\n6. Checking patient medications...');
    try {
      const medications = await prisma.patientMedication.findMany({
        where: {
          patientId,
          isActive: true
        },
        include: {
          drug: {
            select: {
              brandName: true,
              genericName: true
            }
          }
        },
        take: 5
      });
      console.log(`Found ${medications.length} active medications`);
    } catch (error) {
      console.error('❌ Error querying medications:', error.message);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPatientEngagement();
