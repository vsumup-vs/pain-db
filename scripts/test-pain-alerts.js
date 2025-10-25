const { PrismaClient } = require('@prisma/client');
const { evaluateObservation } = require('../src/services/alertEvaluationService');
const prisma = new PrismaClient();

async function testPainAlerts() {
  console.log('🚨 Evaluating high-pain observations for alerts...\n');

  // Get the new high-pain observations
  const painObs = await prisma.observation.findMany({
    where: {
      patient: { firstName: 'Jennifer', lastName: 'Lee' },
      metric: { key: 'pain_level_nrs' },
      recordedAt: {
        gte: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // Last 4 days
      }
    },
    include: {
      patient: true,
      metric: true
    },
    orderBy: { recordedAt: 'desc' }
  });

  console.log(`Found ${painObs.length} pain observations in last 4 days\n`);

  let alertsTriggered = 0;

  for (const obs of painObs) {
    const val = typeof obs.value === 'object' ? obs.value.numeric : obs.value;
    console.log(`Evaluating: Jennifer Lee - pain = ${val} at ${obs.recordedAt.toISOString()}`);

    try {
      const result = await evaluateObservation(obs);
      if (result && result.length > 0) {
        alertsTriggered += result.length;
        console.log(`  ✅ Triggered ${result.length} alert(s)`);
        result.forEach(alert => {
          console.log(`     - Alert ID: ${alert.id}`);
          console.log(`       Severity: ${alert.severity}`);
          console.log(`       Message: ${alert.message}`);
          console.log(`       Risk Score: ${alert.riskScore}`);
        });
      } else {
        console.log(`  ⚠️  No alerts triggered`);
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n📊 Summary:`);
  console.log(`  Observations evaluated: ${painObs.length}`);
  console.log(`  Alerts triggered: ${alertsTriggered}`);

  // Check alerts in database
  const dbAlerts = await prisma.alert.findMany({
    include: {
      patient: true,
      rule: true
    },
    orderBy: { triggeredAt: 'desc' },
    take: 10
  });

  console.log(`\n🔔 Recent Alerts in Database (${dbAlerts.length}):`);
  dbAlerts.forEach(alert => {
    console.log(`\n  ${alert.severity} | ${alert.patient.firstName} ${alert.patient.lastName}`);
    console.log(`  Rule: ${alert.rule.name}`);
    console.log(`  Message: ${alert.message}`);
    console.log(`  Status: ${alert.status}`);
    console.log(`  Risk Score: ${alert.riskScore}`);
    console.log(`  Triggered: ${alert.triggeredAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

testPainAlerts().catch(console.error);
