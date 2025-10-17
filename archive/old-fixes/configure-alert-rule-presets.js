const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

/**
 * Alert Rule to Condition Preset Configuration Script
 * 
 * This script links alert rules to condition presets based on medical relevance
 * and clinical workflows. It runs separately from deployment to maintain
 * clean separation of concerns.
 */

// Smart linking rules based on medical conditions and alert relevance
const alertRuleLinkingRules = [
  {
    name: 'Pain Management Alerts',
    description: 'Link pain-related alerts to pain management presets',
    alertPatterns: ['pain', 'analgesic', 'opioid'],
    presetPatterns: ['pain', 'fibromyalgia', 'arthritis', 'chronic pain', 'post-surgical'],
    priority: 'high'
  },
  {
    name: 'Mental Health Alerts',
    description: 'Link mental health alerts to psychiatric condition presets',
    alertPatterns: ['depression', 'anxiety', 'phq', 'gad', 'mental'],
    presetPatterns: ['depression', 'anxiety', 'mental health', 'psychiatric'],
    priority: 'high'
  },
  {
    name: 'Cardiovascular Alerts',
    description: 'Link cardiovascular alerts to heart condition presets',
    alertPatterns: ['blood pressure', 'hypertensive', 'cardiac', 'heart'],
    presetPatterns: ['cardiovascular', 'hypertension', 'heart', 'cardiac'],
    priority: 'high'
  },
  {
    name: 'Respiratory Alerts',
    description: 'Link respiratory alerts to lung condition presets',
    alertPatterns: ['oxygen', 'respiratory', 'peak flow', 'breathing'],
    presetPatterns: ['copd', 'asthma', 'respiratory', 'lung'],
    priority: 'high'
  },
  {
    name: 'Diabetes Alerts',
    description: 'Link diabetes alerts to endocrine condition presets',
    alertPatterns: ['glucose', 'diabetes', 'hypoglycemia', 'blood sugar'],
    presetPatterns: ['diabetes', 'endocrine', 'glucose'],
    priority: 'high'
  },
  {
    name: 'Medication Alerts',
    description: 'Link medication alerts to all medication-related presets',
    alertPatterns: ['medication', 'adherence', 'dose', 'drug'],
    presetPatterns: ['medication', 'drug', 'therapy'],
    priority: 'medium'
  },
  {
    name: 'Functional Status Alerts',
    description: 'Link functional alerts to rehabilitation presets',
    alertPatterns: ['functional', 'mobility', 'rehabilitation'],
    presetPatterns: ['rehabilitation', 'therapy', 'mobility', 'functional'],
    priority: 'medium'
  },
  {
    name: 'Critical Safety Alerts',
    description: 'Link critical alerts to all relevant presets for safety',
    alertPatterns: ['critical', 'severe', 'emergency'],
    presetPatterns: ['.*'], // All presets for critical alerts
    priority: 'critical'
  }
];

async function configureAlertRulePresets() {
  console.log('🚨 Alert Rule to Condition Preset Configuration');
  console.log('=' .repeat(55));
  console.log('');

  try {
    // Step 1: Get current system status
    console.log('📊 Step 1: Current System Status');
    console.log('-'.repeat(35));

    const [alertRules, conditionPresets, existingLinks] = await Promise.all([
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
      }),
      prisma.conditionPresetAlertRule.findMany()
    ]);

    console.log(`🚨 Total Alert Rules: ${alertRules.length}`);
    console.log(`🏥 Total Condition Presets: ${conditionPresets.length}`);
    console.log(`🔗 Existing Links: ${existingLinks.length}`);

    // Show current linking status
    const rulesWithoutPresets = alertRules.filter(rule => rule.presetLinks.length === 0);
    const presetsWithoutRules = conditionPresets.filter(preset => preset.alertRules.length === 0);

    console.log(`⚠️  Alert Rules without presets: ${rulesWithoutPresets.length}`);
    console.log(`⚠️  Presets without alert rules: ${presetsWithoutRules.length}`);

    if (rulesWithoutPresets.length > 0) {
      console.log('\n📋 Alert Rules needing preset links:');
      rulesWithoutPresets.forEach(rule => {
        console.log(`   - ${rule.name} (${rule.severity})`);
      });
    }

    // Step 2: Apply smart linking rules
    console.log('\n🔧 Step 2: Applying Smart Linking Rules');
    console.log('-'.repeat(40));

    let linksCreated = 0;
    const linkingResults = [];

    for (const linkingRule of alertRuleLinkingRules) {
      console.log(`\n🎯 ${linkingRule.name} (${linkingRule.priority} priority)`);
      console.log(`   ${linkingRule.description}`);

      // Find matching alert rules
      const matchingAlertRules = alertRules.filter(alertRule => {
        const alertNameLower = alertRule.name.toLowerCase();
        return linkingRule.alertPatterns.some(pattern => 
          alertNameLower.includes(pattern.toLowerCase())
        );
      });

      // Find matching condition presets
      const matchingPresets = conditionPresets.filter(preset => {
        const presetNameLower = preset.name.toLowerCase();
        return linkingRule.presetPatterns.some(pattern => {
          if (pattern === '.*') return true; // Match all for critical alerts
          return presetNameLower.includes(pattern.toLowerCase());
        });
      });

      if (matchingAlertRules.length > 0 && matchingPresets.length > 0) {
        console.log(`   📊 Found ${matchingAlertRules.length} alert rule(s) and ${matchingPresets.length} preset(s)`);

        // Create links
        for (const alertRule of matchingAlertRules) {
          for (const preset of matchingPresets) {
            // Check if link already exists
            const existingLink = await prisma.conditionPresetAlertRule.findFirst({
              where: {
                ruleId: alertRule.id,
                presetId: preset.id
              }
            });

            if (!existingLink) {
              await prisma.conditionPresetAlertRule.create({
                data: {
                  ruleId: alertRule.id,
                  presetId: preset.id
                }
              });

              console.log(`   ✅ Linked: ${alertRule.name} → ${preset.name}`);
              linksCreated++;
            }
          }
        }

        linkingResults.push({
          rule: linkingRule.name,
          alertRules: matchingAlertRules.length,
          presets: matchingPresets.length,
          priority: linkingRule.priority
        });
      } else {
        console.log(`   ⚠️  No matches found`);
      }
    }

    // Step 3: Handle remaining unlinked alert rules
    console.log('\n🔄 Step 3: Handling Remaining Unlinked Rules');
    console.log('-'.repeat(45));

    const stillUnlinkedRules = await prisma.alertRule.findMany({
      where: {
        presetLinks: { none: {} }
      }
    });

    if (stillUnlinkedRules.length > 0) {
      console.log(`📋 ${stillUnlinkedRules.length} alert rules still need preset links`);
      
      // Link to general/medication presets as fallback
      const fallbackPresets = conditionPresets.filter(preset => {
        const name = preset.name.toLowerCase();
        return name.includes('general') || name.includes('medication') || name.includes('daily');
      });

      if (fallbackPresets.length > 0) {
        console.log(`🔄 Linking to fallback presets: ${fallbackPresets.map(p => p.name).join(', ')}`);
        
        for (const alertRule of stillUnlinkedRules) {
          // Link to first fallback preset
          await prisma.conditionPresetAlertRule.create({
            data: {
              ruleId: alertRule.id,
              presetId: fallbackPresets[0].id
            }
          });
          
          console.log(`   ✅ ${alertRule.name} → ${fallbackPresets[0].name} (fallback)`);
          linksCreated++;
        }
      }
    }

    // Step 4: Final verification and summary
    console.log('\n✅ Step 4: Final Verification & Summary');
    console.log('-'.repeat(40));

    const finalAlertRules = await prisma.alertRule.findMany({
      include: {
        presetLinks: {
          include: {
            preset: { select: { name: true } }
          }
        }
      }
    });

    const finalPresets = await prisma.conditionPreset.findMany({
      include: {
        alertRules: {
          include: {
            rule: { select: { name: true, severity: true } }
          }
        }
      }
    });

    const finalLinkedRules = finalAlertRules.filter(rule => rule.presetLinks.length > 0);
    const finalLinkedPresets = finalPresets.filter(preset => preset.alertRules.length > 0);

    console.log(`📊 Configuration Results:`);
    console.log(`   🔗 Total links created: ${linksCreated}`);
    console.log(`   🚨 Alert rules with presets: ${finalLinkedRules.length}/${finalAlertRules.length}`);
    console.log(`   🏥 Presets with alert rules: ${finalLinkedPresets.length}/${finalPresets.length}`);

    const ruleCompletionRate = Math.round((finalLinkedRules.length / finalAlertRules.length) * 100);
    const presetCompletionRate = Math.round((finalLinkedPresets.length / finalPresets.length) * 100);

    console.log(`   📈 Alert Rule Coverage: ${ruleCompletionRate}%`);
    console.log(`   📈 Preset Coverage: ${presetCompletionRate}%`);

    // Show detailed results
    if (finalLinkedRules.length > 0) {
      console.log('\n📋 Alert Rules Successfully Configured:');
      finalLinkedRules.forEach(rule => {
        const presetCount = rule.presetLinks.length;
        const presetNames = rule.presetLinks.map(link => link.preset.name).join(', ');
        console.log(`   ✅ ${rule.name} (${rule.severity}): ${presetCount} preset(s)`);
        if (presetCount <= 3) { // Show preset names if not too many
          console.log(`      → ${presetNames}`);
        }
      });
    }

    // Show any remaining issues
    const stillUnlinked = finalAlertRules.filter(rule => rule.presetLinks.length === 0);
    if (stillUnlinked.length > 0) {
      console.log('\n⚠️  Alert Rules Still Needing Configuration:');
      stillUnlinked.forEach(rule => {
        console.log(`   - ${rule.name} (${rule.severity})`);
      });
    }

    // Success summary
    console.log('\n🎉 Alert Rule Configuration Complete!');
    console.log('=' .repeat(40));
    
    if (ruleCompletionRate >= 95) {
      console.log('✅ EXCELLENT: All alert rules properly configured');
    } else if (ruleCompletionRate >= 80) {
      console.log('✅ GOOD: Most alert rules configured successfully');
    } else {
      console.log('⚠️  PARTIAL: Some alert rules may need manual configuration');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Review alert rule configurations in the dashboard');
    console.log('   2. Test alert triggering with sample data');
    console.log('   3. Adjust thresholds and conditions as needed');
    console.log('   4. Monitor alert performance in production');

  } catch (error) {
    console.error('❌ Configuration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for potential use in other scripts
module.exports = {
  configureAlertRulePresets,
  alertRuleLinkingRules
};

// Run if called directly
if (require.main === module) {
  configureAlertRulePresets()
    .then(() => {
      console.log('\n✅ Alert rule configuration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Alert rule configuration failed:', error);
      process.exit(1);
    });
}