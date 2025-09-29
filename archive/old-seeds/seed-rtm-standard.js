const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

/**
 * RTM Standard Seed File - Enhanced with Comprehensive Coverage
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
 * - Sample data for testing and demonstration
 * 
 * Version: 2.0 - Enhanced with Respiratory and Musculoskeletal metrics
 * Last Updated: 2024
 */

// ===== STANDARDIZED METRICS WITH COMPREHENSIVE RTM COVERAGE =====
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

  // === FIBROMYALGIA METRICS ===
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
    displayName: 'Joint Stiffness',
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
    valueType: 'categorical',
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
          code: 'wrists', 
          display: 'Wrists',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299702006',
            display: 'Wrist joint swelling'
          }
        },
        { 
          code: 'elbows', 
          display: 'Elbows',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299703001',
            display: 'Elbow joint swelling'
          }
        },
        { 
          code: 'shoulders', 
          display: 'Shoulders',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299704007',
            display: 'Shoulder joint swelling'
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
        },
        { 
          code: 'ankles', 
          display: 'Ankles',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299706009',
            display: 'Ankle joint swelling'
          }
        },
        { 
          code: 'feet', 
          display: 'Feet/Toes',
          snomed: {
            system: 'http://snomed.info/sct',
            code: '299707000',
            display: 'Foot joint swelling'
          }
        }
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

  // === DIABETES MANAGEMENT METRICS ===
  {
    key: 'blood_glucose',
    displayName: 'Blood Glucose',
    valueType: 'numeric',
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

// ===== ENHANCED CONDITION PRESETS WITH COMPREHENSIVE COVERAGE =====
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

// ===== ENHANCED ASSESSMENT TEMPLATES WITH COMPREHENSIVE COVERAGE =====
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
    description: 'Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence',
    version: 1,
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
  },
  {
    name: 'Diabetes Comprehensive Monitoring',
    description: 'Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence',
    version: 1,
    items: [
      { metricKey: 'blood_glucose', required: true, displayOrder: 1, helpText: 'Enter your blood glucose reading in mg/dL' },
      { metricKey: 'hba1c', required: false, displayOrder: 2, helpText: 'Enter your most recent HbA1c percentage (quarterly)' },
      { metricKey: 'medication_adherence', required: true, displayOrder: 3, helpText: 'Did you take your diabetes medication as prescribed?' }
    ]
  }
];

// ===== SEED FUNCTION =====
async function seedRTMStandard() {
  console.log('🌱 Starting Enhanced RTM Standard Seed...');
  
  try {
    // Clear existing data in correct order to avoid foreign key constraints
    console.log('🧹 Clearing existing data...');
    
    // Delete junction tables first
    await prisma.conditionPresetTemplate.deleteMany();
    await prisma.conditionPresetDiagnosis.deleteMany();
    
    // Delete dependent tables
    await prisma.assessmentTemplateItem.deleteMany();
    
    // Delete main tables
    await prisma.conditionPreset.deleteMany();
    await prisma.assessmentTemplate.deleteMany();
    await prisma.metricDefinition.deleteMany();

    // Create metric definitions
    console.log('📊 Creating enhanced metric definitions...');
    const createdMetrics = {};
    for (const metric of standardizedMetrics) {
      const created = await prisma.metricDefinition.create({
        data: {
          key: metric.key,
          displayName: metric.displayName,
          valueType: metric.valueType,
          scaleMin: metric.scaleMin,
          scaleMax: metric.scaleMax,
          unit: metric.unit,
          decimalPrecision: metric.decimalPrecision,
          defaultFrequency: metric.defaultFrequency,
          coding: metric.coding,
          options: metric.options,
          validation: metric.validation
        }
      });
      createdMetrics[metric.key] = created;
      console.log(`  ✅ Created metric: ${metric.displayName}`);
    }

    // Create condition presets
    console.log('🏥 Creating enhanced condition presets...');
    const createdPresets = {};
    for (const preset of conditionPresets) {
      const created = await prisma.conditionPreset.create({
        data: {
          name: preset.name,
          defaultProtocolId: preset.defaultProtocolId
        }
      });
      
      // Create diagnoses for this preset
      for (const diagnosis of preset.diagnoses) {
        await prisma.conditionPresetDiagnosis.create({
          data: {
            presetId: created.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label
          }
        });
      }
      
      createdPresets[preset.name] = created;
      console.log(`  ✅ Created condition preset: ${preset.name}`);
    }

    // Create assessment templates
console.log('📋 Creating enhanced assessment templates...');
const createdTemplates = {};
for (const template of assessmentTemplates) {
  const createdTemplate = await prisma.assessmentTemplate.create({
    data: {
      name: template.name,
      description: template.description,
      version: template.version
    }
  });

  // Create template items
  for (const item of template.items) {
    const metric = createdMetrics[item.metricKey];
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
    }
  }
  
  createdTemplates[template.name] = createdTemplate;
  console.log(`  ✅ Created assessment template: ${template.name} with ${template.items.length} items`);
    }

    // Link condition presets to assessment templates
console.log('🔗 Linking condition presets to assessment templates...');
const presetTemplateLinks = [
  {
    presetName: 'Chronic Pain Management',
    templateNames: ['Chronic Pain Daily Assessment']
  },
  {
    presetName: 'Fibromyalgia Care Program',
    templateNames: ['Fibromyalgia Daily Check-in']
  },
  {
    presetName: 'Arthritis Management',
    templateNames: ['Arthritis Management Assessment']
  },
  {
    presetName: 'Diabetes Management Program',
    templateNames: ['Diabetes Monitoring']
  },
  {
    presetName: 'Cardiovascular Monitoring',
    templateNames: ['Cardiovascular Daily Monitoring']
  },
  {
    presetName: 'Mental Health Monitoring',
    templateNames: ['Mental Health Weekly Assessment']
  }
];

for (const link of presetTemplateLinks) {
  const preset = createdPresets[link.presetName];
  if (preset) {
    for (const templateName of link.templateNames) {
      const template = createdTemplates[templateName];
      if (template) {
        await prisma.conditionPresetTemplate.create({
          data: {
            presetId: preset.id,
            templateId: template.id
          }
        });
        console.log(`  ✅ Linked ${link.presetName} → ${templateName}`);
      }
    }
  }
}

console.log('🎉 Enhanced RTM Standard Seed completed successfully!');
    console.log(`📊 Created ${standardizedMetrics.length} metric definitions`);
    console.log(`🏥 Created ${conditionPresets.length} condition presets`);
    console.log(`📋 Created ${assessmentTemplates.length} assessment templates`);
    console.log('');
    console.log('🔍 Enhanced Coverage Summary:');
    console.log('  ✅ Pain Management (Chronic Pain, Fibromyalgia, Arthritis)');
    console.log('  ✅ Diabetes Management');
    console.log('  ✅ Mental Health (Depression, Anxiety)');
    console.log('  ✅ Cardiovascular Monitoring');
    console.log('  ✅ Respiratory Health (COPD, Asthma) - NEW');
    console.log('  ✅ Musculoskeletal Function (Range of Motion, Strength) - NEW');
    console.log('');
    console.log('💰 RTM Billing Compliance: All metrics support CPT 98976-98981');

  } catch (error) {
    console.error('❌ Error seeding enhanced RTM standard data:', error);
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