#!/usr/bin/env node

/**
 * Seed Script: Create Sample Enrollments with Billing Programs
 *
 * Purpose: Generate realistic sample enrollments linked to billing programs
 * for testing the configurable billing architecture (Phase 3).
 *
 * What this script creates:
 * - 10 enrollments for existing patients and clinicians
 * - Links enrollments to appropriate billing programs (RPM, RTM, CCM)
 * - Generates observations and time logs linked to enrollments
 * - Creates data realistic enough to test billing readiness calculations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting enrollment seed with billing programs...\n');

  // Get organization
  const org = await prisma.organization.findFirst({
    where: { name: 'Default Healthcare Organization' }
  });

  if (!org) {
    throw new Error('Organization not found. Run seed script first.');
  }

  console.log(`✅ Found organization: ${org.name} (${org.id})\n`);

  // Get billing programs
  const billingPrograms = await prisma.billingProgram.findMany({
    where: { isActive: true },
    include: { cptCodes: true }
  });

  console.log(`✅ Found ${billingPrograms.length} billing programs:`);
  billingPrograms.forEach(bp => {
    console.log(`   - ${bp.name} (${bp.code}) with ${bp.cptCodes.length} CPT codes`);
  });
  console.log('');

  // Get patients and clinicians (from any organization since we might not have many)
  const patients = await prisma.patient.findMany({
    take: 10
  });

  const clinicians = await prisma.clinician.findMany({
    take: 3
  });

  if (patients.length === 0 || clinicians.length === 0) {
    console.error('❌ No patients or clinicians found.');
    console.error('   Run seed script first: node scripts/seed-triage-queue-test-data.js');
    throw new Error('No patients or clinicians found. Run seed script first.');
  }

  console.log(`✅ Found ${patients.length} patients and ${clinicians.length} clinicians\n`);

  // Get care programs
  const carePrograms = await prisma.careProgram.findMany({
    where: { organizationId: org.id }
  });

  if (carePrograms.length === 0) {
    throw new Error('No care programs found. Run seed script first.');
  }

  // Get metric definitions for observations
  const metrics = await prisma.metricDefinition.findMany({
    where: {
      OR: [
        { key: 'bp_systolic' },
        { key: 'bp_diastolic' },
        { key: 'heart_rate' },
        { key: 'blood_glucose' },
        { key: 'weight' }
      ]
    }
  });

  console.log(`✅ Found ${metrics.length} metrics for observations\n`);

  // Create enrollments with billing programs
  const enrollments = [];
  const enrollmentDistribution = [
    { programCode: 'CMS_RPM_2025', count: 4 },
    { programCode: 'CMS_RTM_2025', count: 3 },
    { programCode: 'CMS_CCM_2025', count: 3 }
  ];

  let patientIndex = 0;

  for (const dist of enrollmentDistribution) {
    const billingProgram = billingPrograms.find(bp => bp.code === dist.programCode);

    if (!billingProgram) {
      console.log(`⚠️  Billing program ${dist.programCode} not found, skipping...`);
      continue;
    }

    for (let i = 0; i < dist.count && patientIndex < patients.length; i++) {
      const patient = patients[patientIndex];
      const clinician = clinicians[patientIndex % clinicians.length];
      const careProgram = carePrograms[patientIndex % carePrograms.length];

      // Check if enrollment already exists
      let enrollment = await prisma.enrollment.findFirst({
        where: {
          patientId: patient.id,
          careProgramId: careProgram.id,
          startDate: new Date('2025-10-01')
        }
      });

      if (enrollment) {
        console.log(`⚠️  Enrollment already exists for ${patient.firstName} ${patient.lastName}, skipping...`);
        patientIndex++;
        continue;
      }

      // Create enrollment
      enrollment = await prisma.enrollment.create({
        data: {
          organizationId: org.id,
          patientId: patient.id,
          clinicianId: clinician.id,
          careProgramId: careProgram.id,
          billingProgramId: billingProgram.id,
          status: 'ACTIVE',
          startDate: new Date('2025-10-01'),
          notes: `Enrolled in ${billingProgram.name} program for billing testing`
        }
      });

      enrollments.push(enrollment);

      console.log(`✅ Created enrollment ${patientIndex + 1}:`);
      console.log(`   Patient: ${patient.firstName} ${patient.lastName}`);
      console.log(`   Clinician: ${clinician.firstName} ${clinician.lastName}`);
      console.log(`   Billing Program: ${billingProgram.name}`);
      console.log(`   Care Program: ${careProgram.name}`);

      // Generate observations for this enrollment (simulating device data)
      if (metrics.length > 0 && dist.programCode.includes('RPM')) {
        console.log(`   📊 Generating observations for RPM enrollment...`);

        // Generate 20 days of observations (to meet 16-day threshold)
        const observationCount = 20;
        const startDate = new Date('2025-10-01');

        for (let day = 0; day < observationCount; day++) {
          const recordedAt = new Date(startDate);
          recordedAt.setDate(recordedAt.getDate() + day);
          recordedAt.setHours(12, 0, 0, 0); // Set to noon to avoid conflicts

          // Create 2-3 observations per day
          const numObsPerDay = 2 + Math.floor(Math.random() * 2);

          for (let obsIdx = 0; obsIdx < numObsPerDay; obsIdx++) {
            const metric = metrics[Math.floor(Math.random() * metrics.length)];

            let value;
            if (metric.key === 'bp_systolic') {
              value = 120 + Math.floor(Math.random() * 40) - 20;
            } else if (metric.key === 'bp_diastolic') {
              value = 80 + Math.floor(Math.random() * 20) - 10;
            } else if (metric.key === 'heart_rate') {
              value = 70 + Math.floor(Math.random() * 30);
            } else if (metric.key === 'blood_glucose') {
              value = 100 + Math.floor(Math.random() * 80);
            } else if (metric.key === 'weight') {
              value = 150 + Math.floor(Math.random() * 100);
            }

            // Add hours to avoid collisions with unique constraint
            const uniqueRecordedAt = new Date(recordedAt);
            uniqueRecordedAt.setHours(uniqueRecordedAt.getHours() + obsIdx);

            await prisma.observation.create({
              data: {
                organizationId: org.id,
                patientId: patient.id,
                clinicianId: clinician.id,
                enrollmentId: enrollment.id,  // PHASE 3: Link to enrollment
                metricId: metric.id,
                value: value,
                source: 'DEVICE',
                context: 'PROGRAM_ENROLLMENT',
                recordedAt: uniqueRecordedAt
              }
            });
          }
        }

        console.log(`      ✅ Created ${observationCount * 2} observations over ${observationCount} days`);
      }

      // Generate time logs for this enrollment (simulating clinical time)
      console.log(`   ⏱️  Generating time logs for billing...`);

      // Generate 3-5 time log entries for the current month
      const timeLogCount = 3 + Math.floor(Math.random() * 3);

      for (let tlIdx = 0; tlIdx < timeLogCount; tlIdx++) {
        const loggedAt = new Date('2025-10-01');
        loggedAt.setDate(loggedAt.getDate() + (tlIdx * 7)); // Weekly time logs

        // Random duration between 10-30 minutes
        const duration = 10 + Math.floor(Math.random() * 21);

        await prisma.timeLog.create({
          data: {
            patientId: patient.id,
            clinicianId: clinician.id,
            enrollmentId: enrollment.id,  // PHASE 3: Link to enrollment
            activity: `${billingProgram.programType} clinical review and patient consultation`,
            duration: duration,
            billable: true,
            loggedAt: loggedAt
          }
        });
      }

      console.log(`      ✅ Created ${timeLogCount} time logs (total: ${timeLogCount * 15} avg minutes)\n`);

      patientIndex++;
    }
  }

  console.log(`\n✅ Created ${enrollments.length} enrollments with billing programs!`);
  console.log(`✅ All enrollments have linked observations and time logs\n`);

  // Summary statistics
  const observationCount = await prisma.observation.count({
    where: { enrollmentId: { not: null } }
  });

  const timeLogCount = await prisma.timeLog.count({
    where: { enrollmentId: { not: null } }
  });

  console.log('📊 Summary:');
  console.log(`   - Total enrollments: ${enrollments.length}`);
  console.log(`   - Observations linked to enrollments: ${observationCount}`);
  console.log(`   - Time logs linked to enrollments: ${timeLogCount}`);
  console.log('');

  console.log('🎉 Seed complete! You can now test billing readiness calculations.\n');
}

main()
  .catch(e => {
    console.error('❌ Error seeding enrollments:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
