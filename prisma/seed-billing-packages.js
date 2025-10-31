const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedBillingPackages() {
  console.log('🔄 Seeding Billing Package Templates...\n');

  try {
    // Package 1: COPD/Asthma Multi-Program Package
    const copdAsthmaPackage = await prisma.billingPackageTemplate.upsert({
      where: { code: 'COPD_ASTHMA_MULTI' },
      update: {},
      create: {
        name: 'COPD/Asthma Multi-Program Package',
        code: 'COPD_ASTHMA_MULTI',
        description: 'Comprehensive remote monitoring package for patients with COPD or Asthma requiring device monitoring, therapeutic tracking, and care coordination',
        category: 'RESPIRATORY',
        isStandardized: true,
        isActive: true,
        diagnosisCriteria: {
          primary: [
            { code: 'J44.*', display: 'Chronic obstructive pulmonary disease', codingSystem: 'ICD-10' },
            { code: 'J45.*', display: 'Asthma', codingSystem: 'ICD-10' }
          ],
          secondary: [
            { code: 'I10', display: 'Essential hypertension', codingSystem: 'ICD-10' },
            { code: 'E11.*', display: 'Type 2 diabetes mellitus', codingSystem: 'ICD-10' },
            { code: 'I50.*', display: 'Heart failure', codingSystem: 'ICD-10' }
          ],
          minMatchRequired: 1,
          preferMultiMorbidity: true
        },
        programCombinations: {
          programs: [
            {
              billingProgramCode: 'CMS_RPM_2025',
              programType: 'RPM',
              cptCodes: ['99453', '99454', '99457', '99458'],
              priority: 1,
              rationale: 'Device-based monitoring of SpO2, respiratory rate, heart rate'
            },
            {
              billingProgramCode: 'CMS_RTM_2025',
              programType: 'RTM',
              cptCodes: ['98975', '98976', '98977', '98980'],
              priority: 2,
              rationale: 'Therapeutic monitoring of breathing exercises, medication adherence, symptom tracking'
            },
            {
              billingProgramCode: 'CMS_CCM_2025',
              programType: 'CCM',
              cptCodes: ['99490', '99491'],
              priority: 3,
              condition: 'IF secondary diagnoses >= 2',
              rationale: 'Chronic care management for multi-morbid patients (COPD + diabetes/hypertension/heart failure)'
            }
          ],
          requiredDevices: [
            'Pulse Oximeter',
            'Bluetooth-enabled peak flow meter (for asthma)',
            'Blood pressure monitor (if hypertension present)'
          ],
          recommendedMetrics: [
            'oxygen_saturation',
            'respiratory_rate',
            'heart_rate',
            'peak_flow',
            'symptom_scores',
            'medication_adherence'
          ]
        },
        suggestedPresets: {
          conditionPresets: ['COPD Monitoring', 'Asthma Management'],
          assessments: ['COPD Assessment Test (CAT)', 'Asthma Control Test', 'Daily Symptom Tracker'],
          alertRules: ['Hypoxia (O2 sat <90%)', 'Tachypnea (RR >30)', 'Severe Dyspnea']
        },
        clinicalRationale: 'COPD and asthma patients benefit from multi-modal remote monitoring combining device readings (RPM), therapeutic compliance tracking (RTM), and care coordination (CCM for multi-morbid patients). Studies show 30-40% reduction in hospitalizations with comprehensive remote monitoring.',
        evidenceSource: 'GOLD Guidelines 2024, GINA Guidelines 2024, CMS RPM/RTM final rules',
        displayOrder: 1
      }
    });

    console.log('✅ Created COPD/Asthma Multi-Program Package');

    // Package 2: Wound Care Package
    const woundCarePackage = await prisma.billingPackageTemplate.upsert({
      where: { code: 'WOUND_CARE_RTM' },
      update: {},
      create: {
        name: 'Wound Care Therapeutic Monitoring Package',
        code: 'WOUND_CARE_RTM',
        description: 'Remote therapeutic monitoring package for patients with chronic wounds requiring photo documentation, assessment tracking, and care coordination',
        category: 'WOUND_CARE',
        isStandardized: true,
        isActive: true,
        diagnosisCriteria: {
          primary: [
            { code: 'L89.*', display: 'Pressure ulcer', codingSystem: 'ICD-10' },
            { code: 'L97.*', display: 'Non-pressure chronic ulcer of lower limb', codingSystem: 'ICD-10' },
            { code: 'L98.4*', display: 'Chronic ulcer of skin', codingSystem: 'ICD-10' },
            { code: 'T81.3*', display: 'Disruption of wound', codingSystem: 'ICD-10' }
          ],
          secondary: [
            { code: 'E11.*', display: 'Type 2 diabetes mellitus', codingSystem: 'ICD-10' },
            { code: 'I73.*', display: 'Peripheral vascular disease', codingSystem: 'ICD-10' },
            { code: 'R60.*', display: 'Edema', codingSystem: 'ICD-10' }
          ],
          minMatchRequired: 1,
          preferMultiMorbidity: false
        },
        programCombinations: {
          programs: [
            {
              billingProgramCode: 'CMS_RTM_2025',
              programType: 'RTM',
              cptCodes: ['98975', '98976', '98977', '98980'],
              priority: 1,
              rationale: 'Photo-based wound assessments, PUSH score tracking, dressing adherence monitoring'
            },
            {
              billingProgramCode: 'CMS_CCM_2025',
              programType: 'CCM',
              cptCodes: ['99490', '99491'],
              priority: 2,
              condition: 'IF complex wound OR multi-morbid',
              rationale: 'Care coordination for complex wounds or patients with diabetes/PVD requiring interdisciplinary team'
            },
            {
              billingProgramCode: 'CMS_RPM_2025',
              programType: 'RPM',
              cptCodes: ['99454', '99457'],
              priority: 3,
              condition: 'IF edema monitoring OR infection risk',
              rationale: 'Optional device monitoring for edema (weight) or infection surveillance (temperature)'
            }
          ],
          requiredDevices: [
            'Smartphone camera for wound photos',
            'Weight scale (if edema present)',
            'Thermometer (for infection surveillance)'
          ],
          recommendedMetrics: [
            'wound_size',
            'wound_depth',
            'exudate_amount',
            'tissue_type',
            'push_score',
            'pain_level',
            'edema_rating'
          ]
        },
        suggestedPresets: {
          conditionPresets: ['Wound Care Management'],
          assessments: ['Pressure Ulcer Scale for Healing (PUSH)', 'Pain Assessment', 'Daily Wound Tracker'],
          alertRules: ['Wound Size Increase', 'Signs of Infection', 'Severe Pain', 'Worsening Edema']
        },
        clinicalRationale: 'Remote wound monitoring with photo documentation enables early detection of complications (infection, deterioration) and reduces clinic visits. RTM reimbursement supports structured tracking, while CCM billing is appropriate for complex wounds requiring care coordination.',
        evidenceSource: 'NPUAP Guidelines, Wound Healing Society Best Practices, CMS RTM coverage determination',
        displayOrder: 2
      }
    });

    console.log('✅ Created Wound Care RTM Package');

    // Package 3: GI (IBS/GERD) Package
    const giPackage = await prisma.billingPackageTemplate.upsert({
      where: { code: 'GI_IBS_GERD_RTM' },
      update: {},
      create: {
        name: 'GI Symptom Tracking Package (IBS/GERD)',
        code: 'GI_IBS_GERD_RTM',
        description: 'Remote therapeutic monitoring for gastrointestinal conditions requiring symptom tracking, dietary adherence, and medication management',
        category: 'GASTROINTESTINAL',
        isStandardized: true,
        isActive: true,
        diagnosisCriteria: {
          primary: [
            { code: 'K58.*', display: 'Irritable bowel syndrome', codingSystem: 'ICD-10' },
            { code: 'K21.*', display: 'Gastro-esophageal reflux disease', codingSystem: 'ICD-10' },
            { code: 'K50.*', display: 'Crohn\'s disease', codingSystem: 'ICD-10' },
            { code: 'K51.*', display: 'Ulcerative colitis', codingSystem: 'ICD-10' }
          ],
          secondary: [
            { code: 'R19.7', display: 'Diarrhea', codingSystem: 'ICD-10' },
            { code: 'K59.0*', display: 'Constipation', codingSystem: 'ICD-10' },
            { code: 'R10.*', display: 'Abdominal pain', codingSystem: 'ICD-10' },
            { code: 'F41.*', display: 'Anxiety disorder', codingSystem: 'ICD-10' }
          ],
          minMatchRequired: 1,
          preferMultiMorbidity: false
        },
        programCombinations: {
          programs: [
            {
              billingProgramCode: 'CMS_RTM_2025',
              programType: 'RTM',
              cptCodes: ['98975', '98976', '98977', '98980'],
              priority: 1,
              rationale: 'Daily symptom tracking (IBS-SSS, GerdQ), dietary adherence, medication response monitoring'
            },
            {
              billingProgramCode: 'CMS_CCM_2025',
              programType: 'CCM',
              cptCodes: ['99490', '99491'],
              priority: 2,
              condition: 'IF complex case OR anxiety comorbidity',
              rationale: 'Care coordination for complex GI cases or patients with significant anxiety/depression requiring behavioral health integration'
            },
            {
              billingProgramCode: 'CMS_RPM_2025',
              programType: 'RPM',
              cptCodes: ['99454', '99457'],
              priority: 3,
              condition: 'IF weight monitoring required',
              rationale: 'Optional RPM for patients with significant weight loss or malnutrition risk'
            }
          ],
          requiredDevices: [
            'Smartphone for symptom diary',
            'Weight scale (optional, for nutritional monitoring)'
          ],
          recommendedMetrics: [
            'abdominal_pain_severity',
            'bowel_movement_frequency',
            'stool_consistency',
            'heartburn_frequency',
            'nausea_severity',
            'diet_adherence',
            'medication_adherence'
          ]
        },
        suggestedPresets: {
          conditionPresets: ['IBS Management', 'GERD Management'],
          assessments: ['IBS Symptom Severity Score (IBS-SSS)', 'GerdQ Questionnaire', 'Daily GI Symptom Tracker', 'PHQ-9 (if anxiety)', 'GAD-7 (if anxiety)'],
          alertRules: ['Severe Abdominal Pain', 'Persistent Vomiting', 'Blood in Stool', 'Severe Heartburn', 'Weight Loss >5 lbs/week']
        },
        clinicalRationale: 'IBS and GERD require daily symptom tracking to identify triggers, assess treatment response, and guide therapy adjustments. RTM supports structured data collection for therapeutic monitoring. CCM is appropriate for complex cases requiring dietary counseling, medication management, and behavioral health integration.',
        evidenceSource: 'Rome IV Criteria for IBS, Montreal Definition of GERD, ACG Clinical Guidelines, CMS RTM coverage',
        displayOrder: 3
      }
    });

    console.log('✅ Created GI (IBS/GERD) RTM Package');

    // Add common SNOMED CT → ICD-10 mappings for respiratory conditions
    const snomedMappings = [
      {
        sourceSystem: 'SNOMED_CT',
        sourceCode: '13645005',
        sourceDisplay: 'Chronic obstructive lung disease',
        targetSystem: 'ICD-10-CM',
        targetCode: 'J44.9',
        targetDisplay: 'Chronic obstructive pulmonary disease, unspecified',
        mappingType: 'EXACT',
        confidence: 0.95,
        evidenceSource: 'UMLS'
      },
      {
        sourceSystem: 'SNOMED_CT',
        sourceCode: '195967001',
        sourceDisplay: 'Asthma',
        targetSystem: 'ICD-10-CM',
        targetCode: 'J45.909',
        targetDisplay: 'Unspecified asthma, uncomplicated',
        mappingType: 'EXACT',
        confidence: 0.95,
        evidenceSource: 'UMLS'
      },
      {
        sourceSystem: 'SNOMED_CT',
        sourceCode: '399963005',
        sourceDisplay: 'Pressure ulcer',
        targetSystem: 'ICD-10-CM',
        targetCode: 'L89.90',
        targetDisplay: 'Pressure ulcer of unspecified site, unspecified stage',
        mappingType: 'BROADER',
        confidence: 0.85,
        evidenceSource: 'UMLS'
      },
      {
        sourceSystem: 'SNOMED_CT',
        sourceCode: '10743008',
        sourceDisplay: 'Gastroesophageal reflux disease',
        targetSystem: 'ICD-10-CM',
        targetCode: 'K21.9',
        targetDisplay: 'Gastro-esophageal reflux disease without esophagitis',
        mappingType: 'EXACT',
        confidence: 0.95,
        evidenceSource: 'UMLS'
      },
      {
        sourceSystem: 'SNOMED_CT',
        sourceCode: '10743008',
        sourceDisplay: 'Irritable bowel syndrome',
        targetSystem: 'ICD-10-CM',
        targetCode: 'K58.9',
        targetDisplay: 'Irritable bowel syndrome without diarrhea',
        mappingType: 'BROADER',
        confidence: 0.85,
        evidenceSource: 'UMLS'
      }
    ];

    for (const mapping of snomedMappings) {
      await prisma.codeSystemMapping.upsert({
        where: {
          sourceSystem_sourceCode_targetSystem: {
            sourceSystem: mapping.sourceSystem,
            sourceCode: mapping.sourceCode,
            targetSystem: mapping.targetSystem
          }
        },
        update: {},
        create: mapping
      });
    }

    console.log('✅ Created SNOMED CT → ICD-10 mappings');

    console.log('\n✅ Billing Package Templates seeded successfully!');
    console.log('\nSummary:');
    console.log('- 3 billing package templates created');
    console.log('- 5 code system mappings created');
    console.log('\nNext steps:');
    console.log('1. Review packages at: GET /api/billing/packages');
    console.log('2. Test package suggestion: POST /api/billing/suggest-package');
    console.log('3. Create backend services for automatic suggestion');

  } catch (error) {
    console.error('❌ Error seeding billing packages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedBillingPackages()
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
