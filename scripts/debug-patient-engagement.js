const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPatientEngagement() {
  try {
    const patientId = 'cmh1xl78a00b97kz2aewjvwvq';
    const organizationId = 'cmgz1ve7v00027kyyrqp5w0zk';
    const timeframe = '30d';

    console.log('🔍 Debugging Patient Engagement Metrics...\n');

    // Step 1: Organization context check
    console.log('Step 1: Checking organization context...');
    if (!organizationId) {
      throw new Error('Organization context required');
    }

    // Step 2: Check organization exists
    console.log('Step 2: Checking organization exists...');
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, type: true, name: true }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }
    console.log(`✅ Organization: ${organization.name} (${organization.type})`);

    // Step 3: Block PLATFORM organizations
    console.log('Step 3: Checking organization type...');
    if (organization.type === 'PLATFORM') {
      throw new Error('Analytics not available for platform organizations');
    }
    console.log('✅ Organization type allowed');

    // Step 4: Calculate date range
    console.log('\nStep 4: Calculating date range...');
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = now;
    console.log(`From: ${start.toISOString()}`);
    console.log(`To: ${end.toISOString()}`);

    // Step 5: Find patient
    console.log('\nStep 5: Finding patient...');
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        medicalRecordNumber: true
      }
    });

    if (!patient) {
      throw new Error('Patient not found');
    }
    console.log(`✅ Patient: ${patient.firstName} ${patient.lastName}`);

    // Step 6: Get enrollments
    console.log('\nStep 6: Getting enrollments...');
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
    console.log(`✅ Found ${enrollments.length} active enrollments`);

    // Step 7: Assessment adherence
    console.log('\nStep 7: Calculating assessment adherence...');
    const totalAssessments = await prisma.assessment.count({
      where: {
        patientId,
        createdAt: { gte: start, lte: end }
      }
    });
    console.log(`Total assessments created: ${totalAssessments}`);

    const completedAssessments = await prisma.assessment.count({
      where: {
        patientId,
        completedAt: { gte: start, lte: end }
      }
    });
    console.log(`Completed assessments: ${completedAssessments}`);

    // Step 8: Calculate expected assessments
    console.log('\nStep 8: Calculating expected assessments...');
    const daysDiff = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    let expectedAssessments = 0;
    enrollments.forEach(enrollment => {
      const frequency = enrollment.careProgram.settings?.assessmentFrequency || 'WEEKLY';
      console.log(`Program: ${enrollment.careProgram.name}, Frequency: ${frequency}`);
      if (frequency === 'DAILY') {
        expectedAssessments += daysDiff;
      } else if (frequency === 'WEEKLY') {
        expectedAssessments += Math.floor(daysDiff / 7);
      }
    });
    console.log(`Expected assessments: ${expectedAssessments}`);

    const assessmentAdherenceRate = expectedAssessments > 0
      ? (completedAssessments / expectedAssessments) * 100
      : 0;
    console.log(`Assessment adherence rate: ${assessmentAdherenceRate.toFixed(1)}%`);

    // Step 9: Medication adherence
    console.log('\nStep 9: Checking medication adherence...');
    const activeMedications = await prisma.patientMedication.findMany({
      where: {
        patientId,
        isActive: true,
        startDate: { lte: end },
        OR: [
          { endDate: null },
          { endDate: { gte: start } }
        ]
      },
      select: {
        id: true,
        drug: {
          select: {
            brandName: true,
            genericName: true
          }
        }
      }
    });
    console.log(`Found ${activeMedications.length} active medications`);

    // Step 10: Observation submission pattern
    console.log('\nStep 10: Checking observation patterns...');
    const observations = await prisma.observation.findMany({
      where: {
        patientId,
        recordedAt: { gte: start, lte: end }
      },
      select: {
        recordedAt: true,
        metric: {
          select: {
            displayName: true,
            category: true
          }
        }
      },
      orderBy: {
        recordedAt: 'asc'
      }
    });
    console.log(`Found ${observations.length} observations`);

    // Group by day
    const observationsByDay = {};
    observations.forEach(obs => {
      const day = obs.recordedAt.toISOString().split('T')[0];
      if (!observationsByDay[day]) {
        observationsByDay[day] = 0;
      }
      observationsByDay[day]++;
    });

    const daysWithObservations = Object.keys(observationsByDay).length;
    const observationConsistency = daysDiff > 0 ? (daysWithObservations / daysDiff) * 100 : 0;
    console.log(`Days with observations: ${daysWithObservations}/${daysDiff}`);
    console.log(`Observation consistency: ${observationConsistency.toFixed(1)}%`);

    // Step 11: Alert metrics
    console.log('\nStep 11: Checking alert metrics...');
    const patientAlerts = await prisma.alert.count({
      where: {
        patientId,
        triggeredAt: { gte: start, lte: end }
      }
    });

    const criticalAlerts = await prisma.alert.count({
      where: {
        patientId,
        severity: 'CRITICAL',
        triggeredAt: { gte: start, lte: end }
      }
    });
    console.log(`Total alerts: ${patientAlerts}`);
    console.log(`Critical alerts: ${criticalAlerts}`);

    // Step 12: Calculate engagement score
    console.log('\nStep 12: Calculating engagement score...');
    let engagementScore = 0;
    engagementScore += (assessmentAdherenceRate / 100) * 40;
    engagementScore += (observationConsistency / 100) * 20;
    if (criticalAlerts === 0) {
      engagementScore += 10;
    }
    console.log(`Engagement score: ${Math.round(engagementScore)}/100`);

    console.log('\n✅ All calculations completed successfully!');
    console.log('\n📊 Final Result:');
    console.log(JSON.stringify({
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        medicalRecordNumber: patient.medicalRecordNumber
      },
      summary: {
        engagementScore: Math.round(engagementScore),
        assessmentAdherenceRate: Math.round(assessmentAdherenceRate),
        observationConsistency: Math.round(observationConsistency),
        totalAlerts: patientAlerts,
        criticalAlerts
      }
    }, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugPatientEngagement();
