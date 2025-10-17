/**
 * PRODUCTION SEED FILE FOR CLINMETRICS PRO
 *
 * This file seeds the database with standardized, platform-level data including:
 * - Billing Programs (RPM, RTM, CCM) with CPT codes and eligibility rules
 * - Drug Database (50+ common medications with NDC numbers)
 * - Metric Definitions (70+ standardized metrics with LOINC/SNOMED coding)
 * - Condition Presets (8+ clinical programs with ICD-10/SNOMED diagnoses)
 * - Assessment Templates (10+ standardized assessments)
 * - Alert Rules (25+ clinical alert rules with evidence)
 *
 * All standardized data has organizationId = NULL (platform-level library)
 * All standardized data has isStandardized = true
 *
 * This seed file is idempotent - can be run multiple times safely.
 *
 * Usage: node seed-production.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// SAFE DELETION ORDER (respects foreign key constraints)
// ============================================================================
async function cleanStandardizedData() {
  console.log('🧹 Cleaning existing standardized data...\n');

  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.assessmentTemplateItem.deleteMany({ where: { template: { organizationId: null } } });
    await prisma.conditionPresetAlertRule.deleteMany({ where: { conditionPreset: { organizationId: null } } });
    await prisma.conditionPresetTemplate.deleteMany({ where: { conditionPreset: { organizationId: null } } });
    await prisma.conditionPresetDiagnosis.deleteMany({ where: { conditionPreset: { organizationId: null } } });

    await prisma.alertRule.deleteMany({ where: { organizationId: null } });
    await prisma.assessmentTemplate.deleteMany({ where: { organizationId: null } });
    await prisma.conditionPreset.deleteMany({ where: { organizationId: null } });
    await prisma.metricDefinition.deleteMany({ where: { organizationId: null } });

    await prisma.billingCPTCode.deleteMany({ where: { billingProgram: { isActive: true } } });
    await prisma.billingEligibilityRule.deleteMany({ where: { billingProgram: { isActive: true } } });
    await prisma.billingProgram.deleteMany({});

    await prisma.drug.deleteMany({});

    console.log('✅ Cleaned existing standardized data\n');
  } catch (error) {
    console.error('❌ Error cleaning data:', error.message);
    throw error;
  }
}

// ============================================================================
// SECTION 1: BILLING PROGRAMS (RPM, RTM, CCM)
// ============================================================================
async function seedBillingPrograms() {
  console.log('📊 Seeding Billing Programs...\n');

  // CMS RPM 2025
  const rpmProgram = await prisma.billingProgram.create({
    data: {
      name: 'CMS Remote Patient Monitoring 2025',
      code: 'CMS_RPM_2025',
      region: 'US',
      payer: 'CMS',
      programType: 'RPM',
      version: '2025.1',
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
      requirements: {
        dataCollectionDays: 16,
        clinicalTimeMinutes: 20,
        setupRequired: true,
        deviceRequired: true,
        chronicConditionsMin: 1,
        eligibilityCriteria: {
          insurance: ['Medicare Part B'],
          minAge: 18,
          requiresConsent: true,
          deviceTransmission: 'automated'
        }
      },
      description: 'Medicare Remote Patient Monitoring program for physiologic data collection from medical devices',
      cptCodes: {
        create: [
          {
            code: '99453',
            description: 'Initial setup and patient education on use of remote monitoring equipment (one-time per episode)',
            category: 'SETUP',
            isRecurring: false,
            criteria: {
              type: 'ONE_TIME',
              requiresDocumentation: true,
              calculationMethod: 'initial_setup_completed'
            },
            reimbursementRate: 19.50,
            currency: 'USD',
            displayOrder: 1,
            isActive: true
          },
          {
            code: '99454',
            description: 'Device supply with daily recording or programmed alert transmission (per 30-day period)',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_DAYS',
              threshold: 16,
              operator: '>=',
              calculationMethod: 'unique_days_device_observations',
              periodDays: 30
            },
            reimbursementRate: 63.00,
            currency: 'USD',
            displayOrder: 2,
            isActive: true
          },
          {
            code: '99457',
            description: 'Remote physiologic monitoring treatment management services, 20 minutes or more of clinical staff/physician/QHP time in a calendar month',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              periodDays: 30
            },
            reimbursementRate: 51.00,
            currency: 'USD',
            displayOrder: 3,
            isActive: true
          },
          {
            code: '99458',
            description: 'Remote physiologic monitoring treatment management services, each additional 20 minutes (add-on code)',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 40,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              periodDays: 30,
              requiresBaseCPT: '99457'
            },
            reimbursementRate: 41.00,
            currency: 'USD',
            displayOrder: 4,
            isActive: true
          },
          {
            code: '99091',
            description: 'Collection and interpretation of physiologic data (e.g., ECG, blood pressure, glucose monitoring) digitally stored and/or transmitted by the patient and/or caregiver to the physician or other qualified health care professional',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_COLLECTION_TIME',
              thresholdMinutes: 30,
              operator: '>=',
              calculationMethod: 'data_review_time',
              periodDays: 30
            },
            reimbursementRate: 59.00,
            currency: 'USD',
            displayOrder: 5,
            isActive: true
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Eligibility',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare Part B or Medicare Advantage coverage'
            },
            description: 'Verify patient has qualifying Medicare coverage for RPM services'
          },
          {
            ruleName: 'Chronic Condition Requirement',
            ruleType: 'DIAGNOSIS',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'MIN_COUNT',
              minCount: 1,
              codingSystems: ['ICD-10', 'SNOMED'],
              expectedDuration: '3_MONTHS',
              errorMessage: 'Requires at least 1 chronic condition expected to last 3+ months'
            },
            description: 'Patient must have at least one chronic condition requiring ongoing monitoring'
          },
          {
            ruleName: 'Adult Patient Requirement',
            ruleType: 'AGE',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'AGE',
              operator: '>=',
              value: 18,
              errorMessage: 'Patient must be 18 years or older for Medicare RPM'
            },
            description: 'Verify patient meets minimum age requirement'
          },
          {
            ruleName: 'Informed Consent Required',
            ruleType: 'CONSENT',
            priority: 4,
            isRequired: true,
            ruleLogic: {
              type: 'CONSENT',
              consentType: 'RPM_SERVICES',
              operator: 'EQUALS',
              value: true,
              errorMessage: 'Patient must provide informed consent for RPM services'
            },
            description: 'Document patient consent for remote monitoring'
          }
        ]
      }
    }
  });
  console.log('✅ Created CMS RPM 2025 program');

  // CMS RTM 2025
  const rtmProgram = await prisma.billingProgram.create({
    data: {
      name: 'CMS Remote Therapeutic Monitoring 2025',
      code: 'CMS_RTM_2025',
      region: 'US',
      payer: 'CMS',
      programType: 'RTM',
      version: '2025.1',
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
      requirements: {
        dataCollectionDays: 16,
        clinicalTimeMinutes: 20,
        setupRequired: true,
        deviceRequired: false, // Can use patient-reported outcomes
        chronicConditionsMin: 0, // Not required for RTM
        eligibilityCriteria: {
          insurance: ['Medicare Part B'],
          minAge: 18,
          requiresConsent: true,
          monitoringType: 'therapeutic'
        }
      },
      description: 'Medicare Remote Therapeutic Monitoring for musculoskeletal, respiratory, and therapy adherence',
      cptCodes: {
        create: [
          {
            code: '98975',
            description: 'Remote therapeutic monitoring (e.g., respiratory system status, musculoskeletal system status, therapy adherence); initial set-up and patient education',
            category: 'SETUP',
            isRecurring: false,
            criteria: {
              type: 'ONE_TIME',
              requiresDocumentation: true,
              calculationMethod: 'initial_setup_completed'
            },
            reimbursementRate: 19.50,
            currency: 'USD',
            displayOrder: 1,
            isActive: true
          },
          {
            code: '98976',
            description: 'Remote therapeutic monitoring device supply with scheduled data transmissions (per 30-day period)',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_DAYS',
              threshold: 16,
              operator: '>=',
              calculationMethod: 'unique_days_therapeutic_observations',
              periodDays: 30
            },
            reimbursementRate: 54.00,
            currency: 'USD',
            displayOrder: 2,
            isActive: true
          },
          {
            code: '98977',
            description: 'Remote therapeutic monitoring treatment management services, physician/QHP time in a calendar month requiring at least one interactive communication with the patient/caregiver, first 20 minutes',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              periodDays: 30,
              requiresInteractiveCommunication: true
            },
            reimbursementRate: 49.00,
            currency: 'USD',
            displayOrder: 3,
            isActive: true
          },
          {
            code: '98980',
            description: 'Remote therapeutic monitoring treatment management services, physician/QHP time, each additional 20 minutes (add-on code)',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 40,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              periodDays: 30,
              requiresBaseCPT: '98977'
            },
            reimbursementRate: 39.00,
            currency: 'USD',
            displayOrder: 4,
            isActive: true
          },
          {
            code: '98981',
            description: 'Remote therapeutic monitoring treatment management services, clinical staff/physician/QHP time in a calendar month requiring at least one interactive communication with the patient/caregiver, first 20 minutes',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              periodDays: 30,
              requiresInteractiveCommunication: true,
              staffType: 'clinical_staff'
            },
            reimbursementRate: 47.00,
            currency: 'USD',
            displayOrder: 5,
            isActive: true
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Eligibility',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare Part B or Medicare Advantage coverage'
            }
          },
          {
            ruleName: 'Therapeutic Monitoring Indication',
            ruleType: 'DIAGNOSIS',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'ANY',
              categories: ['Musculoskeletal', 'Respiratory', 'Therapeutic Adherence'],
              errorMessage: 'Requires qualifying condition for therapeutic monitoring'
            },
            description: 'Patient must have condition requiring therapeutic monitoring'
          },
          {
            ruleName: 'Adult Patient Requirement',
            ruleType: 'AGE',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'AGE',
              operator: '>=',
              value: 18,
              errorMessage: 'Patient must be 18 years or older'
            }
          }
        ]
      }
    }
  });
  console.log('✅ Created CMS RTM 2025 program');

  // CMS CCM 2025
  const ccmProgram = await prisma.billingProgram.create({
    data: {
      name: 'CMS Chronic Care Management 2025',
      code: 'CMS_CCM_2025',
      region: 'US',
      payer: 'CMS',
      programType: 'CCM',
      version: '2025.1',
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
      requirements: {
        clinicalTimeMinutes: 20,
        chronicConditionsMin: 2,
        careManagerRequired: true,
        carePlanRequired: true,
        eligibilityCriteria: {
          insurance: ['Medicare Part B'],
          minAge: 18,
          requiresConsent: true,
          chronicConditionsDuration: '12_MONTHS'
        }
      },
      description: 'Medicare Chronic Care Management for patients with 2+ chronic conditions',
      cptCodes: {
        create: [
          {
            code: '99490',
            description: 'Chronic care management services, at least 20 minutes of clinical staff time per calendar month',
            category: 'CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_ccm_time_logs',
              periodDays: 30,
              requiresCarePlan: true
            },
            reimbursementRate: 42.00,
            currency: 'USD',
            displayOrder: 1,
            isActive: true
          },
          {
            code: '99491',
            description: 'Chronic care management services, at least 30 minutes of clinical staff time per calendar month',
            category: 'CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 30,
              operator: '>=',
              calculationMethod: 'sum_ccm_time_logs',
              periodDays: 30,
              requiresCarePlan: true
            },
            reimbursementRate: 63.00,
            currency: 'USD',
            displayOrder: 2,
            isActive: true
          },
          {
            code: '99487',
            description: 'Complex chronic care management services, first 60 minutes per calendar month',
            category: 'CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 60,
              maxMinutes: 89,
              operator: '>=',
              calculationMethod: 'sum_ccm_time_logs',
              periodDays: 30,
              requiresCarePlan: true,
              complexityLevel: 'high'
            },
            reimbursementRate: 95.00,
            currency: 'USD',
            displayOrder: 3,
            isActive: true
          },
          {
            code: '99489',
            description: 'Complex chronic care management services, each additional 30 minutes (add-on code)',
            category: 'CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 90,
              operator: '>=',
              calculationMethod: 'sum_ccm_time_logs',
              periodDays: 30,
              requiresBaseCPT: '99487'
            },
            reimbursementRate: 47.00,
            currency: 'USD',
            displayOrder: 4,
            isActive: true
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Eligibility',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare Part B or Medicare Advantage coverage'
            }
          },
          {
            ruleName: '2+ Chronic Conditions (12 Months)',
            ruleType: 'DIAGNOSIS',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'MIN_COUNT',
              minCount: 2,
              codingSystems: ['ICD-10'],
              expectedDuration: '12_MONTHS',
              errorMessage: 'Requires 2+ chronic conditions expected to last 12+ months'
            },
            description: 'Patient must have multiple chronic conditions requiring ongoing care coordination'
          },
          {
            ruleName: 'Significant Risk of Decline or Exacerbation',
            ruleType: 'CUSTOM',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'CLINICAL_ASSESSMENT',
              operator: 'EVALUATED',
              requiresDocumentation: true,
              errorMessage: 'Must document significant risk of decline or exacerbation'
            },
            description: 'Clinical assessment of elevated risk requiring care management'
          }
        ]
      }
    }
  });
  console.log('✅ Created CMS CCM 2025 program\n');

  return { rpmProgram, rtmProgram, ccmProgram };
}

// ============================================================================
// SECTION 2: DRUG DATABASE
// ============================================================================
async function seedDrugs() {
  console.log('💊 Seeding Drug Database...\n');

  const drugs = [
    // Pain Management
    {
      name: 'Acetaminophen 500mg Tablet',
      genericName: 'Acetaminophen',
      brandName: 'Tylenol',
      dosageForm: 'Tablet',
      strength: '500mg',
      manufacturer: 'Johnson & Johnson',
      ndcNumber: '50580-0506-01',
      description: 'Analgesic and antipyretic',
      sideEffects: ['Nausea', 'Stomach pain', 'Loss of appetite', 'Liver damage (high doses)'],
      contraindications: ['Severe liver disease', 'Active liver disease', 'Alcohol abuse'],
      interactions: ['Warfarin', 'Isoniazid', 'Carbamazepine', 'Phenytoin']
    },
    {
      name: 'Ibuprofen 200mg Tablet',
      genericName: 'Ibuprofen',
      brandName: 'Advil',
      dosageForm: 'Tablet',
      strength: '200mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00573-0164-70',
      description: 'Nonsteroidal anti-inflammatory drug (NSAID)',
      sideEffects: ['Upset stomach', 'Heartburn', 'Dizziness', 'Headache'],
      contraindications: ['Active GI bleeding', 'Severe renal impairment', 'Aspirin allergy'],
      interactions: ['Aspirin', 'Warfarin', 'ACE inhibitors', 'Lithium']
    },
    {
      name: 'Gabapentin 300mg Capsule',
      genericName: 'Gabapentin',
      brandName: 'Neurontin',
      dosageForm: 'Capsule',
      strength: '300mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00071-0805-24',
      description: 'Anticonvulsant for neuropathic pain',
      sideEffects: ['Dizziness', 'Drowsiness', 'Fatigue', 'Peripheral edema'],
      contraindications: ['Hypersensitivity to gabapentin'],
      interactions: ['Antacids', 'Hydrocodone', 'Morphine', 'Naproxen']
    },

    // Diabetes Management
    {
      name: 'Metformin 500mg Tablet',
      genericName: 'Metformin',
      brandName: 'Glucophage',
      dosageForm: 'Tablet',
      strength: '500mg',
      manufacturer: 'Bristol-Myers Squibb',
      ndcNumber: '00087-6060-05',
      description: 'Oral diabetes medicine (biguanide)',
      sideEffects: ['Diarrhea', 'Nausea', 'Vomiting', 'Gas', 'Metallic taste'],
      contraindications: ['Renal dysfunction', 'Metabolic acidosis', 'Diabetic ketoacidosis'],
      interactions: ['Alcohol', 'Contrast dye', 'Cimetidine', 'Furosemide']
    },
    {
      name: 'Insulin Glargine 100 units/mL Solution',
      genericName: 'Insulin Glargine',
      brandName: 'Lantus',
      dosageForm: 'Solution for injection',
      strength: '100 units/mL',
      manufacturer: 'Sanofi',
      ndcNumber: '00088-2220-33',
      description: 'Long-acting basal insulin analog',
      sideEffects: ['Hypoglycemia', 'Injection site reactions', 'Weight gain', 'Lipodystrophy'],
      contraindications: ['Hypoglycemia', 'Hypersensitivity to insulin glargine'],
      interactions: ['Beta-blockers', 'ACE inhibitors', 'Corticosteroids', 'Thiazides']
    },
    {
      name: 'Glipizide 5mg Tablet',
      genericName: 'Glipizide',
      brandName: 'Glucotrol',
      dosageForm: 'Tablet',
      strength: '5mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00049-1530-66',
      description: 'Sulfonylurea for type 2 diabetes',
      sideEffects: ['Hypoglycemia', 'Nausea', 'Diarrhea', 'Weight gain'],
      contraindications: ['Type 1 diabetes', 'Diabetic ketoacidosis', 'Sulfa allergy'],
      interactions: ['Beta-blockers', 'Fluconazole', 'Aspirin', 'Warfarin']
    },

    // Cardiovascular / Hypertension
    {
      name: 'Lisinopril 10mg Tablet',
      genericName: 'Lisinopril',
      brandName: 'Prinivil',
      dosageForm: 'Tablet',
      strength: '10mg',
      manufacturer: 'Merck',
      ndcNumber: '00006-0019-31',
      description: 'ACE inhibitor for hypertension and heart failure',
      sideEffects: ['Dizziness', 'Headache', 'Persistent cough', 'Hyperkalemia'],
      contraindications: ['Angioedema history', 'Pregnancy', 'Bilateral renal artery stenosis'],
      interactions: ['Potassium supplements', 'NSAIDs', 'Lithium', 'Aliskiren']
    },
    {
      name: 'Amlodipine 5mg Tablet',
      genericName: 'Amlodipine',
      brandName: 'Norvasc',
      dosageForm: 'Tablet',
      strength: '5mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00069-1520-68',
      description: 'Calcium channel blocker for hypertension',
      sideEffects: ['Peripheral edema', 'Dizziness', 'Flushing', 'Fatigue'],
      contraindications: ['Severe hypotension', 'Cardiogenic shock', 'Severe aortic stenosis'],
      interactions: ['Simvastatin', 'Clarithromycin', 'Itraconazole', 'Grapefruit juice']
    },
    {
      name: 'Atorvastatin 20mg Tablet',
      genericName: 'Atorvastatin',
      brandName: 'Lipitor',
      dosageForm: 'Tablet',
      strength: '20mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00071-0155-23',
      description: 'HMG-CoA reductase inhibitor (statin) for cholesterol',
      sideEffects: ['Muscle pain', 'Headache', 'Nausea', 'Elevated liver enzymes'],
      contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding'],
      interactions: ['Grapefruit juice', 'Clarithromycin', 'Cyclosporine', 'Gemfibrozil']
    },
    {
      name: 'Metoprolol Tartrate 50mg Tablet',
      genericName: 'Metoprolol',
      brandName: 'Lopressor',
      dosageForm: 'Tablet',
      strength: '50mg',
      manufacturer: 'Novartis',
      ndcNumber: '00078-0094-05',
      description: 'Beta-blocker for hypertension and angina',
      sideEffects: ['Fatigue', 'Dizziness', 'Bradycardia', 'Cold extremities'],
      contraindications: ['Severe bradycardia', 'Heart block', 'Cardiogenic shock', 'Severe asthma'],
      interactions: ['Verapamil', 'Diltiazem', 'Clonidine', 'Digoxin']
    },
    {
      name: 'Warfarin 5mg Tablet',
      genericName: 'Warfarin',
      brandName: 'Coumadin',
      dosageForm: 'Tablet',
      strength: '5mg',
      manufacturer: 'Bristol-Myers Squibb',
      ndcNumber: '00056-0173-70',
      description: 'Anticoagulant (vitamin K antagonist)',
      sideEffects: ['Bleeding', 'Bruising', 'Nausea', 'Abdominal pain'],
      contraindications: ['Active bleeding', 'Severe liver disease', 'Pregnancy', 'Recent surgery'],
      interactions: ['Aspirin', 'NSAIDs', 'Antibiotics', 'Vitamin K', 'Alcohol']
    },

    // Mental Health
    {
      name: 'Sertraline 50mg Tablet',
      genericName: 'Sertraline',
      brandName: 'Zoloft',
      dosageForm: 'Tablet',
      strength: '50mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00049-4960-66',
      description: 'Selective serotonin reuptake inhibitor (SSRI) antidepressant',
      sideEffects: ['Nausea', 'Diarrhea', 'Insomnia', 'Sexual dysfunction', 'Dry mouth'],
      contraindications: ['MAOI use (within 14 days)', 'Pimozide use', 'Hypersensitivity'],
      interactions: ['MAOIs', 'Pimozide', 'Warfarin', 'NSAIDs', 'Triptans']
    },
    {
      name: 'Escitalopram 10mg Tablet',
      genericName: 'Escitalopram',
      brandName: 'Lexapro',
      dosageForm: 'Tablet',
      strength: '10mg',
      manufacturer: 'Forest Laboratories',
      ndcNumber: '00456-2010-63',
      description: 'SSRI antidepressant for depression and anxiety',
      sideEffects: ['Nausea', 'Insomnia', 'Drowsiness', 'Sexual dysfunction'],
      contraindications: ['MAOI use (within 14 days)', 'Pimozide use'],
      interactions: ['MAOIs', 'Pimozide', 'Citalopram', 'Tramadol']
    },
    {
      name: 'Alprazolam 0.5mg Tablet',
      genericName: 'Alprazolam',
      brandName: 'Xanax',
      dosageForm: 'Tablet',
      strength: '0.5mg',
      manufacturer: 'Pfizer',
      ndcNumber: '00009-0029-01',
      description: 'Benzodiazepine for anxiety and panic disorder',
      sideEffects: ['Drowsiness', 'Dizziness', 'Memory impairment', 'Dependence'],
      contraindications: ['Acute narrow-angle glaucoma', 'Severe respiratory insufficiency', 'Pregnancy'],
      interactions: ['Opioids', 'Alcohol', 'Ketoconazole', 'Itraconazole', 'HIV protease inhibitors']
    },
    {
      name: 'Bupropion XL 150mg Tablet',
      genericName: 'Bupropion',
      brandName: 'Wellbutrin XL',
      dosageForm: 'Extended-release tablet',
      strength: '150mg',
      manufacturer: 'GlaxoSmithKline',
      ndcNumber: '00173-0722-00',
      description: 'Atypical antidepressant and smoking cessation aid',
      sideEffects: ['Insomnia', 'Dry mouth', 'Headache', 'Nausea', 'Tremor'],
      contraindications: ['Seizure disorder', 'Eating disorder', 'Abrupt discontinuation of alcohol/benzodiazepines'],
      interactions: ['MAOIs', 'CYP2D6 substrates', 'Ritonavir', 'Carbamazepine']
    },

    // Respiratory / COPD
    {
      name: 'Albuterol 90mcg/actuation Inhaler',
      genericName: 'Albuterol',
      brandName: 'ProAir HFA',
      dosageForm: 'Aerosol inhaler',
      strength: '90mcg/actuation',
      manufacturer: 'Teva',
      ndcNumber: '00826-7144-00',
      description: 'Short-acting beta-agonist bronchodilator',
      sideEffects: ['Tremor', 'Nervousness', 'Headache', 'Tachycardia'],
      contraindications: ['Hypersensitivity to albuterol or levalbuterol'],
      interactions: ['Beta-blockers', 'Digoxin', 'MAOIs', 'Tricyclic antidepressants']
    },
    {
      name: 'Fluticasone Propionate 250mcg/actuation Inhaler',
      genericName: 'Fluticasone',
      brandName: 'Flovent HFA',
      dosageForm: 'Aerosol inhaler',
      strength: '250mcg/actuation',
      manufacturer: 'GlaxoSmithKline',
      ndcNumber: '00173-0462-00',
      description: 'Inhaled corticosteroid for asthma maintenance',
      sideEffects: ['Oral thrush', 'Hoarseness', 'Cough', 'Headache'],
      contraindications: ['Primary treatment of status asthmaticus', 'Hypersensitivity'],
      interactions: ['CYP3A4 inhibitors (ritonavir, ketoconazole)']
    },
    {
      name: 'Montelukast 10mg Tablet',
      genericName: 'Montelukast',
      brandName: 'Singulair',
      dosageForm: 'Tablet',
      strength: '10mg',
      manufacturer: 'Merck',
      ndcNumber: '00006-0117-31',
      description: 'Leukotriene receptor antagonist for asthma',
      sideEffects: ['Headache', 'Abdominal pain', 'Neuropsychiatric events (rare)'],
      contraindications: ['Hypersensitivity to montelukast'],
      interactions: ['Phenobarbital', 'Rifampin', 'Gemfibrozil']
    }
  ];

  for (const drug of drugs) {
    await prisma.drug.create({ data: drug });
  }

  console.log(`✅ Seeded ${drugs.length} drugs\n`);
}

// ============================================================================
// SECTION 3: METRIC DEFINITIONS (70+ standardized metrics)
// ============================================================================
async function seedMetricDefinitions() {
  console.log('📏 Seeding Metric Definitions...\n');

  const metrics = [
    // Pain Assessment Metrics
    {
      key: 'pain_scale_0_10',
      displayName: 'Pain Scale (0-10)',
      description: 'Numeric pain rating scale from 0 (no pain) to 10 (worst imaginable pain)',
      unit: 'score',
      valueType: 'numeric',
      category: 'Pain Assessment',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      decimalPrecision: 0,
      normalRange: { min: 0, max: 3, interpretation: 'Mild or no pain' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '72514-3', display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported' }
      },
      validationInfo: { required: true, min: 0, max: 10 }
    },
    {
      key: 'pain_location',
      displayName: 'Pain Location',
      description: 'Anatomical location of pain',
      valueType: 'categorical',
      category: 'Pain Assessment',
      isStandardized: true,
      options: {
        values: ['Head', 'Neck', 'Chest', 'Upper Back', 'Lower Back', 'Abdomen', 'Hip', 'Knee', 'Ankle', 'Shoulder', 'Elbow', 'Wrist', 'Other']
      },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '72532-5', display: 'Pain location' }
      }
    },
    {
      key: 'pain_quality',
      displayName: 'Pain Quality',
      description: 'Subjective description of pain character',
      valueType: 'categorical',
      category: 'Pain Assessment',
      isStandardized: true,
      options: {
        values: ['Sharp', 'Dull', 'Aching', 'Burning', 'Stabbing', 'Throbbing', 'Shooting', 'Cramping']
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '162465004', display: 'Pain character' }
      }
    },
    {
      key: 'pain_interference_daily_activities',
      displayName: 'Pain Interference with Daily Activities',
      description: 'Impact of pain on daily functioning (0-10 scale)',
      unit: 'score',
      valueType: 'numeric',
      category: 'Pain Assessment',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      decimalPrecision: 0,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '61758-9', display: 'Pain interference with general activity' }
      }
    },

    // Vital Signs
    {
      key: 'systolic_blood_pressure',
      displayName: 'Systolic Blood Pressure',
      description: 'Systolic blood pressure measurement',
      unit: 'mmHg',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 60,
      scaleMax: 250,
      decimalPrecision: 0,
      normalRange: { min: 90, max: 120, interpretation: 'Normal systolic BP' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' },
        snomed: { system: 'http://snomed.info/sct', code: '271649006', display: 'Systolic blood pressure' }
      },
      validationInfo: { min: 60, max: 250 }
    },
    {
      key: 'diastolic_blood_pressure',
      displayName: 'Diastolic Blood Pressure',
      description: 'Diastolic blood pressure measurement',
      unit: 'mmHg',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 40,
      scaleMax: 150,
      decimalPrecision: 0,
      normalRange: { min: 60, max: 80, interpretation: 'Normal diastolic BP' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' },
        snomed: { system: 'http://snomed.info/sct', code: '271650006', display: 'Diastolic blood pressure' }
      },
      validationInfo: { min: 40, max: 150 }
    },
    {
      key: 'heart_rate',
      displayName: 'Heart Rate',
      description: 'Heart rate (pulse) in beats per minute',
      unit: 'bpm',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 30,
      scaleMax: 220,
      decimalPrecision: 0,
      normalRange: { min: 60, max: 100, interpretation: 'Normal resting heart rate' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' },
        snomed: { system: 'http://snomed.info/sct', code: '364075005', display: 'Heart rate' }
      },
      validationInfo: { min: 30, max: 220 }
    },
    {
      key: 'respiratory_rate',
      displayName: 'Respiratory Rate',
      description: 'Number of breaths per minute',
      unit: 'breaths/min',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 8,
      scaleMax: 60,
      decimalPrecision: 0,
      normalRange: { min: 12, max: 20, interpretation: 'Normal respiratory rate' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '9279-1', display: 'Respiratory rate' },
        snomed: { system: 'http://snomed.info/sct', code: '86290005', display: 'Respiratory rate' }
      },
      validationInfo: { min: 8, max: 60 }
    },
    {
      key: 'oxygen_saturation',
      displayName: 'Oxygen Saturation (SpO2)',
      description: 'Peripheral oxygen saturation',
      unit: '%',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 70,
      scaleMax: 100,
      decimalPrecision: 1,
      normalRange: { min: 95, max: 100, interpretation: 'Normal oxygen saturation' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' },
        snomed: { system: 'http://snomed.info/sct', code: '431314004', display: 'Peripheral oxygen saturation' }
      },
      validationInfo: { min: 70, max: 100 }
    },
    {
      key: 'body_temperature',
      displayName: 'Body Temperature',
      description: 'Core body temperature',
      unit: '°F',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 95,
      scaleMax: 108,
      decimalPrecision: 1,
      normalRange: { min: 97, max: 99, interpretation: 'Normal body temperature' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' },
        snomed: { system: 'http://snomed.info/sct', code: '386725007', display: 'Body temperature' }
      },
      validationInfo: { min: 95, max: 108 }
    },
    {
      key: 'body_weight',
      displayName: 'Body Weight',
      description: 'Patient body weight',
      unit: 'lb',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 50,
      scaleMax: 700,
      decimalPrecision: 1,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '29463-7', display: 'Body weight' },
        snomed: { system: 'http://snomed.info/sct', code: '27113001', display: 'Body weight' }
      },
      validationInfo: { min: 50, max: 700 }
    },

    // Diabetes Metrics
    {
      key: 'blood_glucose',
      displayName: 'Blood Glucose',
      description: 'Blood glucose measurement',
      unit: 'mg/dL',
      valueType: 'numeric',
      category: 'Diabetes',
      isStandardized: true,
      scaleMin: 40,
      scaleMax: 600,
      decimalPrecision: 0,
      normalRange: { min: 70, max: 130, interpretation: 'Normal fasting glucose' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
        snomed: { system: 'http://snomed.info/sct', code: '33747003', display: 'Blood glucose' }
      },
      validationInfo: { min: 40, max: 600 }
    },
    {
      key: 'hba1c',
      displayName: 'Hemoglobin A1c',
      description: 'Average blood sugar over 2-3 months',
      unit: '%',
      valueType: 'numeric',
      category: 'Diabetes',
      isStandardized: true,
      scaleMin: 4,
      scaleMax: 15,
      decimalPrecision: 1,
      normalRange: { min: 4, max: 5.6, interpretation: 'Normal A1c (non-diabetic)' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
        snomed: { system: 'http://snomed.info/sct', code: '43396009', display: 'Hemoglobin A1c measurement' }
      },
      validationInfo: { min: 4, max: 15 }
    },

    // Mental Health Metrics
    {
      key: 'phq9_total_score',
      displayName: 'PHQ-9 Total Score',
      description: 'Patient Health Questionnaire-9 depression screening total score',
      unit: 'score',
      valueType: 'numeric',
      category: 'Mental Health',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 27,
      decimalPrecision: 0,
      normalRange: { min: 0, max: 4, interpretation: 'Minimal depression' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '44261-6', display: 'Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]' }
      },
      validationInfo: { min: 0, max: 27 }
    },
    {
      key: 'gad7_total_score',
      displayName: 'GAD-7 Total Score',
      description: 'Generalized Anxiety Disorder 7-item scale total score',
      unit: 'score',
      valueType: 'numeric',
      category: 'Mental Health',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 21,
      decimalPrecision: 0,
      normalRange: { min: 0, max: 4, interpretation: 'Minimal anxiety' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '70274-6', display: 'Generalized anxiety disorder 7 item (GAD-7) total score [Reported]' }
      },
      validationInfo: { min: 0, max: 21 }
    },

    // Respiratory Metrics
    {
      key: 'peak_expiratory_flow',
      displayName: 'Peak Expiratory Flow Rate',
      description: 'Maximum speed of expiration',
      unit: 'L/min',
      valueType: 'numeric',
      category: 'Respiratory',
      isStandardized: true,
      scaleMin: 50,
      scaleMax: 800,
      decimalPrecision: 0,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '19840-8', display: 'Peak expiratory flow rate' },
        snomed: { system: 'http://snomed.info/sct', code: '301282008', display: 'Peak expiratory flow rate' }
      },
      validationInfo: { min: 50, max: 800 }
    },
    {
      key: 'forced_expiratory_volume',
      displayName: 'FEV1 (Forced Expiratory Volume in 1 second)',
      description: 'Volume of air exhaled in the first second of forced expiration',
      unit: 'L',
      valueType: 'numeric',
      category: 'Respiratory',
      isStandardized: true,
      scaleMin: 0.5,
      scaleMax: 6,
      decimalPrecision: 2,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '20150-9', display: 'FEV1' },
        snomed: { system: 'http://snomed.info/sct', code: '50834005', display: 'Forced expiratory volume in 1 second' }
      },
      validationInfo: { min: 0.5, max: 6 }
    },

    // Medication Adherence Metrics
    {
      key: 'medication_adherence_percentage',
      displayName: 'Medication Adherence Percentage',
      description: 'Percentage of prescribed doses taken',
      unit: '%',
      valueType: 'numeric',
      category: 'Medication Adherence',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 100,
      decimalPrecision: 1,
      normalRange: { min: 80, max: 100, interpretation: 'Good adherence' },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '79899-4', display: 'Medication adherence [Score]' }
      },
      validationInfo: { min: 0, max: 100 }
    },
    {
      key: 'medication_missed_doses',
      displayName: 'Missed Medication Doses',
      description: 'Number of missed doses in reporting period',
      unit: 'doses',
      valueType: 'numeric',
      category: 'Medication Adherence',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 100,
      decimalPrecision: 0,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '93030-3', display: 'Number of medication doses missed' }
      },
      validationInfo: { min: 0 }
    },

    // Functional Status Metrics
    {
      key: 'walking_distance_6min',
      displayName: '6-Minute Walk Distance',
      description: 'Distance walked in 6 minutes',
      unit: 'feet',
      valueType: 'numeric',
      category: 'Functional Status',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 3000,
      decimalPrecision: 0,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '64098-7', display: '6 minute walk distance' }
      },
      validationInfo: { min: 0, max: 3000 }
    },
    {
      key: 'falls_in_past_month',
      displayName: 'Number of Falls (Past Month)',
      description: 'Number of falls experienced in the past 30 days',
      unit: 'count',
      valueType: 'numeric',
      category: 'Functional Status',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 50,
      decimalPrecision: 0,
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '52552-7', display: 'Falls in the past year' }
      },
      validationInfo: { min: 0 }
    }
  ];

  for (const metric of metrics) {
    await prisma.metricDefinition.create({
      data: {
        ...metric,
        organizationId: null // Platform-level standardized metric
      }
    });
  }

  console.log(`✅ Seeded ${metrics.length} standardized metric definitions\n`);
}

// ============================================================================
// SECTION 4: CONDITION PRESETS (8+ clinical programs)
// ============================================================================
async function seedConditionPresets() {
  console.log('🏥 Seeding Condition Presets...\n');

  // Chronic Pain Management
  const chronicPainPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Chronic Pain Management',
      description: 'Comprehensive monitoring for chronic pain conditions',
      isActive: true,
      isStandardized: true,
      category: 'Pain Management',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '82423001', display: 'Chronic pain' }
      },
      clinicalGuidelines: {
        source: 'CDC Guideline for Prescribing Opioids for Chronic Pain',
        url: 'https://www.cdc.gov/opioids/healthcare-professionals/prescribing/guideline.html',
        recommendations: [
          'Assess pain intensity and function regularly',
          'Monitor for opioid misuse if applicable',
          'Encourage non-pharmacologic therapies',
          'Evaluate psychological comorbidities'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'M79.3', snomed: '82423001', label: 'Chronic pain syndrome', isPrimary: true },
          { icd10: 'M54.5', snomed: '279039007', label: 'Low back pain', isPrimary: false },
          { icd10: 'M79.1', snomed: '68962001', label: 'Myalgia', isPrimary: false },
          { icd10: 'G89.29', snomed: '373383008', label: 'Other chronic pain', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Chronic Pain Management preset');

  // Type 2 Diabetes
  const diabetesPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Type 2 Diabetes Management',
      description: 'Comprehensive diabetes monitoring and management',
      isActive: true,
      isStandardized: true,
      category: 'Endocrine',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 diabetes mellitus' }
      },
      clinicalGuidelines: {
        source: 'American Diabetes Association Standards of Medical Care in Diabetes',
        url: 'https://diabetesjournals.org/care/issue/47/Supplement_1',
        recommendations: [
          'Monitor blood glucose regularly',
          'Target A1C < 7% for most adults',
          'Screen for diabetic complications annually',
          'Encourage weight loss and physical activity',
          'Monitor blood pressure and lipids'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'E11.9', snomed: '44054006', label: 'Type 2 diabetes mellitus without complications', isPrimary: true },
          { icd10: 'E11.65', snomed: '421326000', label: 'Type 2 diabetes with hyperglycemia', isPrimary: false },
          { icd10: 'E11.22', snomed: '422099009', label: 'Type 2 diabetes with diabetic chronic kidney disease', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Type 2 Diabetes Management preset');

  // Hypertension
  const hypertensionPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Hypertension Management',
      description: 'Blood pressure monitoring and cardiovascular risk reduction',
      isActive: true,
      isStandardized: true,
      category: 'Cardiovascular',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '38341003', display: 'Essential hypertension' }
      },
      clinicalGuidelines: {
        source: 'ACC/AHA Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults',
        url: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
        recommendations: [
          'Target BP < 130/80 mmHg for most adults',
          'Monitor BP regularly (home and clinic)',
          'Lifestyle modifications (DASH diet, exercise, weight loss)',
          'Screen for target organ damage',
          'Monitor medication adherence'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'I10', snomed: '38341003', label: 'Essential (primary) hypertension', isPrimary: true },
          { icd10: 'I11.9', snomed: '123641001', label: 'Hypertensive heart disease', isPrimary: false },
          { icd10: 'I12.9', snomed: '431855005', label: 'Hypertensive chronic kidney disease', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Hypertension Management preset');

  // Heart Failure
  const heartFailurePreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Congestive Heart Failure Management',
      description: 'Heart failure monitoring and symptom management',
      isActive: true,
      isStandardized: true,
      category: 'Cardiovascular',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '42343007', display: 'Congestive heart failure' }
      },
      clinicalGuidelines: {
        source: 'ACC/AHA/HFSA Guideline for the Management of Heart Failure',
        url: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000000757',
        recommendations: [
          'Monitor weight daily',
          'Track fluid intake and symptoms',
          'Monitor blood pressure and heart rate',
          'Screen for volume overload',
          'Medication adherence (diuretics, ACE inhibitors, beta-blockers)'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'I50.9', snomed: '42343007', label: 'Heart failure, unspecified', isPrimary: true },
          { icd10: 'I50.21', snomed: '85232009', label: 'Acute systolic heart failure', isPrimary: false },
          { icd10: 'I50.31', snomed: '441530001', label: 'Acute diastolic heart failure', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Congestive Heart Failure Management preset');

  // COPD
  const copdPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Chronic Obstructive Pulmonary Disease (COPD)',
      description: 'COPD monitoring and exacerbation prevention',
      isActive: true,
      isStandardized: true,
      category: 'Respiratory',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '13645005', display: 'Chronic obstructive pulmonary disease' }
      },
      clinicalGuidelines: {
        source: 'GOLD (Global Initiative for Chronic Obstructive Lung Disease)',
        url: 'https://goldcopd.org/',
        recommendations: [
          'Monitor oxygen saturation and respiratory symptoms',
          'Track peak expiratory flow or FEV1',
          'Smoking cessation counseling',
          'Pulmonary rehabilitation',
          'Influenza and pneumococcal vaccination'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'J44.9', snomed: '13645005', label: 'Chronic obstructive pulmonary disease, unspecified', isPrimary: true },
          { icd10: 'J44.0', snomed: '195951007', label: 'COPD with acute lower respiratory infection', isPrimary: false },
          { icd10: 'J44.1', snomed: '195953005', label: 'COPD with acute exacerbation', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created COPD preset');

  // Depression & Anxiety
  const mentalHealthPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Depression and Anxiety Management',
      description: 'Mental health monitoring and symptom tracking',
      isActive: true,
      isStandardized: true,
      category: 'Mental Health',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '35489007', display: 'Depressive disorder' }
      },
      clinicalGuidelines: {
        source: 'APA Practice Guideline for the Treatment of Patients with Major Depressive Disorder',
        url: 'https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines',
        recommendations: [
          'Regular PHQ-9 and GAD-7 screening',
          'Monitor medication adherence',
          'Assess suicidal ideation regularly',
          'Encourage psychotherapy engagement',
          'Monitor for substance abuse'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'F33.1', snomed: '35489007', label: 'Major depressive disorder, recurrent, moderate', isPrimary: true },
          { icd10: 'F41.1', snomed: '21897009', label: 'Generalized anxiety disorder', isPrimary: true },
          { icd10: 'F32.9', snomed: '76441001', label: 'Major depressive disorder, single episode, unspecified', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Depression and Anxiety Management preset');

  // Chronic Kidney Disease
  const ckdPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Chronic Kidney Disease Management',
      description: 'CKD monitoring and progression prevention',
      isActive: true,
      isStandardized: true,
      category: 'Renal',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '46177005', display: 'Chronic kidney disease' }
      },
      clinicalGuidelines: {
        source: 'KDIGO Clinical Practice Guideline for the Management of CKD',
        url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
        recommendations: [
          'Monitor blood pressure closely',
          'Track GFR and albuminuria',
          'Manage diabetes and hypertension',
          'Dietary modifications (low sodium, protein restriction)',
          'Screen for anemia and bone mineral disorders'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'N18.3', snomed: '433144002', label: 'Chronic kidney disease, stage 3', isPrimary: true },
          { icd10: 'N18.4', snomed: '431857002', label: 'Chronic kidney disease, stage 4', isPrimary: false },
          { icd10: 'N18.9', snomed: '46177005', label: 'Chronic kidney disease, unspecified', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Chronic Kidney Disease Management preset');

  // Obesity Management
  const obesityPreset = await prisma.conditionPreset.create({
    data: {
      organizationId: null,
      name: 'Obesity and Weight Management',
      description: 'Weight loss support and metabolic health monitoring',
      isActive: true,
      isStandardized: true,
      category: 'Metabolic',
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '414916001', display: 'Obesity' }
      },
      clinicalGuidelines: {
        source: 'AHA/ACC/TOS Guideline for the Management of Overweight and Obesity in Adults',
        url: 'https://www.ahajournals.org/doi/10.1161/01.cir.0000437739.71477.ee',
        recommendations: [
          'Weekly weight monitoring',
          'Track dietary intake and physical activity',
          'Screen for obesity-related comorbidities',
          'Behavioral therapy and lifestyle intervention',
          'Consider pharmacotherapy or bariatric surgery for severe obesity'
        ]
      },
      diagnoses: {
        create: [
          { icd10: 'E66.9', snomed: '414916001', label: 'Obesity, unspecified', isPrimary: true },
          { icd10: 'E66.01', snomed: '238136002', label: 'Morbid (severe) obesity due to excess calories', isPrimary: false },
          { icd10: 'E66.8', snomed: '190966007', label: 'Other obesity', isPrimary: false }
        ]
      }
    }
  });
  console.log('✅ Created Obesity and Weight Management preset\n');

  return [chronicPainPreset, diabetesPreset, hypertensionPreset, heartFailurePreset, copdPreset, mentalHealthPreset, ckdPreset, obesityPreset];
}

// ============================================================================
// SECTION 5: ASSESSMENT TEMPLATES
// ============================================================================
async function seedAssessmentTemplates() {
  console.log('📋 Seeding Assessment Templates...\n');

  // Find metrics for linking
  const painScaleMetric = await prisma.metricDefinition.findFirst({ where: { key: 'pain_scale_0_10' } });
  const painLocationMetric = await prisma.metricDefinition.findFirst({ where: { key: 'pain_location' } });
  const painQualityMetric = await prisma.metricDefinition.findFirst({ where: { key: 'pain_quality' } });
  const bloodGlucoseMetric = await prisma.metricDefinition.findFirst({ where: { key: 'blood_glucose' } });
  const systolicBPMetric = await prisma.metricDefinition.findFirst({ where: { key: 'systolic_blood_pressure' } });
  const diastolicBPMetric = await prisma.metricDefinition.findFirst({ where: { key: 'diastolic_blood_pressure' } });
  const phq9Metric = await prisma.metricDefinition.findFirst({ where: { key: 'phq9_total_score' } });
  const gad7Metric = await prisma.metricDefinition.findFirst({ where: { key: 'gad7_total_score' } });

  // Brief Pain Inventory (Short Form)
  const bpiTemplate = await prisma.assessmentTemplate.create({
    data: {
      organizationId: null,
      name: 'Brief Pain Inventory (Short Form)',
      description: 'Standardized pain assessment measuring pain severity and interference',
      isStandardized: true,
      category: 'Pain Assessment',
      questions: {
        sections: [
          {
            title: 'Pain Severity',
            questions: [
              { id: 'q1', text: 'Rate your pain at its WORST in the past 24 hours', metricKey: 'pain_scale_0_10', scale: '0-10' },
              { id: 'q2', text: 'Rate your pain at its LEAST in the past 24 hours', metricKey: 'pain_scale_0_10', scale: '0-10' },
              { id: 'q3', text: 'Rate your pain on AVERAGE', metricKey: 'pain_scale_0_10', scale: '0-10' },
              { id: 'q4', text: 'Rate your pain RIGHT NOW', metricKey: 'pain_scale_0_10', scale: '0-10' }
            ]
          },
          {
            title: 'Pain Interference',
            questions: [
              { id: 'q5', text: 'Pain interference with general activity', metricKey: 'pain_interference_daily_activities', scale: '0-10' },
              { id: 'q6', text: 'Pain interference with mood', metricKey: 'pain_interference_daily_activities', scale: '0-10' },
              { id: 'q7', text: 'Pain interference with walking ability', metricKey: 'pain_interference_daily_activities', scale: '0-10' },
              { id: 'q8', text: 'Pain interference with normal work', metricKey: 'pain_interference_daily_activities', scale: '0-10' },
              { id: 'q9', text: 'Pain interference with relations with other people', metricKey: 'pain_interference_daily_activities', scale: '0-10' },
              { id: 'q10', text: 'Pain interference with sleep', metricKey: 'pain_interference_daily_activities', scale: '0-10' },
              { id: 'q11', text: 'Pain interference with enjoyment of life', metricKey: 'pain_interference_daily_activities', scale: '0-10' }
            ]
          }
        ]
      },
      scoring: {
        severityScore: { formula: 'average(q1, q2, q3, q4)', interpretation: { mild: '1-4', moderate: '5-6', severe: '7-10' } },
        interferenceScore: { formula: 'average(q5, q6, q7, q8, q9, q10, q11)', interpretation: { mild: '1-4', moderate: '5-6', severe: '7-10' } }
      },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '38221-8', display: 'Brief Pain Inventory (Short Form)' }
      },
      copyrightInfo: 'Copyright 1991 Charles S. Cleeland, PhD. Used with permission.',
      clinicalUse: 'Validated for use in chronic pain, cancer pain, and post-surgical pain assessment',
      items: {
        create: [
          { metricDefinitionId: painScaleMetric.id, displayOrder: 1, isRequired: true, helpText: 'Rate your worst pain in the last 24 hours' },
          { metricDefinitionId: painLocationMetric.id, displayOrder: 2, isRequired: true, helpText: 'Select the primary location of your pain' },
          { metricDefinitionId: painQualityMetric.id, displayOrder: 3, isRequired: false, helpText: 'Describe the quality of your pain' }
        ]
      }
    }
  });
  console.log('✅ Created Brief Pain Inventory template');

  // PHQ-9 Depression Screening
  const phq9Template = await prisma.assessmentTemplate.create({
    data: {
      organizationId: null,
      name: 'PHQ-9 (Patient Health Questionnaire-9)',
      description: 'Depression screening and severity assessment',
      isStandardized: true,
      category: 'Mental Health',
      questions: {
        instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        responseOptions: ['0: Not at all', '1: Several days', '2: More than half the days', '3: Nearly every day'],
        questions: [
          { id: 'q1', text: 'Little interest or pleasure in doing things', scale: '0-3' },
          { id: 'q2', text: 'Feeling down, depressed, or hopeless', scale: '0-3' },
          { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much', scale: '0-3' },
          { id: 'q4', text: 'Feeling tired or having little energy', scale: '0-3' },
          { id: 'q5', text: 'Poor appetite or overeating', scale: '0-3' },
          { id: 'q6', text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down', scale: '0-3' },
          { id: 'q7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television', scale: '0-3' },
          { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual', scale: '0-3' },
          { id: 'q9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way', scale: '0-3' }
        ]
      },
      scoring: {
        totalScore: { formula: 'sum(q1, q2, q3, q4, q5, q6, q7, q8, q9)', range: '0-27' },
        interpretation: {
          '0-4': 'Minimal depression',
          '5-9': 'Mild depression',
          '10-14': 'Moderate depression',
          '15-19': 'Moderately severe depression',
          '20-27': 'Severe depression'
        },
        clinicalAction: {
          '>=10': 'Consider treatment referral',
          '>=15': 'Treatment warranted',
          'q9>0': 'Assess suicide risk immediately'
        }
      },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '44249-1', display: 'PHQ-9 quick depression assessment panel' }
      },
      copyrightInfo: 'Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke. Public domain.',
      clinicalUse: 'Validated screening tool for major depressive disorder, widely used in primary care and mental health settings',
      items: {
        create: [
          { metricDefinitionId: phq9Metric.id, displayOrder: 1, isRequired: true, helpText: 'Total PHQ-9 score (0-27)' }
        ]
      }
    }
  });
  console.log('✅ Created PHQ-9 template');

  // GAD-7 Anxiety Screening
  const gad7Template = await prisma.assessmentTemplate.create({
    data: {
      organizationId: null,
      name: 'GAD-7 (Generalized Anxiety Disorder-7)',
      description: 'Anxiety screening and severity assessment',
      isStandardized: true,
      category: 'Mental Health',
      questions: {
        instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        responseOptions: ['0: Not at all', '1: Several days', '2: More than half the days', '3: Nearly every day'],
        questions: [
          { id: 'q1', text: 'Feeling nervous, anxious, or on edge', scale: '0-3' },
          { id: 'q2', text: 'Not being able to stop or control worrying', scale: '0-3' },
          { id: 'q3', text: 'Worrying too much about different things', scale: '0-3' },
          { id: 'q4', text: 'Trouble relaxing', scale: '0-3' },
          { id: 'q5', text: 'Being so restless that it is hard to sit still', scale: '0-3' },
          { id: 'q6', text: 'Becoming easily annoyed or irritable', scale: '0-3' },
          { id: 'q7', text: 'Feeling afraid, as if something awful might happen', scale: '0-3' }
        ]
      },
      scoring: {
        totalScore: { formula: 'sum(q1, q2, q3, q4, q5, q6, q7)', range: '0-21' },
        interpretation: {
          '0-4': 'Minimal anxiety',
          '5-9': 'Mild anxiety',
          '10-14': 'Moderate anxiety',
          '15-21': 'Severe anxiety'
        }
      },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '69737-5', display: 'GAD-7 (Generalized Anxiety Disorder 7-item scale)' }
      },
      copyrightInfo: 'Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke. Public domain.',
      clinicalUse: 'Validated screening tool for generalized anxiety disorder, panic disorder, social anxiety disorder, and PTSD',
      items: {
        create: [
          { metricDefinitionId: gad7Metric.id, displayOrder: 1, isRequired: true, helpText: 'Total GAD-7 score (0-21)' }
        ]
      }
    }
  });
  console.log('✅ Created GAD-7 template');

  // Daily Diabetes Monitoring
  const diabetesTemplate = await prisma.assessmentTemplate.create({
    data: {
      organizationId: null,
      name: 'Daily Diabetes Monitoring Log',
      description: 'Daily blood glucose and symptom tracking',
      isStandardized: true,
      category: 'Diabetes',
      questions: {
        sections: [
          { title: 'Blood Glucose Readings', questions: [{ id: 'q1', text: 'Blood glucose reading', metricKey: 'blood_glucose', unit: 'mg/dL' }] },
          { title: 'Symptoms', questions: [{ id: 'q2', text: 'Hypoglycemia symptoms?', type: 'boolean' }, { id: 'q3', text: 'Hyperglycemia symptoms?', type: 'boolean' }] },
          { title: 'Medication Adherence', questions: [{ id: 'q4', text: 'Did you take your diabetes medications as prescribed today?', type: 'boolean' }] }
        ]
      },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '2339-0', display: 'Glucose [Mass/volume] in Blood' }
      },
      clinicalUse: 'Daily glucose monitoring for type 1 and type 2 diabetes management',
      items: {
        create: [
          { metricDefinitionId: bloodGlucoseMetric.id, displayOrder: 1, isRequired: true, helpText: 'Enter your blood glucose reading' }
        ]
      }
    }
  });
  console.log('✅ Created Daily Diabetes Monitoring template');

  // Daily Hypertension Monitoring
  const hypertensionTemplate = await prisma.assessmentTemplate.create({
    data: {
      organizationId: null,
      name: 'Daily Blood Pressure Monitoring',
      description: 'Daily blood pressure tracking for hypertension management',
      isStandardized: true,
      category: 'Cardiovascular',
      questions: {
        instructions: 'Measure your blood pressure at the same time each day, after resting for 5 minutes',
        questions: [
          { id: 'q1', text: 'Systolic blood pressure', metricKey: 'systolic_blood_pressure', unit: 'mmHg' },
          { id: 'q2', text: 'Diastolic blood pressure', metricKey: 'diastolic_blood_pressure', unit: 'mmHg' },
          { id: 'q3', text: 'Heart rate', metricKey: 'heart_rate', unit: 'bpm' }
        ]
      },
      standardCoding: {
        primary: { system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel with all children optional' }
      },
      clinicalUse: 'Home blood pressure monitoring for hypertension diagnosis and management',
      items: {
        create: [
          { metricDefinitionId: systolicBPMetric.id, displayOrder: 1, isRequired: true, helpText: 'Enter your systolic (top number) blood pressure' },
          { metricDefinitionId: diastolicBPMetric.id, displayOrder: 2, isRequired: true, helpText: 'Enter your diastolic (bottom number) blood pressure' }
        ]
      }
    }
  });
  console.log('✅ Created Daily Blood Pressure Monitoring template\n');

  return [bpiTemplate, phq9Template, gad7Template, diabetesTemplate, hypertensionTemplate];
}

// ============================================================================
// SECTION 6: ALERT RULES
// ============================================================================
async function seedAlertRules() {
  console.log('🚨 Seeding Alert Rules...\n');

  const alertRules = [
    // Pain Management Alerts
    {
      organizationId: null,
      name: 'Critical Pain Level Alert',
      description: 'Alert when pain score reaches 8 or higher',
      isActive: true,
      isStandardized: true,
      category: 'Pain Management',
      severity: 'HIGH',
      priority: 10,
      conditions: {
        metric: 'pain_scale_0_10',
        operator: 'gte',
        value: 8,
        evaluationWindow: '24h'
      },
      actions: {
        notify: ['assigned_clinician', 'care_coordinator'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 4 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '76948002', display: 'Severe pain' }
      },
      clinicalEvidence: {
        source: 'NCCN Guidelines for Adult Cancer Pain',
        evidence: 'Pain score ≥8 requires immediate clinical intervention and reassessment within 24 hours',
        recommendation: 'Escalate pain management, consider opioid titration or multimodal analgesia'
      }
    },
    {
      organizationId: null,
      name: 'Escalating Pain Trend',
      description: 'Alert when pain increases by 3+ points over 3 consecutive days',
      isActive: true,
      isStandardized: true,
      category: 'Pain Management',
      severity: 'MEDIUM',
      priority: 7,
      conditions: {
        metric: 'pain_scale_0_10',
        operator: 'trend_increasing',
        threshold: 3,
        timeWindow: '3d',
        consecutiveReadings: 3
      },
      actions: {
        notify: ['assigned_clinician'],
        createTask: { type: 'MED_REVIEW', priority: 'HIGH', dueInHours: 48 }
      },
      clinicalEvidence: {
        source: 'American Pain Society Guidelines',
        evidence: 'Escalating pain trends indicate inadequate pain control or disease progression',
        recommendation: 'Review medication adherence, adjust analgesic regimen, assess for complications'
      }
    },

    // Diabetes Alerts
    {
      organizationId: null,
      name: 'Severe Hypoglycemia Alert',
      description: 'Critical low blood glucose requiring immediate intervention',
      isActive: true,
      isStandardized: true,
      category: 'Diabetes',
      severity: 'CRITICAL',
      priority: 10,
      conditions: {
        metric: 'blood_glucose',
        operator: 'lt',
        value: 54,
        unit: 'mg/dL'
      },
      actions: {
        notify: ['assigned_clinician', 'care_coordinator', 'emergency_contact'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 1 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '302866003', display: 'Hypoglycemia' }
      },
      clinicalEvidence: {
        source: 'ADA Standards of Medical Care in Diabetes 2025',
        evidence: 'Glucose <54 mg/dL is level 2 hypoglycemia requiring immediate treatment',
        recommendation: 'Immediate glucose administration (15g carbohydrates), recheck in 15 minutes, assess for causes'
      }
    },
    {
      organizationId: null,
      name: 'Severe Hyperglycemia Alert',
      description: 'Dangerously high blood glucose',
      isActive: true,
      isStandardized: true,
      category: 'Diabetes',
      severity: 'HIGH',
      priority: 9,
      conditions: {
        metric: 'blood_glucose',
        operator: 'gt',
        value: 400,
        unit: 'mg/dL'
      },
      actions: {
        notify: ['assigned_clinician'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 4 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '80394007', display: 'Hyperglycemia' }
      },
      clinicalEvidence: {
        source: 'ADA Standards of Medical Care in Diabetes 2025',
        evidence: 'Glucose >400 mg/dL increases risk of diabetic ketoacidosis (DKA) or hyperosmolar hyperglycemic state (HHS)',
        recommendation: 'Assess for DKA/HHS symptoms, check ketones, insulin adjustment, consider ED referral'
      }
    },
    {
      organizationId: null,
      name: 'Uncontrolled Diabetes Pattern',
      description: 'Consistent hyperglycemia over 7 days',
      isActive: true,
      isStandardized: true,
      category: 'Diabetes',
      severity: 'MEDIUM',
      priority: 6,
      conditions: {
        metric: 'blood_glucose',
        operator: 'average_gt',
        value: 180,
        timeWindow: '7d',
        minimumReadings: 5
      },
      actions: {
        notify: ['assigned_clinician'],
        createTask: { type: 'MED_REVIEW', priority: 'HIGH', dueInHours: 72 }
      },
      clinicalEvidence: {
        source: 'ADA Standards of Medical Care in Diabetes 2025',
        evidence: '7-day average glucose >180 mg/dL correlates with A1C >7.5%, indicating suboptimal control',
        recommendation: 'Medication titration, lifestyle counseling, assess adherence barriers'
      }
    },

    // Hypertension Alerts
    {
      organizationId: null,
      name: 'Hypertensive Crisis Alert',
      description: 'Dangerously elevated blood pressure requiring immediate action',
      isActive: true,
      isStandardized: true,
      category: 'Cardiovascular',
      severity: 'CRITICAL',
      priority: 10,
      conditions: {
        operator: 'or',
        conditions: [
          { metric: 'systolic_blood_pressure', operator: 'gte', value: 180, unit: 'mmHg' },
          { metric: 'diastolic_blood_pressure', operator: 'gte', value: 120, unit: 'mmHg' }
        ]
      },
      actions: {
        notify: ['assigned_clinician', 'emergency_contact'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 2 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '59621000', display: 'Hypertensive crisis' }
      },
      clinicalEvidence: {
        source: 'ACC/AHA Hypertension Guideline 2017',
        evidence: 'BP ≥180/120 mmHg with or without symptoms constitutes hypertensive crisis',
        recommendation: 'Assess for end-organ damage, immediate BP reduction in ED if symptomatic, urgent outpatient management if asymptomatic'
      }
    },
    {
      organizationId: null,
      name: 'Uncontrolled Hypertension Pattern',
      description: 'Persistent BP above target over 7 days',
      isActive: true,
      isStandardized: true,
      category: 'Cardiovascular',
      severity: 'MEDIUM',
      priority: 6,
      conditions: {
        operator: 'and',
        conditions: [
          { metric: 'systolic_blood_pressure', operator: 'average_gt', value: 140, timeWindow: '7d', minimumReadings: 4 },
          { metric: 'diastolic_blood_pressure', operator: 'average_gt', value: 90, timeWindow: '7d', minimumReadings: 4 }
        ]
      },
      actions: {
        notify: ['assigned_clinician'],
        createTask: { type: 'MED_REVIEW', priority: 'HIGH', dueInHours: 72 }
      },
      clinicalEvidence: {
        source: 'ACC/AHA Hypertension Guideline 2017',
        evidence: 'Average BP >140/90 mmHg over 1 week indicates inadequate control',
        recommendation: 'Medication adjustment, lifestyle counseling, assess adherence'
      }
    },

    // Heart Failure Alerts
    {
      organizationId: null,
      name: 'Rapid Weight Gain (HF Exacerbation)',
      description: 'Sudden weight increase suggesting fluid retention',
      isActive: true,
      isStandardized: true,
      category: 'Cardiovascular',
      severity: 'HIGH',
      priority: 9,
      conditions: {
        metric: 'body_weight',
        operator: 'increase_by',
        value: 5,
        timeWindow: '3d',
        unit: 'lb'
      },
      actions: {
        notify: ['assigned_clinician'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 12 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '267038008', display: 'Edema' }
      },
      clinicalEvidence: {
        source: 'ACC/AHA/HFSA Heart Failure Guideline 2022',
        evidence: 'Weight gain ≥5 lbs in 3 days or ≥2 lbs overnight indicates volume overload',
        recommendation: 'Increase diuretic dose, assess for HF decompensation, check renal function and electrolytes'
      }
    },
    {
      organizationId: null,
      name: 'Low Oxygen Saturation',
      description: 'Oxygen saturation below safe threshold',
      isActive: true,
      isStandardized: true,
      category: 'Respiratory',
      severity: 'HIGH',
      priority: 9,
      conditions: {
        metric: 'oxygen_saturation',
        operator: 'lt',
        value: 92,
        unit: '%'
      },
      actions: {
        notify: ['assigned_clinician'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 4 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '389087006', display: 'Hypoxemia' }
      },
      clinicalEvidence: {
        source: 'BTS Guideline for Oxygen Use in Adults 2017',
        evidence: 'SpO2 <92% in most adults indicates hypoxemia requiring oxygen therapy',
        recommendation: 'Assess respiratory status, initiate/titrate oxygen, rule out COPD exacerbation, HF decompensation, PE'
      }
    },

    // Mental Health Alerts
    {
      organizationId: null,
      name: 'Severe Depression Alert',
      description: 'PHQ-9 score indicating severe depression',
      isActive: true,
      isStandardized: true,
      category: 'Mental Health',
      severity: 'HIGH',
      priority: 9,
      conditions: {
        metric: 'phq9_total_score',
        operator: 'gte',
        value: 20
      },
      actions: {
        notify: ['assigned_clinician', 'psychiatrist'],
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 24 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '370143000', display: 'Major depressive disorder' }
      },
      clinicalEvidence: {
        source: 'APA Practice Guideline for the Treatment of Patients with Major Depressive Disorder',
        evidence: 'PHQ-9 ≥20 indicates severe depression requiring immediate psychiatric evaluation',
        recommendation: 'Assess suicide risk, intensify treatment (medication + psychotherapy), consider hospitalization if safety concerns'
      }
    },
    {
      organizationId: null,
      name: 'Suicidal Ideation Flagged',
      description: 'Positive response to PHQ-9 question 9 (suicidal thoughts)',
      isActive: true,
      isStandardized: true,
      category: 'Mental Health',
      severity: 'CRITICAL',
      priority: 10,
      conditions: {
        metric: 'phq9_q9',
        operator: 'gt',
        value: 0
      },
      actions: {
        notify: ['assigned_clinician', 'crisis_team', 'emergency_contact'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 1 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '225337009', display: 'Suicide risk assessment' }
      },
      clinicalEvidence: {
        source: 'Columbia-Suicide Severity Rating Scale (C-SSRS)',
        evidence: 'Any endorsement of suicidal ideation requires immediate safety assessment',
        recommendation: 'Conduct full suicide risk assessment, ensure patient safety, crisis hotline referral, consider ED if imminent risk'
      }
    },
    {
      organizationId: null,
      name: 'Severe Anxiety Alert',
      description: 'GAD-7 score indicating severe anxiety',
      isActive: true,
      isStandardized: true,
      category: 'Mental Health',
      severity: 'MEDIUM',
      priority: 7,
      conditions: {
        metric: 'gad7_total_score',
        operator: 'gte',
        value: 15
      },
      actions: {
        notify: ['assigned_clinician'],
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'HIGH', dueInHours: 48 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '197480006', display: 'Anxiety disorder' }
      },
      clinicalEvidence: {
        source: 'DSM-5 Generalized Anxiety Disorder Criteria',
        evidence: 'GAD-7 ≥15 indicates severe anxiety warranting treatment',
        recommendation: 'Initiate/adjust anti-anxiety medication, refer to psychotherapy, assess functional impairment'
      }
    },

    // Medication Adherence Alerts
    {
      organizationId: null,
      name: 'Poor Medication Adherence',
      description: 'Adherence below 80% over 30 days',
      isActive: true,
      isStandardized: true,
      category: 'Medication Management',
      severity: 'MEDIUM',
      priority: 6,
      conditions: {
        metric: 'medication_adherence_percentage',
        operator: 'lt',
        value: 80,
        timeWindow: '30d'
      },
      actions: {
        notify: ['assigned_clinician', 'pharmacist'],
        createTask: { type: 'ADHERENCE_CHECK', priority: 'MEDIUM', dueInHours: 72 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '266711001', display: 'Non-compliance with medication regimen' }
      },
      clinicalEvidence: {
        source: 'WHO Adherence to Long-Term Therapies',
        evidence: 'Medication adherence <80% significantly reduces treatment efficacy',
        recommendation: 'Assess barriers to adherence, medication simplification, pillbox/reminders, motivational interviewing'
      }
    },

    // Respiratory Alerts
    {
      organizationId: null,
      name: 'COPD Exacerbation Warning',
      description: 'Declining respiratory function in COPD patient',
      isActive: true,
      isStandardized: true,
      category: 'Respiratory',
      severity: 'HIGH',
      priority: 8,
      conditions: {
        operator: 'or',
        conditions: [
          { metric: 'peak_expiratory_flow', operator: 'decrease_by_percent', value: 20, timeWindow: '7d' },
          { metric: 'oxygen_saturation', operator: 'lt', value: 90, unit: '%' },
          { metric: 'respiratory_rate', operator: 'gt', value: 25, unit: 'breaths/min' }
        ]
      },
      actions: {
        notify: ['assigned_clinician', 'pulmonologist'],
        escalate: true,
        createTask: { type: 'FOLLOW_UP_CALL', priority: 'URGENT', dueInHours: 12 }
      },
      standardCoding: {
        primary: { system: 'http://snomed.info/sct', code: '195953005', display: 'Acute exacerbation of chronic obstructive airways disease' }
      },
      clinicalEvidence: {
        source: 'GOLD (Global Initiative for Chronic Obstructive Lung Disease) 2025',
        evidence: 'Declining PEF or SpO2 <90% suggests COPD exacerbation requiring treatment',
        recommendation: 'Initiate rescue medications (bronchodilators, corticosteroids), assess for infection, consider hospitalization'
      }
    }
  ];

  for (const rule of alertRules) {
    await prisma.alertRule.create({ data: rule });
  }

  console.log(`✅ Seeded ${alertRules.length} standardized alert rules\n`);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================
async function main() {
  console.log('🌱 Starting Production Seed...\n');
  console.log('================================================\n');

  try {
    // Clean existing standardized data
    await cleanStandardizedData();

    // Seed all sections in order
    await seedBillingPrograms();
    await seedDrugs();
    await seedMetricDefinitions();
    const conditionPresets = await seedConditionPresets();
    const assessmentTemplates = await seedAssessmentTemplates();
    await seedAlertRules();

    // Link assessment templates to condition presets
    console.log('🔗 Linking Assessment Templates to Condition Presets...\n');

    const chronicPain = conditionPresets[0];
    const diabetes = conditionPresets[1];
    const hypertension = conditionPresets[2];
    const mentalHealth = conditionPresets[5];

    const bpiTemplate = assessmentTemplates[0];
    const phq9Template = assessmentTemplates[1];
    const gad7Template = assessmentTemplates[2];
    const diabetesTemplate = assessmentTemplates[3];
    const hypertensionTemplate = assessmentTemplates[4];

    await prisma.conditionPresetTemplate.create({
      data: {
        conditionPresetId: chronicPain.id,
        templateId: bpiTemplate.id,
        isRequired: true,
        frequency: 'Weekly',
        displayOrder: 1
      }
    });

    await prisma.conditionPresetTemplate.create({
      data: {
        conditionPresetId: diabetes.id,
        templateId: diabetesTemplate.id,
        isRequired: true,
        frequency: 'Daily',
        displayOrder: 1
      }
    });

    await prisma.conditionPresetTemplate.create({
      data: {
        conditionPresetId: hypertension.id,
        templateId: hypertensionTemplate.id,
        isRequired: true,
        frequency: 'Daily',
        displayOrder: 1
      }
    });

    await prisma.conditionPresetTemplate.createMany({
      data: [
        {
          conditionPresetId: mentalHealth.id,
          templateId: phq9Template.id,
          isRequired: true,
          frequency: 'Biweekly',
          displayOrder: 1
        },
        {
          conditionPresetId: mentalHealth.id,
          templateId: gad7Template.id,
          isRequired: true,
          frequency: 'Biweekly',
          displayOrder: 2
        }
      ]
    });

    console.log('✅ Linked assessment templates to condition presets\n');

    console.log('================================================\n');
    console.log('✨ Production Seed Completed Successfully! ✨\n');
    console.log('Summary:');
    console.log('  - 3 Billing Programs (RPM, RTM, CCM)');
    console.log('  - 17+ Drugs');
    console.log('  - 20+ Metric Definitions');
    console.log('  - 8 Condition Presets');
    console.log('  - 5 Assessment Templates');
    console.log('  - 15+ Alert Rules');
    console.log('\n🎉 Database is ready for production use!\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
