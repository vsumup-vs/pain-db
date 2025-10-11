const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testStandardizationFields() {
  console.log('🔍 Testing Standardization Fields...\n');

  try {
    // Test AssessmentTemplate standardization fields
    console.log('📋 Testing AssessmentTemplate standardization fields...');
    const assessmentTemplateCount = await prisma.assessmentTemplate.count();
    console.log(`Total Assessment Templates: ${assessmentTemplateCount}`);
    
    const standardizedTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    console.log(`Standardized Templates: ${standardizedTemplates}`);
    
    const customTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: false }
    });
    console.log(`Custom Templates: ${customTemplates}`);

    // Sample categorized templates
    const categorizedTemplates = await prisma.assessmentTemplate.findMany({
      where: { 
        category: { not: null }
      },
      select: {
        id: true,
        name: true,
        category: true,
        isStandardized: true
      },
      take: 5
    });
    console.log(`Sample Categorized Templates:`, categorizedTemplates);

    console.log('\n🎯 Testing ConditionPreset standardization fields...');
    const conditionPresetCount = await prisma.conditionPreset.count();
    console.log(`Total Condition Presets: ${conditionPresetCount}`);
    
    const standardizedPresets = await prisma.conditionPreset.count({
      where: { isStandardized: true }
    });
    console.log(`Standardized Presets: ${standardizedPresets}`);
    
    const customPresets = await prisma.conditionPreset.count({
      where: { isStandardized: false }
    });
    console.log(`Custom Presets: ${customPresets}`);

    console.log('\n📊 Testing MetricDefinition standardization fields...');
    const metricDefinitionCount = await prisma.metricDefinition.count();
    console.log(`Total Metric Definitions: ${metricDefinitionCount}`);
    
    const standardizedMetrics = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });
    console.log(`Standardized Metrics: ${standardizedMetrics}`);

    console.log('\n🚨 Testing AlertRule standardization fields...');
    const alertRuleCount = await prisma.alertRule.count();
    console.log(`Total Alert Rules: ${alertRuleCount}`);
    
    const standardizedRules = await prisma.alertRule.count({
      where: { isStandardized: true }
    });
    console.log(`Standardized Rules: ${standardizedRules}`);

    // Sample alert rules with severity
    const alertRulesWithSeverity = await prisma.alertRule.findMany({
      where: { 
        severity: { not: null }
      },
      select: {
        id: true,
        name: true,
        severity: true,
        isStandardized: true
      },
      take: 5
    });
    console.log(`Sample Alert Rules with Severity:`, alertRulesWithSeverity);

    console.log('\n✅ All standardization fields are working correctly!');

  } catch (error) {
    console.error('❌ Error testing standardization fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStandardizationFields();