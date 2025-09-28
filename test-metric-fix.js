const { PrismaClient } = require('./generated/prisma');

async function testMetricFix() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing metric definitions fix...\n');
    
    // Get one template with items and metric definitions
    const template = await prisma.assessmentTemplate.findFirst({
      where: { isStandardized: true },
      include: {
        items: {
          include: {
            metricDefinition: true
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    
    if (!template) {
      console.log('❌ No standardized templates found');
      return;
    }
    
    console.log(`✅ Template: ${template.name}`);
    console.log(`📊 Items: ${template.items.length}`);
    
    let hasMetricDefinitions = 0;
    let missingMetricDefinitions = 0;
    
    template.items.forEach((item, index) => {
      if (item.metricDefinition) {
        console.log(`✅ Item ${index + 1}: ${item.metricDefinition.name} (${item.metricDefinition.type})`);
        hasMetricDefinitions++;
      } else {
        console.log(`❌ Item ${index + 1}: Missing metric definition (ID: ${item.metricDefinitionId})`);
        missingMetricDefinitions++;
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Items with metric definitions: ${hasMetricDefinitions}`);
    console.log(`   ❌ Items missing metric definitions: ${missingMetricDefinitions}`);
    
    if (missingMetricDefinitions === 0) {
      console.log(`\n🎉 SUCCESS: All items have metric definitions!`);
    } else {
      console.log(`\n⚠️  WARNING: Some items are missing metric definitions`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMetricFix();