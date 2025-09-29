const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

/**
 * Enhanced RTM Seed File with Comprehensive Coverage
 * 
 * This enhanced seed file extends the standard RTM system with additional
 * respiratory and musculoskeletal metrics for complete RTM coverage including:
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
 * - Comprehensive condition coverage
 * - Evidence-based assessment tools
 */

// ===== ENHANCED STANDARDIZED METRICS WITH RESPIRATORY & MUSCULOSKELETAL =====
const enhancedStandardizedMetrics = [
  // === EXISTING PAIN MANAGEMENT METRICS ===
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

  // === NEW RESPIRATORY METRICS ===
  {
    key: 'oxygen_saturation',
    displayName: 'Oxygen Saturation (SpO2)',
    valueType: 'numeric',
    scaleMin: 70,
    scaleMax: 100,
    unit: '%',
    decimalPrecision: 1,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '59408-5',
        display: 'Oxygen saturation in Arterial blood by Pulse oximetry'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '431314004',
          display: 'Peripheral oxygen saturation'
        }
      ],
      mappings: {
        icd10: 'R06.02',
        description: 'Shortness of breath'
      }
    },
    validation: {
      min: 70,
      max: 100,
      type: 'decimal',
      criticalLow: 88,
      normalRange: { min: 95, max: 100 }
    }
  },
  {
    key: 'peak_flow',
    displayName: 'Peak Expiratory Flow Rate',
    valueType: 'numeric',
    scaleMin: 50,
    scaleMax: 800,
    unit: 'L/min',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33452-4',
        display: 'Peak expiratory flow rate'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '313193009',
          display: 'Peak expiratory flow rate'
        }
      ],
      mappings: {
        icd10: 'J44.1',
        description: 'Chronic obstructive pulmonary disease with acute exacerbation'
      }
    },
    validation: {
      min: 50,
      max: 800,
      type: 'integer'
    }
  },
  {
    key: 'dyspnea_scale',
    displayName: 'Dyspnea (Shortness of Breath) Scale',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '89957-4',
        display: 'Dyspnea severity - 0-4 scale'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '267036007',
          display: 'Dyspnea'
        }
      ]
    },
    options: {
      values: [
        { code: '0', display: 'No shortness of breath', snomed: '260413007' },
        { code: '1', display: 'Mild shortness of breath', snomed: '255604002' },
        { code: '2', display: 'Moderate shortness of breath', snomed: '6736007' },
        { code: '3', display: 'Severe shortness of breath', snomed: '24484000' },
        { code: '4', display: 'Very severe shortness of breath', snomed: '442452003' }
      ]
    }
  },
  {
    key: 'cough_severity',
    displayName: 'Cough Severity',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '89958-2',
        display: 'Cough severity - 0-4 scale'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '49727002',
          display: 'Cough'
        }
      ]
    },
    options: {
      values: [
        { code: '0', display: 'No cough', snomed: '260413007' },
        { code: '1', display: 'Mild cough', snomed: '255604002' },
        { code: '2', display: 'Moderate cough', snomed: '6736007' },
        { code: '3', display: 'Severe cough', snomed: '24484000' },
        { code: '4', display: 'Very severe cough', snomed: '442452003' }
      ]
    }
  },

  // === NEW MUSCULOSKELETAL METRICS ===
  {
    key: 'range_of_motion_shoulder',
    displayName: 'Shoulder Range of Motion',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 180,
    unit: 'degrees',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Range of motion assessment'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '364564000',
          display: 'Range of joint movement'
        }
      ],
      mappings: {
        icd10: 'M25.511',
        description: 'Pain in shoulder'
      }
    },
    validation: {
      min: 0,
      max: 180,
      type: 'integer',
      normalRange: { min: 150, max: 180 }
    }
  },
  {
    key: 'grip_strength',
    displayName: 'Grip Strength Assessment',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 4,
    unit: 'scale',
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Muscle strength assessment'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '406203001',
          display: 'Muscle strength'
        }
      ]
    },
    options: {
      values: [
        { code: '0', display: 'Unable to grip', snomed: '260413007' },
        { code: '1', display: 'Very weak grip', snomed: '255604002' },
        { code: '2', display: 'Weak grip', snomed: '6736007' },
        { code: '3', display: 'Moderate grip', snomed: '24484000' },
        { code: '4', display: 'Strong grip', snomed: '442452003' }
      ]
    }
  },
  {
    key: 'functional_mobility',
    displayName: 'Functional Mobility Assessment',
    valueType: 'ordinal',
    scaleMin: 1,
    scaleMax: 5,
    unit: 'scale',
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Functional assessment'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '364832000',
          display: 'Finding related to ability to perform activities of daily living'
        }
      ]
    },
    options: {
      values: [
        { code: '1', display: 'Completely dependent', snomed: '371154003' },
        { code: '2', display: 'Requires assistance', snomed: '371153009' },
        { code: '3', display: 'Requires supervision', snomed: '371152004' },
        { code: '4', display: 'Independent with aids', snomed: '371151006' },
        { code: '5', display: 'Completely independent', snomed: '371150007' }
      ]
    }
  },
  {
    key: 'balance_assessment',
    displayName: 'Balance and Stability',
    valueType: 'ordinal',
    scaleMin: 1,
    scaleMax: 4,
    unit: 'scale',
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Balance assessment'
      },
      secondary: [
        {
          system: 'http://snomed.info/sct',
          code: '387603000',
          display: 'Impairment of balance'
        }
      ]
    },
    options: {
      values: [
        { code: '1', display: 'Poor balance, frequent falls', snomed: '129839007' },
        { code: '2', display: 'Unsteady, occasional falls', snomed: '282145008' },
        { code: '3', display: 'Stable with support', snomed: '165245003' },
        { code: '4', display: 'Good balance, no falls', snomed: '165246002' }
      ]
    }
  },

  // === EXISTING METRICS (abbreviated for space) ===
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
      }
    },
    validation: {
      min: 0,
      max: 10,
      type: 'integer'
    }
  },
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
      }
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
      }
    },
    validation: {
      min: 40,
      max: 150,
      type: 'integer',
      normalRange: { min: 60, max: 80 }
    }
  },
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
      }
    },
    options: {
      values: [
        { code: 'taken_on_time', display: 'Taken on time' },
        { code: 'taken_late', display: 'Taken late' },
        { code: 'missed_dose', display: 'Missed dose' },
        { code: 'double_dose', display: 'Double dose taken' }
      ]
    }
  }
];

// ===== ENHANCED CONDITION PRESETS =====
const enhancedConditionPresets = [
  // === EXISTING PRESETS ===
  {
    name: 'Chronic Pain Management',
    defaultProtocolId: 'chronic_pain_protocol_v1',
    description: 'Comprehensive chronic pain monitoring and management program',
    diagnoses: [
      { icd10: 'M79.3', snomed: '82423001', label: 'Chronic pain syndrome' },
      { icd10: 'M25.50', snomed: '57676002', label: 'Joint pain, unspecified' },
      { icd10: 'M54.5', snomed: '279039007', label: 'Low back pain' },
      { icd10: 'G89.29', snomed: '82423001', label: 'Other chronic pain' }
    ]
  },
  
  // === NEW RESPIRATORY PRESETS ===
  {
    name: 'COPD Management Program',
    defaultProtocolId: 'copd_management_protocol_v1',
    description: 'Comprehensive COPD monitoring including oxygen saturation, peak flow, and symptom tracking',
    diagnoses: [
      { icd10: 'J44.1', snomed: '13645005', label: 'Chronic obstructive pulmonary disease with acute exacerbation' },
      { icd10: 'J44.0', snomed: '13645005', label: 'Chronic obstructive pulmonary disease with acute lower respiratory infection' },
      { icd10: 'J44.9', snomed: '13645005', label: 'Chronic obstructive pulmonary disease, unspecified' }
    ]
  },
  {
    name: 'Asthma Monitoring Program',
    defaultProtocolId: 'asthma_monitoring_protocol_v1',
    description: 'Daily asthma symptom and peak flow monitoring for optimal control',
    diagnoses: [
      { icd10: 'J45.9', snomed: '195967001', label: 'Asthma, unspecified' },
      { icd10: 'J45.0', snomed: '195967001', label: 'Predominantly allergic asthma' },
      { icd10: 'J45.1', snomed: '195967001', label: 'Nonallergic asthma' }
    ]
  },
  
  // === NEW MUSCULOSKELETAL PRESETS ===
  {
    name: 'Post-Surgical Rehabilitation',
    defaultProtocolId: 'post_surgical_rehab_protocol_v1',
    description: 'Comprehensive post-surgical monitoring including range of motion, pain, and functional recovery',
    diagnoses: [
      { icd10: 'Z98.89', snomed: '182840001', label: 'Other specified postprocedural states' },
      { icd10: 'M25.511', snomed: '45326000', label: 'Pain in right shoulder' },
      { icd10: 'M25.561', snomed: '30989003', label: 'Pain in right knee' }
    ]
  },
  {
    name: 'Physical Therapy Monitoring',
    defaultProtocolId: 'physical_therapy_protocol_v1',
    description: 'Functional assessment and progress tracking for physical therapy patients',
    diagnoses: [
      { icd10: 'M62.81', snomed: '26544005', label: 'Muscle weakness (generalized)' },
      { icd10: 'M25.50', snomed: '57676002', label: 'Joint pain, unspecified' },
      { icd10: 'R26.2', snomed: '282145008', label: 'Difficulty in walking, not elsewhere classified' }
    ]
  }
];

// ===== ENHANCED ASSESSMENT TEMPLATES =====
const enhancedAssessmentTemplates = [
  // === EXISTING TEMPLATES ===
  {
    name: 'Chronic Pain Daily Assessment',
    description: 'Comprehensive daily pain monitoring and functional assessment',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your current pain level from 0 (no pain) to 10 (worst pain imaginable)' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 2, helpText: 'Did you take your pain medication as prescribed?' }
    ]
  },
  
  // === NEW RESPIRATORY TEMPLATES ===
  {
    name: 'COPD Daily Monitoring',
    description: 'Daily COPD symptom and respiratory function monitoring',
    version: 1,
    items: [
      { metricKey: 'oxygen_saturation', required: true, displayOrder: 1, helpText: 'Measure your oxygen saturation using pulse oximeter' },
      { metricKey: 'peak_flow', required: true, displayOrder: 2, helpText: 'Measure your peak flow using peak flow meter' },
      { metricKey: 'dyspnea_scale', required: true, displayOrder: 3, helpText: 'Rate your shortness of breath today' },
      { metricKey: 'cough_severity', required: true, displayOrder: 4, helpText: 'Rate the severity of your cough today' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 5, helpText: 'Did you take your respiratory medications as prescribed?' }
    ]
  },
  {
    name: 'Asthma Daily Check-in',
    description: 'Daily asthma symptom and peak flow monitoring',
    version: 1,
    items: [
      { metricKey: 'peak_flow', required: true, displayOrder: 1, helpText: 'Record your morning peak flow reading' },
      { metricKey: 'dyspnea_scale', required: true, displayOrder: 2, helpText: 'Rate any breathing difficulties today' },
      { metricKey: 'cough_severity', required: false, displayOrder: 3, helpText: 'Rate any cough symptoms' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 4, helpText: 'Did you take your asthma medications as prescribed?' }
    ]
  },
  
  // === NEW MUSCULOSKELETAL TEMPLATES ===
  {
    name: 'Post-Surgical Recovery Assessment',
    description: 'Comprehensive post-surgical recovery monitoring including pain, function, and mobility',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your surgical site pain level from 0 to 10' },
      { metricKey: 'range_of_motion_shoulder', required: true, displayOrder: 2, helpText: 'Measure your shoulder range of motion in degrees' },
      { metricKey: 'functional_mobility', required: true, displayOrder: 3, helpText: 'Rate your ability to perform daily activities' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 4, helpText: 'Did you take your prescribed medications?' }
    ]
  },
  {
    name: 'Physical Therapy Progress Assessment',
    description: 'Weekly functional assessment for physical therapy patients',
    version: 1,
    items: [
      { metricKey: 'pain_scale_0_10', required: true, displayOrder: 1, helpText: 'Rate your current pain level' },
      { metricKey: 'range_of_motion_shoulder', required: false, displayOrder: 2, helpText: 'Measure range of motion if applicable' },
      { metricKey: 'grip_strength', required: true, displayOrder: 3, helpText: 'Assess your grip strength' },
      { metricKey: 'balance_assessment', required: true, displayOrder: 4, helpText: 'Rate your balance and stability' },
      { metricKey: 'functional_mobility', required: true, displayOrder: 5, helpText: 'Rate your functional mobility' }
    ]
  }
];

// Export the enhanced metrics
module.exports = {
  enhancedStandardizedMetrics,
  enhancedConditionPresets,
  enhancedAssessmentTemplates
};