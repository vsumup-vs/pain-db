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

    // 4. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(40));

    if (standardizedTemplates.length === 0) {
      console.log('1. ⚠️  Run enhancement script to mark templates as standardized:');
      console.log('   node enhance-assessment-templates-fixed.js');
    }

    if (presets.length === 0) {
      console.log('2. ⚠️  Create condition presets:');
      console.log('   node seed-condition-presets.js');
    }

    const unlinkedStandardizedTemplates = standardizedTemplates.filter(t => t.presets.length === 0);
    if (unlinkedStandardizedTemplates.length > 0) {
      console.log('3. ⚠️  Link standardized templates to appropriate presets:');
      console.log('   node seed-preset-links.js');
    }

    const presetsWithoutTemplates = presets.filter(p => p.templates.length === 0);
    if (presetsWithoutTemplates.length > 0) {
      console.log('4. ⚠️  Some presets have no templates linked:');
      for (const preset of presetsWithoutTemplates) {
        console.log(`   - ${preset.name}`);
      }
    }

    // 5. Suggested preset-template mappings
    console.log('\n🎯 SUGGESTED PRESET-TEMPLATE MAPPINGS:');
    console.log('-'.repeat(40));

    const mappingSuggestions = [
      {
        presetPattern: /pain|fibromyalgia/i,
        templates: ['Brief Pain Inventory (BPI)', 'Fibromyalgia Impact Questionnaire (FIQ)']
      },
      {
        presetPattern: /mental|depression|anxiety/i,
        templates: ['Patient Health Questionnaire-9 (PHQ-9)', 'Generalized Anxiety Disorder-7 (GAD-7)']
      },
      {
        presetPattern: /diabetes/i,
        templates: ['Summary of Diabetes Self-Care Activities (SDSCA)']
      }
    ];

    for (const preset of presets) {
      const currentTemplateNames = preset.templates.map(t => t.template.name);
      
      for (const suggestion of mappingSuggestions) {
        if (suggestion.presetPattern.test(preset.name)) {
          const missingTemplates = suggestion.templates.filter(
            templateName => !currentTemplateNames.includes(templateName)
          );
          
          if (missingTemplates.length > 0) {
            console.log(`\n${preset.name} could benefit from:`);
            for (const templateName of missingTemplates) {
              console.log(`   + ${templateName}`);
            }
          }
        }
      }
    }

    console.log('\n✅ System status check completed!');

  } catch (error) {
    console.error('❌ Error checking system status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemStatus();