const { PrismaClient } = require('@prisma/client');
const { evaluateObservation } = require('../src/services/alertEvaluationService');
const prisma = new PrismaClient();

async function testCorrectedConsecutiveLogic() {
  console.log('🔍 Testing CORRECTED consecutive days logic\n');

  // Delete existing alerts to reset
  await prisma.alert.deleteMany({
    where: {
      patient: { firstName: 'Jennifer', lastName: 'Lee' }
    }
  });
  console.log('✅ Cleared existing alerts\n');

  // Get an observation from Oct 19 (which has mixed values [5, 9])
  const jennifer = await prisma.patient.findFirst({
    where: { firstName: 'Jennifer', lastName: 'Lee' }
  });

  const obs = await prisma.observation.findFirst({
    where: {
      patientId: jennifer.id,
      metric: { key: 'pain_level_nrs' },
      recordedAt: {
        gte: new Date('2025-10-19'),
        lt: new Date('2025-10-20')
      }
    },
    include: {
      patient: true,
      metric: true
    },
    orderBy: { recordedAt: 'desc' }
  });

  console.log(`Testing with observation from Oct 19:`);
  console.log(`  Date: ${obs.recordedAt.toISOString()}`);
  console.log(`  Pain value: ${obs.value.numeric}\n`);

  // Check what days have ANY pain > 8
  const painObs = await prisma.observation.findMany({
    where: {
      patientId: jennifer.id,
      metric: { key: 'pain_level_nrs' },
      recordedAt: {
        gte: new Date('2025-10-16'),
        lte: new Date('2025-10-21T23:59:59')
      }
    },
    orderBy: { recordedAt: 'asc' }
  });

  const byDay = {};
  painObs.forEach(o => {
    const day = o.recordedAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(o.value.numeric);
  });

  console.log('Pain data by day (last 6 days):');
  console.log('='.repeat(80));
  Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([day, values]) => {
      const anyAbove8 = values.some(v => v > 8);
      console.log(`${day}: [${values.join(', ')}] - ANY > 8: ${anyAbove8 ? '✅' : '❌'}`);
    });

  console.log(`\nEvaluating observation...\n`);

  // Evaluate
  const result = await evaluateObservation(obs);

  console.log(`\n📊 Alerts triggered: ${result.length}\n`);

  result.forEach(alert => {
    console.log(`✅ ${alert.severity}: ${alert.rule.name}`);
    console.log(`   Message: ${alert.message}`);
    console.log(`   Consecutive: ${alert.rule.conditions.consecutive || false}\n`);
  });

  await prisma.$disconnect();
}

testCorrectedConsecutiveLogic().catch(console.error);
