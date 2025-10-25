const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createConsecutiveHighPainDays() {
  console.log('🔴 Creating 3 consecutive days of HIGH pain observations (all > 8)...\n');

  // Get Jennifer Lee
  const jennifer = await prisma.patient.findFirst({
    where: {
      firstName: 'Jennifer',
      lastName: 'Lee'
    }
  });

  if (!jennifer) {
    console.error('❌ Jennifer Lee not found');
    return;
  }

  // Get pain_level_nrs metric
  const painMetric = await prisma.metricDefinition.findFirst({
    where: { key: 'pain_level_nrs' }
  });

  if (!painMetric) {
    console.error('❌ pain_level_nrs metric not found');
    return;
  }

  // Get Jennifer's RTM enrollment (for enrollmentId linkage)
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      patientId: jennifer.id,
      billingProgramId: { not: null },
      status: 'ACTIVE'
    },
    orderBy: { startDate: 'desc' }
  });

  console.log(`Patient: ${jennifer.firstName} ${jennifer.lastName} (${jennifer.id})`);
  console.log(`Metric: ${painMetric.displayName} (${painMetric.id})`);
  console.log(`Enrollment: ${enrollment?.id || 'None'}\n`);

  // Create 3 consecutive days (Oct 22, 23, 24)
  const days = [
    { date: new Date('2025-10-22T10:00:00Z'), times: ['10:00', '14:00', '18:00'] },
    { date: new Date('2025-10-23T10:00:00Z'), times: ['10:00', '14:00', '18:00'] },
    { date: new Date('2025-10-24T10:00:00Z'), times: ['10:00', '14:00', '18:00'] }
  ];

  let createdCount = 0;

  for (const day of days) {
    for (const time of day.times) {
      const [hours, minutes] = time.split(':');
      const recordedAt = new Date(day.date);
      recordedAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await prisma.observation.create({
        data: {
          organizationId: jennifer.organizationId,
          patientId: jennifer.id,
          enrollmentId: enrollment?.id,
          metricId: painMetric.id,
          value: { numeric: 9 }, // All observations are 9 (> 8)
          unit: painMetric.unit,
          source: 'MANUAL',
          context: 'PROGRAM_ENROLLMENT',
          recordedAt
        }
      });

      createdCount++;
    }
  }

  console.log(`✅ Created ${createdCount} pain observations (all with pain = 9)\n`);

  // Show observations by day
  const observations = await prisma.observation.findMany({
    where: {
      patientId: jennifer.id,
      metricId: painMetric.id,
      recordedAt: {
        gte: new Date('2025-10-22'),
        lte: new Date('2025-10-24T23:59:59')
      }
    },
    orderBy: { recordedAt: 'desc' }
  });

  console.log('Pain observations by day:');
  console.log('='.repeat(80));

  const byDay = {};
  observations.forEach(obs => {
    const day = obs.recordedAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(obs.value.numeric);
  });

  Object.entries(byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([day, values]) => {
      const allAbove8 = values.every(v => v > 8);
      const status = allAbove8 ? '✅ ALL > 8' : '❌ Not all > 8';
      console.log(`${day}: [${values.join(', ')}] ${status}`);
    });

  console.log('\n✅ Test data ready for consecutive days evaluation!');

  await prisma.$disconnect();
}

createConsecutiveHighPainDays().catch(console.error);
