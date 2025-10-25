const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { evaluateObservation } = require('../src/services/alertEvaluationService');

async function triggerAlertEvaluation() {
  console.log('🚨 Triggering Alert Evaluation for Test Patients\n');
  console.log('='.repeat(80));

  // Get observations for William and Jennifer
  const observations = await prisma.observation.findMany({
    where: {
      patient: {
        firstName: { in: ['William', 'Jennifer'] }
      }
    },
    include: {
      patient: true,
      metric: true
    },
    orderBy: {
      recordedAt: 'asc'
    }
  });

  console.log(`\nFound ${observations.length} observations to evaluate\n`);

  let evaluatedCount = 0;
  let alertsTriggered = 0;
  let errors = 0;

  for (const observation of observations) {
    try {
      console.log(`Evaluating: ${observation.patient.firstName} ${observation.patient.lastName} - ${observation.metric.displayName} = ${observation.value.numeric || observation.value.text || JSON.stringify(observation.value)}`);

      const result = await evaluateObservation(observation);
      evaluatedCount++;

      if (result && result.alertsTriggered > 0) {
        alertsTriggered += result.alertsTriggered;
        console.log(`  ✅ Triggered ${result.alertsTriggered} alert(s)`);
      }
    } catch (error) {
      errors++;
      console.error(`  ❌ Error evaluating observation ${observation.id}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Evaluation Summary:`);
  console.log(`  Observations evaluated: ${evaluatedCount}`);
  console.log(`  Alerts triggered: ${alertsTriggered}`);
  console.log(`  Errors: ${errors}`);

  // Get all alerts created
  const alerts = await prisma.alert.findMany({
    where: {
      patient: {
        firstName: { in: ['William', 'Jennifer'] }
      }
    },
    include: {
      patient: true,
      rule: true
    },
    orderBy: {
      triggeredAt: 'desc'
    }
  });

  console.log(`\n🔔 Alerts Created: ${alerts.length}`);

  if (alerts.length > 0) {
    console.log('\n');
    for (const alert of alerts) {
      console.log(`  ${alert.severity.padEnd(8)} | ${alert.patient.firstName} ${alert.patient.lastName} | ${alert.rule.name}`);
      console.log(`           | ${alert.message}`);
      console.log(`           | Triggered: ${alert.triggeredAt.toISOString()}`);
      console.log('');
    }
  }

  await prisma.$disconnect();
}

triggerAlertEvaluation().catch(console.error);
