const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testItemsFix() {
  console.log('🧪 Testing Items Relationship Fix...\n');

  try {
    // Test 1: Direct database query with items
    console.log('1. 📊 Testing direct database query with items...');
    const templatesWithItems = await prisma.assessmentTemplate.findMany({
      take: 3,
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                name: true,
                displayName: true,
                description: true,
                unit: true,
                valueType: true,
                category: true,
                normalRange: true,
                isStandardized: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    console.log(`✅ Found ${templatesWithItems.length} templates`);
    
    templatesWithItems.forEach((template, index) => {
      console.log(`\n   Template ${index + 1}: ${template.name}`);
      console.log(`   📊 Items count: ${template.items?.length || 0}`);
      
      if (template.items && template.items.length > 0) {
        console.log(`   📋 Sample items:`);
        template.items.slice(0, 3).forEach((item, itemIndex) => {
          console.log(`      ${itemIndex + 1}. ${item.metricDefinition?.displayName || item.metricDefinition?.name || 'Unknown'}`);
          console.log(`         - Required: ${item.isRequired || false}`);
          console.log(`         - Order: ${item.displayOrder}`);
        });
      }
    });

    // Test 2: Test specific template by ID
    console.log('\n2. 🔍 Testing specific template by ID...');
    if (templatesWithItems.length > 0) {
      const templateId = templatesWithItems[0].id;
      const specificTemplate = await prisma.assessmentTemplate.findUnique({
        where: { id: templateId },
        include: {
          items: {
            include: {
              metricDefinition: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  displayName: true,
                  description: true,
                  unit: true,
                  valueType: true,
                  category: true,
                  normalRange: true,
                  isStandardized: true
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          }
        }
      });

      console.log(`✅ Template: ${specificTemplate.name}`);
      console.log(`📊 Items: ${specificTemplate.items?.length || 0}`);
      console.log(`🔗 Items structure:`, JSON.stringify(specificTemplate.items?.slice(0, 2), null, 2));
    }

    // Test 3: Verify the frontend will see the correct data
    console.log('\n3. 🎯 Frontend Data Structure Test...');
    if (templatesWithItems.length > 0) {
      const template = templatesWithItems[0];
      const frontendData = {
        id: template.id,
        name: template.name,
        description: template.description,
        items: template.items,
        metricCount: template.items?.length || 0
      };

      console.log(`✅ Frontend will see:`);
      console.log(`   - Template: ${frontendData.name}`);
      console.log(`   - Metric Count: ${frontendData.metricCount}`);
      console.log(`   - Items Array: ${Array.isArray(frontendData.items) ? 'Yes' : 'No'}`);
      console.log(`   - Items Length: ${frontendData.items?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testItemsFix();