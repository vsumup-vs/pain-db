const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import standardized data
const { 
  standardizedAssessmentTemplates, 
  standardizedMetricDefinitions 
} = require('./create-standardized-assessment-templates.js');

// Helper function to convert valueType to proper enum
function convertValueType(valueType) {
  if (!valueType) return 'NUMERIC';
  
  const typeMap = {
    'numeric': 'NUMERIC',
    'ordinal': 'NUMERIC', // Ordinal scales are typically numeric in our system
    'text': 'TEXT',
    'boolean': 'BOOLEAN',
    'date': 'DATE',
    'time': 'TIME',
    'datetime': 'DATETIME',
    'json': 'JSON'
  };
  
  return typeMap[valueType.toLowerCase()] || 'NUMERIC';
}

// Helper function to convert items to questions format
function convertItemsToQuestions(items) {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map(item => ({
    id: item.metricKey,
    question: item.question,
    type: item.valueType || 'numeric',
    scale: item.scale,
    options: item.options,
    required: item.required || false,
    displayOrder: item.displayOrder || 0,
    helpText: item.helpText,
    alertThreshold: item.alertThreshold,
    criticalAlert: item.criticalAlert || false
  }));
}

async function fixStandardizationIssues() {
  try {
    console.log('🔧 Starting Standardization Issues Fix...\n');

    // Step 1: Fix Metric Definitions
    console.log('📊 Step 1: Fixing Metric Definitions...');
    
    let metricsFixed = 0;
    let metricsCreated = 0;
    
    for (const metric of standardizedMetricDefinitions) {
      const existingMetric = await prisma.metricDefinition.findFirst({
        where: { 
          OR: [
            { key: metric.key },
            { name: metric.displayName }
          ]
        }
      });

      // Only include fields that exist in the MetricDefinition schema
      const metricData = {
        key: metric.key,
        name: metric.displayName, // Use displayName as name
        description: metric.description,
        unit: metric.unit,
        valueType: convertValueType(metric.valueType),
        category: metric.category,
        normalRange: metric.normalRange,
        isStandardized: true, // Ensure this is set to true
        standardCoding: metric.coding,
        validationInfo: metric.validation
        // Removed: scaleMin, scaleMax, decimalPrecision, defaultFrequency (not in schema)
      };

      // Remove undefined values
      Object.keys(metricData).forEach(key => {
        if (metricData[key] === undefined) {
          delete metricData[key];
        }
      });

      if (!existingMetric) {
        await prisma.metricDefinition.create({ data: metricData });
        metricsCreated++;
        console.log(`   ✅ Created metric: ${metric.displayName}`);
      } else {
        await prisma.metricDefinition.update({
          where: { id: existingMetric.id },
          data: metricData
        });
        metricsFixed++;
        console.log(`   🔄 Updated metric: ${metric.displayName}`);
      }
    }

    // Step 2: Create/Update Assessment Templates
    console.log('\n📋 Step 2: Creating/Updating Assessment Templates...');
    
    let templatesFixed = 0;
    let templatesCreated = 0;
    
    for (const template of standardizedAssessmentTemplates) {
      const existingTemplate = await prisma.assessmentTemplate.findFirst({
        where: { name: template.name }
      });

      // Convert items to questions format
      const questions = convertItemsToQuestions(template.items);

      const templateData = {
        name: template.name,
        description: template.description,
        questions: questions, // Use converted questions
        scoring: template.scoring,
        isStandardized: true, // Ensure this is set to true
        category: template.category,
        standardCoding: template.standardCoding,
        validationInfo: template.validationInfo,
        scoringInfo: template.scoringInfo,
        copyrightInfo: template.copyrightInfo,
        clinicalUse: template.clinicalUse
      };

      // Remove undefined values
      Object.keys(templateData).forEach(key => {
        if (templateData[key] === undefined) {
          delete templateData[key];
        }
      });

      if (!existingTemplate) {
        const newTemplate = await prisma.assessmentTemplate.create({ 
          data: templateData 
        });
        templatesCreated++;
        console.log(`   ✅ Created template: ${template.name}`);

        // Create template items
        if (template.items && template.items.length > 0) {
          for (const item of template.items) {
            const metricDef = await prisma.metricDefinition.findFirst({
              where: { 
                OR: [
                  { key: item.metricKey },
                  { name: item.displayName || item.name }
                ]
              }
            });

            if (metricDef) {
              await prisma.assessmentTemplateItem.create({
                data: {
                  templateId: newTemplate.id,
                  metricDefinitionId: metricDef.id,
                  displayOrder: item.displayOrder || 0,
                  isRequired: item.required || false,
                  helpText: item.helpText,
                  defaultValue: item.defaultValue
                }
              });
            } else {
              console.log(`   ⚠️ Metric not found for item: ${item.metricKey || item.displayName}`);
            }
          }
        }
      } else {
        await prisma.assessmentTemplate.update({
          where: { id: existingTemplate.id },
          data: templateData
        });
        templatesFixed++;
        console.log(`   🔄 Updated template: ${template.name}`);
      }
    }

    // Step 3: Verification
    console.log('\n🔍 Step 3: Verification...');
    
    const standardizedMetrics = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });
    
    const customMetrics = await prisma.metricDefinition.count({
      where: { isStandardized: false }
    });
    
    const standardizedTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    
    const customTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: false }
    });

    console.log('\n📊 Final Results:');
    console.log(`   Metrics Created: ${metricsCreated}`);
    console.log(`   Metrics Updated: ${metricsFixed}`);
    console.log(`   Templates Created: ${templatesCreated}`);
    console.log(`   Templates Updated: ${templatesFixed}`);
    console.log('\n📈 Current Counts:');
    console.log(`   Standardized Metrics: ${standardizedMetrics}`);
    console.log(`   Custom Metrics: ${customMetrics}`);
    console.log(`   Standardized Templates: ${standardizedTemplates}`);
    console.log(`   Custom Templates: ${customTemplates}`);

    console.log('\n✅ Standardization issues fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing standardization issues:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { fixStandardizationIssues };

if (require.main === module) {
  fixStandardizationIssues()
    .catch(console.error);
}