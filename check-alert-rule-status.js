const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

/**
 * Quick status check for alert rule preset linking
 */

async function checkAlertRuleStatus() {
  console.log('🔍 Alert Rule Status Check');
  console.log('=' .repeat(30));

  try {
    const [alertRules, conditionPresets] = await Promise.all([
      prisma.alertRule.findMany({
        include: {
          presetLinks: {
            include: {
              preset: { select: { name: true } }
            }
          }
        }
      }),
      prisma.conditionPreset.findMany({
        include: {
          alertRules: {
            include: {
              rule: { select: { name: true, severity: true } }
            }
          }
        }
      })
    ]);

    console.log(`\n📊 Current Status:`);
    console.log(`   🚨 Total Alert Rules: ${alertRules.length}`);
    console.log(`   🏥 Total Condition Presets: ${conditionPresets.length}`);

    console.log('\n🚨 Alert Rules:');
    alertRules.forEach(rule => {
      const presetCount = rule.presetLinks.length;
      const status = presetCount > 0 ? '✅' : '❌';
      console.log(`   ${status} ${rule.name} (${rule.severity}): ${presetCount} presets`);
    });

    console.log('\n🏥 Condition Presets:');
    conditionPresets.forEach(preset => {
      const ruleCount = preset.alertRules.length;
      const status = ruleCount > 0 ? '✅' : '❌';
      console.log(`   ${status} ${preset.name}: ${ruleCount} alert rules`);
    });

    const rulesWithPresets = alertRules.filter(rule => rule.presetLinks.length > 0).length;
    const presetsWithRules = conditionPresets.filter(preset => preset.alertRules.length > 0).length;

    console.log(`\n📈 Summary:`);
    console.log(`   Alert Rules with presets: ${rulesWithPresets}/${alertRules.length} (${Math.round(rulesWithPresets/alertRules.length*100)}%)`);
    console.log(`   Presets with alert rules: ${presetsWithRules}/${conditionPresets.length} (${Math.round(presetsWithRules/conditionPresets.length*100)}%)`);

  } catch (error) {
    console.error('❌ Status check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkAlertRuleStatus().catch(console.error);
}

module.exports = { checkAlertRuleStatus };