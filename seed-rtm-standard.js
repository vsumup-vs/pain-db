const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

/**
 * RTM Standard Seed File
 * 
 * This comprehensive seed file creates a complete RTM (Remote Therapeutic Monitoring) 
 * system with standardized metrics, assessment templates, and condition presets
 * for various chronic conditions including:
 * - Pain Management (Chronic Pain, Fibromyalgia, Arthritis)
 * - Diabetes Management
 * - Mental Health (Depression, Anxiety)
 * - Cardiovascular Monitoring
 * 
 * Features:
 * - LOINC, SNOMED, ICD-10 coding compliance
 * - CMS RTM billing code support (CPT 98976-98981)
 * - Standardized assessment templates
 * - Condition-specific metrics and presets
 * - Sample data for testing and demonstration
 */

// ===== STANDARDIZED METRICS WITH CODING SYSTEMS =====
const standardizedMetrics = [
  // === PAIN MANAGEMENT METRICS ===
  {
    key: 'pain_scale_0_10',
    displayName: 'Pain Scale (0-10)',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
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
      ],
      mappings: {
        icd10: 'R52',
        description: 'Pain, unspecified'
      }
    },
    validation: {
      min: 0,
      max: 10,
      type: 'integer',
      required: true
    }
  },
  {
    key: 'pain_location',
    displayName: 'Pain Location',
    valueType: 'categorical',
    defaultFrequency: 'daily',
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
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '61758-9',
        display: 'Pain interference with general activity'
      }
    },
    validation: {
      min: 0,
      max: 10,
      type: 'integer'
    }
  },

  // === FIBROMYALGIA-SPECIFIC METRICS ===
  {
    key: 'fatigue_level',
    displayName: 'Fatigue Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
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
      ],
      mappings: {
        icd10: 'R53.1',
        description: 'Weakness'
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
    displayName: 'Sleep Quality',
    valueType: 'ordinal',
    scaleMin: 1,
    scaleMax: 5,
    unit: 'scale',
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '93832-4',
        display: 'Sleep quality'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '248254009',
          display: 'Sleep pattern'
        }
      ]
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
    key: 'cognitive_symptoms',
    displayName: 'Cognitive Symptoms (Brain Fog)',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Cognitive function assessment'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '386806002',
          display: 'Impaired cognition'
        }
      ]
    },
    options: {
      values: [
        { code: '0', display: 'None', snomed: '260413007' },
        { code: '1', display: 'Mild', snomed: '255604002' },
        { code: '2', display: 'Moderate', snomed: '6736007' },
        { code: '3', display: 'Severe', snomed: '24484000' },
        { code: '4', display: 'Very Severe', snomed: '442452003' }
      ]
    }
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

  // === ARTHRITIS-SPECIFIC METRICS ===
  {
    key: 'joint_stiffness',
    displayName: 'Joint Stiffness Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Joint stiffness severity - 0-10 verbal numeric rating [Score] - Reported'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '84445001',
          display: 'Joint stiffness'
        }
      ],
      mappings: {
        icd10: 'M25.60',
        description: 'Stiffness of joint, unspecified'
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
    displayName: 'Joint Swelling',
    valueType: 'categorical',
    defaultFrequency: 'daily',
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

  // === DIABETES MANAGEMENT METRICS ===
  {
    key: 'blood_glucose',
    displayName: 'Blood Glucose',
    valueType: 'numeric',
    scaleMin: 50,
    scaleMax: 400,
    unit: 'mg/dL',
    decimalPrecision: 0,
    defaultFrequency: 'multiple_daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33747-0',
        display: 'Glucose [Mass/volume] in Blood by Glucometer'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '33747-0',
          display: 'Blood glucose measurement'
        }
      ],
      mappings: {
        cpt: '82947',
        description: 'Glucose; quantitative, blood (except urine)'
      }
    },
    validation: {
      min: 50,
      max: 400,
      type: 'integer',
      criticalLow: 70,
      criticalHigh: 250
    }
  },
  {
    key: 'hba1c',
    displayName: 'HbA1c',
    valueType: 'numeric',
    scaleMin: 4.0,
    scaleMax: 15.0,
    unit: '%',
    decimalPrecision: 1,
    defaultFrequency: 'quarterly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '4548-4',
        display: 'Hemoglobin A1c/Hemoglobin.total in Blood'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '43396009',
          display: 'Hemoglobin A1c measurement'
        }
      ],
      mappings: {
        cpt: '83036',
        description: 'Hemoglobin; glycosylated (A1C)'
      }
    },
    validation: {
      min: 4.0,
      max: 15.0,
      type: 'decimal',
      targetRange: { min: 6.5, max: 7.0 }
    }
  },

  // === CARDIOVASCULAR METRICS ===
  {
    key: 'systolic_bp',
    displayName: 'Systolic Blood Pressure',
    valueType: 'numeric',
    scaleMin: 70,
    scaleMax: 250,
    unit: 'mmHg',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '8480-6',
        display: 'Systolic blood pressure'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '271649006',
          display: 'Systolic blood pressure'
        }
      ]
    },
    validation: {
      min: 70,
      max: 250,
      type: 'integer',
      normalRange: { min: 90, max: 120 }
    }
  },
  {
    key: 'diastolic_bp',
    displayName: 'Diastolic Blood Pressure',
    valueType: 'numeric',
    scaleMin: 40,
    scaleMax: 150,
    unit: 'mmHg',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '8462-4',
        display: 'Diastolic blood pressure'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '271650006',
          display: 'Diastolic blood pressure'
        }
      ]
    },
    validation: {
      min: 40,
      max: 150,
      type: 'integer',
      normalRange: { min: 60, max: 80 }
    }
  },
  {
    key: 'weight',
    displayName: 'Body Weight',
    valueType: 'numeric',
    scaleMin: 50,
    scaleMax: 500,
    unit: 'lbs',
    decimalPrecision: 1,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '29463-7',
        display: 'Body weight'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '27113001',
          display: 'Body weight'
        }
      ]
    },
    validation: {
      min: 50,
      max: 500,
      type: 'decimal'
    }
  },

  // === MENTAL HEALTH METRICS ===
  {
    key: 'phq9_score',
    displayName: 'PHQ-9 Depression Score',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 27,
    unit: 'score',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44249-1',
        display: 'PHQ-9 quick depression assessment panel'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '35489007',
          display: 'Depressive disorder'
        }
      ]
    },
    validation: {
      min: 0,
      max: 27,
      type: 'integer',
      severityRanges: {
        minimal: { min: 0, max: 4 },
        mild: { min: 5, max: 9 },
        moderate: { min: 10, max: 14 },
        moderatelySevere: { min: 15, max: 19 },
        severe: { min: 20, max: 27 }
      }
    }
  },
  {
    key: 'gad7_score',
    displayName: 'GAD-7 Anxiety Score',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 21,
    unit: 'score',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '70274-6',
        display: 'Generalized anxiety disorder 7 item (GAD-7)'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '48694002',
          display: 'Anxiety'
        }
      ]
    },
    validation: {
      min: 0,
      max: 21,
      type: 'integer',
      severityRanges: {
        minimal: { min: 0, max: 4 },
        mild: { min: 5, max: 9 },
        moderate: { min: 10, max: 14 },
        severe: { min: 15, max: 21 }
      }
    }
  },

  // === MEDICATION ADHERENCE ===
  {
    key: 'medication_adherence',
    displayName: 'Medication Adherence',
    valueType: 'categorical',
    defaultFrequency: 'multiple_daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '71799-1',
        display: 'Medication adherence'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '182840001',
          display: 'Drug compliance good'
        }
      ]
    },
    options: {
      values: [
        { 
          code: 'taken_on_time', 
          display: 'Taken on time',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '182840001',
            display: 'Drug compliance good'
          }
        },
        { 
          code: 'taken_late', 
          display: 'Taken late',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '182841002',
            display: 'Drug compliance poor'
          }
        },
        { 
          code: 'missed_dose', 
          display: 'Missed dose',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '182842009',
            display: 'Drug not taken'
          }
        },
        { 
          code: 'double_dose', 
          display: 'Double dose taken',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '182843004',
            display: 'Drug overdose'
          }
        }
      ]
    }
  }
];

// ===== CONDITION PRESETS WITH STANDARDIZED CODING =====
const conditionPresets = [
  {
    name: 'Chronic Pain Management',
    defaultProtocolId: 'chronic_pain_protocol_v1',
    description: 'Comprehensive chronic pain monitoring and management program',
    diagnoses: [
      {
        icd10: 'M79.3',
        snomed: '82423001',
        label: 'Chronic pain syndrome'
      },
      {
        icd10: 'M25.50',
        snomed: '57676002',
        label: 'Joint pain, unspecified'
      },
      {
        icd10: 'M54.5',
        snomed: '279039007',
        label: 'Low back pain'
      },
      {
        icd10: 'G89.29',
        snomed: '82423001',
        label: 'Other chronic pain'
      }
    ]
  },
  {
    name: 'Fibromyalgia Care Program',
    defaultProtocolId: 'fibromyalgia_care_protocol_v1',
    description: 'Specialized fibromyalgia monitoring including pain, fatigue, sleep, and cognitive symptoms',
    diagnoses: [
      {
        icd10: 'M79.7',
        snomed: '24693007',
        label: 'Fibromyalgia'
      },
      {
        icd10: 'M79.0',
        snomed: '288231001',
        label: 'Rheumatism, unspecified'
      }
    ]
  },
  {
    name: 'Arthritis Management',
    defaultProtocolId: 'arthritis_management_protocol_v1',
    description: 'Comprehensive arthritis care including joint monitoring and functional assessment',
    diagnoses: [
      {
        icd10: 'M06.9',
        snomed: '69896004',
        label: 'Rheumatoid arthritis, unspecified'
      },
      {
        icd10: 'M15.9',
        snomed: '396275006',
        label: 'Polyosteoarthritis, unspecified'
      },
      {
        icd10: 'M19.90',
        snomed: '396275006',
        label: 'Unspecified osteoarthritis, unspecified site'
      }
    ]
  },
  {
    name: 'Diabetes Management Program',
    defaultProtocolId: 'diabetes_management_protocol_v1',
    description: 'Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence',
    diagnoses: [
      {
        icd10: 'E11.9',
        snomed: '44054006',
        label: 'Type 2 diabetes mellitus without complications'
      },
      {
        icd10: 'E10.9',
        snomed: '46635009',
        label: 'Type 1 diabetes mellitus without complications'
      },
      {
        icd10: 'E11.65',
        snomed: '421895002',
        label: 'Type 2 diabetes mellitus with hyperglycemia'
      }
    ]
  },
  {
    name: 'Cardiovascular Monitoring',
    defaultProtocolId: 'cardiovascular_monitoring_protocol_v1',
    description: 'Blood pressure, weight, and cardiovascular symptom monitoring',
    diagnoses: [
      {
        icd10: 'I10',
        snomed: '38341003',
        label: 'Essential hypertension'
      },
      {
        icd10: 'I50.9',
        snomed: '84114007',
        label: 'Heart failure, unspecified'
      },
      {
        icd10: 'I25.10',
        snomed: '414545008',
        label: 'Atherosclerotic heart disease of native coronary artery without angina pectoris'
      }
    ]
  },
  {
    name: 'Mental Health Monitoring',
    defaultProtocolId: 'mental_health_monitoring_protocol_v1',
    description: 'Depression and anxiety screening and monitoring program',
    diagnoses: [
      {
        icd10: 'F32.9',
        snomed: '35489007',
        label: 'Major depressive disorder, single episode, unspecified'
      },
      {
        icd10: 'F41.1',
        snomed: '21897009',
        label: 'Generalized anxiety disorder'
      },
      {
        icd10: 'F33.9',
        snomed: '35489007',
        label: 'Major depressive disorder, recurrent, unspecified'
      }
    ]
  }
];

// ===== ASSESSMENT TEMPLATES =====
const assessmentTemplates = [
  {
    name: 'Chronic Pain Daily Assessment',
    description: 'Comprehensive daily pain monitoring and functional assessment',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your current pain level from 0 (no pain) to 10 (worst pain imaginable)' },
      { metricKey: 'pain_location', required: true, displayOrder: 2, helpText: 'Select the primary location of your pain today' },
      { metricKey: 'pain_interference', required: true, displayOrder: 3, helpText: 'How much has pain interfered with your daily activities today?' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 4, helpText: 'Did you take your pain medication as prescribed?' }
    ]
  },
  {
    name: 'Fibromyalgia Daily Check-in',
    description: 'Comprehensive fibromyalgia symptom tracking including pain, fatigue, sleep, and cognitive symptoms',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your overall pain level today from 0 to 10' },
      { metricKey: 'fatigue_level', required: true, displayOrder: 2, helpText: 'Rate your fatigue level from 0 (no fatigue) to 10 (completely exhausted)' },
      { metricKey: 'sleep_quality', required: true, displayOrder: 3, helpText: 'How would you rate the quality of your sleep last night?' },
      { metricKey: 'morning_stiffness_duration', required: true, displayOrder: 4, helpText: 'How many minutes did morning stiffness last today?' },
      { metricKey: 'cognitive_symptoms', required: true, displayOrder: 5, helpText: 'Rate your brain fog or cognitive difficulties today' },
      { metricKey: 'pain_interference', required: false, displayOrder: 6, helpText: 'How much has pain interfered with your daily activities?' }
    ]
  },
  {
    name: 'Arthritis Management Assessment',
    description: 'Daily arthritis monitoring including joint symptoms and functional limitations',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your current joint pain level from 0 to 10' },
      { metricKey: 'joint_stiffness', required: true, displayOrder: 2, helpText: 'Rate your current joint stiffness from 0 (no stiffness) to 10 (completely stiff)' },
      { metricKey: 'joint_swelling', required: true, displayOrder: 3, helpText: 'Which joints are currently swollen or inflamed?' },
      { metricKey: 'morning_stiffness_duration', required: true, displayOrder: 4, helpText: 'How many minutes did morning joint stiffness last today?' }
    ]
  },
  {
    name: 'Diabetes Monitoring',
    description: 'Blood glucose tracking and diabetes management monitoring',
    version: 1,
    items: [
      { metricKey: 'blood_glucose', required: true, displayOrder: 1, helpText: 'Enter your blood glucose reading in mg/dL' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 2, helpText: 'Did you take your diabetes medication as prescribed?' }
    ]
  },
  {
    name: 'Cardiovascular Daily Monitoring',
    description: 'Daily blood pressure and weight monitoring for cardiovascular health',
    version: 1,
    items: [
      { metricKey: 'systolic_bp', required: true, displayOrder: 1, helpText: 'Enter your systolic blood pressure reading' },
      { metricKey: 'diastolic_bp', required: true, displayOrder: 2, helpText: 'Enter your diastolic blood pressure reading' },
      { metricKey: 'weight', required: true, displayOrder: 3, helpText: 'Enter your current weight in pounds' }
    ]
  },
  {
    name: 'Mental Health Weekly Assessment',
    description: 'Weekly depression and anxiety screening using standardized tools',
    version: 1,
    items: [
      { metricKey: 'phq9_score', required: true, displayOrder: 1, helpText: 'Complete the PHQ-9 depression screening questionnaire' },
      { metricKey: 'gad7_score', required: true, displayOrder: 2, helpText: 'Complete the GAD-7 anxiety screening questionnaire' }
    ]
  }
];

// ===== MAIN SEEDING FUNCTION =====
async function seedRTMStandard() {
  console.log('🌱 Starting RTM Standard Database Seeding...');
  console.log('📋 This will create a complete RTM system with standardized metrics, templates, and condition presets');

  try {
    // 0. Clean existing data (in reverse dependency order)
    console.log('🧹 Cleaning existing data...');
    await prisma.observation.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.timeLog.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conditionPresetAlertRule.deleteMany({});
    await prisma.conditionPresetTemplate.deleteMany({});
    await prisma.conditionPresetDiagnosis.deleteMany({});
    await prisma.assessmentTemplateItem.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.alertRule.deleteMany({});
    await prisma.conditionPreset.deleteMany({});
    await prisma.assessmentTemplate.deleteMany({});
    await prisma.metricDefinition.deleteMany({});
    await prisma.clinician.deleteMany({});
    await prisma.patient.deleteMany({});
    console.log('✅ Database cleaned');

    // 1. Create Standardized Metric Definitions
    console.log('📊 Creating standardized metric definitions...');
    const createdMetrics = [];
    for (const metric of standardizedMetrics) {
      const createdMetric = await prisma.metricDefinition.create({
        data: metric
      });
      createdMetrics.push(createdMetric);
      console.log(`✅ Created metric: ${metric.displayName}`);
    }

    // 2. Create Assessment Templates
    console.log('📋 Creating assessment templates...');
    const createdTemplates = [];
    for (const template of assessmentTemplates) {
      const createdTemplate = await prisma.assessmentTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          version: template.version,
          isStandardized: true
        }
      });
      createdTemplates.push(createdTemplate);
      console.log(`✅ Created template: ${template.name}`);

      // Create template items
      for (const item of template.items) {
        const metric = createdMetrics.find(m => m.key === item.metricKey);
        if (metric) {
          await prisma.assessmentTemplateItem.create({
            data: {
              templateId: createdTemplate.id,
              metricDefinitionId: metric.id,
              required: item.required,
              displayOrder: item.displayOrder,
              helpText: item.helpText
            }
          });
          console.log(`  ✅ Added ${metric.displayName} to ${template.name}`);
        }
      }
    }

    // 3. Create Condition Presets
    console.log('🏥 Creating condition presets...');
    const createdPresets = [];
    for (const preset of conditionPresets) {
      const createdPreset = await prisma.conditionPreset.create({
        data: {
          name: preset.name,
          defaultProtocolId: preset.defaultProtocolId
        }
      });
      createdPresets.push(createdPreset);
      console.log(`✅ Created condition preset: ${preset.name}`);

      // Create condition preset diagnoses
      for (const diagnosis of preset.diagnoses) {
        await prisma.conditionPresetDiagnosis.create({
          data: {
            presetId: createdPreset.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label
          }
        });
        console.log(`  ✅ Added diagnosis: ${diagnosis.label} (${diagnosis.icd10})`);
      }
    }

    // 4. Link Templates to Condition Presets
    console.log('🔗 Linking templates to condition presets...');
    const templatePresetMappings = [
      { presetName: 'Chronic Pain Management', templateName: 'Chronic Pain Daily Assessment' },
      { presetName: 'Fibromyalgia Care Program', templateName: 'Fibromyalgia Daily Check-in' },
      { presetName: 'Arthritis Management', templateName: 'Arthritis Management Assessment' },
      { presetName: 'Diabetes Management Program', templateName: 'Diabetes Monitoring' },
      { presetName: 'Cardiovascular Monitoring', templateName: 'Cardiovascular Daily Monitoring' },
      { presetName: 'Mental Health Monitoring', templateName: 'Mental Health Weekly Assessment' }
    ];

    for (const mapping of templatePresetMappings) {
      const preset = createdPresets.find(p => p.name === mapping.presetName);
      const template = createdTemplates.find(t => t.name === mapping.templateName);
      
      if (preset && template) {
        await prisma.conditionPresetTemplate.create({
          data: {
            presetId: preset.id,
            templateId: template.id
          }
        });
        console.log(`✅ Linked ${mapping.templateName} to ${mapping.presetName}`);
      }
    }

    // 5. Create Sample Patients for Testing
    console.log('👥 Creating sample patients...');
    const samplePatients = await Promise.all([
      prisma.patient.create({
        data: {
          mrn: 'RTM001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123',
          dateOfBirth: new Date('1985-03-15'),
          gender: 'MALE',
          address: '123 Main St, Anytown, USA',
          emergencyContact: 'Jane Doe - +1-555-0124',
          medicalHistory: 'Chronic lower back pain, Fibromyalgia',
          allergies: 'Penicillin',
          medications: 'Gabapentin 300mg, Duloxetine 60mg',
          insuranceInfo: 'Blue Cross Blue Shield - Policy #12345'
        }
      }),
      prisma.patient.create({
        data: {
          mrn: 'RTM002',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1-555-0125',
          dateOfBirth: new Date('1962-07-22'),
          gender: 'FEMALE',
          address: '456 Oak Ave, Somewhere, USA',
          emergencyContact: 'Mike Johnson - +1-555-0126',
          medicalHistory: 'Type 2 Diabetes, Hypertension',
          allergies: 'Shellfish',
          medications: 'Metformin 1000mg, Lisinopril 10mg',
          insuranceInfo: 'Aetna - Policy #67890'
        }
      }),
      prisma.patient.create({
        data: {
          mrn: 'RTM003',
          firstName: 'Michael',
          lastName: 'Brown',
          email: 'michael.brown@example.com',
          phone: '+1-555-0127',
          dateOfBirth: new Date('1978-11-08'),
          gender: 'MALE',
          address: '789 Pine St, Elsewhere, USA',
          emergencyContact: 'Lisa Brown - +1-555-0128',
          medicalHistory: 'Rheumatoid Arthritis, Depression',
          allergies: 'None known',
          medications: 'Methotrexate 15mg, Sertraline 50mg',
          insuranceInfo: 'United Healthcare - Policy #11111'
        }
      })
    ]);

    // 6. Create Sample Clinicians
    console.log('👨‍⚕️ Creating sample clinicians...');
    const sampleClinicians = await Promise.all([
      prisma.clinician.create({
        data: {
          npi: '1234567890',
          firstName: 'Dr. Alice',
          lastName: 'Smith',
          email: 'alice.smith@hospital.com',
          phone: '+1-555-0200',
          specialization: 'Pain Management',
          licenseNumber: 'MD123456',
          department: 'Anesthesiology'
        }
      }),
      prisma.clinician.create({
        data: {
          npi: '2345678901',
          firstName: 'Dr. Robert',
          lastName: 'Wilson',
          email: 'robert.wilson@hospital.com',
          phone: '+1-555-0201',
          specialization: 'Endocrinology',
          licenseNumber: 'MD234567',
          department: 'Internal Medicine'
        }
      }),
      prisma.clinician.create({
        data: {
          npi: '3456789012',
          firstName: 'Dr. Emily',
          lastName: 'Davis',
          email: 'emily.davis@hospital.com',
          phone: '+1-555-0202',
          specialization: 'Rheumatology',
          licenseNumber: 'MD345678',
          department: 'Rheumatology'
        }
      })
    ]);

    console.log('🎉 RTM Standard Database Seeding Completed Successfully!');
    console.log('📊 Summary:');
    console.log(`   • ${createdMetrics.length} standardized metrics created`);
    console.log(`   • ${createdTemplates.length} assessment templates created`);
    console.log(`   • ${createdPresets.length} condition presets created`);
    console.log(`   • ${samplePatients.length} sample patients created`);
    console.log(`   • ${sampleClinicians.length} sample clinicians created`);
    console.log('');
    console.log('🏥 Available RTM Programs:');
    createdPresets.forEach(preset => {
      console.log(`   • ${preset.name}`);
    });
    console.log('');
    console.log('📋 Available Assessment Templates:');
    createdTemplates.forEach(template => {
      console.log(`   • ${template.name}`);
    });
    console.log('');
    console.log('✅ The system is now ready for RTM program enrollment and monitoring!');

  } catch (error) {
    console.error('❌ Error during RTM standard seeding:', error);
    throw error;
  }
}

// Export for use in other files
module.exports = {
  seedRTMStandard,
  standardizedMetrics,
  conditionPresets,
  assessmentTemplates
};

// Run if called directly
if (require.main === module) {
  seedRTMStandard()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}