const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const fibromyalgiaMetrics = [
  {
    key: 'fatigue_level',
    displayName: 'Fatigue Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    validation: {
      min: 0,
      max: 10,
      type: 'integer'
    },
    coding: {
      system: 'http://loinc.org',
      code: '89026-8',
      display: 'Fatigue severity - 0-10 verbal numeric rating [Score] - Reported'
    }
  },
  {
    key: 'sleep_quality',
    displayName: 'Sleep Quality',
    valueType: 'ordinal',
    scaleMin: 1,
    scaleMax: 5,
    unit: 'scale',
    options: {
      values: [
        { code: '1', display: 'Very Poor' },
        { code: '2', display: 'Poor' },
        { code: '3', display: 'Fair' },
        { code: '4', display: 'Good' },
        { code: '5', display: 'Excellent' }
      ]
    },
    defaultFrequency: 'daily'
  },
  {
    key: 'tender_points_count',
    displayName: 'Number of Tender Points',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 18,
    unit: 'count',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    validation: {
      min: 0,
      max: 18,
      type: 'integer'
    },
    coding: {
      system: 'fibromyalgia-assessment',
      code: 'tender-points',
      display: 'Fibromyalgia tender points count'
    }
  },
  {
    key: 'morning_stiffness_duration',
    displayName: 'Morning Stiffness Duration',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 480,
    unit: 'minutes',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    validation: {
      min: 0,
      max: 480,
      type: 'integer'
    }
  },
  {
    key: 'cognitive_symptoms',
    displayName: 'Cognitive Symptoms (Brain Fog)',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    options: {
      values: [
        { code: '0', display: 'None' },
        { code: '1', display: 'Mild' },
        { code: '2', display: 'Moderate' },
        { code: '3', display: 'Severe' },
        { code: '4', display: 'Very Severe' }
      ]
    },
    defaultFrequency: 'daily'
  },
  {
    key: 'exercise_tolerance',
    displayName: 'Exercise Tolerance',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    options: {
      values: [
        { code: '0', display: 'Unable to exercise' },
        { code: '1', display: 'Very limited activity' },
        { code: '2', display: 'Light activity only' },
        { code: '3', display: 'Moderate activity' },
        { code: '4', display: 'Normal activity level' }
      ]
    },
    defaultFrequency: 'weekly'
  }
];

async function seedFibromyalgiaMetrics() {
  console.log('🔬 Seeding fibromyalgia-specific metrics...');
  
  try {
    for (const metric of fibromyalgiaMetrics) {
      await prisma.metricDefinition.upsert({
        where: {
          key_version: {
            key: metric.key,
            version: 1
          }
        },
        update: {},
        create: {
          ...metric,
          version: 1
        }
      });

      console.log(`✅ Created/updated metric: ${metric.displayName}`);
    }

    console.log('🎉 Fibromyalgia metrics seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding fibromyalgia metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedFibromyalgiaMetrics();
}

module.exports = { seedFibromyalgiaMetrics, fibromyalgiaMetrics };