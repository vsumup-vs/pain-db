const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

// Enhanced metrics with standardized coding systems
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

  // === DIABETES METRICS ===
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

  // === COGNITIVE ASSESSMENT ===
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
  }
];

async function seedStandardizedMetrics() {
  try {
    console.log('🏥 Seeding standardized metrics with LOINC, SNOMED CT, and ICD-10 codes...');
    
    for (const metric of standardizedMetrics) {
      const existingMetric = await prisma.metricDefinition.findFirst({
        where: { key: metric.key }
      });

      if (existingMetric) {
        // Update existing metric with standardized codes
        await prisma.metricDefinition.update({
          where: { id: existingMetric.id },
          data: {
            coding: metric.coding,
            validation: metric.validation,
            options: metric.options
          }
        });
        console.log(`✅ Updated ${metric.displayName} with standardized codes`);
      } else {
        // Create new metric
        await prisma.metricDefinition.create({
          data: metric
        });
        console.log(`✅ Created ${metric.displayName} with standardized codes`);
      }
    }
    
    console.log('\n📊 Standardized metrics summary:');
    console.log(`- ${standardizedMetrics.length} metrics with standardized codes`);
    console.log('- LOINC codes for clinical observations');
    console.log('- SNOMED CT codes for clinical concepts');
    console.log('- ICD-10 mappings for diagnosis correlation');
    console.log('- Enhanced validation rules');
    console.log('- Quality measure compatibility');
    
  } catch (error) {
    console.error('❌ Error seeding standardized metrics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other files
module.exports = { 
  seedStandardizedMetrics, 
  standardizedMetrics 
};

// Run if called directly
if (require.main === module) {
  seedStandardizedMetrics()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    });
}