const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSupportedRules() {
  console.log('📋 Alert Rules with SUPPORTED Operators:\n');
  console.log('Supported operators: gt, gte, lt, lte, eq, neq, in, increase, decrease\n');
  console.log('='.repeat(80));

  const rules = await prisma.alertRule.findMany({
    where: { isActive: true },
    select: { id: true, name: true, severity: true, conditions: true }
  });

  const supportedOps = ['gt', 'gte', 'lt', 'lte', 'eq', 'equals', 'neq', 'not_equals', 'in', 'increase', 'decrease'];

  const supportedRules = rules.filter(rule => {
    const op = rule.conditions?.operator;
    return supportedOps.includes(op);
  });

  supportedRules.forEach(rule => {
    console.log(`\n✅ ${rule.name} (${rule.severity})`);
    console.log(`   Operator: ${rule.conditions.operator}`);
    console.log(`   Metric: ${rule.conditions.metric}`);
    console.log(`   Threshold: ${rule.conditions.value}${rule.conditions.unit || ''}`);
  });

  console.log(`\n\nTotal supported rules: ${supportedRules.length} / ${rules.length}`);

  // Now check if we have observations that should trigger supported rules
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🔍 Checking for observations that should trigger supported rules:\n');

  // Get actual pain values
  const painObs = await prisma.observation.findMany({
    where: {
      patient: { firstName: { in: ['William', 'Jennifer'] } },
      metric: { key: 'pain_level' }
    },
    include: { patient: true, metric: true },
    orderBy: { recordedAt: 'desc' },
    take: 10
  });

  console.log(`Pain observations (last 10):`);
  painObs.forEach(obs => {
    const val = typeof obs.value === 'object' ? obs.value.numeric : obs.value;
    console.log(`  ${obs.patient.firstName}: pain = ${val} (should trigger if >= 8)`);
  });

  // Check for high BP
  const highBP = await prisma.observation.findMany({
    where: {
      patient: { firstName: { in: ['William', 'Jennifer'] } },
      metric: { key: 'systolic_bp' }
    },
    include: { patient: true },
    orderBy: { recordedAt: 'desc' },
    take: 10
  });

  console.log(`\nSystolic BP observations (last 10):`);
  highBP.forEach(obs => {
    const val = typeof obs.value === 'object' ? obs.value.numeric : obs.value;
    console.log(`  ${obs.patient.firstName}: SBP = ${val} mmHg (should trigger if >= 180)`);
  });

  // Check blood glucose
  const glucose = await prisma.observation.findMany({
    where: {
      patient: { firstName: { in: ['William', 'Jennifer'] } },
      metric: { key: 'blood_glucose' }
    },
    include: { patient: true },
    orderBy: { recordedAt: 'desc' },
    take: 10
  });

  console.log(`\nBlood Glucose observations (last 10):`);
  glucose.forEach(obs => {
    const val = typeof obs.value === 'object' ? obs.value.numeric : obs.value;
    console.log(`  ${obs.patient.firstName}: glucose = ${val} mg/dL (critical if < 70 or > 250)`);
  });

  await prisma.$disconnect();
}

checkSupportedRules().catch(console.error);
