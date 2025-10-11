const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveRTMSystemFix() {
  try {
    console.log('🏥 Comprehensive RTM System Fix & Verification');
    console.log('==============================================\n');
    
    // Step 1: Verify and fix database schema consistency
    console.log('📊 Step 1: Database Schema Verification...');
    
    // Check if all required models exist and are accessible
    const schemaCheck = {
      metricDefinitions: 0,
      assessmentTemplates: 0,
      assessmentTemplateItems: 0,
      alertRules: 0,
      conditionPresets: 0,
      conditionPresetDiagnoses: 0,
      conditionPresetTemplates: 0,
      conditionPresetAlertRules: 0
    };
    
    try {
      schemaCheck.metricDefinitions = await prisma.metric_definitions.count();
      schemaCheck.assessmentTemplates = await prisma.assessment_templates.count();
      schemaCheck.assessmentTemplateItems = await prisma.assessment_template_items.count();
      schemaCheck.alertRules = await prisma.alert_rules.count();
      schemaCheck.conditionPresets = await prisma.condition_presets.count();
      schemaCheck.conditionPresetDiagnoses = await prisma.condition_preset_diagnoses.count();
      schemaCheck.conditionPresetTemplates = await prisma.condition_preset_templates.count();
      schemaCheck.conditionPresetAlertRules = await prisma.condition_preset_alert_rules.count();
      
      console.log('   ✅ Schema verification successful');
      console.log(`   📊 Current counts: ${JSON.stringify(schemaCheck, null, 6)}`);
    } catch (error) {
      console.log('   ❌ Schema access error:', error.message);
      console.log('   🔧 This indicates controller naming mismatch issues');
    }
    
    // Step 2: Run the comprehensive RTM setup
    console.log('\n🚀 Step 2: Running Enhanced RTM Comprehensive Setup...');
    
    try {
      // Import and run the comprehensive setup
      const { enhancedRTMComprehensiveSetup } = require('./enhanced-rtm-comprehensive-setup.js');
      const setupResults = await enhancedRTMComprehensiveSetup();
      
      console.log('   ✅ Enhanced RTM setup completed successfully');
      console.log(`   📊 Setup results: ${JSON.stringify(setupResults, null, 6)}`);
    } catch (error) {
      console.log('   ❌ Enhanced RTM setup failed:', error.message);
      console.log('   🔧 Attempting manual component setup...');
      
      // Manual setup fallback
      await manualRTMComponentSetup();
    }
    
    // Step 3: Verify controller compatibility
    console.log('\n🔧 Step 3: Controller Compatibility Check...');
    
    const controllerTests = [
      {
        name: 'Assessment Templates Controller',
        test: async () => {
          const templates = await prisma.assessment_templates.findMany({
            include: {
              assessment_template_items: {
                include: {
                  metric_definitions: true
                }
              }
            },
            take: 1
          });
          return templates.length > 0;
        }
      },
      {
        name: 'Condition Presets Controller',
        test: async () => {
          const presets = await prisma.condition_presets.findMany({
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
          return presets.length > 0;
        }
      },
      {
        name: 'Metric Definitions Access',
        test: async () => {
          const metrics = await prisma.metric_definitions.findMany({ take: 1 });
          return metrics.length > 0;
        }
      },
      {
        name: 'Alert Rules Access',
        test: async () => {
          const rules = await prisma.alert_rules.findMany({ take: 1 });
          return rules.length > 0;
        }
      }
    ];
    
    for (const test of controllerTests) {
      try {
        const result = await test.test();
        console.log(`   ${result ? '✅' : '❌'} ${test.name}: ${result ? 'Working' : 'Failed'}`);
      } catch (error) {
        console.log(`   ❌ ${test.name}: Error - ${error.message}`);
      }
    }
    
    // Step 4: API Endpoint Testing
    console.log('\n🌐 Step 4: API Endpoint Simulation...');
    
    const apiTests = [
      {
        name: 'GET /assessment-templates',
        test: async () => {
          const templates = await prisma.assessment_templates.findMany({
            include: {
              assessment_template_items: {
                include: {
                  metric_definitions: true
                }
              }
            }
          });
          return { count: templates.length, sample: templates[0]?.name };
        }
      },
      {
        name: 'GET /condition-presets',
        test: async () => {
          const presets = await prisma.condition_presets.findMany({
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
              },
              _count: {
                select: {
                  enrollments: true
                }
              }
            }
          });
          return { count: presets.length, sample: presets[0]?.name };
        }
      },
      {
        name: 'GET /metric-definitions',
        test: async () => {
          const metrics = await prisma.metric_definitions.findMany();
          return { count: metrics.length, sample: metrics[0]?.displayName };
        }
      },
      {
        name: 'GET /alert-rules',
        test: async () => {
          const rules = await prisma.alert_rules.findMany({
            include: {
              condition_preset_alert_rules: {
                include: {
                  condition_presets: true
                }
              }
            }
          });
          return { count: rules.length, sample: rules[0]?.name };
        }
      }
    ];
    
    for (const test of apiTests) {
      try {
        const result = await test.test();
        console.log(`   ✅ ${test.name}: ${result.count} items (Sample: ${result.sample || 'N/A'})`);
      } catch (error) {
        console.log(`   ❌ ${test.name}: Error - ${error.message}`);
      }
    }
    
    // Step 5: RTM Compliance Verification
    console.log('\n🏆 Step 5: RTM Compliance Verification...');
    
    const complianceChecks = [
      {
        name: 'Metric Definitions (30+ required)',
        check: async () => {
          const count = await prisma.metric_definitions.count();
          return { status: count >= 30, value: count, target: 30 };
        }
      },
      {
        name: 'Assessment Templates (12+ required)',
        check: async () => {
          const count = await prisma.assessment_templates.count();
          return { status: count >= 12, value: count, target: 12 };
        }
      },
      {
        name: 'Alert Rules (11+ required)',
        check: async () => {
          const count = await prisma.alert_rules.count();
          return { status: count >= 11, value: count, target: 11 };
        }
      },
      {
        name: 'Condition Presets (10+ required)',
        check: async () => {
          const count = await prisma.condition_presets.count();
          return { status: count >= 10, value: count, target: 10 };
        }
      },
      {
        name: 'Template-Preset Linking',
        check: async () => {
          const count = await prisma.condition_preset_templates.count();
          return { status: count >= 10, value: count, target: 10 };
        }
      },
      {
        name: 'Alert-Preset Linking',
        check: async () => {
          const count = await prisma.condition_preset_alert_rules.count();
          return { status: count >= 20, value: count, target: 20 };
        }
      }
    ];
    
    let complianceScore = 0;
    for (const check of complianceChecks) {
      try {
        const result = await check.check();
        const status = result.status ? '✅' : '❌';
        console.log(`   ${status} ${check.name}: ${result.value}/${result.target}`);
        if (result.status) complianceScore++;
      } catch (error) {
        console.log(`   ❌ ${check.name}: Error - ${error.message}`);
      }
    }
    
    const compliancePercentage = Math.round((complianceScore / complianceChecks.length) * 100);
    console.log(`\n   🎯 RTM Compliance Score: ${complianceScore}/${complianceChecks.length} (${compliancePercentage}%)`);
    
    // Step 6: Generate Fix Recommendations
    console.log('\n💡 Step 6: Fix Recommendations...');
    
    if (compliancePercentage < 100) {
      console.log('   🔧 Recommended Actions:');
      
      if (complianceScore < 4) {
        console.log('   1. Run: node enhanced-rtm-comprehensive-setup.js');
        console.log('   2. Run: npx prisma generate');
        console.log('   3. Restart your server');
      }
      
      console.log('   4. Run: node configure-alert-rule-presets.js');
      console.log('   5. Verify API endpoints are working');
      console.log('   6. Test frontend dashboard functionality');
    } else {
      console.log('   🎉 System is fully RTM compliant!');
      console.log('   ✅ All components are properly configured');
      console.log('   ✅ API endpoints should be working');
      console.log('   ✅ Ready for production use');
    }
    
    // Step 7: Final System Status
    console.log('\n📋 Step 7: Final System Status...');
    
    const finalCounts = {
      metrics: await prisma.metric_definitions.count(),
      templates: await prisma.assessment_templates.count(),
      templateItems: await prisma.assessment_template_items.count(),
      alertRules: await prisma.alert_rules.count(),
      conditionPresets: await prisma.condition_presets.count(),
      presetDiagnoses: await prisma.condition_preset_diagnoses.count(),
      presetTemplates: await prisma.condition_preset_templates.count(),
      presetAlertRules: await prisma.condition_preset_alert_rules.count()
    };
    
    console.log('\n🎉 Comprehensive RTM System Fix Complete!');
    console.log('==========================================');
    console.log(`📊 Metric Definitions: ${finalCounts.metrics}`);
    console.log(`📋 Assessment Templates: ${finalCounts.templates}`);
    console.log(`🔗 Template Items: ${finalCounts.templateItems}`);
    console.log(`🚨 Alert Rules: ${finalCounts.alertRules}`);
    console.log(`🏥 Condition Presets: ${finalCounts.conditionPresets}`);
    console.log(`🔬 Preset Diagnoses: ${finalCounts.presetDiagnoses}`);
    console.log(`📋 Preset-Template Links: ${finalCounts.presetTemplates}`);
    console.log(`🚨 Preset-Alert Links: ${finalCounts.presetAlertRules}`);
    console.log(`\n🏆 RTM Compliance: ${compliancePercentage}%`);
    
    return {
      complianceScore: compliancePercentage,
      finalCounts,
      recommendations: compliancePercentage < 100 ? 'Run additional setup scripts' : 'System ready for production'
    };
    
  } catch (error) {
    console.error('❌ Comprehensive RTM System Fix Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function manualRTMComponentSetup() {
  console.log('   🔧 Running manual RTM component setup...');
  
  try {
    // Basic metric definitions
    const basicMetrics = [
      {
        key: 'pain_scale_0_10',
        displayName: 'Pain Scale (0-10)',
        description: 'Numeric pain rating scale from 0 (no pain) to 10 (worst pain)',
        dataType: 'integer',
        unit: 'scale',
        normalRange: { min: 0, max: 3 },
        loinc: '72514-3',
        snomed: '225908003'
      },
      {
        key: 'phq9_total_score',
        displayName: 'PHQ-9 Total Score',
        description: 'Patient Health Questionnaire-9 depression screening total score',
        dataType: 'integer',
        unit: 'score',
        normalRange: { min: 0, max: 4 },
        loinc: '44249-1',
        snomed: '273724008'
      }
    ];
    
    for (const metric of basicMetrics) {
      await prisma.metric_definitions.upsert({
        where: { key: metric.key },
        update: metric,
        create: metric
      });
    }
    
    console.log('   ✅ Basic metrics created');
    
    // Basic assessment template
    const basicTemplate = await prisma.assessment_templates.upsert({
      where: { name: 'Basic Pain Assessment' },
      update: {
        description: 'Basic pain assessment for RTM compliance',
        isStandardized: true
      },
      create: {
        name: 'Basic Pain Assessment',
        description: 'Basic pain assessment for RTM compliance',
        isStandardized: true
      }
    });
    
    console.log('   ✅ Basic template created');
    
    // Basic condition preset
    await prisma.condition_presets.upsert({
      where: { name: 'Basic Pain Management' },
      update: {
        description: 'Basic pain management preset for RTM compliance',
        isActive: true,
        isStandardized: true
      },
      create: {
        name: 'Basic Pain Management',
        description: 'Basic pain management preset for RTM compliance',
        isActive: true,
        isStandardized: true
      }
    });
    
    console.log('   ✅ Basic preset created');
    console.log('   ✅ Manual setup completed');
    
  } catch (error) {
    console.log('   ❌ Manual setup failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  comprehensiveRTMSystemFix()
    .catch(console.error);
}

module.exports = { comprehensiveRTMSystemFix };