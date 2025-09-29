const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const arthritisMetrics = [
  {
    key: 'joint_stiffness',
    displayName: 'Joint Stiffness Level',
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
      code: '72514-3',
      display: 'Joint stiffness severity - 0-10 verbal numeric rating [Score] - Reported'
    }
  },
  {
    key: 'joint_swelling',
    displayName: 'Joint Swelling',
    valueType: 'categorical',
    options: {
      values: [
        { code: 'none', display: 'No swelling' },
        { code: 'hands', display: 'Hands/Fingers' },
        { code: 'wrists', display: 'Wrists' },
        { code: 'elbows', display: 'Elbows' },
        { code: 'shoulders', display: 'Shoulders' },
        { code: 'knees', display: 'Knees' },
        { code: 'ankles', display: 'Ankles' },
        { code: 'feet', display: 'Feet/Toes' },
        { code: 'multiple', display: 'Multiple joints' }
      ]
    },
    defaultFrequency: 'daily'
  },
  {
    key: 'range_of_motion',
    displayName: 'Range of Motion',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    options: {
      values: [
        { code: '0', display: 'Severely limited' },
        { code: '1', display: 'Moderately limited' },
        { code: '2', display: 'Mildly limited' },
        { code: '3', display: 'Slightly limited' },
        { code: '4', display: 'Normal range' }
      ]
    },
    defaultFrequency: 'daily'
  },
  {
    key: 'arthritis_morning_stiffness',
    displayName: 'Morning Stiffness Duration (Arthritis)',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 360,
    unit: 'minutes',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    validation: {
      min: 0,
      max: 360,
      type: 'integer'
    },
    coding: {
      system: 'arthritis-assessment',
      code: 'morning-stiffness',
      display: 'Arthritis morning stiffness duration'
    }
  },
  {
    key: 'weather_impact',
    displayName: 'Weather Impact on Symptoms',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    options: {
      values: [
        { code: '0', display: 'No impact' },
        { code: '1', display: 'Slight worsening' },
        { code: '2', display: 'Moderate worsening' },
        { code: '3', display: 'Significant worsening' },
        { code: '4', display: 'Severe worsening' }
      ]
    },
    defaultFrequency: 'daily'
  },
  {
    key: 'activity_limitation',
    displayName: 'Activity Limitation Due to Arthritis',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    options: {
      values: [
        { code: '0', display: 'No limitation' },
        { code: '1', display: 'Mild limitation' },
        { code: '2', display: 'Moderate limitation' },
        { code: '3', display: 'Severe limitation' },
        { code: '4', display: 'Unable to perform activities' }
      ]
    },
    defaultFrequency: 'daily'
  },
  {
    key: 'grip_strength',
    displayName: 'Grip Strength Assessment',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    options: {
      values: [
        { code: '0', display: 'Unable to grip' },
        { code: '1', display: 'Very weak grip' },
        { code: '2', display: 'Weak grip' },
        { code: '3', display: 'Moderate grip' },
        { code: '4', display: 'Strong grip' }
      ]
    },
    defaultFrequency: 'weekly'
  }
];

async function seedArthritisMetrics() {
  console.log('🔬 Seeding arthritis-specific metrics...');
  
  try {
    for (const metric of arthritisMetrics) {
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

    console.log('🎉 Arthritis metrics seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding arthritis metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedArthritisMetrics();
}

module.exports = { seedArthritisMetrics, arthritisMetrics };