const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkAlertRulesToPresets() {
  try {
    console.log('🔗 Linking Alert Rules to Condition Presets...\n');

    // Get all standardized condition presets
    const presets = await prisma.conditionPreset.findMany({
      where: { organizationId: null, isStandardized: true }
    });

    // Get all standardized alert rules
    const alertRules = await prisma.alertRule.findMany({
      where: { organizationId: null, isStandardized: true }
    });

    console.log(`Found ${presets.length} condition presets`);
    console.log(`Found ${alertRules.length} alert rules\n`);

    // Create preset name to ID mapping
    const presetMap = {};
    presets.forEach(preset => {
      presetMap[preset.name] = preset.id;
    });

    // Create alert rule name to ID mapping
    const ruleMap = {};
    alertRules.forEach(rule => {
      ruleMap[rule.name] = rule.id;
    });

    // Define relationships based on clinical logic
    const relationships = [
      // Chronic Pain Management preset
      {
        preset: 'Chronic Pain Management',
        rules: [
          'Critical Pain Level Alert',
          'Escalating Pain Trend',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Type 2 Diabetes Management preset
      {
        preset: 'Type 2 Diabetes Management',
        rules: [
          'Severe Hypoglycemia Alert',
          'Severe Hyperglycemia Alert',
          'Uncontrolled Diabetes Pattern',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Hypertension Management preset
      {
        preset: 'Hypertension Management',
        rules: [
          'Hypertensive Crisis Alert',
          'Uncontrolled Hypertension Pattern',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Depression and Anxiety Management preset
      {
        preset: 'Depression and Anxiety Management',
        rules: [
          'Severe Depression Alert',
          'Severe Anxiety Alert',
          'Suicidal Ideation Flagged',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Chronic Obstructive Pulmonary Disease (COPD) preset
      {
        preset: 'Chronic Obstructive Pulmonary Disease (COPD)',
        rules: [
          'COPD Exacerbation Warning',
          'Low Oxygen Saturation',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Congestive Heart Failure Management preset
      {
        preset: 'Congestive Heart Failure Management',
        rules: [
          'Rapid Weight Gain (HF Exacerbation)',
          'Hypertensive Crisis Alert',
          'Low Oxygen Saturation',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Chronic Kidney Disease Management preset
      {
        preset: 'Chronic Kidney Disease Management',
        rules: [
          'Hypertensive Crisis Alert',
          'Uncontrolled Hypertension Pattern',
          'Missed Assessment Alert',
          'Poor Medication Adherence'
        ]
      },
      // Obesity and Weight Management preset
      {
        preset: 'Obesity and Weight Management',
        rules: [
          'Missed Assessment Alert'
        ]
      }
    ];

    // Link alert rules to presets
    let totalLinksCreated = 0;

    for (const relationship of relationships) {
      const presetId = presetMap[relationship.preset];

      if (!presetId) {
        console.log(`⚠️  Preset not found: ${relationship.preset}`);
        continue;
      }

      console.log(`\n🔗 Linking "${relationship.preset}"...`);

      for (const ruleName of relationship.rules) {
        const ruleId = ruleMap[ruleName];

        if (!ruleId) {
          console.log(`  ⚠️  Rule not found: ${ruleName}`);
          continue;
        }

        try {
          await prisma.conditionPresetAlertRule.create({
            data: {
              conditionPresetId: presetId,
              alertRuleId: ruleId
            }
          });
          console.log(`  ✅ Linked: ${ruleName}`);
          totalLinksCreated++;
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`  ℹ️  Already linked: ${ruleName}`);
          } else {
            console.log(`  ❌ Error linking ${ruleName}:`, error.message);
          }
        }
      }
    }

    console.log(`\n✨ Created ${totalLinksCreated} alert rule links\n`);

    // Verify the links
    console.log('🔍 Verifying links...\n');
    const presetsWithRules = await prisma.conditionPreset.findMany({
      where: { organizationId: null },
      include: {
        alertRules: {
          include: {
            rule: true
          }
        }
      }
    });

    presetsWithRules.forEach(preset => {
      console.log(`  ${preset.name}: ${preset.alertRules.length} alert rules`);
      preset.alertRules.forEach(ar => {
        console.log(`    - ${ar.rule.name}`);
      });
    });

    console.log('\n✅ Alert rules successfully linked to condition presets!\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

linkAlertRulesToPresets();
