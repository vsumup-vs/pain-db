const { PrismaClient } = require('@prisma/client');
const { evaluateObservation } = require('../src/services/alertEvaluationService');
const prisma = new PrismaClient();

async function simulateDailyAlertEvaluation() {
  console.log('🔄 Simulating alert evaluation as if it ran on each day\n');

  // Clear existing alerts
  await prisma.alert.deleteMany({
    where: {
      patient: { firstName: 'Jennifer', lastName: 'Lee' }
    }
  });
  console.log('✅ Cleared existing alerts\n');

  const jennifer = await prisma.patient.findFirst({
    where: { firstName: 'Jennifer', lastName: 'Lee' }
  });

  // Get all pain observations for Oct 19-21, ordered by recordedAt
  const observations = await prisma.observation.findMany({
    where: {
      patientId: jennifer.id,
      metric: { key: 'pain_level_nrs' },
      recordedAt: {
        gte: new Date('2025-10-19'),
        lte: new Date('2025-10-21T23:59:59')
      }
    },
    include: {
      patient: true,
      metric: true
    },
    orderBy: { recordedAt: 'asc' }
  });

  console.log(`Found ${observations.length} observations to evaluate\n`);

  let alertCount = 0;

  for (const obs of observations) {
    const day = obs.recordedAt.toISOString().split('T')[0];
    const time = obs.recordedAt.toISOString().split('T')[1].substring(0, 8);

    console.log(`\n📅 ${day} ${time} - Pain = ${obs.value.numeric}`);
    console.log('-'.repeat(80));

    const result = await evaluateObservation(obs);

    if (result.length > 0) {
      console.log(`✅ ${result.length} alert(s) triggered:`);
      result.forEach(alert => {
        alertCount++;
        console.log(`   ${alertCount}. ${alert.severity}: ${alert.rule.name}`);
      });
    } else {
      console.log('⚠️  No alerts triggered (likely due to cooldown)');
    }

    // Wait 100ms between evaluations to allow cooldown checks
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Show final alert list
  const alerts = await prisma.alert.findMany({
    where: { patientId: jennifer.id },
    include: {
      rule: { select: { name: true, conditions: true } }
    },
    orderBy: { triggeredAt: 'asc' }
  });

  console.log('\n\n' + '='.repeat(80));
  console.log(`📊 Final Alert Count: ${alerts.length}\n`);

  alerts.forEach((alert, i) => {
    const day = alert.triggeredAt.toISOString().split('T')[0];
    const consecutive = alert.rule.conditions.consecutive || false;
    console.log(`${i + 1}. ${alert.severity.padEnd(8)} | ${day} | ${alert.rule.name}`);
    console.log(`   ${consecutive ? '📅 Consecutive' : '📍 Single day'} | ${alert.message}`);
  });

  await prisma.$disconnect();
}

simulateDailyAlertEvaluation().catch(console.error);
