const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function linkPresetsToTemplatesAndAlerts() {
  try {
    console.log('Linking condition presets to templates and alert rules...');
    
    // Get all presets
    const presets = await prisma.conditionPreset.findMany();
    
    // Get relevant templates
    const templates = await prisma.assessmentTemplate.findMany({
      where: {
        name: {
          in: [
            'Daily Pain Assessment',
            'Weekly Pain Review',
            'Daily Medication Assessment',
            'PRN Medication Assessment',
            'Medication Side Effects Assessment'
          ]
        }
      }
    });
    
    // Get medication alert rules
    const alertRules = await prisma.alertRule.findMany({
      where: {
        name: {
          in: [
            'Medication Non-Adherence',
            'Severe Medication Side Effects',
            'Medication Ineffectiveness',
            'Missed Medication Doses'
          ]
        }
      }
    });
    
    // Link presets to templates and alerts
    for (const preset of presets) {
      console.log(`\nLinking preset: ${preset.name}`);
      
      if (preset.name.includes('Pain')) {
        // Link pain-related templates
        const painTemplates = templates.filter(t => 
          t.name.includes('Pain') || t.name.includes('Daily')
        );
        
        for (const template of painTemplates) {
          const existingLink = await prisma.conditionPresetTemplate.findFirst({
            where: {
              presetId: preset.id,
              templateId: template.id
            }
          });
          
          if (!existingLink) {
            await prisma.conditionPresetTemplate.create({
              data: {
                presetId: preset.id,
                templateId: template.id
              }
            });
            console.log(`  - Linked template: ${template.name}`);
          }
        }
      }
      
      if (preset.name.includes('Medication') || preset.name.includes('Opioid')) {
        // Link medication-related templates
        const medicationTemplates = templates.filter(t => 
          t.name.includes('Medication') || t.name.includes('Daily')
        );
        
        for (const template of medicationTemplates) {
          const existingLink = await prisma.conditionPresetTemplate.findFirst({
            where: {
              presetId: preset.id,
              templateId: template.id
            }
          });
          
          if (!existingLink) {
            await prisma.conditionPresetTemplate.create({
              data: {
                presetId: preset.id,
                templateId: template.id
              }
            });
            console.log(`  - Linked template: ${template.name}`);
          }
        }
        
        // Link medication alert rules
        for (const alertRule of alertRules) {
          const existingLink = await prisma.conditionPresetAlertRule.findFirst({
            where: {
              presetId: preset.id,
              ruleId: alertRule.id
            }
          });
          
          if (!existingLink) {
            await prisma.conditionPresetAlertRule.create({
              data: {
                presetId: preset.id,
                ruleId: alertRule.id
              }
            });
            console.log(`  - Linked alert rule: ${alertRule.name}`);
          }
        }
      }
    }
    
    console.log('\nPreset linking completed!');
  } catch (error) {
    console.error('Error linking presets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkPresetsToTemplatesAndAlerts();