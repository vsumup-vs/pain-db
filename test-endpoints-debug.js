const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEndpoints() {
  console.log('🔍 Testing database connections and queries...\n');

  try {
    // Test 1: Basic database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Test 2: Test assessment templates query (corrected)
    console.log('2. Testing assessment templates query...');
    const templates = await prisma.assessmentTemplate.findMany({
      take: 5,
      include: {
        assessments: true,
        conditionPresetTemplates: {
          include: {
            conditionPreset: true
          }
        }
      }
    });
    console.log(`✅ Found ${templates.length} assessment templates`);
    if (templates.length > 0) {
      console.log(`   Sample template: ${templates[0].name}`);
      console.log(`   Questions type: ${typeof templates[0].questions}`);
    }
    console.log('');

    // Test 3: Test condition presets query (corrected)
    console.log('3. Testing condition presets query...');
    const presets = await prisma.conditionPreset.findMany({
      take: 5,
      include: {
        templates: {
          include: {
            template: true
          }
        },
        alertRules: {
          include: {
            rule: true
          }
        }
      }
    });
    console.log(`✅ Found ${presets.length} condition presets`);
    if (presets.length > 0) {
      console.log(`   Sample preset: ${presets[0].name}`);
    }
    console.log('');

    // Test 4: Test metric definitions query
    console.log('4. Testing metric definitions query...');
    const metrics = await prisma.metricDefinition.findMany({
      take: 5
    });
    console.log(`✅ Found ${metrics.length} metric definitions`);
    if (metrics.length > 0) {
      console.log(`   Sample metric: ${metrics[0].name} (${metrics[0].valueType})`);
    }
    console.log('');

    // Test 5: Test patients query
    console.log('5. Testing patients query...');
    const patients = await prisma.patient.findMany({
      take: 5,
      include: {
        enrollments: true
      }
    });
    console.log(`✅ Found ${patients.length} patients\n`);

    // Test 6: Test relationship queries
    console.log('6. Testing relationship queries...');
    
    // Test assessment template with condition presets
    const templateWithPresets = await prisma.assessmentTemplate.findFirst({
      include: {
        conditionPresetTemplates: {
          include: {
            conditionPreset: {
              include: {
                alertRules: {
                  include: {
                    rule: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (templateWithPresets) {
      console.log(`✅ Template-preset relationship working: ${templateWithPresets.name}`);
      console.log(`   Connected to ${templateWithPresets.conditionPresetTemplates.length} condition presets`);
    } else {
      console.log('⚠️  No templates with condition presets found');
    }

    console.log('\n🎉 All database tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.constructor.name + ':');
    console.error(error.message);
    if (error.stack) {
      console.error('Stack trace:', error.constructor.name + ':');
      console.error(error.message);
    }
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

testEndpoints();