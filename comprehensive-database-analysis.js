const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveDatabaseAnalysis() {
  console.log('🔍 COMPREHENSIVE DATABASE ANALYSIS');
  console.log('=====================================\n');

  try {
    // Step 1: Schema Model Analysis
    console.log('📋 Step 1: Schema Model Analysis');
    console.log('-'.repeat(40));
    
    const models = [
      'metric_definitions',
      'assessment_templates', 
      'assessment_template_items',
      'alert_rules',
      'condition_presets',
      'condition_preset_diagnoses',
      'condition_preset_templates',
      'condition_preset_alert_rules'
    ];

    const modelCounts = {};
    for (const model of models) {
      try {
        const count = await prisma[model].count();
        modelCounts[model] = count;
        console.log(`✅ ${model}: ${count} records`);
      } catch (error) {
        console.log(`❌ ${model}: ERROR - ${error.message}`);
        modelCounts[model] = 'ERROR';
      }
    }

    // Step 2: Controller Naming Analysis
    console.log('\n🎯 Step 2: Controller vs Schema Naming Analysis');
    console.log('-'.repeat(50));

    // Test different naming patterns
    const namingTests = [
      {
        name: 'MetricDefinition (camelCase)',
        test: async () => await prisma.metricDefinition.findFirst()
      },
      {
        name: 'metric_definitions (snake_case)',
        test: async () => await prisma.metric_definitions.findFirst()
      },
      {
        name: 'AssessmentTemplate (camelCase)',
        test: async () => await prisma.assessmentTemplate.findFirst()
      },
      {
        name: 'assessment_templates (snake_case)',
        test: async () => await prisma.assessment_templates.findFirst()
      },
      {
        name: 'AlertRule (camelCase)',
        test: async () => await prisma.alertRule.findFirst()
      },
      {
        name: 'alert_rules (snake_case)',
        test: async () => await prisma.alert_rules.findFirst()
      },
      {
        name: 'ConditionPreset (camelCase)',
        test: async () => await prisma.conditionPreset.findFirst()
      },
      {
        name: 'condition_presets (snake_case)',
        test: async () => await prisma.condition_presets.findFirst()
      }
    ];

    for (const test of namingTests) {
      try {
        await test.test();
        console.log(`✅ ${test.name}: Accessible`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message.split('\n')[0]}`);
      }
    }

    // Step 3: Relationship Analysis
    console.log('\n🔗 Step 3: Relationship Analysis');
    console.log('-'.repeat(35));

    const relationshipTests = [
      {
        name: 'Assessment Template Items → Metric Definitions',
        test: async () => {
          const result = await prisma.assessment_template_items.findFirst({
            include: {
              metric_definitions: true
            }
          });
          return result ? 'Working' : 'No data';
        }
      },
      {
        name: 'Condition Presets → Diagnoses',
        test: async () => {
          const result = await prisma.condition_presets.findFirst({
            include: {
              condition_preset_diagnoses: true
            }
          });
          return result ? `Working (${result.condition_preset_diagnoses?.length || 0} diagnoses)` : 'No data';
        }
      },
      {
        name: 'Condition Presets → Templates',
        test: async () => {
          const result = await prisma.condition_presets.findFirst({
            include: {
              condition_preset_templates: {
                include: {
                  assessment_templates: true
                }
              }
            }
          });
          return result ? `Working (${result.condition_preset_templates?.length || 0} templates)` : 'No data';
        }
      },
      {
        name: 'Condition Presets → Alert Rules',
        test: async () => {
          const result = await prisma.condition_presets.findFirst({
            include: {
              condition_preset_alert_rules: {
                include: {
                  alert_rules: true
                }
              }
            }
          });
          return result ? `Working (${result.condition_preset_alert_rules?.length || 0} alert rules)` : 'No data';
        }
      }
    ];

    for (const test of relationshipTests) {
      try {
        const result = await test.test();
        console.log(`✅ ${test.name}: ${result}`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message.split('\n')[0]}`);
      }
    }

    // Step 4: Controller Compatibility Test
    console.log('\n🎮 Step 4: Controller Compatibility Test');
    console.log('-'.repeat(40));

    // Test actual controller queries
    const controllerTests = [
      {
        name: 'MetricDefinitionController Query',
        test: async () => {
          // This mimics what metricDefinitionController.js does
          const result = await prisma.metricDefinition.findMany({
            take: 1
          });
          return `Found ${result.length} metrics`;
        }
      },
      {
        name: 'AlertRuleController Query',
        test: async () => {
          // This mimics what alertRuleController.js does
          const result = await prisma.alertRule.findMany({
            include: {
              presetLinks: {
                include: {
                  preset: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            },
            take: 1
          });
          return `Found ${result.length} alert rules`;
        }
      },
      {
        name: 'AssessmentTemplateController Query',
        test: async () => {
          // This mimics what assessmentTemplateController.js does
          const result = await prisma.assessment_templates.findMany({
            include: {
              condition_preset_templates: {
                include: {
                  condition_presets: {
                    select: {
                      id: true,
                      name: true,
                      isStandardized: true
                    }
                  }
                }
              }
            },
            take: 1
          });
          return `Found ${result.length} templates`;
        }
      },
      {
        name: 'ConditionPresetController Query',
        test: async () => {
          // This mimics what conditionPresetController.js does
          const result = await prisma.condition_presets.findMany({
            include: {
              condition_preset_diagnoses: true,
              condition_preset_templates: {
                include: {
                  assessment_templates: true
                }
              },
              condition_preset_alert_rules: {
                include: {
                  alert_rules: true
                }
              }
            },
            take: 1
          });
          return `Found ${result.length} presets`;
        }
      }
    ];

    for (const test of controllerTests) {
      try {
        const result = await test.test();
        console.log(`✅ ${test.name}: ${result}`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message.split('\n')[0]}`);
      }
    }

    // Step 5: Data Integrity Check
    console.log('\n🔍 Step 5: Data Integrity Check');
    console.log('-'.repeat(32));

    try {
      // Check for orphaned records
      const templateItems = await prisma.assessment_template_items.count();
      const templatesWithItems = await prisma.assessment_templates.count({
        where: {
          assessment_template_items: {
            some: {}
          }
        }
      });

      const presetTemplates = await prisma.condition_preset_templates.count();
      const presetsWithTemplates = await prisma.condition_presets.count({
        where: {
          condition_preset_templates: {
            some: {}
          }
        }
      });

      console.log(`📊 Template Items: ${templateItems} total`);
      console.log(`📋 Templates with Items: ${templatesWithItems}`);
      console.log(`🔗 Preset-Template Links: ${presetTemplates}`);
      console.log(`🏥 Presets with Templates: ${presetsWithTemplates}`);

    } catch (error) {
      console.log(`❌ Data integrity check failed: ${error.message}`);
    }

    // Step 6: RTM Compliance Summary
    console.log('\n🏆 Step 6: RTM Compliance Summary');
    console.log('-'.repeat(35));

    const complianceTargets = {
      'Metric Definitions': { target: 30, current: modelCounts.metric_definitions },
      'Assessment Templates': { target: 12, current: modelCounts.assessment_templates },
      'Alert Rules': { target: 11, current: modelCounts.alert_rules },
      'Condition Presets': { target: 10, current: modelCounts.condition_presets }
    };

    let totalScore = 0;
    let maxScore = 0;

    for (const [component, data] of Object.entries(complianceTargets)) {
      const current = typeof data.current === 'number' ? data.current : 0;
      const score = current >= data.target ? 1 : current / data.target;
      totalScore += score;
      maxScore += 1;

      const status = current >= data.target ? '✅' : '⚠️';
      console.log(`${status} ${component}: ${current}/${data.target} (${Math.round(score * 100)}%)`);
    }

    const overallCompliance = Math.round((totalScore / maxScore) * 100);
    console.log(`\n🎯 Overall RTM Compliance: ${overallCompliance}%`);

    // Step 7: Recommendations
    console.log('\n💡 Step 7: Recommendations');
    console.log('-'.repeat(28));

    const issues = [];
    
    if (modelCounts.metric_definitions === 'ERROR') {
      issues.push('❌ MetricDefinition model access issue - check controller naming');
    }
    if (modelCounts.alert_rules === 'ERROR') {
      issues.push('❌ AlertRule model access issue - check controller naming');
    }
    if (typeof modelCounts.metric_definitions === 'number' && modelCounts.metric_definitions < 30) {
      issues.push('⚠️ Insufficient metric definitions for RTM compliance');
    }
    if (typeof modelCounts.assessment_templates === 'number' && modelCounts.assessment_templates < 12) {
      issues.push('⚠️ Insufficient assessment templates for RTM compliance');
    }

    if (issues.length === 0) {
      console.log('✅ No critical issues found!');
    } else {
      issues.forEach(issue => console.log(issue));
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Fix controller naming mismatches');
    console.log('2. Run enhanced RTM setup if data is missing');
    console.log('3. Verify API endpoints after fixes');
    console.log('4. Test full RTM workflow');

    return {
      modelCounts,
      overallCompliance,
      issues: issues.length,
      recommendations: issues
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { comprehensiveDatabaseAnalysis };

// Run if called directly
if (require.main === module) {
  comprehensiveDatabaseAnalysis()
    .then(results => {
      console.log('\n📊 Analysis Complete!');
      console.log(`Compliance: ${results.overallCompliance}%`);
      console.log(`Issues Found: ${results.issues}`);
    })
    .catch(console.error);
}