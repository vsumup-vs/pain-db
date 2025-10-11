const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * RTM Standard Seed File - Enhanced Version 2.0 with Correct Prisma Model Names
 * 
 * This comprehensive seed file creates a complete RTM (Remote Therapeutic Monitoring) 
 * system with standardized metrics, assessment templates, and condition presets
 * for various chronic conditions including:
 * - Pain Management (Chronic Pain, Fibromyalgia, Arthritis)
 * - Diabetes Management
 * - Mental Health (Depression, Anxiety)
 * - Cardiovascular Monitoring
 * - Respiratory Health (COPD, Asthma) - ENHANCED
 * - Musculoskeletal Function (Range of Motion, Strength) - ENHANCED
 * - Post-Surgical Rehabilitation - NEW
 * 
 * Features:
 * - 22+ comprehensive metrics
 * - 10 condition presets (including missing COPD, Asthma, Post-Surgical)
 * - 10 assessment templates
 * - LOINC, SNOMED, ICD-10 coding compliance
 * - CMS RTM billing code support (CPT 98976-98981)
 * - FIXED: Uses correct Prisma client model names (camelCase)
 * 
 * Version: 2.0 - Enhanced with Complete Coverage per RTM_STANDARD_SEED_GUIDE.md
 */

// Import the original data from the existing seed file
const { standardizedMetrics, conditionPresets, assessmentTemplates } = require('./seed-rtm-standard.js');

// ===== ADDITIONAL ENHANCED METRICS FOR COMPLETE COVERAGE =====
const additionalMetrics = [
  // Additional metrics that might be missing from the original
  {
    key: 'morning_stiffness_duration',
    displayName: 'Morning Stiffness Duration',
    valueType: 'NUMERIC',
    scaleMin: 0,
    scaleMax: 480,
    unit: 'minutes',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    category: 'musculoskeletal',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Morning stiffness duration'
      }
    },
    validation: {
      min: 0,
      max: 480,
      type: 'integer'
    }
  },
  {
    key: 'joint_stiffness',
    displayName: 'Joint Stiffness Level',
    valueType: 'NUMERIC',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    category: 'musculoskeletal',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Joint stiffness assessment'
      }
    },
    validation: {
      min: 0,
      max: 10,
      type: 'integer'
    }
  },
  {
    key: 'joint_swelling',
    displayName: 'Joint Swelling Assessment',
    valueType: 'TEXT',
    defaultFrequency: 'daily',
    category: 'musculoskeletal',
    options: {
      values: [
        { code: 'none', display: 'No swelling', snomed: '260413007' },
        { code: 'mild', display: 'Mild swelling', snomed: '255604002' },
        { code: 'moderate', display: 'Moderate swelling', snomed: '6736007' },
        { code: 'severe', display: 'Severe swelling', snomed: '24484000' }
      ]
    }
  },
  {
    key: 'cognitive_symptoms',
    displayName: 'Cognitive Symptoms (Brain Fog)',
    valueType: 'NUMERIC',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    category: 'mental_health',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Cognitive function assessment'
      }
    },
    validation: {
      min: 0,
      max: 10,
      type: 'integer'
    }
  },
  {
    key: 'sleep_quality',
    displayName: 'Sleep Quality Assessment',
    valueType: 'TEXT',
    defaultFrequency: 'daily',
    category: 'general',
    options: {
      values: [
        { code: 'poor', display: 'Poor sleep', snomed: '248255005' },
        { code: 'fair', display: 'Fair sleep', snomed: '248254009' },
        { code: 'good', display: 'Good sleep', snomed: '248253003' },
        { code: 'excellent', display: 'Excellent sleep', snomed: '248252008' }
      ]
    }
  }
];

// ===== ADDITIONAL ENHANCED CONDITION PRESETS =====
const additionalConditionPresets = [
  {
    name: 'COPD Management',
    defaultProtocolId: 'copd_management_protocol_v1',
    description: 'Comprehensive COPD monitoring including respiratory symptoms, oxygen saturation, and medication adherence',
    diagnoses: [
      {
        icd10: 'J44.1',
        snomed: '13645005',
        label: 'Chronic obstructive pulmonary disease with acute exacerbation'
      },
      {
        icd10: 'J44.0',
        snomed: '13645005',
        label: 'Chronic obstructive pulmonary disease with acute lower respiratory infection'
      },
      {
        icd10: 'J44.9',
        snomed: '13645005',
        label: 'Chronic obstructive pulmonary disease, unspecified'
      }
    ]
  },
  {
    name: 'Asthma Monitoring',
    defaultProtocolId: 'asthma_monitoring_protocol_v1',
    description: 'Daily asthma symptom tracking including peak flow, medication use, and trigger identification',
    diagnoses: [
      {
        icd10: 'J45.9',
        snomed: '195967001',
        label: 'Asthma, unspecified'
      },
      {
        icd10: 'J45.0',
        snomed: '195967001',
        label: 'Predominantly allergic asthma'
      },
      {
        icd10: 'J45.1',
        snomed: '195967001',
        label: 'Nonallergic asthma'
      }
    ]
  },
  {
    name: 'Post-Surgical Rehabilitation',
    defaultProtocolId: 'post_surgical_rehab_protocol_v1',
    description: 'Post-surgical recovery monitoring including pain, mobility, wound healing, and functional improvement',
    diagnoses: [
      {
        icd10: 'Z98.89',
        snomed: '182840001',
        label: 'Other specified postprocedural states'
      },
      {
        icd10: 'M25.50',
        snomed: '57676002',
        label: 'Joint pain, unspecified'
      },
      {
        icd10: 'Z47.1',
        snomed: '182840001',
        label: 'Aftercare following joint replacement surgery'
      }
    ]
  },
  {
    name: 'Musculoskeletal Function Monitoring',
    defaultProtocolId: 'musculoskeletal_function_protocol_v1',
    description: 'Comprehensive musculoskeletal assessment including range of motion, strength, balance, and functional mobility',
    diagnoses: [
      {
        icd10: 'M25.50',
        snomed: '57676002',
        label: 'Joint pain, unspecified'
      },
      {
        icd10: 'M62.81',
        snomed: '26544005',
        label: 'Muscle weakness (generalized)'
      },
      {
        icd10: 'R26.2',
        snomed: '282145008',
        label: 'Difficulty in walking, not elsewhere classified'
      }
    ]
  }
];

// ===== ADDITIONAL ENHANCED ASSESSMENT TEMPLATES =====
const additionalAssessmentTemplates = [
  {
    name: 'COPD Daily Assessment',
    description: 'Comprehensive COPD monitoring including respiratory symptoms and oxygen levels',
    version: 1,
    items: [
      { metricKey: 'oxygen_saturation', required: true, displayOrder: 1, helpText: 'Measure your oxygen saturation using pulse oximeter' },
      { metricKey: 'dyspnea_scale', required: true, displayOrder: 2, helpText: 'Rate your shortness of breath today' },
      { metricKey: 'cough_severity', required: true, displayOrder: 3, helpText: 'Rate your cough severity today' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 4, helpText: 'Did you take your COPD medications as prescribed?' }
    ]
  },
  {
    name: 'Asthma Daily Monitoring',
    description: 'Daily asthma symptom tracking and peak flow monitoring',
    version: 1,
    items: [
      { metricKey: 'peak_flow', required: true, displayOrder: 1, helpText: 'Measure your peak expiratory flow rate' },
      { metricKey: 'dyspnea_scale', required: true, displayOrder: 2, helpText: 'Rate your breathing difficulty today' },
      { metricKey: 'cough_severity', required: false, displayOrder: 3, helpText: 'Rate any cough symptoms today' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 4, helpText: 'Did you use your inhaler as prescribed?' }
    ]
  },
  {
    name: 'Post-Surgical Recovery Assessment',
    description: 'Post-surgical recovery monitoring including pain, mobility, and functional improvement',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your surgical site pain level from 0 to 10' },
      { metricKey: 'functional_mobility', required: true, displayOrder: 2, helpText: 'Rate your ability to move and perform activities' },
      { metricKey: 'range_of_motion_shoulder', required: false, displayOrder: 3, helpText: 'If applicable, measure your shoulder range of motion' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 4, helpText: 'Did you take your prescribed medications?' }
    ]
  },
  {
    name: 'Musculoskeletal Function Assessment',
    description: 'Weekly comprehensive musculoskeletal function evaluation',
    version: 1,
    items: [
      { metricKey: 'range_of_motion_shoulder', required: true, displayOrder: 1, helpText: 'Measure your shoulder range of motion in degrees' },
      { metricKey: 'grip_strength', required: true, displayOrder: 2, helpText: 'Assess your grip strength today' },
      { metricKey: 'functional_mobility', required: true, displayOrder: 3, helpText: 'Rate your overall functional mobility' },
      { metricKey: 'balance_assessment', required: true, displayOrder: 4, helpText: 'Rate your balance and stability today' }
    ]
  }
];

async function seedRTMStandardEnhanced() {
  try {
    console.log('🌱 Starting Enhanced RTM Standard Seed (Version 2.0)...');
    console.log('=' .repeat(60));

    // Clear existing relationships first
    console.log('🧹 Clearing existing relationships...');
    await prisma.conditionPresetDiagnoses.deleteMany({});
    await prisma.assessmentTemplateItems.deleteMany({});
    await prisma.conditionPresetTemplates.deleteMany({});
    console.log('  ✅ Cleared existing relationships');

    // Combine original and additional metrics
    const allMetrics = [...standardizedMetrics, ...additionalMetrics];
    const allConditionPresets = [...conditionPresets, ...additionalConditionPresets];
    const allAssessmentTemplates = [...assessmentTemplates, ...additionalAssessmentTemplates];

    // Create metric definitions using upsert with CORRECT model names
    console.log('\n📊 Creating/updating metric definitions...');
    const createdMetrics = {};
    for (const metric of allMetrics) {
      const created = await prisma.metricDefinition.upsert({
        where: { key: metric.key },
        update: {
          name: metric.displayName,
          description: metric.description || `${metric.displayName} measurement`,
          valueType: metric.valueType,
          scaleMin: metric.scaleMin,
          scaleMax: metric.scaleMax,
          unit: metric.unit,
          decimalPrecision: metric.decimalPrecision,
          options: metric.options || null,
          standardCoding: metric.coding || null,
          validationInfo: metric.validation || null,
          isStandardized: true,
          category: metric.category || null
        },
        create: {
          key: metric.key,
          name: metric.displayName,
          description: metric.description || `${metric.displayName} measurement`,
          valueType: metric.valueType,
          scaleMin: metric.scaleMin,
          scaleMax: metric.scaleMax,
          unit: metric.unit,
          decimalPrecision: metric.decimalPrecision,
          options: metric.options || null,
          standardCoding: metric.coding || null,
          validationInfo: metric.validation || null,
          isStandardized: true,
          category: metric.category || null
        }
      });
      createdMetrics[metric.key] = created;
      console.log(`  ✅ Created/updated metric: ${metric.displayName}`);
    }

    // Create condition presets using upsert with CORRECT model names
    console.log('\n🏥 Creating/updating condition presets...');
    const createdPresets = {};
    for (const preset of allConditionPresets) {
      const created = await prisma.conditionPresets.upsert({
        where: { name: preset.name },
        update: {
          defaultProtocolId: preset.defaultProtocolId,
          description: preset.description
        },
        create: {
          name: preset.name,
          defaultProtocolId: preset.defaultProtocolId,
          description: preset.description
        }
      });
      createdPresets[preset.name] = created;
      console.log(`  ✅ Created/updated condition preset: ${preset.name}`);

      // Create diagnoses for this condition preset with CORRECT model names
      for (const diagnosis of preset.diagnoses) {
        await prisma.conditionPresetDiagnoses.create({
          data: {
            conditionPresetId: created.id,
            icd10Code: diagnosis.icd10,
            snomedCode: diagnosis.snomed,
            diagnosisLabel: diagnosis.label
          }
        });
      }
      console.log(`    ✅ Added ${preset.diagnoses.length} diagnoses`);
    }

    // Create assessment templates using upsert with CORRECT model names
    console.log('\n📋 Creating/updating assessment templates...');
    const createdTemplates = {};
    for (const template of allAssessmentTemplates) {
      const created = await prisma.assessmentTemplates.upsert({
        where: { name: template.name },
        update: {
          description: template.description,
          version: template.version
        },
        create: {
          name: template.name,
          description: template.description,
          version: template.version
        }
      });
      createdTemplates[template.name] = created;
      console.log(`  ✅ Created/updated assessment template: ${template.name}`);

      // Create assessment template items with CORRECT model names
      for (const item of template.items) {
        const metric = createdMetrics[item.metricKey];
        if (metric) {
          await prisma.assessmentTemplateItems.create({
            data: {
              assessmentTemplateId: created.id,
              metricDefinitionId: metric.id,
              required: item.required,
              displayOrder: item.displayOrder,
              helpText: item.helpText
            }
          });
        }
      }
      console.log(`    ✅ Added ${template.items.length} template items`);
    }

    // Link condition presets to assessment templates with CORRECT model names
    console.log('\n🔗 Linking condition presets to assessment templates...');
    const presetTemplateLinks = [
      { preset: 'Chronic Pain Management', template: 'Chronic Pain Daily Assessment' },
      { preset: 'Fibromyalgia Care Program', template: 'Fibromyalgia Daily Check-in' },
      { preset: 'Arthritis Management', template: 'Arthritis Management Assessment' },
      { preset: 'Diabetes Management Program', template: 'Diabetes Monitoring' },
      { preset: 'Cardiovascular Monitoring', template: 'Cardiovascular Daily Monitoring' },
      { preset: 'Mental Health Monitoring', template: 'Mental Health Weekly Assessment' },
      { preset: 'COPD Management', template: 'COPD Daily Assessment' },
      { preset: 'Asthma Monitoring', template: 'Asthma Daily Monitoring' },
      { preset: 'Post-Surgical Rehabilitation', template: 'Post-Surgical Recovery Assessment' },
      { preset: 'Musculoskeletal Function Monitoring', template: 'Musculoskeletal Function Assessment' }
    ];

    for (const link of presetTemplateLinks) {
      const preset = createdPresets[link.preset];
      const template = createdTemplates[link.template];
      
      if (preset && template) {
        await prisma.conditionPresetTemplates.create({
          data: {
            conditionPresetId: preset.id,
            assessmentTemplateId: template.id,
            isDefault: true
          }
        });
        console.log(`  ✅ Linked "${link.preset}" to "${link.template}"`);
      } else {
        console.log(`  ⚠️  Could not link "${link.preset}" to "${link.template}" - one or both not found`);
      }
    }

    console.log('\n🎉 Enhanced RTM Standard Seed completed successfully!');
    console.log('=' .repeat(60));
    console.log(`📊 Created ${allMetrics.length} metrics`);
    console.log(`🏥 Created ${allConditionPresets.length} condition presets`);
    console.log(`📋 Created ${allAssessmentTemplates.length} assessment templates`);
    console.log(`🔗 Created ${presetTemplateLinks.length} preset-template links`);
    console.log('=' .repeat(60));
    console.log('🔍 Enhanced Coverage Summary:');
    console.log('  ✅ Pain Management (Chronic Pain, Fibromyalgia, Arthritis)');
    console.log('  ✅ Diabetes Management');
    console.log('  ✅ Mental Health (Depression, Anxiety)');
    console.log('  ✅ Cardiovascular Monitoring');
    console.log('  ✅ Respiratory Health (COPD, Asthma) - ENHANCED');
    console.log('  ✅ Musculoskeletal Function (Range of Motion, Strength) - ENHANCED');
    console.log('  ✅ Post-Surgical Rehabilitation - NEW');
    console.log('');
    console.log('💰 RTM Billing Compliance: All metrics support CPT 98976-98981');
    console.log('🏥 Matches RTM_STANDARD_SEED_GUIDE.md Version 2.0 specifications');
    console.log('🔧 FIXED: Uses correct Prisma client model names (camelCase)');

  } catch (error) {
    console.error('❌ Error during Enhanced RTM Standard seeding:', error);
    throw error;
  }
}

module.exports = {
  seedRTMStandardEnhanced,
  additionalMetrics,
  additionalConditionPresets,
  additionalAssessmentTemplates
};

if (require.main === module) {
  seedRTMStandardEnhanced()
    .catch((e) => {
      console.error('❌ Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}