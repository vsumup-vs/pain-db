const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function checkSystemStatus() {
  try {
    console.log('🔍 COMPREHENSIVE SYSTEM STATUS CHECK');
    console.log('=' .repeat(60));

    // 1. Check Assessment Templates
    console.log('\n📄 ASSESSMENT TEMPLATES STATUS:');
    console.log('-'.repeat(40));

    const allTemplates = await prisma.assessmentTemplate.findMany({
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                displayName: true
              }
            }
          }
        },
        presets: {
          include: {
            preset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const standardizedTemplates = allTemplates.filter(t => t.isStandardized === true);
    const customTemplates = allTemplates.filter(t => t.isStandardized !== true);

    console.log(`Total Templates: ${allTemplates.length}`);
    console.log(`Standardized Templates: ${standardizedTemplates.length}`);
    console.log(`Custom Templates: ${customTemplates.length}`);

    if (standardizedTemplates.length > 0) {
      console.log('\n✅ Standardized Templates:');
      for (const template of standardizedTemplates) {
        const linkedPresets = template.presets.length;
        console.log(`   - ${template.name} (Category: ${template.category || 'None'}, Linked to ${linkedPresets} presets)`);
      }
    } else {
      console.log('\n❌ No standardized templates found - need to run enhancement script');
    }

    // 2. Check Condition Presets
    console.log('\n🏥 CONDITION PRESETS STATUS:');
    console.log('-'.repeat(40));

    const presets = await prisma.conditionPreset.findMany({
      include: {
        diagnoses: true,
        templates: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                isStandardized: true,
                category: true
              }
            }
          }
        },
        alertRules: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    console.log(`Total Condition Presets: ${presets.length}`);

    if (presets.length > 0) {
      console.log('\n📋 Condition Presets Details:');
      for (const preset of presets) {
        const standardizedCount = preset.templates.filter(t => t.template.isStandardized).length;
        const customCount = preset.templates.filter(t => !t.template.isStandardized).length;
        
        console.log(`\n   ${preset.name}:`);
        console.log(`     - Diagnoses: ${preset.diagnoses.length}`);
        console.log(`     - Templates: ${preset.templates.length} (${standardizedCount} standardized, ${customCount} custom)`);
        console.log(`     - Alert Rules: ${preset.alertRules.length}`);
        console.log(`     - Enrollments: ${preset._count.enrollments}`);
        
        if (preset.templates.length > 0) {
          console.log(`     - Linked Templates:`);
          for (const link of preset.templates) {
            const status = link.template.isStandardized ? '✅' : '❌';
            console.log(`       ${status} ${link.template.name}`);
          }
        }
      }
    } else {
      console.log('\n❌ No condition presets found - need to run seed script');
    }

    // 3. Check for missing links between standardized templates and presets
    console.log('\n🔗 STANDARDIZED TEMPLATE LINKAGE ANALYSIS:');
    console.log('-'.repeat(40));

    const expectedStandardizedTemplates = [
      'Brief Pain Inventory (BPI)',
      'Patient Health Questionnaire-9 (PHQ-9)',
      'Generalized Anxiety Disorder-7 (GAD-7)',
      'Fibromyalgia Impact Questionnaire (FIQ)',
      'Summary of Diabetes Self-Care Activities (SDSCA)'
    ];

    for (const expectedName of expectedStandardizedTemplates) {
      const template = standardizedTemplates.find(t => t.name === expectedName);
      if (template) {
        const linkedPresets = template.presets.length;
        if (linkedPresets === 0) {
          console.log(`⚠️  ${expectedName} - Not linked to any preset`);
        } else {
          console.log(`✅ ${expectedName} - Linked to ${linkedPresets} preset(s)`);
        }
      } else {
        console.log(`❌ ${expectedName} - Not found or not standardized`);
      }
    }

    // 4. Check Metric Definitions
    console.log('\n📊 METRIC DEFINITIONS STATUS:');
    console.log('-'.repeat(40));

    const metrics = await prisma.metricDefinition.findMany();
    console.log(`Total Metric Definitions: ${metrics.length}`);

    // 5. Check Alert Rules
    console.log('\n🚨 ALERT RULES STATUS:');
    console.log('-'.repeat(40));

    const alertRules = await prisma.alertRule.findMany();
    console.log(`Total Alert Rules: ${alertRules.length}`);

    // 6. RTM Compliance Score
    console.log('\n🎯 RTM COMPLIANCE SCORE:');
    console.log('-'.repeat(40));

    const totalComponents = 7; // Templates, Presets, Metrics, Alerts, Links, etc.
    let score = 0;

    if (allTemplates.length >= 10) score += 1;
    if (standardizedTemplates.length >= 5) score += 1;
    if (presets.length >= 8) score += 1;
    if (metrics.length >= 25) score += 1;
    if (alertRules.length >= 10) score += 1;
    
    const linkedTemplates = standardizedTemplates.filter(t => t.presets.length > 0).length;
    if (linkedTemplates >= 3) score += 1;
    
    const presetsWithTemplates = presets.filter(p => p.templates.length > 0).length;
    if (presetsWithTemplates >= 5) score += 1;

    const compliancePercentage = Math.round((score / totalComponents) * 100);
    console.log(`RTM Compliance Score: ${score}/${totalComponents} (${compliancePercentage}%)`);

    if (compliancePercentage >= 80) {
      console.log('🎉 Excellent RTM compliance!');
    } else if (compliancePercentage >= 60) {
      console.log('✅ Good RTM compliance - minor improvements needed');
    } else {
      console.log('⚠️  RTM compliance needs improvement');
    }

    console.log('\n✅ System status check completed!');

  } catch (error) {
    console.error('❌ Error checking system status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemStatus();