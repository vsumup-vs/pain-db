const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed CMS 2025 Billing Programs
 *
 * This script seeds the configurable billing architecture with:
 * - CMS Remote Patient Monitoring (RPM) 2025
 * - CMS Remote Therapeutic Monitoring (RTM) 2025
 * - CMS Chronic Care Management (CCM) 2025
 *
 * Each program includes:
 * - Billing requirements (configurable JSON)
 * - CPT codes with criteria
 * - Eligibility rules
 * - Current 2025 reimbursement rates
 */

async function seedCMSBillingPrograms() {
  console.log('🏥 Seeding CMS 2025 Billing Programs...\n');

  // ============================================================================
  // 1. CMS RPM (Remote Patient Monitoring) 2025
  // ============================================================================
  console.log('📊 Creating CMS RPM 2025...');

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
        transmissionFrequency: 'DAILY',
        eligibilityCriteria: {
          requiresMedicare: true,
          chronicConditionsMin: 1
        }
      },
      description: 'CMS Remote Patient Monitoring program for Medicare beneficiaries with chronic conditions requiring daily physiologic data collection and transmission.',
      notes: 'Updated for 2025 CMS guidelines. Requires 16+ days of device readings and 20+ minutes of clinical time per month.',
      cptCodes: {
        create: [
          {
            code: '99453',
            description: 'Remote monitoring of physiologic parameter(s) (eg, weight, blood pressure, pulse oximetry, respiratory flow rate), initial; set-up and patient education on use of equipment',
            category: 'SETUP',
            isRecurring: false,
            criteria: {
              type: 'ONE_TIME_SETUP',
              requiresCompletion: true,
              validityPeriod: 'LIFETIME',
              notes: 'One-time billable code per patient lifetime'
            },
            reimbursementRate: 19.19,
            currency: 'USD',
            displayOrder: 1,
            isActive: true
          },
          {
            code: '99454',
            description: 'Remote monitoring of physiologic parameter(s) (eg, weight, blood pressure, pulse oximetry, respiratory flow rate), initial; device(s) supply with daily recording(s) or programmed alert(s) transmission, each 30 days',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_DAYS',
              threshold: 16,
              operator: '>=',
              calculationMethod: 'unique_days_device_observations',
              evaluationPeriod: 'MONTHLY',
              sourceFilter: { source: 'DEVICE' },
              notes: 'Requires at least 16 days of device readings in a 30-day period'
            },
            reimbursementRate: 64.53,
            currency: 'USD',
            displayOrder: 2,
            isActive: true
          },
          {
            code: '99457',
            description: 'Remote physiologic monitoring treatment management services, 20 minutes or more of clinical staff/physician/other qualified health care professional time in a calendar month requiring interactive communication with the patient/caregiver during the month',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              evaluationPeriod: 'MONTHLY',
              cptCodesAllowed: ['99457'],
              requiresInteractiveCommunication: true,
              notes: 'First 20 minutes of clinical time per month'
            },
            reimbursementRate: 51.55,
            currency: 'USD',
            displayOrder: 3,
            isActive: true
          },
          {
            code: '99458',
            description: 'Remote physiologic monitoring treatment management services, each additional 20 minutes of clinical staff/physician/other qualified health care professional time in a calendar month requiring interactive communication with the patient/caregiver during the month (List separately in addition to code for primary procedure)',
            category: 'CLINICAL_TIME_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['99457'],
              notes: 'Each additional 20 minutes beyond the first 20 minutes (99457)'
            },
            reimbursementRate: 40.84,
            currency: 'USD',
            displayOrder: 4,
            isActive: true
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Coverage',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare Part B or Medicare Advantage coverage',
              validationNotes: 'Verify active Medicare coverage before enrollment'
            },
            description: 'Patient must have active Medicare Part B or Medicare Advantage coverage to be eligible for RPM billing.'
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
              codingSystems: ['ICD-10'],
              expectedDuration: '3_MONTHS',
              errorMessage: 'Requires at least 1 chronic condition expected to last 3+ months',
              exampleConditions: ['Hypertension (I10)', 'Diabetes (E11)', 'Heart Failure (I50)', 'COPD (J44)']
            },
            description: 'Patient must have at least one chronic condition that is expected to last at least 3 months or until the death of the patient.'
          },
          {
            ruleName: 'Informed Consent',
            ruleType: 'CONSENT',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'CONSENT',
              operator: 'OBTAINED',
              consentTypes: ['RPM_MONITORING', 'DATA_TRANSMISSION', 'COST_SHARING'],
              errorMessage: 'Patient consent for remote monitoring, data transmission, and cost-sharing required',
              consentRequirements: [
                'Patient understands RPM services',
                'Patient agrees to daily device use',
                'Patient acknowledges cost-sharing responsibility'
              ]
            },
            description: 'Patient must provide informed consent for RPM services, including understanding of cost-sharing responsibilities.'
          }
        ]
      }
    },
    include: {
      cptCodes: true,
      eligibilityRules: true
    }
  });

  console.log(`✅ Created CMS RPM 2025 (ID: ${rpmProgram.id})`);
  console.log(`   - ${rpmProgram.cptCodes.length} CPT codes`);
  console.log(`   - ${rpmProgram.eligibilityRules.length} eligibility rules\n`);

  // ============================================================================
  // 2. CMS RTM (Remote Therapeutic Monitoring) 2025
  // ============================================================================
  console.log('📊 Creating CMS RTM 2025...');

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
        treatmentTimeMinutes: 20,
        setupRequired: true,
        therapeuticInterventionRequired: true,
        eligibilityCriteria: {
          requiresMedicare: true,
          therapeuticGoal: true,
          respiratoryOrMusculoskeletal: true
        }
      },
      description: 'CMS Remote Therapeutic Monitoring for musculoskeletal and respiratory system status. Non-physiologic data collection and treatment management.',
      notes: 'RTM focuses on therapeutic adherence, medication compliance, therapy response, and musculoskeletal/respiratory system status.',
      cptCodes: {
        create: [
          {
            code: '98975',
            description: 'Remote therapeutic monitoring (eg, respiratory system status, musculoskeletal system status, therapy adherence, therapy response); initial set-up and patient education on use of equipment',
            category: 'SETUP',
            isRecurring: false,
            criteria: {
              type: 'ONE_TIME_SETUP',
              requiresCompletion: true,
              validityPeriod: 'LIFETIME',
              notes: 'One-time billable code per patient lifetime'
            },
            reimbursementRate: 19.49,
            currency: 'USD',
            displayOrder: 1,
            isActive: true
          },
          {
            code: '98976',
            description: 'Remote therapeutic monitoring (eg, respiratory system status, musculoskeletal system status, therapy adherence, therapy response); device(s) supply with scheduled (eg, daily) recording(s) and/or programmed alert(s) transmission to monitor respiratory system, each 30 days',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_DAYS',
              threshold: 16,
              operator: '>=',
              calculationMethod: 'unique_days_therapeutic_data',
              evaluationPeriod: 'MONTHLY',
              contextFilter: { context: { in: ['CLINICAL_MONITORING', 'PROGRAM_ENROLLMENT'] } },
              notes: 'Requires at least 16 days of therapeutic data in a 30-day period'
            },
            reimbursementRate: 56.84,
            currency: 'USD',
            displayOrder: 2,
            isActive: true
          },
          {
            code: '98977',
            description: 'Remote therapeutic monitoring treatment management services, physician or other qualified health care professional time in a calendar month requiring at least one interactive communication with the patient/caregiver during the calendar month; first 20 minutes',
            category: 'TREATMENT_TIME',
            isRecurring: true,
            criteria: {
              type: 'TREATMENT_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_treatment_time_logs',
              evaluationPeriod: 'MONTHLY',
              requiresInteractiveCommunication: true,
              notes: 'First 20 minutes of treatment management time per month'
            },
            reimbursementRate: 48.79,
            currency: 'USD',
            displayOrder: 3,
            isActive: true
          },
          {
            code: '98980',
            description: 'Remote therapeutic monitoring treatment management services, physician or other qualified health care professional time in a calendar month requiring at least one interactive communication with the patient/caregiver during the calendar month; each additional 20 minutes (List separately in addition to code for primary procedure) - RESPIRATORY',
            category: 'TREATMENT_TIME_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'TREATMENT_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_treatment_time_logs_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['98977'],
              conditionCategory: 'RESPIRATORY',
              notes: 'Each additional 20 minutes for respiratory conditions (e.g., COPD, asthma)'
            },
            reimbursementRate: 39.24,
            currency: 'USD',
            displayOrder: 4,
            isActive: true
          },
          {
            code: '98981',
            description: 'Remote therapeutic monitoring treatment management services, physician or other qualified health care professional time in a calendar month requiring at least one interactive communication with the patient/caregiver during the calendar month; each additional 20 minutes (List separately in addition to code for primary procedure) - MUSCULOSKELETAL',
            category: 'TREATMENT_TIME_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'TREATMENT_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_treatment_time_logs_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['98977'],
              conditionCategory: 'MUSCULOSKELETAL',
              notes: 'Each additional 20 minutes for musculoskeletal conditions (e.g., chronic pain, arthritis)'
            },
            reimbursementRate: 39.24,
            currency: 'USD',
            displayOrder: 5,
            isActive: true
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Coverage',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare Part B or Medicare Advantage coverage'
            },
            description: 'Patient must have active Medicare coverage to be eligible for RTM billing.'
          },
          {
            ruleName: 'Therapeutic Goal Documentation',
            ruleType: 'CUSTOM',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DOCUMENTATION',
              operator: 'REQUIRED',
              documentTypes: ['THERAPEUTIC_GOAL', 'TREATMENT_PLAN'],
              errorMessage: 'Documented therapeutic goal and treatment plan required',
              requirements: [
                'Specific therapeutic goal (e.g., improve respiratory function, reduce pain)',
                'Treatment plan outlining interventions',
                'Expected outcomes and timeline'
              ]
            },
            description: 'RTM requires documented therapeutic goals and a treatment plan before services can be billed.'
          },
          {
            ruleName: 'Respiratory or Musculoskeletal Condition',
            ruleType: 'DIAGNOSIS',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'CATEGORY_MATCH',
              categories: ['RESPIRATORY', 'MUSCULOSKELETAL'],
              errorMessage: 'Patient must have respiratory or musculoskeletal condition',
              exampleConditions: [
                'Respiratory: COPD (J44), Asthma (J45)',
                'Musculoskeletal: Chronic pain (M79.3), Arthritis (M19)'
              ]
            },
            description: 'RTM is specifically for respiratory system status or musculoskeletal system status monitoring.'
          }
        ]
      }
    },
    include: {
      cptCodes: true,
      eligibilityRules: true
    }
  });

  console.log(`✅ Created CMS RTM 2025 (ID: ${rtmProgram.id})`);
  console.log(`   - ${rtmProgram.cptCodes.length} CPT codes`);
  console.log(`   - ${rtmProgram.eligibilityRules.length} eligibility rules\n`);

  // ============================================================================
  // 3. CMS CCM (Chronic Care Management) 2025
  // ============================================================================
  console.log('📊 Creating CMS CCM 2025...');

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
        careCoordinationMinutes: 20,
        chronicConditionsMin: 2,
        comprehensiveCarePlanRequired: true,
        twentyFourSevenAccessRequired: true,
        eligibilityCriteria: {
          requiresMedicare: true,
          chronicConditionsMin: 2,
          expectedDuration: '12_MONTHS'
        }
      },
      description: 'CMS Chronic Care Management for Medicare beneficiaries with multiple (two or more) chronic conditions expected to last at least 12 months or until the death of the patient.',
      notes: 'CCM requires a comprehensive care plan, 24/7 access to care management services, and enhanced communication among all practitioners providing care.',
      cptCodes: {
        create: [
          {
            code: '99490',
            description: 'Chronic care management services, at least 20 minutes of clinical staff time directed by a physician or other qualified health care professional, per calendar month',
            category: 'CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'CARE_COORDINATION_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_care_coordination_time',
              evaluationPeriod: 'MONTHLY',
              requiresCarePlan: true,
              requires24x7Access: true,
              notes: 'First 20 minutes of care coordination per month'
            },
            reimbursementRate: 52.37,
            currency: 'USD',
            displayOrder: 1,
            isActive: true
          },
          {
            code: '99439',
            description: 'Chronic care management services, each additional 20 minutes of clinical staff time directed by a physician or other qualified health care professional, per calendar month (List separately in addition to code for primary procedure)',
            category: 'CARE_COORDINATION_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'CARE_COORDINATION_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_care_coordination_time_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['99490'],
              notes: 'Each additional 20 minutes beyond the first 20 minutes (99490)'
            },
            reimbursementRate: 42.32,
            currency: 'USD',
            displayOrder: 2,
            isActive: true
          },
          {
            code: '99491',
            description: 'Chronic care management services, provided personally by a physician or other qualified health care professional, at least 30 minutes of physician or other qualified health care professional time, per calendar month',
            category: 'COMPLEX_CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'COMPLEX_CARE_COORDINATION_TIME',
              thresholdMinutes: 30,
              maxMinutes: 59,
              operator: '>=',
              calculationMethod: 'sum_care_coordination_time',
              evaluationPeriod: 'MONTHLY',
              requiresPhysicianTime: true,
              requiresComplexityIndicators: true,
              complexityIndicators: [
                'Multiple chronic conditions with significant impairment',
                'Requires substantial revision of care plan',
                'Moderate to high complexity medical decision making'
              ],
              notes: 'Complex CCM - Requires direct physician/QHP time and complexity indicators'
            },
            reimbursementRate: 95.17,
            currency: 'USD',
            displayOrder: 3,
            isActive: true
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Coverage',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B'],
              errorMessage: 'Patient must have Medicare Part B coverage (Note: Medicare Advantage has different CCM requirements)'
            },
            description: 'Patient must have active Medicare Part B coverage (traditional Medicare) to be eligible for CCM billing under CMS rules.'
          },
          {
            ruleName: '2+ Chronic Conditions (12+ months)',
            ruleType: 'DIAGNOSIS',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'MIN_COUNT',
              minCount: 2,
              codingSystems: ['ICD-10'],
              expectedDuration: '12_MONTHS',
              errorMessage: 'Requires 2+ chronic conditions expected to last 12+ months or until death',
              exampleConditions: [
                'Diabetes (E11) + Hypertension (I10)',
                'Heart Failure (I50) + COPD (J44)',
                'CKD (N18) + Diabetes (E11)'
              ]
            },
            description: 'Patient must have at least two chronic conditions that are expected to last at least 12 months or until the death of the patient, and that place the patient at significant risk of death, acute exacerbation/decompensation, or functional decline.'
          },
          {
            ruleName: 'Comprehensive Care Plan',
            ruleType: 'CUSTOM',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'DOCUMENTATION',
              operator: 'REQUIRED',
              documentTypes: ['COMPREHENSIVE_CARE_PLAN'],
              errorMessage: 'Comprehensive care plan must be documented and shared with patient',
              carePlanRequirements: [
                'Problem list with all chronic conditions',
                'Medication reconciliation and management',
                'Expected outcomes and prognosis',
                'Treatment goals',
                'Symptom management plan',
                'Planned interventions and community resources',
                'Identification of care team and coordination'
              ]
            },
            description: 'A comprehensive care plan must be created, documented, and shared with the patient (and caregiver, if applicable). The plan must be revised as the patient\'s health status changes.'
          },
          {
            ruleName: 'Patient Consent',
            ruleType: 'CONSENT',
            priority: 4,
            isRequired: true,
            ruleLogic: {
              type: 'CONSENT',
              operator: 'OBTAINED',
              consentTypes: ['CCM_SERVICES', 'COST_SHARING_ACKNOWLEDGEMENT', 'ONLY_ONE_PRACTITIONER'],
              errorMessage: 'Patient must consent to CCM services, acknowledge cost-sharing, and agree that only one practitioner will bill for CCM per month',
              consentRequirements: [
                'Patient understands CCM services and benefits',
                'Patient acknowledges cost-sharing responsibility (typically 20% coinsurance)',
                'Patient agrees that only one practitioner can bill CCM per calendar month',
                'Patient can revoke consent at any time'
              ]
            },
            description: 'Patient must provide informed consent for CCM services, including understanding that they can only receive CCM from one practitioner per month and acknowledging cost-sharing responsibilities.'
          },
          {
            ruleName: '24/7 Access to Care Management',
            ruleType: 'CUSTOM',
            priority: 5,
            isRequired: true,
            ruleLogic: {
              type: 'PROCESS',
              operator: 'REQUIRED',
              processTypes: ['24x7_ACCESS'],
              errorMessage: '24/7 access to care management services must be available',
              accessRequirements: [
                'Continuity of care with designated care team',
                '24-hour access to practitioners (phone or secure messaging)',
                'System to respond to urgent needs within appropriate timeframe'
              ]
            },
            description: 'Practice must provide 24/7 access to care management services, including continuity of care and same-day access to a designated care team member when needed.'
          }
        ]
      }
    },
    include: {
      cptCodes: true,
      eligibilityRules: true
    }
  });

  console.log(`✅ Created CMS CCM 2025 (ID: ${ccmProgram.id})`);
  console.log(`   - ${ccmProgram.cptCodes.length} CPT codes`);
  console.log(`   - ${ccmProgram.eligibilityRules.length} eligibility rules\n`);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ CMS 2025 Billing Programs Seed Complete!\n');
  console.log('📋 Summary:');
  console.log(`   - ${[rpmProgram, rtmProgram, ccmProgram].length} billing programs created`);
  console.log(`   - ${rpmProgram.cptCodes.length + rtmProgram.cptCodes.length + ccmProgram.cptCodes.length} total CPT codes`);
  console.log(`   - ${rpmProgram.eligibilityRules.length + rtmProgram.eligibilityRules.length + ccmProgram.eligibilityRules.length} total eligibility rules\n`);

  console.log('📊 Programs:');
  console.log(`   1. CMS RPM 2025 (${rpmProgram.code})`);
  console.log(`      - 4 CPT codes: 99453, 99454, 99457, 99458`);
  console.log(`      - Requirements: 16+ days data, 20+ min clinical time`);
  console.log(`   2. CMS RTM 2025 (${rtmProgram.code})`);
  console.log(`      - 5 CPT codes: 98975, 98976, 98977, 98980, 98981`);
  console.log(`      - Requirements: 16+ days data, 20+ min treatment time`);
  console.log(`   3. CMS CCM 2025 (${ccmProgram.code})`);
  console.log(`      - 3 CPT codes: 99490, 99439, 99491`);
  console.log(`      - Requirements: 2+ chronic conditions, 20+ min care coordination\n`);

  console.log('💡 Next Steps:');
  console.log('   1. Create billingReadinessService to calculate eligibility');
  console.log('   2. Create API endpoints for billing readiness');
  console.log('   3. Build billing readiness dashboard UI');
  console.log('   4. Update enrollment workflow to use billing programs');
  console.log('═══════════════════════════════════════════════════════════\n');

  return {
    rpm: rpmProgram,
    rtm: rtmProgram,
    ccm: ccmProgram
  };
}

// Run the seed function
seedCMSBillingPrograms()
  .then((result) => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
