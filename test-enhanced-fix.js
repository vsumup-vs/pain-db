const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEnhancedFix() {
  console.log('Testing Enhanced Controller Fix...\n');

  try {
    // Test the exact query structure that was failing
    console.log('1. Testing metricDefinition select without displayName...');
    
    const template = await prisma.assessmentTemplate.findFirst({
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                name: true,
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
        },
        assessments: true,
        conditionPresetTemplates: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true,
                isStandardized: true
              }
            }
          }
        }
      }
    });

    if (template) {
      console.log('✅ Query succeeded!');
      console.log(`Template: ${template.name}`);
      console.log(`Items count: ${template.items?.length || 0}`);
      
      if (template.items?.length > 0) {
        console.log(`First metric: ${template.items[0].metricDefinition?.name}`);
        console.log('Metric fields:', Object.keys(template.items[0].metricDefinition));
      }
    } else {
      console.log('⚠️ No templates found');
    }

    // Test getAllAssessmentTemplates query structure
    console.log('\n2. Testing getAllAssessmentTemplates query...');
    
    const [templates, total] = await Promise.all([
      prisma.assessmentTemplate.findMany({
        where: {},
        include: {
          items: {
            include: {
              metricDefinition: {
                select: {
                  id: true,
                  key: true,
                  name: true,
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
          },
          assessments: true,
          conditionPresetTemplates: {
            include: {
              conditionPreset: {
                select: {
                  id: true,
                  name: true,
                  isStandardized: true
                }
              }
            }
          }
        },
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' }
      }),
      prisma.assessmentTemplate.count({})
    ]);

    console.log(`✅ getAllAssessmentTemplates query succeeded!`);
    console.log(`Found ${templates.length} templates out of ${total} total`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedFix();