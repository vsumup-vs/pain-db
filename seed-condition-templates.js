const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function createConditionAssessmentTemplates() {
  try {
    console.log('🏥 Creating condition-specific assessment templates...');

    // === FIBROMYALGIA CARE TEMPLATE ===
    console.log('Creating Fibromyalgia Care assessment template...');
    
    // Get fibromyalgia-specific metrics
    const fibromyalgiaMetricKeys = [
      'pain_scale_0_10',           // From base seed.js
      'fatigue_level',             // From fibromyalgia metrics
      'sleep_quality',             // From fibromyalgia metrics
      'tender_points_count',       // From fibromyalgia metrics
      'morning_stiffness_duration', // From fibromyalgia metrics
      'cognitive_symptoms',        // From fibromyalgia metrics
      'exercise_tolerance',        // From fibromyalgia metrics
      'pain_interference'          // From base seed.js
    ];

    const fibromyalgiaMetrics = await prisma.metricDefinition.findMany({
      where: {
        key: { in: fibromyalgiaMetricKeys }
      }
    });

    // Create Fibromyalgia Assessment Template
    const fibromyalgiaTemplate = await prisma.assessmentTemplate.upsert({
      where: {
        name_version: {
          name: 'Fibromyalgia Care Assessment',
          version: 1
        }
      },
      update: {},
      create: {
        name: 'Fibromyalgia Care Assessment',
        description: 'Comprehensive daily assessment for fibromyalgia patients including pain, fatigue, sleep, and cognitive symptoms'
      }
    });

    // Add fibromyalgia template items
    const fibromyalgiaTemplateItems = [
      { key: 'pain_scale_0_10', order: 1, required: true, helpText: 'Rate your current overall pain level from 0 (no pain) to 10 (worst possible pain)' },
      { key: 'fatigue_level', order: 2, required: true, helpText: 'Rate your current fatigue level from 0 (no fatigue) to 10 (completely exhausted)' },
      { key: 'sleep_quality', order: 3, required: true, helpText: 'How would you rate the quality of your sleep last night?' },
      { key: 'morning_stiffness_duration', order: 4, required: true, helpText: 'How many minutes did morning stiffness last today?' },
      { key: 'cognitive_symptoms', order: 5, required: true, helpText: 'Rate your brain fog or cognitive difficulties today' },
      { key: 'pain_interference', order: 6, required: true, helpText: 'How much has pain interfered with your daily activities today?' },
      { key: 'exercise_tolerance', order: 7, required: false, helpText: 'What level of physical activity were you able to tolerate this week?' },
      { key: 'tender_points_count', order: 8, required: false, helpText: 'Number of tender points identified during examination (weekly assessment)' }
    ];

    for (const item of fibromyalgiaTemplateItems) {
      const metric = fibromyalgiaMetrics.find(m => m.key === item.key);
      if (metric) {
        await prisma.assessmentTemplateItem.upsert({
          where: {
            templateId_metricDefinitionId: {
              templateId: fibromyalgiaTemplate.id,
              metricDefinitionId: metric.id
            }
          },
          update: {},
          create: {
            templateId: fibromyalgiaTemplate.id,
            metricDefinitionId: metric.id,
            required: item.required,
            displayOrder: item.order,
            helpText: item.helpText
          }
        });
        console.log(`✅ Added ${metric.displayName} to Fibromyalgia template`);
      }
    }

    // === ARTHRITIS MANAGEMENT TEMPLATE ===
    console.log('Creating Arthritis Management assessment template...');
    
    // Get arthritis-specific metrics
    const arthritisMetricKeys = [
      'pain_scale_0_10',              // From base seed.js
      'joint_stiffness',              // From arthritis metrics
      'joint_swelling',               // From arthritis metrics
      'range_of_motion',              // From arthritis metrics
      'arthritis_morning_stiffness',  // From arthritis metrics
      'weather_impact',               // From arthritis metrics
      'activity_limitation',          // From arthritis metrics
      'grip_strength',                // From arthritis metrics
      'pain_interference'             // From base seed.js
    ];

    const arthritisMetrics = await prisma.metricDefinition.findMany({
      where: {
        key: { in: arthritisMetricKeys }
      }
    });

    // Create Arthritis Assessment Template
    const arthritisTemplate = await prisma.assessmentTemplate.upsert({
      where: {
        name_version: {
          name: 'Arthritis Management Assessment',
          version: 1
        }
      },
      update: {},
      create: {
        name: 'Arthritis Management Assessment',
        description: 'Comprehensive daily assessment for arthritis patients including joint pain, stiffness, swelling, and functional limitations'
      }
    });

    // Add arthritis template items
    const arthritisTemplateItems = [
      { key: 'pain_scale_0_10', order: 1, required: true, helpText: 'Rate your current joint pain level from 0 (no pain) to 10 (worst possible pain)' },
      { key: 'joint_stiffness', order: 2, required: true, helpText: 'Rate your current joint stiffness from 0 (no stiffness) to 10 (completely stiff)' },
      { key: 'joint_swelling', order: 3, required: true, helpText: 'Which joints are currently swollen or inflamed?' },
      { key: 'arthritis_morning_stiffness', order: 4, required: true, helpText: 'How many minutes did morning joint stiffness last today?' },
      { key: 'range_of_motion', order: 5, required: true, helpText: 'How would you rate your current range of motion in affected joints?' },
      { key: 'activity_limitation', order: 6, required: true, helpText: 'How much has arthritis limited your daily activities today?' },
      { key: 'weather_impact', order: 7, required: false, helpText: 'How much has weather affected your arthritis symptoms today?' },
      { key: 'grip_strength', order: 8, required: false, helpText: 'How would you rate your current grip strength? (weekly assessment)' }
    ];

    for (const item of arthritisTemplateItems) {
      const metric = arthritisMetrics.find(m => m.key === item.key);
      if (metric) {
        await prisma.assessmentTemplateItem.upsert({
          where: {
            templateId_metricDefinitionId: {
              templateId: arthritisTemplate.id,
              metricDefinitionId: metric.id
            }
          },
          update: {},
          create: {
            templateId: arthritisTemplate.id,
            metricDefinitionId: metric.id,
            required: item.required,
            displayOrder: item.order,
            helpText: item.helpText
          }
        });
        console.log(`✅ Added ${metric.displayName} to Arthritis template`);
      }
    }

    console.log('🎉 Condition-specific assessment templates created successfully!');
    
    // Display summary
    console.log('\n📋 ASSESSMENT TEMPLATES SUMMARY:');
    console.log(`✅ Fibromyalgia Care Assessment - ${fibromyalgiaTemplateItems.length} metrics`);
    console.log(`✅ Arthritis Management Assessment - ${arthritisTemplateItems.length} metrics`);

  } catch (error) {
    console.error('❌ Error creating condition assessment templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createConditionAssessmentTemplates();
}

module.exports = { createConditionAssessmentTemplates };