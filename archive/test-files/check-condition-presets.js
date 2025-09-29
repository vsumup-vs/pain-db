const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function checkConditionPresets() {
  try {
    console.log('🏥 CONDITION PRESETS STATUS CHECK');
    console.log('=' .repeat(50));

    // 1. Check total condition presets
    const totalPresets = await prisma.conditionPreset.count();
    console.log(`\n📊 Total Condition Presets: ${totalPresets}`);

    // 2. Get all condition presets with their relationships
    const presets = await prisma.conditionPreset.findMany({
      include: {
        diagnoses: true,
        templates: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                isStandardized: true,
                category: true
              }
            }
          }
        },
        alertRules: {
          include: {
            rule: {
              select: {
                id: true,
                name: true,
                severity: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    console.log('\n🔍 DETAILED CONDITION PRESETS:');
    console.log('-'.repeat(50));

    for (const preset of presets) {
      console.log(`\n📋 ${preset.name}`);
      console.log(`   ID: ${preset.id}`);
      console.log(`   Description: ${preset.description || 'No description'}`);
      console.log(`   Enrollments: ${preset._count.enrollments}`);
      
      // Diagnoses
      console.log(`   📝 Diagnoses (${preset.diagnoses.length}):`);
      for (const diagnosis of preset.diagnoses) {
        console.log(`      - ${diagnosis.label} (ICD-10: ${diagnosis.icd10}, SNOMED: ${diagnosis.snomed})`);
      }
      
      // Linked Templates
      console.log(`   📄 Linked Templates (${preset.templates.length}):`);
      for (const link of preset.templates) {
        const template = link.template;
        const standardizedStatus = template.isStandardized ? '✅ Standardized' : '❌ Custom';
        const category = template.category || 'No category';
        console.log(`      - ${template.name} (${standardizedStatus}, Category: ${category})`);
      }
      
      // Alert Rules
      console.log(`   🚨 Alert Rules (${preset.alertRules.length}):`);
      for (const alertRule of preset.alertRules) {
        console.log(`      - ${alertRule.rule.name} (${alertRule.rule.severity})`);
      }
    }

    // 3. Check for standardized templates not linked to any preset
    console.log('\n🔍 STANDARDIZED TEMPLATES NOT LINKED TO PRESETS:');
    console.log('-'.repeat(50));

    const standardizedTemplates = await prisma.assessmentTemplate.findMany({
      where: {
        isStandardized: true
      },
      include: {
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

    const unlinkedStandardizedTemplates = standardizedTemplates.filter(
      template => template.presets.length === 0
    );

    if (unlinkedStandardizedTemplates.length > 0) {
      console.log(`\n⚠️  Found ${unlinkedStandardizedTemplates.length} standardized templates not linked to any preset:`);
      for (const template of unlinkedStandardizedTemplates) {
        console.log(`   - ${template.name} (Category: ${template.category || 'No category'})`);
      }
    } else {
      console.log('\n✅ All standardized templates are linked to condition presets');
    }

    // 4. Check preset-template compatibility
    console.log('\n🔍 PRESET-TEMPLATE COMPATIBILITY ANALYSIS:');
    console.log('-'.repeat(50));

    for (const preset of presets) {
      console.log(`\n📋 ${preset.name}:`);
      
      // Suggest standardized templates that might be relevant
      const relevantStandardizedTemplates = standardizedTemplates.filter(template => {
        const presetName = preset.name.toLowerCase();
        const templateName = template.name.toLowerCase();
        const templateCategory = (template.category || '').toLowerCase();
        
        // Check for pain-related presets
        if (presetName.includes('pain') || presetName.includes('fibromyalgia')) {
          return templateName.includes('pain') || templateCategory.includes('pain') || 
                 templateName.includes('bpi') || templateName.includes('fiq');
        }
        
        // Check for mental health presets
        if (presetName.includes('mental') || presetName.includes('depression') || presetName.includes('anxiety')) {
          return templateCategory.includes('mental') || templateName.includes('phq') || templateName.includes('gad');
        }
        
        // Check for diabetes presets
        if (presetName.includes('diabetes')) {
          return templateName.includes('diabetes') || templateName.includes('sdsca');
        }
        
        return false;
      });

      const currentTemplateIds = preset.templates.map(t => t.template.id);
      const suggestedTemplates = relevantStandardizedTemplates.filter(
        template => !currentTemplateIds.includes(template.id)
      );

      if (suggestedTemplates.length > 0) {
        console.log(`   💡 Suggested standardized templates to add:`);
        for (const template of suggestedTemplates) {
          console.log(`      - ${template.name} (${template.category || 'No category'})`);
        }
      } else {
        console.log(`   ✅ No additional standardized templates suggested`);
      }
    }

    // 5. Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('-'.repeat(50));
    
    const presetsWithStandardizedTemplates = presets.filter(preset => 
      preset.templates.some(t => t.template.isStandardized)
    ).length;
    
    const presetsWithCustomTemplatesOnly = presets.filter(preset => 
      preset.templates.length > 0 && preset.templates.every(t => !t.template.isStandardized)
    ).length;
    
    const presetsWithNoTemplates = presets.filter(preset => 
      preset.templates.length === 0
    ).length;

    console.log(`Total Condition Presets: ${totalPresets}`);
    console.log(`Presets with Standardized Templates: ${presetsWithStandardizedTemplates}`);
    console.log(`Presets with Custom Templates Only: ${presetsWithCustomTemplatesOnly}`);
    console.log(`Presets with No Templates: ${presetsWithNoTemplates}`);
    console.log(`Total Standardized Templates: ${standardizedTemplates.length}`);
    console.log(`Unlinked Standardized Templates: ${unlinkedStandardizedTemplates.length}`);

  } catch (error) {
    console.error('❌ Error checking condition presets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConditionPresets();