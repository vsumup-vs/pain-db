// Test script to verify metric definitions are included in template queries
const { PrismaClient } = require('./generated/prisma');

async function testMetricDefinitions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing metric definitions inclusion...\n');
    
    // Test getting a template by ID with metric definitions
    const templates = await prisma.assessmentTemplate.findMany({
      where: { isStandardized: true },
      include: {
        items: {
          include: {
            metricDefinition: true
          },
          orderBy: { displayOrder: 'asc' }
        }
      },
      take: 1
    });
    
    if (templates.length > 0) {
      const template = templates[0];
      console.log(`Template: ${template.name}`);
      console.log(`Items count: ${template.items.length}`);
      
      template.items.forEach((item, index) => {
        console.log(`\nItem ${index + 1}:`);
        console.log(`  Display Order: ${item.displayOrder}`);
        console.log(`  Is Required: ${item.isRequired}`);
        console.log(`  Metric Definition ID: ${item.metricDefinitionId}`);
        
        if (item.metricDefinition) {
          console.log(`  Metric Name: ${item.metricDefinition.name}`);
          console.log(`  Metric Type: ${item.metricDefinition.type}`);
          console.log(`  Metric Unit: ${item.metricDefinition.unit || 'N/A'}`);
          console.log(`  Metric Coding: ${item.metricDefinition.coding || 'N/A'}`);
        } else {
          console.log(`  ❌ NO METRIC DEFINITION FOUND!`);
        }
      });
    } else {
      console.log('No standardized templates found');
    }
    
  } catch (error) {
    console.error('Error testing metric definitions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMetricDefinitions();