const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function generateUUID() {
  return crypto.randomUUID();
}

async function safeDelete(modelName, tableName) {
  try {
    const result = await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
    console.log(`✓ Cleared ${result} records from ${modelName}`);
  } catch (error) {
    if (error.code === 'P2003') {
      console.log(`⚠ Cannot clear ${modelName} due to foreign key constraints. Skipping...`);
    } else if (error.code === '42P01') {
      console.log(`⚠ Table ${tableName} does not exist. Skipping...`);
    } else {
      console.error(`✗ Error clearing ${modelName}:`, error.message);
    }
  }
}

// Standardized metrics with correct enum values (lowercase)
const standardizedMetrics = [
  {
    key: 'pain_scale_0_10',
    displayName: 'Pain Scale (0-10)',
    description: 'Numeric pain rating scale from 0 (no pain) to 10 (worst pain imaginable)',
    valueType: 'numeric', // lowercase
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    category: 'Pain Management',
    standardCoding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '22253000',
          display: 'Pain'
        }
      ]
    },
    validationInfo: {
      min: 0,
      max: 10,
      type: 'integer',
      required: true
    }
  },
  {
    key: 'pain_location',
    displayName: 'Pain Location',
    description: 'Primary location of pain experienced by the patient',
    valueType: 'text', // lowercase
    category: 'Pain Management',
    options: {
      values: [
        { 
          code: 'lower_back', 
          display: 'Lower Back',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '279039007',
            display: 'Low back pain'
          },
          icd10: 'M54.5'
        },
        { 
          code: 'upper_back', 
          display: 'Upper Back',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '161891005',
            display: 'Backache'
          },
          icd10: 'M54.9'
        },
        { 
          code: 'neck', 
          display: 'Neck',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '81680005',
            display: 'Neck pain'
          },
          icd10: 'M54.2'
        },
        { 
          code: 'shoulders', 
          display: 'Shoulders',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '45326000',
            display: 'Shoulder pain'
          },
          icd10: 'M25.511'
        },
        { 
          code: 'hips', 
          display: 'Hips',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '49218002',
            display: 'Hip pain'
          },
          icd10: 'M25.551'
        },
        { 
          code: 'knees', 
          display: 'Knees',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '30989003',
            display: 'Knee pain'
          },
          icd10: 'M25.561'
        },
        { 
          code: 'widespread', 
          display: 'Widespread',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '82423001',
            display: 'Chronic pain'
          },
          icd10: 'G89.29'
        }
      ]
    }
  },
  {
    key: 'pain_interference',
    displayName: 'Pain Interference with Daily Activities',
    description: 'How much pain interferes with daily activities (0-10 scale)',
    valueType: 'numeric', // lowercase
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    category: 'Pain Management',
    standardCoding: {
      primary: {
        system: 'http://loinc.org',
        code: '61758-9',
        display: 'Pain interference with general activity'
      }
    },
    validationInfo: {
      min: 0,
      max: 10,
      type: 'integer'
    }
  },
  {
    key: 'fatigue_level',
    displayName: 'Fatigue Level',
    description: 'Fatigue severity rating from 0 (no fatigue) to 10 (completely exhausted)',
    valueType: 'numeric', // lowercase
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    category: 'General Wellness',
    standardCoding: {
      primary: {
        system: 'http://loinc.org',
        code: '89026-8',
        display: 'Fatigue severity - 0-10 verbal numeric rating [Score] - Reported'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '84229001',
          display: 'Fatigue'
        }
      ]
    },
    validationInfo: {
      min: 0,
      max: 10,
      type: 'integer'
    }
  },
  {
    key: 'sleep_quality',
    displayName: 'Sleep Quality',
    description: 'Overall quality of sleep (1-5 scale)',
    valueType: 'categorical', // lowercase
    scaleMin: 1,
    scaleMax: 5,
    unit: 'scale',
    category: 'General Wellness',
    standardCoding: {
      primary: {
        system: 'http://loinc.org',
        code: '93832-4',
        display: 'Sleep quality'
      }
    },
    options: {
      values: [
        { code: '1', display: 'Very Poor', snomed: '247750002' },
        { code: '2', display: 'Poor', snomed: '365508006' },
        { code: '3', display: 'Fair', snomed: '102499006' },
        { code: '4', display: 'Good', snomed: '405153007' },
        { code: '5', display: 'Excellent', snomed: '425405005' }
      ]
    }
  },
  {
    key: 'blood_glucose',
    displayName: 'Blood Glucose',
    description: 'Blood glucose measurement in mg/dL',
    valueType: 'numeric', // lowercase
    scaleMin: 50,
    scaleMax: 600,
    unit: 'mg/dL',
    decimalPrecision: 0,
    category: 'Diabetes Management',
    standardCoding: {
      primary: {
        system: 'http://loinc.org',
        code: '33747-0',
        display: 'Glucose [Mass/volume] in Blood by Glucometer'
      }
    },
    validationInfo: {
      min: 50,
      max: 600,
      type: 'integer',
      normalRange: { min: 70, max: 140 },
      criticalLow: 70,
      criticalHigh: 400
    }
  }
];

// Condition presets with correct structure
const conditionPresets = [
  {
    name: 'Chronic Pain Management',
    description: 'Comprehensive chronic pain monitoring and management program',
    isStandardized: true,
    category: 'Pain Management',
    diagnoses: [
      {
        icd10: 'M79.3',
        snomed: '82423001',
        label: 'Chronic pain syndrome',
        isPrimary: true
      },
      {
        icd10: 'M25.50',
        snomed: '57676002',
        label: 'Joint pain, unspecified',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Diabetes Management Program',
    description: 'Comprehensive diabetes monitoring including glucose and medication adherence',
    isStandardized: true,
    category: 'Endocrine',
    diagnoses: [
      {
        icd10: 'E11.9',
        snomed: '44054006',
        label: 'Type 2 diabetes mellitus without complications',
        isPrimary: true
      }
    ]
  }
];

// Assessment templates with correct structure
const assessmentTemplates = [
  {
    name: 'Chronic Pain Daily Assessment',
    description: 'Comprehensive daily pain monitoring and functional assessment',
    isStandardized: true,
    category: 'Pain Management',
    questions: {
      instructions: 'Please answer the following questions about your pain today.',
      sections: [
        {
          title: 'Pain Assessment',
          questions: [
            {
              id: 'pain_scale',
              text: 'Rate your current pain level from 0 to 10',
              type: 'numeric',
              required: true
            },
            {
              id: 'pain_location',
              text: 'Where is your primary pain located?',
              type: 'categorical',
              required: true
            }
          ]
        }
      ]
    },
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1 },
      { metricKey: 'pain_location', required: true, displayOrder: 2 },
      { metricKey: 'pain_interference', required: true, displayOrder: 3 }
    ]
  },
  {
    name: 'Diabetes Monitoring',
    description: 'Daily diabetes monitoring including glucose levels',
    isStandardized: true,
    category: 'Endocrine',
    questions: {
      instructions: 'Please record your diabetes-related measurements.',
      sections: [
        {
          title: 'Glucose Monitoring',
          questions: [
            {
              id: 'blood_glucose',
              text: 'Enter your blood glucose reading in mg/dL',
              type: 'numeric',
              required: true
            }
          ]
        }
      ]
    },
    items: [
      { metricKey: 'blood_glucose', required: true, displayOrder: 1 }
    ]
  }
];

async function seedComprehensiveFixed() {
  try {
    console.log('🧹 Cleaning existing data...\n');
    
    // Clear data in correct order (respecting foreign key constraints)
    // Use correct table names (snake_case)
    await safeDelete('AssessmentTemplateItem', 'assessment_template_items');
    await safeDelete('AssessmentTemplate', 'assessment_templates');
    await safeDelete('ConditionPresetAlertRule', 'condition_preset_alert_rules');
    await safeDelete('ConditionPresetTemplate', 'condition_preset_templates');
    await safeDelete('ConditionPresetDiagnosis', 'condition_preset_diagnoses');
    await safeDelete('ConditionPreset', 'condition_presets');
    await safeDelete('MetricDefinition', 'metric_definitions');

    console.log('\n📊 Creating standardized metrics...');
    const createdMetrics = {};
    for (const metric of standardizedMetrics) {
      const created = await prisma.metricDefinition.upsert({
        where: { key: metric.key },
        update: {
          displayName: metric.displayName,
          description: metric.description,
          unit: metric.unit,
          valueType: metric.valueType, // lowercase enum values
          category: metric.category,
          isStandardized: true,
          scaleMin: metric.scaleMin,
          scaleMax: metric.scaleMax,
          decimalPrecision: metric.decimalPrecision,
          options: metric.options,
          standardCoding: metric.standardCoding,
          validationInfo: metric.validationInfo
        },
        create: {
          id: generateUUID(),
          key: metric.key,
          displayName: metric.displayName, // correct field name
          description: metric.description,
          unit: metric.unit,
          valueType: metric.valueType, // lowercase enum values
          category: metric.category,
          isStandardized: true,
          scaleMin: metric.scaleMin,
          scaleMax: metric.scaleMax,
          decimalPrecision: metric.decimalPrecision,
          options: metric.options,
          standardCoding: metric.standardCoding,
          validationInfo: metric.validationInfo
        }
      });
      createdMetrics[metric.key] = created;
    }
    console.log(`✓ Created ${Object.keys(createdMetrics).length} metric definitions`);

    console.log('\n🏥 Creating condition presets...');
    const createdPresets = {};
    for (const preset of conditionPresets) {
      const created = await prisma.conditionPreset.upsert({
        where: { name: preset.name },
        update: {
          description: preset.description,
          isStandardized: preset.isStandardized,
          category: preset.category,
          isActive: true
        },
        create: {
          id: generateUUID(),
          name: preset.name,
          description: preset.description,
          isStandardized: preset.isStandardized,
          category: preset.category,
          isActive: true
        }
      });
      createdPresets[preset.name] = created;

      // Create diagnoses for this preset
      for (const diagnosis of preset.diagnoses) {
        await prisma.conditionPresetDiagnosis.upsert({
          where: {
            conditionPresetId_icd10: {
              conditionPresetId: created.id,
              icd10: diagnosis.icd10
            }
          },
          update: {
            snomed: diagnosis.snomed,
            label: diagnosis.label,
            isPrimary: diagnosis.isPrimary
          },
          create: {
            id: generateUUID(),
            conditionPresetId: created.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label,
            isPrimary: diagnosis.isPrimary
          }
        });
      }
    }
    console.log(`✓ Created ${Object.keys(createdPresets).length} condition presets`);

    console.log('\n📋 Creating assessment templates...');
    const createdTemplates = {};
    for (const template of assessmentTemplates) {
      const created = await prisma.assessmentTemplate.upsert({
        where: { name: template.name },
        update: {
          description: template.description,
          questions: template.questions,
          isStandardized: template.isStandardized,
          category: template.category
        },
        create: {
          id: generateUUID(),
          name: template.name,
          description: template.description,
          questions: template.questions,
          isStandardized: template.isStandardized,
          category: template.category
        }
      });
      createdTemplates[template.name] = created;

      // Create template items
      for (const item of template.items) {
        const metric = createdMetrics[item.metricKey];
        if (metric) {
          await prisma.assessmentTemplateItem.upsert({
            where: {
              templateId_metricDefinitionId: {
                templateId: created.id,
                metricDefinitionId: metric.id
              }
            },
            update: {
              displayOrder: item.displayOrder,
              isRequired: item.required,
              helpText: item.helpText
            },
            create: {
              id: generateUUID(),
              templateId: created.id,
              metricDefinitionId: metric.id,
              displayOrder: item.displayOrder,
              isRequired: item.required,
              helpText: item.helpText
            }
          });
        }
      }
    }
    console.log(`✓ Created ${Object.keys(createdTemplates).length} assessment templates`);

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`  - ${Object.keys(createdMetrics).length} metric definitions`);
    console.log(`  - ${Object.keys(createdPresets).length} condition presets`);
    console.log(`  - ${Object.keys(createdTemplates).length} assessment templates`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  seedComprehensiveFixed,
  standardizedMetrics,
  conditionPresets,
  assessmentTemplates
};

if (require.main === module) {
  seedComprehensiveFixed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}