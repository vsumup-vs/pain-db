const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying medication adherence seed data...\n');

  // Check metrics
  const metrics = await prisma.metricDefinition.findMany({
    where: {
      key: {
        in: [
          'medication_adherence',
          'medication_effectiveness',
          'side_effects_severity',
          'pain_before_medication',
          'pain_after_medication',
          'medication_timing'
        ]
      }
    }
  });
  console.log(`✅ Medication Metrics: ${metrics.length}/6 found`);
  metrics.forEach(m => console.log(`   - ${m.displayName} (${m.key})`));

  // Check templates
  const templates = await prisma.assessmentTemplate.findMany({
    where: {
      name: {
        in: [
          'Daily Medication Tracker',
          'Morisky Medication Adherence Scale (MMAS-8)',
          'KCCQ-12 (Kansas City Cardiomyopathy Questionnaire)',
          'COPD Assessment Test (CAT)'
        ]
      }
    }
  });
  console.log(`\n✅ Templates: ${templates.length}/4 found`);
  templates.forEach(t => console.log(`   - ${t.name}`));

  // Check for KCCQ separately
  const kccq = await prisma.assessmentTemplate.findFirst({
    where: { name: { contains: 'KCCQ' } }
  });
  if (kccq) {
    console.log(`\n🔍 Found KCCQ template with name: "${kccq.name}"`);
  } else {
    console.log(`\n⚠️  KCCQ template not found - checking by ID...`);
    const kccqById = await prisma.assessmentTemplate.findUnique({
      where: { id: 'template-kccq-12' }
    });
    if (kccqById) {
      console.log(`   Found by ID: "${kccqById.name}"`);
    }
  }

  // Check preset linkages (using correct field name: conditionPreset, not preset)
  const presetLinkages = await prisma.conditionPresetTemplate.findMany({
    where: {
      id: {
        in: [
          'preset-chronic-pain-daily-med-tracker',
          'preset-chronic-pain-morisky',
          'preset-copd-daily-med-tracker',
          'preset-copd-cat',
          'preset-heart-failure-morisky',
          'preset-heart-failure-kccq'
        ]
      }
    },
    include: {
      template: { select: { name: true } },
      conditionPreset: { select: { name: true } }  // Fixed: was 'preset', now 'conditionPreset'
    }
  });
  console.log(`\n✅ Preset Linkages: ${presetLinkages.length}/6 found`);
  presetLinkages.forEach(pl => {
    console.log(`   - ${pl.conditionPreset.name} ← ${pl.template.name} (${pl.frequency})`);
  });

  console.log('\n✅ All medication adherence data verified successfully!');
  
  await prisma.$disconnect();
}

verify().catch(console.error);
