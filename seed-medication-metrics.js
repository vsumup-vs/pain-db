const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const medicationMetrics = [
  {
    key: 'medication_adherence',
    displayName: 'Medication Adherence',
    valueType: 'categorical',
    options: ['Taken as prescribed', 'Missed dose', 'Partial dose', 'Wrong time', 'Skipped intentionally'],
    defaultFrequency: 'daily',
    validation: {
      required: true
    },
    coding: {
      system: 'medication-adherence',
      version: '1.0'
    }
  },
  {
    key: 'medication_effectiveness',
    displayName: 'Medication Effectiveness',
    valueType: 'ordinal',
    scaleMin: 1,
    scaleMax: 10,
    unit: 'scale',
    options: ['1 - Not effective', '2', '3', '4', '5 - Somewhat effective', '6', '7', '8', '9', '10 - Very effective'],
    defaultFrequency: 'daily'
  },
  {
    key: 'side_effects_severity',
    displayName: 'Side Effects Severity',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    options: ['0 - No side effects', '1-2 - Mild', '3-4 - Mild-Moderate', '5-6 - Moderate', '7-8 - Severe', '9-10 - Very Severe'],
    defaultFrequency: 'as_needed'
  },
  {
    key: 'pain_before_medication',
    displayName: 'Pain Level Before Medication',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    defaultFrequency: 'as_needed'
  },
  {
    key: 'pain_after_medication',
    displayName: 'Pain Level After Medication',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    defaultFrequency: 'as_needed'
  },
  {
    key: 'medication_timing',
    displayName: 'Medication Timing',
    valueType: 'categorical',
    options: ['On time', 'Early (< 1 hour)', 'Late (1-2 hours)', 'Late (2-4 hours)', 'Late (> 4 hours)'],
    defaultFrequency: 'daily'
  }
];

async function seedMedicationMetrics() {
  try {
    console.log('Seeding medication metrics...');
    
    for (const metric of medicationMetrics) {
      await prisma.metricDefinition.upsert({
        where: {
          key_version: {
            key: metric.key,
            version: 1
          }
        },
        update: {},
        create: metric
      });
      console.log(`Created/updated metric: ${metric.displayName}`);
    }
    
    console.log('Medication metrics seeding completed!');
  } catch (error) {
    console.error('Error seeding medication metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMedicationMetrics();