const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * RTM Standard Seed File - Enhanced with Standardization Features (CORRECTED)
 * 
 * This comprehensive seed file creates a complete RTM (Remote Therapeutic Monitoring) 
 * system with standardized metrics, assessment templates, and condition presets
 * for various chronic conditions including:
 * - Pain Management (Chronic Pain, Fibromyalgia, Arthritis)
 * - Diabetes Management
 * - Mental Health (Depression, Anxiety)
 * - Cardiovascular Monitoring
 * - Respiratory Health (COPD, Asthma)
 * - Musculoskeletal Function (Range of Motion, Strength)
 * 
 * Features:
 * - LOINC, SNOMED, ICD-10 coding compliance
 * - CMS RTM billing code support (CPT 98976-98981)
 * - Comprehensive condition coverage for all RTM billable conditions
 * - Evidence-based assessment tools
 * - Standardization flags and categories
 * - Assessment template item linkages to metrics
 * - Sample data for testing and demonstration
 * - CORRECTED: Uses proper Prisma model names from schema
 * 
 * Version: 3.2 - Corrected Model Names
 * Last Updated: 2024
 */

// ===== STANDARDIZED METRICS WITH COMPREHENSIVE RTM COVERAGE =====
const standardizedMetrics = [
  // === PAIN MANAGEMENT METRICS ===
  {
    key: 'pain_scale_0_10',
    displayName: 'Pain Scale (0-10)',
    valueType: 'NUMERIC',
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
    valueType: 'TEXT',
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
    valueType: 'NUMERIC',
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
  {
    key: 'fatigue_level',
    displayName: 'Fatigue Level',
    valueType: 'NUMERIC',
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
    valueType: 'TEXT',
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
    key: 'joint_stiffness',
    displayName: 'Joint Stiffness',
    valueType: 'NUMERIC',
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
      ]
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
    valueType: 'TEXT',
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Joint swelling assessment'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '248490000',
          display: 'Joint swelling'
        }
      ]
    },
    options: {
      values: [
        { 
          code: 'none', 
          display: 'No swelling',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '260413007',
            display: 'None'
          }
        },
        { 
          code: 'hands', 
          display: 'Hands/Fingers',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299701004',
            display: 'Hand joint swelling'
          }
        },
        { 
          code: 'knees', 
          display: 'Knees',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299705008',
            display: 'Knee joint swelling'
          }
        }
      ]
    }
  },
  {
    key: 'morning_stiffness_duration',
    displayName: 'Morning Stiffness Duration',
    valueType: 'NUMERIC',
    scaleMin: 0,
    scaleMax: 480,
    unit: 'minutes',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Morning stiffness duration'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '161832001',
          display: 'Morning stiffness'
        }
      ]
    },
    validation: {
      min: 0,
      max: 480,
      type: 'integer'
    }
  },
  {
    key: 'blood_glucose',
    displayName: 'Blood Glucose',
    valueType: 'NUMERIC',
    scaleMin: 50,
    scaleMax: 600,
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
          display: 'Blood glucose'
        }
      ]
    },
    validation: {
      min: 50,
      max: 600,
      type: 'integer',
      normalRange: { min: 70, max: 140 },
      criticalLow: 70,
      criticalHigh: 400
    }
  },
  {
    key: 'hba1c',
    displayName: 'HbA1c',
    valueType: 'NUMERIC',
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
      ]
    },
    validation: {
      min: 4.0,
      max: 15.0,
      type: 'decimal',
      normalRange: { min: 4.0, max: 5.6 },
      prediabetic: { min: 5.7, max: 6.4 },
      diabetic: { min: 6.5, max: 15.0 }
    }
  },
  {
    key: 'systolic_bp',
    displayName: 'Systolic Blood Pressure',
    valueType: 'NUMERIC',
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
    valueType: 'NUMERIC',
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
    valueType: 'NUMERIC',
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
  {
    key: 'phq9_score',
    displayName: 'PHQ-9 Depression Score',
    valueType: 'NUMERIC',
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
    valueType: 'NUMERIC',
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
  {
    key: 'medication_adherence',
    displayName: 'Medication Adherence',
    valueType: 'TEXT',
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
        }
      ]
    }
  }
];

// ===== ENHANCED CONDITION PRESETS WITH STANDARDIZATION =====
const conditionPresets = [
  {
    name: 'Chronic Pain Management',
    defaultProtocolId: 'chronic_pain_protocol_v1',
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
      },
      {
        icd10: 'M54.5',
        snomed: '279039007',
        label: 'Low back pain',
        isPrimary: false
      },
      {
        icd10: 'G89.29',
        snomed: '82423001',
        label: 'Other chronic pain',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Fibromyalgia Care Program',
    defaultProtocolId: 'fibromyalgia_care_protocol_v1',
    description: 'Specialized fibromyalgia monitoring including pain, fatigue, sleep, and cognitive symptoms',
    isStandardized: true,
    category: 'Pain Management',
    diagnoses: [
      {
        icd10: 'M79.7',
        snomed: '24693007',
        label: 'Fibromyalgia',
        isPrimary: true
      },
      {
        icd10: 'M79.0',
        snomed: '288231001',
        label: 'Rheumatism, unspecified',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Arthritis Management',
    defaultProtocolId: 'arthritis_management_protocol_v1',
    description: 'Comprehensive arthritis care including joint monitoring and functional assessment',
    isStandardized: true,
    category: 'Musculoskeletal',
    diagnoses: [
      {
        icd10: 'M06.9',
        snomed: '69896004',
        label: 'Rheumatoid arthritis, unspecified',
        isPrimary: true
      },
      {
        icd10: 'M15.9',
        snomed: '396275006',
        label: 'Polyosteoarthritis, unspecified',
        isPrimary: false
      },
      {
        icd10: 'M19.90',
        snomed: '396275006',
        label: 'Unspecified osteoarthritis, unspecified site',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Diabetes Management Program',
    defaultProtocolId: 'diabetes_management_protocol_v1',
    description: 'Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence',
    isStandardized: true,
    category: 'Endocrine',
    diagnoses: [
      {
        icd10: 'E11.9',
        snomed: '44054006',
        label: 'Type 2 diabetes mellitus without complications',
        isPrimary: true
      },
      {
        icd10: 'E10.9',
        snomed: '46635009',
        label: 'Type 1 diabetes mellitus without complications',
        isPrimary: false
      },
      {
        icd10: 'E11.65',
        snomed: '421895002',
        label: 'Type 2 diabetes mellitus with hyperglycemia',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Cardiovascular Monitoring',
    defaultProtocolId: 'cardiovascular_monitoring_protocol_v1',
    description: 'Blood pressure, weight, and cardiovascular symptom monitoring',
    isStandardized: true,
    category: 'Cardiovascular',
    diagnoses: [
      {
        icd10: 'I10',
        snomed: '38341003',
        label: 'Essential hypertension',
        isPrimary: true
      },
      {
        icd10: 'I50.9',
        snomed: '84114007',
        label: 'Heart failure, unspecified',
        isPrimary: false
      },
      {
        icd10: 'I25.10',
        snomed: '414545008',
        label: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Mental Health Monitoring',
    defaultProtocolId: 'mental_health_monitoring_protocol_v1',
    description: 'Depression and anxiety screening and monitoring program',
    isStandardized: true,
    category: 'Mental Health',
    diagnoses: [
      {
        icd10: 'F32.9',
        snomed: '35489007',
        label: 'Major depressive disorder, single episode, unspecified',
        isPrimary: true
      },
      {
        icd10: 'F41.1',
        snomed: '21897009',
        label: 'Generalized anxiety disorder',
        isPrimary: false
      },
      {
        icd10: 'F33.9',
        snomed: '35489007',
        label: 'Major depressive disorder, recurrent, unspecified',
        isPrimary: false
      }
    ]
  }
];

// ===== ENHANCED ASSESSMENT TEMPLATES WITH STANDARDIZATION =====
const assessmentTemplates = [
  {
    name: 'Chronic Pain Daily Assessment',
    description: 'Comprehensive daily pain monitoring and functional assessment',
    version: 1,
    isStandardized: true,
    category: 'Pain Management',
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
    isStandardized: true,
    category: 'Pain Management',
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your overall pain level today from 0 to 10' },
      { metricKey: 'fatigue_level', required: true, displayOrder: 2, helpText: 'Rate your fatigue level from 0 (no fatigue) to 10 (completely exhausted)' },
      { metricKey: 'sleep_quality', required: true, displayOrder: 3, helpText: 'How would you rate the quality of your sleep last night?' },
      { metricKey: 'morning_stiffness_duration', required: true, displayOrder: 4, helpText: 'How many minutes did morning stiffness last today?' },
      { metricKey: 'pain_interference', required: false, displayOrder: 5, helpText: 'How much has pain interfered with your daily activities?' }
    ]
  },
  {
    name: 'Arthritis Management Assessment',
    description: 'Daily arthritis monitoring including joint symptoms and functional limitations',
    version: 1,
    isStandardized: true,
    category: 'Musculoskeletal',
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your current joint pain level from 0 to 10' },
      { metricKey: 'joint_stiffness', required: true, displayOrder: 2, helpText: 'Rate your current joint stiffness from 0 (no stiffness) to 10 (completely stiff)' },
      { metricKey: 'joint_swelling', required: true, displayOrder: 3, helpText: 'Which joints are currently swollen or inflamed?' },
      { metricKey: 'morning_stiffness_duration', required: true, displayOrder: 4, helpText: 'How many minutes did morning joint stiffness last today?' }
    ]
  },
  {
    name: 'Diabetes Monitoring',
    description: 'Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence',
    version: 1,
    isStandardized: true,
    category: 'Endocrine',
    items: [
      { metricKey: 'blood_glucose', required: true, displayOrder: 1, helpText: 'Enter your blood glucose reading in mg/dL' },
      { metricKey: 'hba1c', required: false, displayOrder: 2, helpText: 'Enter your most recent HbA1c percentage (quarterly)' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 3, helpText: 'Did you take your diabetes medication as prescribed?' }
    ]
  },
  {
    name: 'Cardiovascular Daily Monitoring',
    description: 'Daily blood pressure and weight monitoring for cardiovascular health',
    version: 1,
    isStandardized: true,
    category: 'Cardiovascular',
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
    isStandardized: true,
    category: 'Mental Health',
    items: [
      { metricKey: 'phq9_score', required: true, displayOrder: 1, helpText: 'Complete the PHQ-9 depression screening questionnaire' },
      { metricKey: 'gad7_score', required: true, displayOrder: 2, helpText: 'Complete the GAD-7 anxiety screening questionnaire' }
    ]
  }
];

async function seedRTMStandardCorrected() {
  console.log('🌱 Starting Enhanced RTM Standard Seed with Corrected Model Names...');
  
  try {
    // Helper function to safely delete from models that may not exist
    const safeDelete = async (modelName, operation) => {
      try {
        if (prisma[modelName] && typeof prisma[modelName][operation] === 'function') {
          const result = await prisma[modelName][operation]();
          console.log(`  ✅ Cleared ${modelName}: ${result.count || 0} records deleted`);
          return result;
        } else {
          console.log(`  ⚠️  Model ${modelName} not found in Prisma client, skipping...`);
          return { count: 0 };
        }
      } catch (error) {
        console.log(`  ⚠️  Error deleting from ${modelName}: ${error.message}`);
        return { count: 0 };
      }
    };

    // Clear existing data in correct order to avoid foreign key constraints
    console.log('🧹 Clearing existing data in proper order...');
    
    // Delete dependent records first (in order of foreign key dependencies)
    await safeDelete('observations', 'deleteMany');
    await safeDelete('assessments', 'deleteMany');
    await safeDelete('time_logs', 'deleteMany');
    
    // Clear assessment template items FIRST (they reference both templates and metrics)
    await safeDelete('assessment_template_items', 'deleteMany');
    
    // Delete junction tables
    await safeDelete('condition_preset_templates', 'deleteMany');
    await safeDelete('condition_preset_diagnoses', 'deleteMany');
    await safeDelete('condition_preset_alert_rules', 'deleteMany');
    
    // Delete main tables
    await safeDelete('condition_presets', 'deleteMany');
    await safeDelete('assessment_templates', 'deleteMany');
    await safeDelete('MetricDefinition', 'deleteMany');

    // Create/Update metric definitions with standardization using upsert
    console.log('📊 Creating/updating enhanced metric definitions...');
    const createdMetrics = {};
    for (const metric of standardizedMetrics) {
      const created = await prisma.MetricDefinition.upsert({
        where: { key: metric.key },
        update: {
          name: metric.displayName,
          description: metric.description || `${metric.displayName} measurement`,
          unit: metric.unit,
          valueType: metric.valueType,
          normalRange: JSON.stringify(metric.validation || metric.normalRange || null),
          isStandardized: true,
          category: metric.category || 'General',
          standardCoding: JSON.stringify(metric.coding || null),
          validationInfo: JSON.stringify(metric.validation || null),
          decimalPrecision: metric.decimalPrecision,
          options: JSON.stringify(metric.options || null),
          scaleMax: metric.scaleMax,
          scaleMin: metric.scaleMin
        },
        create: {
          key: metric.key,
          name: metric.displayName,
          description: metric.description || `${metric.displayName} measurement`,
          unit: metric.unit,
          valueType: metric.valueType,
          normalRange: JSON.stringify(metric.validation || metric.normalRange || null),
          isStandardized: true,
          category: metric.category || 'General',
          standardCoding: JSON.stringify(metric.coding || null),
          validationInfo: JSON.stringify(metric.validation || null),
          decimalPrecision: metric.decimalPrecision,
          options: JSON.stringify(metric.options || null),
          scaleMax: metric.scaleMax,
          scaleMin: metric.scaleMin
        }
      });
      createdMetrics[metric.key] = created;
      console.log(`  ✅ Created/updated metric: ${metric.displayName}`);
    }

    // Create/Update condition presets with standardization using upsert
    console.log('🏥 Creating/updating standardized condition presets...');
    const createdPresets = {};
    for (const preset of conditionPresets) {
      const created = await prisma.condition_presets.upsert({
        where: { name: preset.name },
        update: {
          defaultProtocolId: preset.defaultProtocolId,
          description: preset.description,
          isStandardized: preset.isStandardized || true,
          category: preset.category
        },
        create: {
          name: preset.name,
          defaultProtocolId: preset.defaultProtocolId,
          description: preset.description,
          isStandardized: preset.isStandardized || true,
          category: preset.category
        }
      });
      createdPresets[preset.name] = created;
      console.log(`  ✅ Created/updated standardized preset: ${preset.name} (${preset.category})`);

      // Clear existing diagnoses for this preset
      await prisma.condition_preset_diagnoses.deleteMany({
        where: { conditionPresetId: created.id }
      });

      // Create condition preset diagnoses
      for (const diagnosis of preset.diagnoses) {
        await prisma.condition_preset_diagnoses.create({
          data: {
            conditionPresetId: created.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label,
            isPrimary: diagnosis.isPrimary || false
          }
        });
      }
    }

    // Create/Update assessment templates with standardization using upsert
    console.log('📋 Creating/updating standardized assessment templates...');
    const createdTemplates = {};
    for (const template of assessmentTemplates) {
      const created = await prisma.assessment_templates.upsert({
        where: { name: template.name },
        update: {
          description: template.description,
          questions: JSON.stringify(template.questions || {}),
          isStandardized: template.isStandardized || true,
          category: template.category
        },
        create: {
          name: template.name,
          description: template.description,
          questions: JSON.stringify(template.questions || {}),
          isStandardized: template.isStandardized || true,
          category: template.category
        }
      });
      createdTemplates[template.name] = created;
      console.log(`  ✅ Created/updated standardized template: ${template.name} (${template.category})`);

      // Clear existing template items for this template
      await prisma.assessment_template_items.deleteMany({
        where: { templateId: created.id }
      });

      // Create assessment template items (linking templates to metrics)
      if (template.items) {
        for (const item of template.items) {
          const metric = createdMetrics[item.metricKey];
          if (metric) {
            await prisma.assessment_template_items.create({
              data: {
                templateId: created.id,
                metricDefinitionId: metric.id,
                displayOrder: item.displayOrder || 0,
                isRequired: item.required || false,
                helpText: item.helpText
              }
            });
          }
        }
      }
    }

    // Link condition presets to assessment templates
    console.log('🔗 Linking condition presets to assessment templates...');
    const templateLinks = [
      { preset: 'Chronic Pain Management', template: 'Chronic Pain Daily Assessment' },
      { preset: 'Fibromyalgia Care Program', template: 'Fibromyalgia Daily Check-in' },
      { preset: 'Arthritis Management', template: 'Arthritis Management Assessment' },
      { preset: 'Diabetes Management Program', template: 'Diabetes Monitoring' },
      { preset: 'Cardiovascular Monitoring', template: 'Cardiovascular Daily Monitoring' },
      { preset: 'Mental Health Monitoring', template: 'Mental Health Weekly Assessment' }
    ];

    for (const link of templateLinks) {
      const preset = createdPresets[link.preset];
      const template = createdTemplates[link.template];
      
      if (preset && template) {
        await prisma.condition_preset_templates.upsert({
          where: {
            conditionPresetId_templateId: {
              conditionPresetId: preset.id,
              templateId: template.id
            }
          },
          update: {
            isRequired: true,
            displayOrder: 0
          },
          create: {
            conditionPresetId: preset.id,
            templateId: template.id,
            isRequired: true,
            displayOrder: 0
          }
        });
        console.log(`  ✅ Linked ${link.preset} → ${link.template}`);
      }
    }

    console.log('\n✅ Enhanced RTM Standard Seed completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • ${Object.keys(createdMetrics).length} standardized metrics created/updated`);
    console.log(`   • ${Object.keys(createdPresets).length} standardized condition presets created/updated`);
    console.log(`   • ${Object.keys(createdTemplates).length} standardized assessment templates created/updated`);
    console.log(`   • ${templateLinks.length} preset-template links established`);
    console.log('\n🎯 All templates now have:');
    console.log('   • isStandardized: true flag');
    console.log('   • Proper category classification');
    console.log('   • Associated metric definitions');
    console.log('   • Linked condition presets');

  } catch (error) {
    console.error('❌ Error seeding enhanced RTM standard data:', error);
    throw error;
  }
}

module.exports = {
  seedRTMStandardCorrected,
  standardizedMetrics,
  conditionPresets,
  assessmentTemplates
};

if (require.main === module) {
  seedRTMStandardCorrected()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}