const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking current database state...\n');

    // Check condition presets
    const conditionPresets = await prisma.condition_presets.findMany({
      select: { id: true, name: true }
    });
    console.log(`📋 Condition Presets: ${conditionPresets.length}`);
    conditionPresets.forEach(cp => console.log(`  - ${cp.name}`));

    // Check assessment templates
    const assessmentTemplates = await prisma.assessment_templates.findMany({
      select: { id: true, name: true }
    });
    console.log(`\n📝 Assessment Templates: ${assessmentTemplates.length}`);
    assessmentTemplates.forEach(at => console.log(`  - ${at.name}`));

    // Check alert rules (using correct model name)
    const alertRules = await prisma.alertRule.findMany({
      select: { id: true, name: true }
    });
    console.log(`\n🚨 Alert Rules: ${alertRules.length}`);
    alertRules.forEach(ar => console.log(`  - ${ar.name}`));

    // Check linkage tables - THIS IS THE KEY PART
    console.log('\n🔗 Checking linkage tables...');
    
    const conditionPresetTemplates = await prisma.condition_preset_templates.findMany();
    console.log(`  - condition_preset_templates: ${conditionPresetTemplates.length} records`);

    const conditionPresetDiagnoses = await prisma.condition_preset_diagnoses.findMany();
    console.log(`  - condition_preset_diagnoses: ${conditionPresetDiagnoses.length} records`);

    const conditionPresetAlertRules = await prisma.condition_preset_alert_rules.findMany();
    console.log(`  - condition_preset_alert_rules: ${conditionPresetAlertRules.length} records`);

    // Check specific condition presets for linkages
    console.log('\n🔍 Checking specific condition preset linkages...');
    
    const arthritisPreset = conditionPresets.find(cp => cp.name.toLowerCase().includes('arthritis'));
    const asthmaPreset = conditionPresets.find(cp => cp.name.toLowerCase().includes('asthma'));

    if (arthritisPreset) {
      const arthritisTemplates = await prisma.condition_preset_templates.findMany({
        where: { conditionPresetId: arthritisPreset.id },
        include: { assessment_templates: { select: { name: true } } }
      });
      console.log(`  - Arthritis templates: ${arthritisTemplates.length}`);
      arthritisTemplates.forEach(link => console.log(`    • ${link.assessment_templates.name}`));

      const arthritisDiagnoses = await prisma.condition_preset_diagnoses.findMany({
        where: { conditionPresetId: arthritisPreset.id }
      });
      console.log(`  - Arthritis diagnoses: ${arthritisDiagnoses.length}`);
      arthritisDiagnoses.forEach(d => console.log(`    • ${d.icd10}: ${d.label}`));
    }

    if (asthmaPreset) {
      const asthmaTemplates = await prisma.condition_preset_templates.findMany({
        where: { conditionPresetId: asthmaPreset.id },
        include: { assessment_templates: { select: { name: true } } }
      });
      console.log(`  - Asthma templates: ${asthmaTemplates.length}`);
      asthmaTemplates.forEach(link => console.log(`    • ${link.assessment_templates.name}`));

      const asthmaDiagnoses = await prisma.condition_preset_diagnoses.findMany({
        where: { conditionPresetId: asthmaPreset.id }
      });
      console.log(`  - Asthma diagnoses: ${asthmaDiagnoses.length}`);
      asthmaDiagnoses.forEach(d => console.log(`    • ${d.icd10}: ${d.label}`));
    }

    // Summary of the issue
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Condition Presets: ${conditionPresets.length}`);
    console.log(`✅ Assessment Templates: ${assessmentTemplates.length}`);
    console.log(`✅ Alert Rules: ${alertRules.length}`);
    console.log(`${conditionPresetTemplates.length > 0 ? '✅' : '❌'} Template Linkages: ${conditionPresetTemplates.length}`);
    console.log(`${conditionPresetDiagnoses.length > 0 ? '✅' : '❌'} Diagnosis Linkages: ${conditionPresetDiagnoses.length}`);
    console.log(`${conditionPresetAlertRules.length > 0 ? '✅' : '❌'} Alert Rule Linkages: ${conditionPresetAlertRules.length}`);

    if (conditionPresetTemplates.length === 0) {
      console.log('\n🚨 ISSUE IDENTIFIED: No template linkages found!');
      console.log('   This explains why condition presets show "0 templates" in the UI.');
      console.log('   Solution: Run the correct seeding script to create linkages.');
    }

    console.log('\n✅ Database state check completed!');

  } catch (error) {
    console.error('❌ Error checking database state:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkDatabaseState();
}

module.exports = { checkDatabaseState };