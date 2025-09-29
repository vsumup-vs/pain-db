const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

// Import the standardized data from the existing script
const { 
  standardizedAssessmentTemplates, 
  standardizedMetricDefinitions 
} = require('./create-standardized-assessment-templates.js');

async function comprehensiveStandardizedSetup() {
  try {
    console.log('🏥 Comprehensive Standardized Assessment Setup');
    console.log('==============================================\n');
    
    // Step 1: Check current status (no destructive cleaning)
    console.log('📊 Step 1: Checking Current Status...');
    const existingTemplates = await prisma.assessmentTemplate.findMany({
      select: { name: true, isStandardized: true }
    });
    
    const existingStandardized = existingTemplates.filter(t => t.isStandardized);
    const existingCustom = existingTemplates.filter(t => !t.isStandardized);
    
    console.log(`   📋 Total templates: ${existingTemplates.length}`);
    console.log(`   🏆 Standardized: ${existingStandardized.length}`);
    console.log(`   🛠️  Custom: ${existingCustom.length}\n`);
    
    // Step 2: Create/Update Metric Definitions
    console.log('📊 Step 2: Creating Standardized Metric Definitions...');
    const createdMetrics = {};
    
    for (const metric of standardizedMetricDefinitions) {
      const existingMetric = await prisma.metricDefinition.findFirst({
        where: { key: metric.key }
      });

      if (!existingMetric) {
        const created = await prisma.metricDefinition.create({
          data: {
            key: metric.key,
            displayName: metric.displayName,
            valueType: metric.valueType,
            scaleMin: metric.scaleMin,
            scaleMax: metric.scaleMax,
            unit: metric.unit,
            decimalPrecision: metric.decimalPrecision,
            defaultFrequency: metric.defaultFrequency,
            coding: metric.coding,
            options: metric.options,
            validation: metric.validation
          }
        });
        createdMetrics[metric.key] = created;
        console.log(`   ✅ Created metric: ${metric.displayName}`);
      } else {
        createdMetrics[metric.key] = existingMetric;
        console.log(`   ⏭️  Metric exists: ${metric.displayName}`);
      }
    }
    
    console.log(`\n📋 Step 3: Creating Standardized Assessment Templates...`);
    const createdTemplates = [];
    
    for (const templateData of standardizedAssessmentTemplates) {
      // Check if template already exists
      const existingTemplate = await prisma.assessmentTemplate.findFirst({
        where: { name: templateData.name }
      });
      
      if (existingTemplate) {
        // Update existing template to ensure it's properly standardized
        const updatedTemplate = await prisma.assessmentTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            description: templateData.description,
            category: templateData.category,
            isStandardized: true,
            validationInfo: templateData.validationInfo,
            standardCoding: templateData.standardCoding,
            scoringInfo: templateData.scoringInfo,
            copyrightInfo: templateData.validationInfo?.copyrightInfo,
            clinicalUse: templateData.validationInfo?.clinicalUse
          }
        });
        
        // Check and create missing template items
        const existingItems = await prisma.assessmentTemplateItem.findMany({
          where: { templateId: existingTemplate.id }
        });
        
        let itemsCreated = 0;
        for (const item of templateData.items) {
          const metric = createdMetrics[item.metricKey];
          if (metric) {
            const existingItem = existingItems.find(ei => ei.metricDefinitionId === metric.id);
            if (!existingItem) {
              await prisma.assessmentTemplateItem.create({
                data: {
                  templateId: existingTemplate.id,
                  metricDefinitionId: metric.id,
                  required: item.required,
                  displayOrder: item.displayOrder,
                  helpText: item.question
                }
              });
              itemsCreated++;
            }
          }
        }
        
        createdTemplates.push(updatedTemplate);
        console.log(`   🔄 Updated template: ${templateData.name} (${itemsCreated} new items)`);
      } else {
        // Create new template
        const template = await prisma.assessmentTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            category: templateData.category,
            isStandardized: true,
            validationInfo: templateData.validationInfo,
            standardCoding: templateData.standardCoding,
            scoringInfo: templateData.scoringInfo,
            copyrightInfo: templateData.validationInfo?.copyrightInfo,
            clinicalUse: templateData.validationInfo?.clinicalUse
          }
        });
        
        // Create template items
        let itemsCreated = 0;
        for (const item of templateData.items) {
          const metric = createdMetrics[item.metricKey];
          if (metric) {
            await prisma.assessmentTemplateItem.create({
              data: {
                templateId: template.id,
                metricDefinitionId: metric.id,
                required: item.required,
                displayOrder: item.displayOrder,
                helpText: item.question
              }
            });
            itemsCreated++;
          } else {
            console.log(`   ⚠️  Warning: Metric ${item.metricKey} not found for ${templateData.name}`);
          }
        }
        
        createdTemplates.push(template);
        console.log(`   ✅ Created template: ${templateData.name} (${itemsCreated}/${templateData.items.length} items)`);
      }
      
      // Display validation info
      if (templateData.validationInfo) {
        console.log(`      📚 Instrument: ${templateData.validationInfo.instrument}`);
        if (templateData.validationInfo.sensitivity) {
          console.log(`      🎯 Sensitivity: ${templateData.validationInfo.sensitivity}, Specificity: ${templateData.validationInfo.specificity}`);
        }
        console.log(`      🏥 Clinical Use: ${templateData.validationInfo.clinicalUse}`);
      }
      console.log('');
    }
    
    // Step 4: Create Condition Presets and Link Templates
    console.log('🏥 Step 4: Creating Condition Presets...');
    
    const conditionPresets = [
      {
        name: 'Chronic Pain Management',
        templates: ['Brief Pain Inventory (BPI)'],
        diagnoses: [
          { icd10: 'M79.3', snomed: '203082005', label: 'Chronic Pain Syndrome' },
          { icd10: 'M25.50', snomed: '57676002', label: 'Joint Pain' }
        ]
      },
      {
        name: 'Mental Health Screening',
        templates: ['Patient Health Questionnaire-9 (PHQ-9)', 'Generalized Anxiety Disorder-7 (GAD-7)'],
        diagnoses: [
          { icd10: 'F32.9', snomed: '35489007', label: 'Major Depressive Disorder' },
          { icd10: 'F41.1', snomed: '21897009', label: 'Generalized Anxiety Disorder' }
        ]
      },
      {
        name: 'Fibromyalgia Care',
        templates: ['Fibromyalgia Impact Questionnaire (FIQ)', 'Brief Pain Inventory (BPI)'],
        diagnoses: [
          { icd10: 'M79.3', snomed: '203082005', label: 'Fibromyalgia' }
        ]
      },
      {
        name: 'Diabetes Self-Care',
        templates: ['Summary of Diabetes Self-Care Activities (SDSCA)'],
        diagnoses: [
          { icd10: 'E11.9', snomed: '44054006', label: 'Type 2 Diabetes Mellitus' }
        ]
      }
    ];
    
    for (const presetData of conditionPresets) {
      // Check if preset already exists
      const existingPreset = await prisma.conditionPreset.findFirst({
        where: { name: presetData.name }
      });
      
      if (existingPreset) {
        console.log(`   ⏭️  Condition preset exists: ${presetData.name}`);
        continue;
      }
      
      const preset = await prisma.conditionPreset.create({
        data: {
          name: presetData.name
        }
      });
      
      // Create diagnoses
      for (const diagnosis of presetData.diagnoses) {
        await prisma.conditionPresetDiagnosis.create({
          data: {
            presetId: preset.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label
          }
        });
      }
      
      // Link templates
      for (const templateName of presetData.templates) {
        const template = await prisma.assessmentTemplate.findFirst({
          where: { name: templateName }
        });
        if (template) {
          await prisma.conditionPresetTemplate.create({
            data: {
              presetId: preset.id,
              templateId: template.id
            }
          });
        }
      }
      
      console.log(`   ✅ Created condition preset: ${presetData.name} (${presetData.templates.length} templates)`);
    }
    
    // Step 5: Final Verification
    console.log('\n🔍 Step 5: Final Verification...');
    
    const finalTemplates = await prisma.assessmentTemplate.findMany({
      where: { isStandardized: true },
      include: {
        items: {
          include: {
            metricDefinition: true
          }
        }
      }
    });
    
    const customTemplates = await prisma.assessmentTemplate.findMany({
      where: { isStandardized: false }
    });
    
    const totalPresets = await prisma.conditionPreset.count();
    
    console.log('\n🎉 Setup Complete! Summary:');
    console.log('============================');
    console.log(`📊 Metrics Created: ${Object.keys(createdMetrics).length}`);
    console.log(`🏆 Standardized Templates: ${finalTemplates.length}`);
    console.log(`🛠️  Custom Templates: ${customTemplates.length}`);
    console.log(`🏥 Condition Presets: ${totalPresets}`);
    
    console.log('\n📋 Standardized Templates Available:');
    finalTemplates.forEach(template => {
      console.log(`   • ${template.name} (${template.items.length} items)`);
    });
    
    console.log('\n🔗 Clinical Benefits:');
    console.log('   ✅ Evidence-based validated instruments');
    console.log('   ✅ Standardized scoring and interpretation');
    console.log('   ✅ Clinical decision support ready');
    console.log('   ✅ Research and quality measure compatible');
    console.log('   ✅ EHR integration ready');
    console.log('   ✅ Condition-specific care pathways');
    
    return {
      metricsCreated: Object.keys(createdMetrics).length,
      standardizedTemplates: finalTemplates.length,
      customTemplates: customTemplates.length,
      conditionPresets: totalPresets
    };
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  comprehensiveStandardizedSetup()
    .catch(console.error);
}

module.exports = { comprehensiveStandardizedSetup };