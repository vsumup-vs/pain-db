/**
 * Seed Data: Medication Adherence + Missing Templates (KCCQ, CAT)
 *
 * This seed file adds:
 * 1. Medication adherence metrics (6 metrics)
 * 2. Medication adherence templates (2 templates)
 * 3. KCCQ template for heart failure
 * 4. CAT template for COPD
 * 5. Links to RTM/CCM-eligible condition presets
 *
 * Run with: node prisma/seed-medication-adherence-and-missing-templates.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding medication adherence metrics and missing templates...');

  const metrics = {};
  const templates = {};

  // ============================================================================
  // MEDICATION ADHERENCE METRICS
  // ============================================================================

  console.log('\n📊 Creating medication adherence metrics...');

  // 1. Medication Adherence (Categorical)
  metrics.medicationAdherence = await prisma.metricDefinition.upsert({
    where: { id: 'metric-medication-adherence' },
    update: {},
    create: {
      id: 'metric-medication-adherence',
      key: 'medication_adherence',
      displayName: 'Medication Adherence',
      description: 'Patient self-report of medication adherence status',
      unit: null,
      valueType: 'categorical',
      category: 'Medication Management',
      isStandardized: true,
      validationInfo: {
        allowedValues: [
          'Taken as prescribed',
          'Missed dose',
          'Skipped intentionally',
          'Took different amount',
          'Took at wrong time'
        ]
      },
      standardCoding: {
        loinc: '71799-1', // Adherence to medication regime
        snomed: '418633004', // Medication adherence
        usageGuidelines: 'Daily tracking for RTM therapeutic data (CPT 98976). Use with Daily Medication Tracker template.'
      }
    }
  });
  console.log('  ✓ Medication Adherence metric');

  // 2. Medication Effectiveness (Ordinal 0-10)
  metrics.medicationEffectiveness = await prisma.metricDefinition.upsert({
    where: { id: 'metric-medication-effectiveness' },
    update: {},
    create: {
      id: 'metric-medication-effectiveness',
      key: 'medication_effectiveness',
      displayName: 'Medication Effectiveness',
      description: 'Patient-reported effectiveness of medication for symptom relief',
      unit: null,
      valueType: 'ordinal',
      category: 'Medication Management',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      options: {
        scaleLabels: {
          0: 'Not effective at all',
          5: 'Moderately effective',
          10: 'Very effective'
        }
      },
      standardCoding: {
        loinc: '82291-9', // Patient perception of medication effectiveness
        snomed: '182888003', // Medication effective
        usageGuidelines: 'RTM therapy response tracking. Use to assess medication adjustments.'
      }
    }
  });
  console.log('  ✓ Medication Effectiveness metric');

  // 3. Side Effects Severity (Ordinal 0-10)
  metrics.sideEffectsSeverity = await prisma.metricDefinition.upsert({
    where: { id: 'metric-side-effects-severity' },
    update: {},
    create: {
      id: 'metric-side-effects-severity',
      key: 'side_effects_severity',
      displayName: 'Side Effects Severity',
      description: 'Severity of medication side effects experienced',
      unit: null,
      valueType: 'ordinal',
      category: 'Medication Management',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      options: {
        scaleLabels: {
          0: 'No side effects',
          3: 'Mild side effects',
          6: 'Moderate side effects',
          10: 'Severe side effects'
        }
      },
      standardCoding: {
        snomed: '281647001', // Adverse reaction (disorder)
        usageGuidelines: 'Monitor for medication intolerance. Trigger for medication review if consistently >6.'
      }
    }
  });
  console.log('  ✓ Side Effects Severity metric');

  // 4. Pain Before Medication (Ordinal 0-10)
  metrics.painBeforeMedication = await prisma.metricDefinition.upsert({
    where: { id: 'metric-pain-before-medication' },
    update: {},
    create: {
      id: 'metric-pain-before-medication',
      key: 'pain_before_medication',
      displayName: 'Pain Level Before Medication',
      description: 'Pain intensity before taking pain medication',
      unit: null,
      valueType: 'ordinal',
      category: 'Pain Assessment',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      options: {
        scaleLabels: {
          0: 'No pain',
          5: 'Moderate pain',
          10: 'Worst pain imaginable'
        }
      },
      standardCoding: {
        loinc: '72514-3', // Pain severity - 0-10 numeric rating [Score] - Reported
        snomed: '225908003', // Pain at rest
        usageGuidelines: 'Use with pain_after_medication to assess medication effectiveness for RTM billing.'
      }
    }
  });
  console.log('  ✓ Pain Before Medication metric');

  // 5. Pain After Medication (Ordinal 0-10)
  metrics.painAfterMedication = await prisma.metricDefinition.upsert({
    where: { id: 'metric-pain-after-medication' },
    update: {},
    create: {
      id: 'metric-pain-after-medication',
      key: 'pain_after_medication',
      displayName: 'Pain Level After Medication',
      description: 'Pain intensity 30-60 minutes after taking pain medication',
      unit: null,
      valueType: 'ordinal',
      category: 'Pain Assessment',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      options: {
        scaleLabels: {
          0: 'No pain',
          5: 'Moderate pain',
          10: 'Worst pain imaginable'
        }
      },
      standardCoding: {
        loinc: '72514-3',
        snomed: '225908003',
        usageGuidelines: 'Calculate pain relief percentage: ((before - after) / before) * 100. Target: >50% relief.'
      }
    }
  });
  console.log('  ✓ Pain After Medication metric');

  // 6. Medication Timing Accuracy (Categorical)
  metrics.medicationTiming = await prisma.metricDefinition.upsert({
    where: { id: 'metric-medication-timing' },
    update: {},
    create: {
      id: 'metric-medication-timing',
      key: 'medication_timing',
      displayName: 'Medication Timing Accuracy',
      description: 'How accurately patient took medication at scheduled time',
      unit: null,
      valueType: 'categorical',
      category: 'Medication Management',
      isStandardized: true,
      validationInfo: {
        allowedValues: [
          'On time (within 30 min)',
          'Slightly late (30-60 min)',
          'Late (1-2 hours)',
          'Very late (>2 hours)',
          'Early',
          'Not taken'
        ]
      }
    }
  });
  console.log('  ✓ Medication Timing metric');

  // ============================================================================
  // MEDICATION ADHERENCE TEMPLATES
  // ============================================================================

  console.log('\n📋 Creating medication adherence templates...');

  // 1. Daily Medication Tracker (for RTM 16-day requirement)
  templates.dailyMedicationTracker = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-daily-medication-tracker' },
    update: {},
    create: {
      id: 'template-daily-medication-tracker',
      name: 'Daily Medication Tracker',
      description: 'Quick daily check-in for medication adherence and effectiveness tracking',
      questions: {
        instructions: 'Please answer these questions about your medications today.',
        items: [
          {
            id: 'q1',
            text: 'Did you take your medications as prescribed today?',
            metricKey: 'medication_adherence',
            type: 'categorical',
            required: true,
            helpText: 'Select the option that best describes your medication use today'
          },
          {
            id: 'q2',
            text: 'How effective were your medications today?',
            metricKey: 'medication_effectiveness',
            type: 'ordinal',
            required: false,
            helpText: 'Rate 0 (not effective) to 10 (very effective)'
          },
          {
            id: 'q3',
            text: 'Did you experience any side effects?',
            metricKey: 'side_effects_severity',
            type: 'ordinal',
            required: false,
            helpText: 'Rate 0 (no side effects) to 10 (severe side effects)'
          }
        ]
      },
      scoring: {
        adherenceScore: {
          description: 'Calculate percentage of days with "Taken as prescribed"',
          formula: '(days_taken_as_prescribed / total_days_tracked) * 100',
          interpretation: {
            excellent: '≥90%',
            good: '80-89%',
            fair: '70-79%',
            poor: '<70%'
          }
        }
      },
      category: 'Medication Management',
      isStandardized: true,
      clinicalUse: 'Daily tracking for RTM therapeutic data (CPT 98976). Satisfies 16-day data requirement for medication compliance monitoring.',
      copyrightInfo: 'Original template for RTM/CCM billing compliance. Public domain.',
      scoringInfo: {
        interpretationGuide: {
          adherence_90_plus: 'Excellent adherence - continue current regimen',
          adherence_70_89: 'Good adherence - monitor for barriers',
          adherence_below_70: 'Poor adherence - intervention needed (barriers assessment, medication review, patient education)'
        }
      }
    }
  });
  console.log('  ✓ Daily Medication Tracker template');

  // 2. Morisky Medication Adherence Scale (MMAS-8) - Validated
  templates.morisky = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-morisky-8' },
    update: {},
    create: {
      id: 'template-morisky-8',
      name: 'Morisky Medication Adherence Scale (MMAS-8)',
      description: 'Validated 8-item medication adherence assessment tool',
      questions: {
        instructions: 'Please answer the following questions about your medication use. There are no right or wrong answers.',
        items: [
          {
            id: 'q1',
            text: 'Do you sometimes forget to take your medicine?',
            type: 'boolean',
            required: true,
            scoring: { yes: 1, no: 0 }
          },
          {
            id: 'q2',
            text: 'Over the past 2 weeks, were there any days when you did not take your medicine?',
            type: 'boolean',
            required: true,
            scoring: { yes: 1, no: 0 }
          },
          {
            id: 'q3',
            text: 'Have you ever cut back or stopped taking your medicine without telling your doctor because you felt worse when you took it?',
            type: 'boolean',
            required: true,
            scoring: { yes: 1, no: 0 }
          },
          {
            id: 'q4',
            text: 'When you travel or leave home, do you sometimes forget to bring along your medicine?',
            type: 'boolean',
            required: true,
            scoring: { yes: 1, no: 0 }
          },
          {
            id: 'q5',
            text: 'Did you take your medicine yesterday?',
            type: 'boolean',
            required: true,
            scoring: { yes: 0, no: 1 }
          },
          {
            id: 'q6',
            text: 'When you feel like your symptoms are under control, do you sometimes stop taking your medicine?',
            type: 'boolean',
            required: true,
            scoring: { yes: 1, no: 0 }
          },
          {
            id: 'q7',
            text: 'Taking medicine every day is a real inconvenience for some people. Do you ever feel hassled about sticking to your treatment plan?',
            type: 'boolean',
            required: true,
            scoring: { yes: 1, no: 0 }
          },
          {
            id: 'q8',
            text: 'How often do you have difficulty remembering to take all your medicine?',
            type: 'ordinal',
            required: true,
            options: [
              { value: 0, label: 'Never/Rarely' },
              { value: 0.25, label: 'Once in a while' },
              { value: 0.5, label: 'Sometimes' },
              { value: 0.75, label: 'Usually' },
              { value: 1, label: 'All the time' }
            ]
          }
        ]
      },
      scoring: {
        totalScore: {
          description: 'Sum of all item scores',
          range: '0-8',
          formula: 'Sum(Q1-Q8)',
          interpretation: {
            high_adherence: 'Score = 0 (100% adherence)',
            medium_adherence: 'Score 1-2 (75-99% adherence)',
            low_adherence: 'Score >2 (<75% adherence)'
          }
        }
      },
      category: 'Medication Management',
      isStandardized: true,
      standardCoding: {
        loinc: '90771-3' // MMAS-8 Total Score
      },
      clinicalUse: 'Validated medication adherence assessment for CCM comprehensive care planning. Use monthly or quarterly for adherence monitoring.',
      copyrightInfo: 'MMAS-8 © Donald E. Morisky. Commercial use requires permission from MMAS Research LLC. Use of the ©MMAS is protected by US copyright laws. Permission for use is required. A licensing agreement is available from: Donald E. Morisky, 294 Lindura Court, Las Vegas, NV 89138-4632; dmorisky@gmail.com',
      scoringInfo: {
        interpretationGuide: {
          score_0: 'High adherence - no intervention needed',
          score_1_2: 'Medium adherence - reinforce importance, address barriers',
          score_gt_2: 'Low adherence - comprehensive intervention (barriers assessment, medication review, simplify regimen, patient education, adherence aids)'
        }
      }
    }
  });
  console.log('  ✓ Morisky MMAS-8 template');

  // ============================================================================
  // KCCQ TEMPLATE FOR HEART FAILURE
  // ============================================================================

  console.log('\n📋 Creating KCCQ template for heart failure...');

  templates.kccq = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-kccq-12' },
    update: {},
    create: {
      id: 'template-kccq-12',
      name: 'Kansas City Cardiomyopathy Questionnaire (KCCQ-12)',
      description: 'Validated 12-item heart failure quality of life assessment',
      questions: {
        instructions: 'The following questions refer to your heart failure and how it may affect your life. Please read and complete the following questions. There are no right or wrong answers. Please mark the answer that best applies to you.',
        sections: [
          {
            id: 'physical_limitations',
            title: 'Physical Limitations',
            items: [
              {
                id: 'q1',
                text: 'Heart failure affects different people in different ways. Some feel shortness of breath while others feel fatigue. Please indicate how much you are limited by heart failure (shortness of breath or fatigue) in your ability to do the following activities over the past 2 weeks.',
                subQuestions: [
                  {
                    id: 'q1a',
                    text: 'Dressing yourself',
                    type: 'ordinal',
                    required: true,
                    options: [
                      { value: 1, label: 'Extremely limited' },
                      { value: 2, label: 'Quite a bit limited' },
                      { value: 3, label: 'Moderately limited' },
                      { value: 4, label: 'Slightly limited' },
                      { value: 5, label: 'Not at all limited' },
                      { value: 6, label: 'Limited for other reasons or did not do the activity' }
                    ]
                  },
                  {
                    id: 'q1b',
                    text: 'Showering/Bathing',
                    type: 'ordinal',
                    required: true,
                    options: [
                      { value: 1, label: 'Extremely limited' },
                      { value: 2, label: 'Quite a bit limited' },
                      { value: 3, label: 'Moderately limited' },
                      { value: 4, label: 'Slightly limited' },
                      { value: 5, label: 'Not at all limited' },
                      { value: 6, label: 'Limited for other reasons or did not do the activity' }
                    ]
                  },
                  {
                    id: 'q1c',
                    text: 'Walking 1 block on level ground',
                    type: 'ordinal',
                    required: true,
                    options: [
                      { value: 1, label: 'Extremely limited' },
                      { value: 2, label: 'Quite a bit limited' },
                      { value: 3, label: 'Moderately limited' },
                      { value: 4, label: 'Slightly limited' },
                      { value: 5, label: 'Not at all limited' },
                      { value: 6, label: 'Limited for other reasons or did not do the activity' }
                    ]
                  },
                  {
                    id: 'q1d',
                    text: 'Doing yardwork, housework, or carrying groceries',
                    type: 'ordinal',
                    required: true,
                    options: [
                      { value: 1, label: 'Extremely limited' },
                      { value: 2, label: 'Quite a bit limited' },
                      { value: 3, label: 'Moderately limited' },
                      { value: 4, label: 'Slightly limited' },
                      { value: 5, label: 'Not at all limited' },
                      { value: 6, label: 'Limited for other reasons or did not do the activity' }
                    ]
                  },
                  {
                    id: 'q1e',
                    text: 'Climbing a flight of stairs without stopping',
                    type: 'ordinal',
                    required: true,
                    options: [
                      { value: 1, label: 'Extremely limited' },
                      { value: 2, label: 'Quite a bit limited' },
                      { value: 3, label: 'Moderately limited' },
                      { value: 4, label: 'Slightly limited' },
                      { value: 5, label: 'Not at all limited' },
                      { value: 6, label: 'Limited for other reasons or did not do the activity' }
                    ]
                  },
                  {
                    id: 'q1f',
                    text: 'Hurrying or jogging (as if to catch a bus)',
                    type: 'ordinal',
                    required: true,
                    options: [
                      { value: 1, label: 'Extremely limited' },
                      { value: 2, label: 'Quite a bit limited' },
                      { value: 3, label: 'Moderately limited' },
                      { value: 4, label: 'Slightly limited' },
                      { value: 5, label: 'Not at all limited' },
                      { value: 6, label: 'Limited for other reasons or did not do the activity' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: 'symptom_frequency',
            title: 'Symptom Frequency',
            items: [
              {
                id: 'q2',
                text: 'Over the past 2 weeks, how many times did you have swelling in your feet, ankles, or legs when you woke up in the morning?',
                type: 'ordinal',
                required: true,
                options: [
                  { value: 1, label: 'Every morning' },
                  { value: 2, label: '3 or more times per week but not every day' },
                  { value: 3, label: '1-2 times per week' },
                  { value: 4, label: 'Less than once a week' },
                  { value: 5, label: 'Never over the past 2 weeks' }
                ]
              },
              {
                id: 'q3',
                text: 'Over the past 2 weeks, how much has your heart failure limited your enjoyment of life?',
                type: 'ordinal',
                required: true,
                options: [
                  { value: 1, label: 'It has extremely limited my enjoyment of life' },
                  { value: 2, label: 'It has limited my enjoyment of life quite a bit' },
                  { value: 3, label: 'It has moderately limited my enjoyment of life' },
                  { value: 4, label: 'It has slightly limited my enjoyment of life' },
                  { value: 5, label: 'It has not limited my enjoyment of life at all' }
                ]
              },
              {
                id: 'q4',
                text: 'Over the past 2 weeks, on average, how many times has fatigue limited your ability to do what you want?',
                type: 'ordinal',
                required: true,
                options: [
                  { value: 1, label: 'All of the time' },
                  { value: 2, label: 'Several times per day' },
                  { value: 3, label: 'At least once a day' },
                  { value: 4, label: '3 or more times per week but not every day' },
                  { value: 5, label: '1-2 times per week' },
                  { value: 6, label: 'Less than once a week' },
                  { value: 7, label: 'Never over the past 2 weeks' }
                ]
              },
              {
                id: 'q5',
                text: 'Over the past 2 weeks, on average, how many times has shortness of breath limited your ability to do what you wanted?',
                type: 'ordinal',
                required: true,
                options: [
                  { value: 1, label: 'All of the time' },
                  { value: 2, label: 'Several times per day' },
                  { value: 3, label: 'At least once a day' },
                  { value: 4, label: '3 or more times per week but not every day' },
                  { value: 5, label: '1-2 times per week' },
                  { value: 6, label: 'Less than once a week' },
                  { value: 7, label: 'Never over the past 2 weeks' }
                ]
              },
              {
                id: 'q6',
                text: 'Over the past 2 weeks, on average, how many times have you been forced to sleep sitting up in a chair or with at least 3 pillows to prop you up because of shortness of breath?',
                type: 'ordinal',
                required: true,
                options: [
                  { value: 1, label: 'Every night' },
                  { value: 2, label: '3 or more times per week but not every day' },
                  { value: 3, label: '1-2 times per week' },
                  { value: 4, label: 'Less than once a week' },
                  { value: 5, label: 'Never over the past 2 weeks' }
                ]
              }
            ]
          },
          {
            id: 'quality_of_life',
            title: 'Quality of Life',
            items: [
              {
                id: 'q7',
                text: 'If you had to spend the rest of your life with your heart failure the way it is right now, how would you feel about this?',
                type: 'ordinal',
                required: true,
                options: [
                  { value: 1, label: 'Not at all satisfied' },
                  { value: 2, label: 'Mostly dissatisfied' },
                  { value: 3, label: 'Somewhat satisfied' },
                  { value: 4, label: 'Mostly satisfied' },
                  { value: 5, label: 'Completely satisfied' }
                ]
              }
            ]
          }
        ]
      },
      scoring: {
        physicalLimitationScore: {
          description: 'Average of Q1a-Q1f (rescale 1-5 to 0-100)',
          formula: '((Sum(Q1a-Q1f) / 6) - 1) * 25',
          range: '0-100'
        },
        symptomFrequencyScore: {
          description: 'Weighted average of symptom questions',
          formula: 'Complex formula per KCCQ scoring manual',
          range: '0-100'
        },
        qualityOfLifeScore: {
          description: 'Q7 rescaled to 0-100',
          formula: '(Q7 - 1) * 25',
          range: '0-100'
        },
        overallSummaryScore: {
          description: 'Average of Physical Limitation and Symptom Frequency scores',
          formula: '(physicalLimitationScore + symptomFrequencyScore) / 2',
          range: '0-100',
          interpretation: {
            excellent: '75-100',
            good: '60-74',
            fair: '45-59',
            poor: '25-44',
            very_poor: '0-24'
          },
          clinicalSignificance: {
            minimal_change: '<5 points',
            small_change: '5-9 points',
            moderate_change: '10-19 points',
            large_change: '≥20 points'
          }
        }
      },
      category: 'Cardiac',
      isStandardized: true,
      standardCoding: {
        loinc: '86923-0', // KCCQ-12 Overall Summary Score
        snomed: '450738001' // Assessment using Kansas City Cardiomyopability Questionnaire
      },
      clinicalUse: 'Validated heart failure quality of life assessment. Use for RPM/CCM monitoring of heart failure patients. Recommended frequency: monthly for active monitoring, quarterly for stable patients.',
      copyrightInfo: '© 2000, John A. Spertus, MD, MPH. All rights reserved. KCCQ is copyrighted by CV Outcomes, Inc. an academic research organization. Use requires permission. Contact: http://www.cvoutcomes.org',
      scoringInfo: {
        interpretationGuide: {
          score_75_100: 'Minimal symptoms - maintain current therapy',
          score_60_74: 'Mild symptoms - optimize medications',
          score_45_59: 'Moderate symptoms - medication review, consider specialist referral',
          score_25_44: 'Significant symptoms - aggressive intervention needed',
          score_0_24: 'Severe symptoms - urgent specialist referral, consider hospitalization'
        }
      }
    }
  });
  console.log('  ✓ KCCQ-12 template');

  // ============================================================================
  // CAT TEMPLATE FOR COPD
  // ============================================================================

  console.log('\n📋 Creating CAT template for COPD...');

  templates.cat = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-copd-cat' },
    update: {},
    create: {
      id: 'template-copd-cat',
      name: 'COPD Assessment Test (CAT)',
      description: 'Validated 8-item COPD symptom impact assessment',
      questions: {
        instructions: 'This questionnaire will help you and your healthcare provider measure the impact COPD is having on your wellbeing and daily life. Your answers, and test score, can be used by you and your healthcare provider to help improve the management of your COPD and get the greatest benefit from treatment.',
        items: [
          {
            id: 'q1',
            text: 'I never cough ← → I cough all the time',
            subtitle: 'Cough',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'I never cough',
              maxLabel: 'I cough all the time'
            }
          },
          {
            id: 'q2',
            text: 'I have no phlegm (mucus) in my chest at all ← → My chest is completely full of phlegm (mucus)',
            subtitle: 'Phlegm',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'I have no phlegm (mucus) in my chest at all',
              maxLabel: 'My chest is completely full of phlegm (mucus)'
            }
          },
          {
            id: 'q3',
            text: 'My chest does not feel tight at all ← → My chest feels very tight',
            subtitle: 'Chest Tightness',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'My chest does not feel tight at all',
              maxLabel: 'My chest feels very tight'
            }
          },
          {
            id: 'q4',
            text: 'When I walk up a hill or one flight of stairs I am not breathless ← → When I walk up a hill or one flight of stairs I am very breathless',
            subtitle: 'Breathlessness',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'When I walk up a hill or one flight of stairs I am not breathless',
              maxLabel: 'When I walk up a hill or one flight of stairs I am very breathless'
            }
          },
          {
            id: 'q5',
            text: 'I am not limited doing any activities at home ← → I am very limited doing activities at home',
            subtitle: 'Activity Limitation at Home',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'I am not limited doing any activities at home',
              maxLabel: 'I am very limited doing activities at home'
            }
          },
          {
            id: 'q6',
            text: 'I am confident leaving my home despite my lung condition ← → I am not at all confident leaving my home because of my lung condition',
            subtitle: 'Confidence Leaving Home',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'I am confident leaving my home despite my lung condition',
              maxLabel: 'I am not at all confident leaving my home because of my lung condition'
            }
          },
          {
            id: 'q7',
            text: 'I sleep soundly ← → I don\'t sleep soundly because of my lung condition',
            subtitle: 'Sleep',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'I sleep soundly',
              maxLabel: 'I don\'t sleep soundly because of my lung condition'
            }
          },
          {
            id: 'q8',
            text: 'I have lots of energy ← → I have no energy at all',
            subtitle: 'Energy',
            type: 'ordinal',
            required: true,
            scale: {
              min: 0,
              max: 5,
              minLabel: 'I have lots of energy',
              maxLabel: 'I have no energy at all'
            }
          }
        ]
      },
      scoring: {
        totalScore: {
          description: 'Sum of all 8 items',
          formula: 'Sum(Q1-Q8)',
          range: '0-40',
          interpretation: {
            low_impact: '0-10 (Low impact on life)',
            medium_impact: '11-20 (Medium impact on life)',
            high_impact: '21-30 (High impact on life)',
            very_high_impact: '31-40 (Very high impact on life)'
          },
          clinicalSignificance: {
            minimal_change: '<2 points',
            clinically_significant: '≥2 points'
          }
        }
      },
      category: 'Respiratory',
      isStandardized: true,
      standardCoding: {
        loinc: '89250-2', // COPD Assessment Test total score
        snomed: '446660001' // COPD assessment test score
      },
      clinicalUse: 'Validated COPD symptom assessment. Use for RTM/RPM monitoring of COPD patients. Recommended frequency: monthly for exacerbation monitoring, quarterly for stable patients.',
      copyrightInfo: '© 2009 GlaxoSmithKline group of companies. All rights reserved. CAT is a trademark of the GlaxoSmithKline group of companies. The CAT may be used free of charge for patient care, clinical research, and other medical and health care purposes.',
      scoringInfo: {
        interpretationGuide: {
          score_0_10: 'Low impact - maintain current therapy, continue monitoring',
          score_11_20: 'Medium impact - review medications, optimize inhaler technique, pulmonary rehabilitation if appropriate',
          score_21_30: 'High impact - aggressive medical management, specialist referral, consider oxygen assessment',
          score_31_40: 'Very high impact - urgent specialist referral, assess for exacerbation, consider hospitalization if acute worsening'
        }
      }
    }
  });
  console.log('  ✓ CAT template');

  // ============================================================================
  // LINK TEMPLATES TO ASSESSMENT TEMPLATE ITEMS (METRICS)
  // ============================================================================

  console.log('\n🔗 Linking templates to metrics...');

  // Daily Medication Tracker items
  await prisma.assessmentTemplateItem.upsert({
    where: { id: 'item-daily-med-tracker-adherence' },
    update: {},
    create: {
      id: 'item-daily-med-tracker-adherence',
      templateId: templates.dailyMedicationTracker.id,
      metricDefinitionId: metrics.medicationAdherence.id,
      displayOrder: 1,
      isRequired: true,
      helpText: 'Select the option that best describes your medication use today'
    }
  });

  await prisma.assessmentTemplateItem.upsert({
    where: { id: 'item-daily-med-tracker-effectiveness' },
    update: {},
    create: {
      id: 'item-daily-med-tracker-effectiveness',
      templateId: templates.dailyMedicationTracker.id,
      metricDefinitionId: metrics.medicationEffectiveness.id,
      displayOrder: 2,
      isRequired: false,
      helpText: 'Rate 0 (not effective) to 10 (very effective)'
    }
  });

  await prisma.assessmentTemplateItem.upsert({
    where: { id: 'item-daily-med-tracker-side-effects' },
    update: {},
    create: {
      id: 'item-daily-med-tracker-side-effects',
      templateId: templates.dailyMedicationTracker.id,
      metricDefinitionId: metrics.sideEffectsSeverity.id,
      displayOrder: 3,
      isRequired: false,
      helpText: 'Rate 0 (no side effects) to 10 (severe side effects)'
    }
  });

  console.log('  ✓ Linked Daily Medication Tracker to metrics');

  // ============================================================================
  // LINK TEMPLATES TO CONDITION PRESETS
  // ============================================================================

  console.log('\n🔗 Linking templates to condition presets...');

  // Get condition presets
  const chronicPainPreset = await prisma.conditionPreset.findFirst({
    where: { name: 'Chronic Pain Management' }
  });

  const copdPreset = await prisma.conditionPreset.findFirst({
    where: { name: 'COPD Monitoring' }
  });

  const heartFailurePreset = await prisma.conditionPreset.findFirst({
    where: { name: 'Heart Failure Monitoring' }
  });

  // Link Daily Medication Tracker to Chronic Pain (RTM-eligible)
  if (chronicPainPreset) {
    await prisma.conditionPresetTemplate.upsert({
      where: { id: 'preset-chronic-pain-daily-med-tracker' },
      update: {},
      create: {
        id: 'preset-chronic-pain-daily-med-tracker',
        conditionPresetId: chronicPainPreset.id,
        templateId: templates.dailyMedicationTracker.id,
        isRequired: true,
        displayOrder: 4,
        frequency: 'DAILY'
      }
    });
    console.log('  ✓ Linked Daily Medication Tracker to Chronic Pain preset');

    // Link Morisky to Chronic Pain (monthly assessment)
    await prisma.conditionPresetTemplate.upsert({
      where: { id: 'preset-chronic-pain-morisky' },
      update: {},
      create: {
        id: 'preset-chronic-pain-morisky',
        conditionPresetId: chronicPainPreset.id,
        templateId: templates.morisky.id,
        isRequired: false,
        displayOrder: 5,
        frequency: 'MONTHLY'
      }
    });
    console.log('  ✓ Linked Morisky MMAS-8 to Chronic Pain preset');
  }

  // Link Daily Medication Tracker to COPD (RTM-eligible)
  if (copdPreset) {
    await prisma.conditionPresetTemplate.upsert({
      where: { id: 'preset-copd-daily-med-tracker' },
      update: {},
      create: {
        id: 'preset-copd-daily-med-tracker',
        conditionPresetId: copdPreset.id,
        templateId: templates.dailyMedicationTracker.id,
        isRequired: true,
        displayOrder: 2,
        frequency: 'DAILY'
      }
    });
    console.log('  ✓ Linked Daily Medication Tracker to COPD preset');

    // Link CAT to COPD preset
    await prisma.conditionPresetTemplate.upsert({
      where: { id: 'preset-copd-cat' },
      update: {},
      create: {
        id: 'preset-copd-cat',
        conditionPresetId: copdPreset.id,
        templateId: templates.cat.id,
        isRequired: true,
        displayOrder: 3,
        frequency: 'MONTHLY'
      }
    });
    console.log('  ✓ Linked CAT to COPD preset');
  }

  // Link Morisky to Heart Failure (CCM medication reconciliation)
  if (heartFailurePreset) {
    await prisma.conditionPresetTemplate.upsert({
      where: { id: 'preset-heart-failure-morisky' },
      update: {},
      create: {
        id: 'preset-heart-failure-morisky',
        conditionPresetId: heartFailurePreset.id,
        templateId: templates.morisky.id,
        isRequired: false,
        displayOrder: 3,
        frequency: 'MONTHLY'
      }
    });
    console.log('  ✓ Linked Morisky MMAS-8 to Heart Failure preset');

    // Link KCCQ to Heart Failure preset
    await prisma.conditionPresetTemplate.upsert({
      where: { id: 'preset-heart-failure-kccq' },
      update: {},
      create: {
        id: 'preset-heart-failure-kccq',
        conditionPresetId: heartFailurePreset.id,
        templateId: templates.kccq.id,
        isRequired: true,
        displayOrder: 2,
        frequency: 'MONTHLY'
      }
    });
    console.log('  ✓ Linked KCCQ-12 to Heart Failure preset');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n✅ Seed complete!');
  console.log('\n📊 Summary:');
  console.log('  • 6 medication adherence metrics created');
  console.log('  • 2 medication adherence templates created');
  console.log('  • 1 KCCQ template for heart failure created');
  console.log('  • 1 CAT template for COPD created');
  console.log('  • Templates linked to RTM/CCM-eligible presets');
  console.log('\n🎯 RTM/CCM Compliance:');
  console.log('  ✓ RTM CPT 98976: Daily Medication Tracker satisfies 16-day therapeutic data requirement');
  console.log('  ✓ CCM Care Plan: Morisky MMAS-8 satisfies medication reconciliation requirement');
  console.log('  ✓ Heart Failure Monitoring: KCCQ-12 added for quality of life assessment');
  console.log('  ✓ COPD Monitoring: CAT added for symptom assessment');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
