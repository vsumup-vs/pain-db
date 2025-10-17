#!/usr/bin/env node
/**
 * Production Seed Data for ClinMetrics Pro
 *
 * This file contains standardized, production-ready clinical content:
 * - Metric Definitions (20+ standardized metrics)
 * - Assessment Templates (5+ validated templates)
 * - Alert Rules (10+ evidence-based rules)
 * - Condition Presets (5+ clinical conditions with full relationships)
 *
 * Field names verified against: docs/developer-reference.md & prisma/schema.prisma
 *
 * Usage:
 *   npm run seed:production
 *   or
 *   node prisma/seed-production.js
 *
 * This seed is idempotent - can be run multiple times safely.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🌱 Starting production seed...\n');

async function main() {
  // ============================================================================
  // PART 1: STANDARDIZED METRIC DEFINITIONS
  // ============================================================================
  console.log('📊 Creating standardized metric definitions...');

  const metrics = {};

  // Vital Signs
  metrics.sbp = await prisma.metricDefinition.upsert({
    where: { id: 'metric-sbp-standard' },
    update: {},
    create: {
      id: 'metric-sbp-standard',
      key: 'systolic_bp',
      displayName: 'Systolic Blood Pressure',
      description: 'Systolic blood pressure measurement',
      unit: 'mmHg',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 70,
      scaleMax: 250,
      decimalPrecision: 0,
      normalRange: { min: 90, max: 120 },
      standardCoding: {
        loinc: '8480-6',
        snomed: '271649006'
      }
    }
  });

  metrics.dbp = await prisma.metricDefinition.upsert({
    where: { id: 'metric-dbp-standard' },
    update: {},
    create: {
      id: 'metric-dbp-standard',
      key: 'diastolic_bp',
      displayName: 'Diastolic Blood Pressure',
      description: 'Diastolic blood pressure measurement',
      unit: 'mmHg',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 40,
      scaleMax: 150,
      decimalPrecision: 0,
      normalRange: { min: 60, max: 80 },
      standardCoding: {
        loinc: '8462-4',
        snomed: '271650006'
      }
    }
  });

  metrics.heartRate = await prisma.metricDefinition.upsert({
    where: { id: 'metric-hr-standard' },
    update: {},
    create: {
      id: 'metric-hr-standard',
      key: 'heart_rate',
      displayName: 'Heart Rate',
      description: 'Heart rate (pulse) measurement',
      unit: 'bpm',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 30,
      scaleMax: 200,
      decimalPrecision: 0,
      normalRange: { min: 60, max: 100 },
      standardCoding: {
        loinc: '8867-4',
        snomed: '364075005'
      }
    }
  });

  metrics.respiratoryRate = await prisma.metricDefinition.upsert({
    where: { id: 'metric-rr-standard' },
    update: {},
    create: {
      id: 'metric-rr-standard',
      key: 'respiratory_rate',
      displayName: 'Respiratory Rate',
      description: 'Respiratory rate measurement',
      unit: 'breaths/min',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 8,
      scaleMax: 40,
      decimalPrecision: 0,
      normalRange: { min: 12, max: 20 },
      standardCoding: {
        loinc: '9279-1',
        snomed: '86290005'
      }
    }
  });

  metrics.temperature = await prisma.metricDefinition.upsert({
    where: { id: 'metric-temp-standard' },
    update: {},
    create: {
      id: 'metric-temp-standard',
      key: 'temperature',
      displayName: 'Body Temperature',
      description: 'Body temperature measurement',
      unit: '°F',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 90,
      scaleMax: 110,
      decimalPrecision: 1,
      normalRange: { min: 97.0, max: 99.5 },
      standardCoding: {
        loinc: '8310-5',
        snomed: '386725007'
      }
    }
  });

  metrics.weight = await prisma.metricDefinition.upsert({
    where: { id: 'metric-weight-standard' },
    update: {},
    create: {
      id: 'metric-weight-standard',
      key: 'body_weight',
      displayName: 'Body Weight',
      description: 'Body weight measurement',
      unit: 'lbs',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 50,
      scaleMax: 500,
      decimalPrecision: 1,
      standardCoding: {
        loinc: '29463-7',
        snomed: '27113001'
      }
    }
  });

  metrics.o2Sat = await prisma.metricDefinition.upsert({
    where: { id: 'metric-o2sat-standard' },
    update: {},
    create: {
      id: 'metric-o2sat-standard',
      key: 'oxygen_saturation',
      displayName: 'Oxygen Saturation (SpO2)',
      description: 'Peripheral oxygen saturation',
      unit: '%',
      valueType: 'numeric',
      category: 'Vital Signs',
      isStandardized: true,
      scaleMin: 70,
      scaleMax: 100,
      decimalPrecision: 0,
      normalRange: { min: 95, max: 100 },
      standardCoding: {
        loinc: '59408-5',
        snomed: '431314004'
      }
    }
  });

  // Pain Assessment
  metrics.painLevel = await prisma.metricDefinition.upsert({
    where: { id: 'metric-pain-nrs-standard' },
    update: {},
    create: {
      id: 'metric-pain-nrs-standard',
      key: 'pain_level_nrs',
      displayName: 'Pain Level (NRS 0-10)',
      description: 'Pain intensity on numeric rating scale',
      unit: 'scale',
      valueType: 'numeric',
      category: 'Pain Assessment',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      decimalPrecision: 0,
      standardCoding: {
        loinc: '72514-3',
        snomed: '225908003',
        standard: 'NRS (Numeric Rating Scale)'
      }
    }
  });

  metrics.painLocation = await prisma.metricDefinition.upsert({
    where: { id: 'metric-pain-location-standard' },
    update: {},
    create: {
      id: 'metric-pain-location-standard',
      key: 'pain_location',
      displayName: 'Pain Location',
      description: 'Primary location of pain',
      valueType: 'categorical',
      category: 'Pain Assessment',
      isStandardized: true,
      options: [
        'Head/Neck',
        'Shoulder',
        'Upper Back',
        'Lower Back',
        'Chest',
        'Abdomen',
        'Hip',
        'Knee',
        'Ankle/Foot',
        'Other'
      ]
    }
  });

  metrics.painDuration = await prisma.metricDefinition.upsert({
    where: { id: 'metric-pain-duration-standard' },
    update: {},
    create: {
      id: 'metric-pain-duration-standard',
      key: 'pain_duration',
      displayName: 'Pain Duration',
      description: 'How long pain has been present',
      valueType: 'categorical',
      category: 'Pain Assessment',
      isStandardized: true,
      options: [
        'Less than 1 hour',
        '1-6 hours',
        '6-24 hours',
        '1-7 days',
        '1-4 weeks',
        'More than 4 weeks'
      ]
    }
  });

  // Diabetes Metrics
  metrics.glucose = await prisma.metricDefinition.upsert({
    where: { id: 'metric-glucose-standard' },
    update: {},
    create: {
      id: 'metric-glucose-standard',
      key: 'blood_glucose',
      displayName: 'Blood Glucose',
      description: 'Blood glucose level',
      unit: 'mg/dL',
      valueType: 'numeric',
      category: 'Diabetes',
      isStandardized: true,
      scaleMin: 40,
      scaleMax: 600,
      decimalPrecision: 0,
      normalRange: { min: 70, max: 130, note: 'Fasting' },
      standardCoding: {
        loinc: '2339-0',
        snomed: '33747003'
      }
    }
  });

  metrics.hba1c = await prisma.metricDefinition.upsert({
    where: { id: 'metric-hba1c-standard' },
    update: {},
    create: {
      id: 'metric-hba1c-standard',
      key: 'hba1c',
      displayName: 'Hemoglobin A1c',
      description: 'Glycated hemoglobin (3-month average glucose)',
      unit: '%',
      valueType: 'numeric',
      category: 'Diabetes',
      isStandardized: true,
      scaleMin: 4,
      scaleMax: 15,
      decimalPrecision: 1,
      normalRange: { min: 4.0, max: 5.6, diabetic: '>6.5' },
      standardCoding: {
        loinc: '4548-4',
        snomed: '43396009'
      }
    }
  });

  // Cardiac Metrics
  metrics.edema = await prisma.metricDefinition.upsert({
    where: { id: 'metric-edema-standard' },
    update: {},
    create: {
      id: 'metric-edema-standard',
      key: 'edema_severity',
      displayName: 'Edema Severity',
      description: 'Swelling in extremities',
      valueType: 'ordinal',
      category: 'Cardiac',
      isStandardized: true,
      options: [
        { value: 0, label: 'None' },
        { value: 1, label: 'Mild (barely detectable)' },
        { value: 2, label: 'Moderate (clearly present)' },
        { value: 3, label: 'Severe (significant swelling)' }
      ]
    }
  });

  metrics.dyspnea = await prisma.metricDefinition.upsert({
    where: { id: 'metric-dyspnea-standard' },
    update: {},
    create: {
      id: 'metric-dyspnea-standard',
      key: 'dyspnea_severity',
      displayName: 'Shortness of Breath',
      description: 'Dyspnea (difficulty breathing) severity',
      valueType: 'ordinal',
      category: 'Cardiac',
      isStandardized: true,
      options: [
        { value: 0, label: 'None at rest' },
        { value: 1, label: 'Mild (with exertion)' },
        { value: 2, label: 'Moderate (limits activity)' },
        { value: 3, label: 'Severe (at rest)' }
      ]
    }
  });

  // Respiratory Metrics
  metrics.fev1 = await prisma.metricDefinition.upsert({
    where: { id: 'metric-fev1-standard' },
    update: {},
    create: {
      id: 'metric-fev1-standard',
      key: 'fev1',
      displayName: 'FEV1 (Forced Expiratory Volume)',
      description: 'Volume exhaled in first second of forced breath',
      unit: 'L',
      valueType: 'numeric',
      category: 'Respiratory',
      isStandardized: true,
      scaleMin: 0.5,
      scaleMax: 6.0,
      decimalPrecision: 2,
      standardCoding: {
        loinc: '20150-9',
        snomed: '313011001'
      }
    }
  });

  metrics.peakFlow = await prisma.metricDefinition.upsert({
    where: { id: 'metric-peakflow-standard' },
    update: {},
    create: {
      id: 'metric-peakflow-standard',
      key: 'peak_flow',
      displayName: 'Peak Expiratory Flow',
      description: 'Maximum flow rate during forced exhalation',
      unit: 'L/min',
      valueType: 'numeric',
      category: 'Respiratory',
      isStandardized: true,
      scaleMin: 50,
      scaleMax: 800,
      decimalPrecision: 0,
      standardCoding: {
        loinc: '19935-6',
        snomed: '313193000'
      }
    }
  });

  // Functional Metrics
  metrics.activityLevel = await prisma.metricDefinition.upsert({
    where: { id: 'metric-activity-standard' },
    update: {},
    create: {
      id: 'metric-activity-standard',
      key: 'activity_level',
      displayName: 'Physical Activity Level',
      description: 'Daily physical activity level',
      valueType: 'ordinal',
      category: 'Functional',
      isStandardized: true,
      options: [
        { value: 0, label: 'Sedentary (mostly sitting/lying)' },
        { value: 1, label: 'Light (light walking, household tasks)' },
        { value: 2, label: 'Moderate (regular exercise, active work)' },
        { value: 3, label: 'Vigorous (intense exercise, physical labor)' }
      ]
    }
  });

  metrics.sleepQuality = await prisma.metricDefinition.upsert({
    where: { id: 'metric-sleep-standard' },
    update: {},
    create: {
      id: 'metric-sleep-standard',
      key: 'sleep_quality',
      displayName: 'Sleep Quality',
      description: 'Overall sleep quality rating',
      unit: 'scale',
      valueType: 'numeric',
      category: 'Functional',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      decimalPrecision: 0,
      validationInfo: {
        description: '0 = Very poor sleep, 10 = Excellent sleep'
      }
    }
  });

  metrics.fatigueLevel = await prisma.metricDefinition.upsert({
    where: { id: 'metric-fatigue-standard' },
    update: {},
    create: {
      id: 'metric-fatigue-standard',
      key: 'fatigue_level',
      displayName: 'Fatigue Level',
      description: 'Overall fatigue/tiredness level',
      unit: 'scale',
      valueType: 'numeric',
      category: 'Functional',
      isStandardized: true,
      scaleMin: 0,
      scaleMax: 10,
      decimalPrecision: 0,
      validationInfo: {
        description: '0 = No fatigue, 10 = Extreme fatigue'
      }
    }
  });

  metrics.mood = await prisma.metricDefinition.upsert({
    where: { id: 'metric-mood-standard' },
    update: {},
    create: {
      id: 'metric-mood-standard',
      key: 'mood_rating',
      displayName: 'Mood Rating',
      description: 'Overall mood/emotional state',
      valueType: 'ordinal',
      category: 'Functional',
      isStandardized: true,
      options: [
        { value: 1, label: 'Very Poor' },
        { value: 2, label: 'Poor' },
        { value: 3, label: 'Fair' },
        { value: 4, label: 'Good' },
        { value: 5, label: 'Very Good' }
      ]
    }
  });

  console.log(`  ✓ Created ${Object.keys(metrics).length} standardized metrics\n`);

  // ============================================================================
  // PART 2: STANDARDIZED ASSESSMENT TEMPLATES
  // ============================================================================
  console.log('📋 Creating standardized assessment templates...');

  const templates = {};

  // PROMIS Pain Intensity (3-item)
  templates.painIntensity = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-promis-pain-intensity' },
    update: {},
    create: {
      id: 'template-promis-pain-intensity',
      name: 'PROMIS Pain Intensity (3-item)',
      description: 'NIH PROMIS short form for pain intensity measurement',
      category: 'Pain Assessment',
      isStandardized: true,
      questions: {
        items: [
          {
            id: 'q1',
            text: 'What is your level of pain right now?',
            type: 'numeric',
            scale: { min: 0, max: 10 },
            required: true
          },
          {
            id: 'q2',
            text: 'What was your average level of pain over the past 7 days?',
            type: 'numeric',
            scale: { min: 0, max: 10 },
            required: true
          },
          {
            id: 'q3',
            text: 'What was your worst level of pain over the past 7 days?',
            type: 'numeric',
            scale: { min: 0, max: 10 },
            required: true
          }
        ]
      },
      scoring: {
        method: 'average',
        interpretation: {
          '0-3': 'Mild pain',
          '4-6': 'Moderate pain',
          '7-10': 'Severe pain'
        }
      },
      standardCoding: {
        standard: 'NIH PROMIS',
        version: '2.0',
        instrument: 'PROMIS Pain Intensity 3a'
      },
      clinicalUse: 'Validated measure of pain intensity for chronic pain management and clinical trials',
      copyrightInfo: 'Public domain - NIH PROMIS'
    }
  });

  // PROMIS Pain Interference (4-item)
  templates.painInterference = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-promis-pain-interference' },
    update: {},
    create: {
      id: 'template-promis-pain-interference',
      name: 'PROMIS Pain Interference (4-item)',
      description: 'NIH PROMIS short form for pain impact on daily activities',
      category: 'Pain Assessment',
      isStandardized: true,
      questions: {
        items: [
          {
            id: 'q1',
            text: 'How much did pain interfere with your day to day activities?',
            type: 'ordinal',
            options: [
              { value: 1, label: 'Not at all' },
              { value: 2, label: 'A little bit' },
              { value: 3, label: 'Somewhat' },
              { value: 4, label: 'Quite a bit' },
              { value: 5, label: 'Very much' }
            ],
            required: true
          },
          {
            id: 'q2',
            text: 'How much did pain interfere with work around the home?',
            type: 'ordinal',
            options: [
              { value: 1, label: 'Not at all' },
              { value: 2, label: 'A little bit' },
              { value: 3, label: 'Somewhat' },
              { value: 4, label: 'Quite a bit' },
              { value: 5, label: 'Very much' }
            ],
            required: true
          },
          {
            id: 'q3',
            text: 'How much did pain interfere with your ability to participate in social activities?',
            type: 'ordinal',
            options: [
              { value: 1, label: 'Not at all' },
              { value: 2, label: 'A little bit' },
              { value: 3, label: 'Somewhat' },
              { value: 4, label: 'Quite a bit' },
              { value: 5, label: 'Very much' }
            ],
            required: true
          },
          {
            id: 'q4',
            text: 'How much did pain interfere with your household chores?',
            type: 'ordinal',
            options: [
              { value: 1, label: 'Not at all' },
              { value: 2, label: 'A little bit' },
              { value: 3, label: 'Somewhat' },
              { value: 4, label: 'Quite a bit' },
              { value: 5, label: 'Very much' }
            ],
            required: true
          }
        ]
      },
      scoring: {
        method: 'sum',
        range: { min: 4, max: 20 },
        interpretation: {
          '4-8': 'Minimal interference',
          '9-12': 'Mild interference',
          '13-16': 'Moderate interference',
          '17-20': 'Severe interference'
        }
      },
      standardCoding: {
        standard: 'NIH PROMIS',
        version: '2.0',
        instrument: 'PROMIS Pain Interference 4a'
      },
      clinicalUse: 'Measures impact of pain on daily activities and quality of life',
      copyrightInfo: 'Public domain - NIH PROMIS'
    }
  });

  // PHQ-9 (Depression Screening)
  templates.phq9 = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-phq9' },
    update: {},
    create: {
      id: 'template-phq9',
      name: 'Patient Health Questionnaire-9 (PHQ-9)',
      description: 'Validated depression screening tool',
      category: 'Mental Health',
      isStandardized: true,
      questions: {
        instruction: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        items: [
          {
            id: 'q1',
            text: 'Little interest or pleasure in doing things',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q2',
            text: 'Feeling down, depressed, or hopeless',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q3',
            text: 'Trouble falling or staying asleep, or sleeping too much',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q4',
            text: 'Feeling tired or having little energy',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q5',
            text: 'Poor appetite or overeating',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q6',
            text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q7',
            text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q8',
            text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q9',
            text: 'Thoughts that you would be better off dead, or of hurting yourself',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true,
            alert: 'If value > 0, trigger immediate clinical review'
          }
        ]
      },
      scoring: {
        method: 'sum',
        range: { min: 0, max: 27 },
        interpretation: {
          '0-4': 'Minimal depression',
          '5-9': 'Mild depression',
          '10-14': 'Moderate depression',
          '15-19': 'Moderately severe depression',
          '20-27': 'Severe depression'
        },
        clinicalAction: {
          '>=10': 'Consider treatment',
          '>=15': 'Warrants treatment for depression',
          '>=20': 'Immediate intervention recommended'
        }
      },
      standardCoding: {
        standard: 'PHQ',
        version: '9',
        instrument: 'Patient Health Questionnaire'
      },
      clinicalUse: 'Depression screening and severity monitoring in primary care and mental health settings',
      copyrightInfo: 'Public domain - Pfizer Inc.'
    }
  });

  // GAD-7 (Anxiety Screening)
  templates.gad7 = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-gad7' },
    update: {},
    create: {
      id: 'template-gad7',
      name: 'Generalized Anxiety Disorder-7 (GAD-7)',
      description: 'Validated anxiety screening tool',
      category: 'Mental Health',
      isStandardized: true,
      questions: {
        instruction: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
        items: [
          {
            id: 'q1',
            text: 'Feeling nervous, anxious, or on edge',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q2',
            text: 'Not being able to stop or control worrying',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q3',
            text: 'Worrying too much about different things',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q4',
            text: 'Trouble relaxing',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q5',
            text: 'Being so restless that it is hard to sit still',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q6',
            text: 'Becoming easily annoyed or irritable',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          },
          {
            id: 'q7',
            text: 'Feeling afraid, as if something awful might happen',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ],
            required: true
          }
        ]
      },
      scoring: {
        method: 'sum',
        range: { min: 0, max: 21 },
        interpretation: {
          '0-4': 'Minimal anxiety',
          '5-9': 'Mild anxiety',
          '10-14': 'Moderate anxiety',
          '15-21': 'Severe anxiety'
        },
        clinicalAction: {
          '>=10': 'Further evaluation recommended',
          '>=15': 'Active treatment warranted'
        }
      },
      standardCoding: {
        standard: 'GAD',
        version: '7',
        instrument: 'Generalized Anxiety Disorder Scale'
      },
      clinicalUse: 'Anxiety screening and severity monitoring in primary care and mental health settings',
      copyrightInfo: 'Public domain - Pfizer Inc.'
    }
  });

  // Daily Symptom Tracker
  templates.dailySymptoms = await prisma.assessmentTemplate.upsert({
    where: { id: 'template-daily-symptoms' },
    update: {},
    create: {
      id: 'template-daily-symptoms',
      name: 'Daily Symptom Tracker',
      description: 'Quick daily assessment of key symptoms',
      category: 'General',
      isStandardized: true,
      questions: {
        instruction: 'Please rate the following symptoms for today',
        items: [
          {
            id: 'pain',
            text: 'Pain level',
            type: 'numeric',
            scale: { min: 0, max: 10 },
            helpText: '0 = No pain, 10 = Worst pain imaginable',
            required: true
          },
          {
            id: 'fatigue',
            text: 'Fatigue level',
            type: 'numeric',
            scale: { min: 0, max: 10 },
            helpText: '0 = No fatigue, 10 = Extreme fatigue',
            required: true
          },
          {
            id: 'sleep',
            text: 'Sleep quality last night',
            type: 'numeric',
            scale: { min: 0, max: 10 },
            helpText: '0 = Very poor sleep, 10 = Excellent sleep',
            required: true
          },
          {
            id: 'mood',
            text: 'Overall mood',
            type: 'ordinal',
            options: [
              { value: 1, label: 'Very Poor' },
              { value: 2, label: 'Poor' },
              { value: 3, label: 'Fair' },
              { value: 4, label: 'Good' },
              { value: 5, label: 'Very Good' }
            ],
            required: true
          },
          {
            id: 'activity',
            text: 'Physical activity level',
            type: 'ordinal',
            options: [
              { value: 0, label: 'Sedentary' },
              { value: 1, label: 'Light activity' },
              { value: 2, label: 'Moderate activity' },
              { value: 3, label: 'Vigorous activity' }
            ],
            required: false
          }
        ]
      },
      scoring: {
        method: 'individual_tracking',
        note: 'Track trends over time rather than aggregate score'
      },
      standardCoding: {
        standard: 'Custom',
        basedOn: 'PROMIS Global Health and symptom tracking best practices'
      },
      clinicalUse: 'Daily symptom monitoring for chronic condition management and quality of life tracking'
    }
  });

  console.log(`  ✓ Created ${Object.keys(templates).length} standardized assessment templates\n`);

  // ============================================================================
  // PART 3: LINK METRICS TO ASSESSMENT TEMPLATES
  // ============================================================================
  console.log('🔗 Creating assessment template items (metric mappings)...');

  const templateItems = [];

  // Pain Intensity Template Items
  templateItems.push(
    await prisma.assessmentTemplateItem.upsert({
      where: {
        templateId_metricDefinitionId: {
          templateId: templates.painIntensity.id,
          metricDefinitionId: metrics.painLevel.id
        }
      },
      update: {},
      create: {
        id: 'ti-pain-intensity-current',
        templateId: templates.painIntensity.id,
        metricDefinitionId: metrics.painLevel.id,
        displayOrder: 1,
        isRequired: true,
        helpText: 'Rate your current pain from 0 (no pain) to 10 (worst pain imaginable)'
      }
    })
  );

  // Daily Symptoms Template Items
  templateItems.push(
    await prisma.assessmentTemplateItem.upsert({
      where: {
        templateId_metricDefinitionId: {
          templateId: templates.dailySymptoms.id,
          metricDefinitionId: metrics.painLevel.id
        }
      },
      update: {},
      create: {
        id: 'ti-daily-pain',
        templateId: templates.dailySymptoms.id,
        metricDefinitionId: metrics.painLevel.id,
        displayOrder: 1,
        isRequired: true,
        helpText: 'Rate your pain level today'
      }
    })
  );

  templateItems.push(
    await prisma.assessmentTemplateItem.upsert({
      where: {
        templateId_metricDefinitionId: {
          templateId: templates.dailySymptoms.id,
          metricDefinitionId: metrics.fatigueLevel.id
        }
      },
      update: {},
      create: {
        id: 'ti-daily-fatigue',
        templateId: templates.dailySymptoms.id,
        metricDefinitionId: metrics.fatigueLevel.id,
        displayOrder: 2,
        isRequired: true,
        helpText: 'Rate your fatigue level today'
      }
    })
  );

  templateItems.push(
    await prisma.assessmentTemplateItem.upsert({
      where: {
        templateId_metricDefinitionId: {
          templateId: templates.dailySymptoms.id,
          metricDefinitionId: metrics.sleepQuality.id
        }
      },
      update: {},
      create: {
        id: 'ti-daily-sleep',
        templateId: templates.dailySymptoms.id,
        metricDefinitionId: metrics.sleepQuality.id,
        displayOrder: 3,
        isRequired: true,
        helpText: 'Rate your sleep quality last night'
      }
    })
  );

  templateItems.push(
    await prisma.assessmentTemplateItem.upsert({
      where: {
        templateId_metricDefinitionId: {
          templateId: templates.dailySymptoms.id,
          metricDefinitionId: metrics.mood.id
        }
      },
      update: {},
      create: {
        id: 'ti-daily-mood',
        templateId: templates.dailySymptoms.id,
        metricDefinitionId: metrics.mood.id,
        displayOrder: 4,
        isRequired: true,
        helpText: 'Rate your overall mood today'
      }
    })
  );

  templateItems.push(
    await prisma.assessmentTemplateItem.upsert({
      where: {
        templateId_metricDefinitionId: {
          templateId: templates.dailySymptoms.id,
          metricDefinitionId: metrics.activityLevel.id
        }
      },
      update: {},
      create: {
        id: 'ti-daily-activity',
        templateId: templates.dailySymptoms.id,
        metricDefinitionId: metrics.activityLevel.id,
        displayOrder: 5,
        isRequired: false,
        helpText: 'Rate your physical activity level today'
      }
    })
  );

  console.log(`  ✓ Created ${templateItems.length} assessment template items\n`);

  // ============================================================================
  // PART 4: STANDARDIZED ALERT RULES
  // ============================================================================
  console.log('⚠️  Creating standardized alert rules...');

  const alertRules = {};

  // Critical High Blood Pressure
  alertRules.criticalHighBP = await prisma.alertRule.upsert({
    where: { id: 'alert-critical-high-bp' },
    update: {},
    create: {
      id: 'alert-critical-high-bp',
      name: 'Critical High Blood Pressure',
      description: 'Hypertensive crisis requiring immediate medical attention',
      isStandardized: true,
      severity: 'CRITICAL',
      priority: 1,
      isActive: true,
      conditions: {
        operator: 'or',
        conditions: [
          {
            metric: 'systolic_blood_pressure',
            operator: 'gte',
            value: 180,
            unit: 'mmHg'
          },
          {
            metric: 'diastolic_blood_pressure',
            operator: 'gte',
            value: 120,
            unit: 'mmHg'
          }
        ]
      },
      actions: {
        notifications: ['CLINICIAN', 'SUPERVISING_PHYSICIAN'],
        escalation: 'IMMEDIATE',
        recommendedAction: 'Contact patient immediately, assess for symptoms, advise ER visit if symptomatic'
      },
      clinicalEvidence: {
        guideline: 'ACC/AHA 2017 Hypertension Guidelines',
        rationale: 'SBP >180 or DBP >120 indicates hypertensive crisis (urgency or emergency)',
        source: 'https://www.acc.org/guidelines'
      }
    }
  });

  // Hypotension
  alertRules.hypotension = await prisma.alertRule.upsert({
    where: { id: 'alert-hypotension' },
    update: {},
    create: {
      id: 'alert-hypotension',
      name: 'Hypotension',
      description: 'Low blood pressure requiring clinical evaluation',
      isStandardized: true,
      severity: 'HIGH',
      priority: 2,
      isActive: true,
      conditions: {
        metric: 'systolic_blood_pressure',
        operator: 'lt',
        value: 90,
        unit: 'mmHg'
      },
      actions: {
        notifications: ['CLINICIAN'],
        escalation: 'WITHIN_4_HOURS',
        recommendedAction: 'Assess for dizziness, syncope, or organ dysfunction. Review medications'
      },
      clinicalEvidence: {
        rationale: 'SBP <90 mmHg may indicate shock, dehydration, or medication side effects',
        source: 'Clinical judgment and standard vital sign monitoring'
      }
    }
  });

  // Tachycardia
  alertRules.tachycardia = await prisma.alertRule.upsert({
    where: { id: 'alert-tachycardia' },
    update: {},
    create: {
      id: 'alert-tachycardia',
      name: 'Tachycardia',
      description: 'Elevated heart rate at rest',
      isStandardized: true,
      severity: 'MEDIUM',
      priority: 3,
      isActive: true,
      conditions: {
        metric: 'heart_rate',
        operator: 'gt',
        value: 120,
        unit: 'bpm',
        note: 'At rest (not during exercise)'
      },
      actions: {
        notifications: ['CLINICIAN'],
        escalation: 'WITHIN_24_HOURS',
        recommendedAction: 'Assess for fever, dehydration, infection, cardiac arrhythmia'
      },
      clinicalEvidence: {
        rationale: 'Resting heart rate >120 bpm may indicate underlying pathology',
        source: 'Standard vital sign monitoring guidelines'
      }
    }
  });

  // Bradycardia
  alertRules.bradycardia = await prisma.alertRule.upsert({
    where: { id: 'alert-bradycardia' },
    update: {},
    create: {
      id: 'alert-bradycardia',
      name: 'Bradycardia',
      description: 'Low heart rate potentially indicating conduction abnormality',
      isStandardized: true,
      severity: 'MEDIUM',
      priority: 3,
      isActive: true,
      conditions: {
        metric: 'heart_rate',
        operator: 'lt',
        value: 50,
        unit: 'bpm',
        note: 'Excluding trained athletes'
      },
      actions: {
        notifications: ['CLINICIAN'],
        escalation: 'WITHIN_24_HOURS',
        recommendedAction: 'Assess for symptoms (dizziness, syncope). Review medications (beta-blockers, calcium channel blockers)'
      },
      clinicalEvidence: {
        rationale: 'Heart rate <50 bpm may indicate AV block or medication effect',
        source: 'Standard cardiac monitoring guidelines'
      }
    }
  });

  // Hypoxia
  alertRules.hypoxia = await prisma.alertRule.upsert({
    where: { id: 'alert-hypoxia' },
    update: {},
    create: {
      id: 'alert-hypoxia',
      name: 'Hypoxia',
      description: 'Low oxygen saturation requiring immediate intervention',
      isStandardized: true,
      severity: 'CRITICAL',
      priority: 1,
      isActive: true,
      conditions: {
        metric: 'oxygen_saturation',
        operator: 'lt',
        value: 90,
        unit: '%'
      },
      actions: {
        notifications: ['CLINICIAN', 'SUPERVISING_PHYSICIAN'],
        escalation: 'IMMEDIATE',
        recommendedAction: 'Contact patient immediately. Assess respiratory status. Advise ER visit or supplemental oxygen'
      },
      clinicalEvidence: {
        guideline: 'WHO Emergency Triage Assessment and Treatment',
        rationale: 'SpO2 <90% indicates significant hypoxemia requiring intervention',
        source: 'https://www.who.int'
      }
    }
  });

  // Severe Pain (Persistent)
  alertRules.severePain = await prisma.alertRule.upsert({
    where: { id: 'alert-severe-pain-persistent' },
    update: {},
    create: {
      id: 'alert-severe-pain-persistent',
      name: 'Severe Pain (Persistent)',
      description: 'Pain level >8/10 for 3+ consecutive days',
      isStandardized: true,
      severity: 'HIGH',
      priority: 2,
      isActive: true,
      conditions: {
        metric: 'pain_level_nrs',
        operator: 'gt',
        value: 8,
        evaluationWindow: '3 days',
        consecutive: true
      },
      actions: {
        notifications: ['CLINICIAN'],
        escalation: 'WITHIN_4_HOURS',
        recommendedAction: 'Review pain management plan. Assess for new injury or disease progression. Consider medication adjustment'
      },
      clinicalEvidence: {
        rationale: 'Persistent severe pain indicates inadequate pain control or new clinical issue',
        source: 'Pain management best practices and NIH pain guidelines'
      }
    }
  });

  // Sudden Pain Increase
  alertRules.suddenPainIncrease = await prisma.alertRule.upsert({
    where: { id: 'alert-sudden-pain-increase' },
    update: {},
    create: {
      id: 'alert-sudden-pain-increase',
      name: 'Sudden Pain Increase',
      description: 'Pain increased by 3+ points in 24 hours',
      isStandardized: true,
      severity: 'HIGH',
      priority: 2,
      isActive: true,
      conditions: {
        metric: 'pain_level_nrs',
        operator: 'trend_increasing',
        value: 3,
        evaluationWindow: '24h'
      },
      actions: {
        notifications: ['CLINICIAN'],
        escalation: 'WITHIN_4_HOURS',
        recommendedAction: 'Assess for new injury, infection, or disease exacerbation'
      },
      clinicalEvidence: {
        rationale: 'Acute pain increase suggests new clinical event requiring evaluation',
        source: 'Pain assessment clinical practice'
      }
    }
  });

  // Hypoglycemia
  alertRules.hypoglycemia = await prisma.alertRule.upsert({
    where: { id: 'alert-hypoglycemia' },
    update: {},
    create: {
      id: 'alert-hypoglycemia',
      name: 'Hypoglycemia',
      description: 'Dangerously low blood glucose',
      isStandardized: true,
      severity: 'CRITICAL',
      priority: 1,
      isActive: true,
      conditions: {
        metric: 'blood_glucose',
        operator: 'lt',
        value: 70,
        unit: 'mg/dL'
      },
      actions: {
        notifications: ['CLINICIAN', 'PATIENT'],
        escalation: 'IMMEDIATE',
        recommendedAction: 'Contact patient immediately. Advise to consume 15g fast-acting carbohydrate. Recheck in 15 minutes'
      },
      clinicalEvidence: {
        guideline: 'ADA Standards of Medical Care in Diabetes',
        rationale: 'Blood glucose <70 mg/dL is clinically significant hypoglycemia requiring immediate treatment',
        source: 'https://care.diabetesjournals.org'
      }
    }
  });

  // Hyperglycemia
  alertRules.hyperglycemia = await prisma.alertRule.upsert({
    where: { id: 'alert-hyperglycemia' },
    update: {},
    create: {
      id: 'alert-hyperglycemia',
      name: 'Hyperglycemia',
      description: 'Significantly elevated blood glucose',
      isStandardized: true,
      severity: 'HIGH',
      priority: 2,
      isActive: true,
      conditions: {
        metric: 'blood_glucose',
        operator: 'gt',
        value: 250,
        unit: 'mg/dL'
      },
      actions: {
        notifications: ['CLINICIAN', 'PATIENT'],
        escalation: 'WITHIN_4_HOURS',
        recommendedAction: 'Assess for DKA symptoms (nausea, vomiting, abdominal pain, fruity breath). Review medication adherence'
      },
      clinicalEvidence: {
        guideline: 'ADA Standards of Medical Care in Diabetes',
        rationale: 'Blood glucose >250 mg/dL increases risk of DKA and requires clinical evaluation',
        source: 'https://care.diabetesjournals.org'
      }
    }
  });

  // Missed Assessments
  alertRules.missedAssessments = await prisma.alertRule.upsert({
    where: { id: 'alert-missed-assessments' },
    update: {},
    create: {
      id: 'alert-missed-assessments',
      name: 'Missed Assessments',
      description: 'No assessment completed in 48 hours',
      isStandardized: true,
      severity: 'LOW',
      priority: 4,
      isActive: true,
      conditions: {
        type: 'missed_assessment',
        metric: 'assessment_completion',
        evaluationWindow: '48h'
      },
      actions: {
        notifications: ['CARE_COORDINATOR'],
        escalation: 'WITHIN_48_HOURS',
        recommendedAction: 'Contact patient to encourage assessment completion. Assess barriers to adherence'
      },
      clinicalEvidence: {
        rationale: 'Regular assessment completion is essential for monitoring program effectiveness',
        source: 'RPM/RTM program best practices'
      }
    }
  });

  console.log(`  ✓ Created ${Object.keys(alertRules).length} standardized alert rules\n`);

  // ============================================================================
  // PART 5: STANDARDIZED CONDITION PRESETS WITH FULL RELATIONSHIPS
  // ============================================================================
  console.log('🏥 Creating standardized condition presets...');

  const conditionPresets = {};

  // 1. CHRONIC PAIN MANAGEMENT
  conditionPresets.chronicPain = await prisma.conditionPreset.upsert({
    where: { id: 'preset-chronic-pain' },
    update: {},
    create: {
      id: 'preset-chronic-pain',
      name: 'Chronic Pain Management',
      description: 'Comprehensive chronic pain monitoring protocol with validated assessments',
      category: 'Pain Management',
      isStandardized: true,
      clinicalGuidelines: {
        overview: 'Evidence-based chronic pain management per CDC Opioid Prescribing Guidelines and American Pain Society recommendations',
        assessmentFrequency: 'Daily pain tracking + weekly validated assessments',
        alertThresholds: 'Pain >8 for 3+ days, sudden increase >3 points',
        source: 'CDC Guidelines for Prescribing Opioids for Chronic Pain (2022)'
      }
    }
  });

  // Chronic Pain Diagnoses
  await prisma.conditionPresetDiagnosis.upsert({
    where: { id: 'cpd-pain-chronic' },
    update: {},
    create: {
      id: 'cpd-pain-chronic',
      conditionPresetId: conditionPresets.chronicPain.id,
      icd10: 'M79.3',
      label: 'Pain, unspecified (Chronic pain)',
      isPrimary: true,
      snomed: '82423001'
    }
  });

  await prisma.conditionPresetDiagnosis.upsert({
    where: { id: 'cpd-pain-joint' },
    update: {},
    create: {
      id: 'cpd-pain-joint',
      conditionPresetId: conditionPresets.chronicPain.id,
      icd10: 'M25.50',
      label: 'Pain in unspecified joint',
      isPrimary: false,
      snomed: '57676002'
    }
  });

  // Chronic Pain Templates
  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-pain-intensity' },
    update: {},
    create: {
      id: 'cpt-pain-intensity',
      conditionPresetId: conditionPresets.chronicPain.id,
      templateId: templates.painIntensity.id,
      frequency: "7",
      isRequired: true,
      displayOrder: 1
    }
  });

  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-pain-interference' },
    update: {},
    create: {
      id: 'cpt-pain-interference',
      conditionPresetId: conditionPresets.chronicPain.id,
      templateId: templates.painInterference.id,
      frequency: "7",
      isRequired: true,
      displayOrder: 2
    }
  });

  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-pain-daily' },
    update: {},
    create: {
      id: 'cpt-pain-daily',
      conditionPresetId: conditionPresets.chronicPain.id,
      templateId: templates.dailySymptoms.id,
      frequency: "1",
      isRequired: true,
      displayOrder: 3
    }
  });

  // Chronic Pain Alert Rules
  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-severe-pain' },
    update: {},
    create: {
      id: 'cpar-severe-pain',
      conditionPresetId: conditionPresets.chronicPain.id,
      alertRuleId: alertRules.severePain.id,
      priority: 1
    }
  });

  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-sudden-pain' },
    update: {},
    create: {
      id: 'cpar-sudden-pain',
      conditionPresetId: conditionPresets.chronicPain.id,
      alertRuleId: alertRules.suddenPainIncrease.id,
      priority: 2
    }
  });

  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-missed-assessments' },
    update: {},
    create: {
      id: 'cpar-missed-assessments',
      conditionPresetId: conditionPresets.chronicPain.id,
      alertRuleId: alertRules.missedAssessments.id,
      priority: 3
    }
  });

  // 2. TYPE 2 DIABETES
  conditionPresets.diabetes = await prisma.conditionPreset.upsert({
    where: { id: 'preset-diabetes' },
    update: {},
    create: {
      id: 'preset-diabetes',
      name: 'Type 2 Diabetes Management',
      description: 'Comprehensive diabetes monitoring with glucose tracking and HbA1c management',
      category: 'Endocrine',
      isStandardized: true,
      clinicalGuidelines: {
        overview: 'American Diabetes Association Standards of Medical Care in Diabetes',
        assessmentFrequency: 'Daily glucose + vitals monitoring',
        alertThresholds: 'Glucose <70 or >250 mg/dL, HbA1c >9%',
        source: 'ADA Standards of Medical Care in Diabetes (2024)'
      }
    }
  });

  // Diabetes Diagnoses
  await prisma.conditionPresetDiagnosis.upsert({
    where: { id: 'cpd-diabetes-e11' },
    update: {},
    create: {
      id: 'cpd-diabetes-e11',
      conditionPresetId: conditionPresets.diabetes.id,
      icd10: 'E11.9',
      label: 'Type 2 diabetes mellitus without complications',
      isPrimary: true,
      snomed: '44054006'
    }
  });

  // Diabetes Templates
  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-diabetes-daily' },
    update: {},
    create: {
      id: 'cpt-diabetes-daily',
      conditionPresetId: conditionPresets.diabetes.id,
      templateId: templates.dailySymptoms.id,
      frequency: "1",
      isRequired: true,
      displayOrder: 1
    }
  });

  // Diabetes Alert Rules
  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hypoglycemia' },
    update: {},
    create: {
      id: 'cpar-hypoglycemia',
      conditionPresetId: conditionPresets.diabetes.id,
      alertRuleId: alertRules.hypoglycemia.id,
      priority: 1
    }
  });

  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hyperglycemia' },
    update: {},
    create: {
      id: 'cpar-hyperglycemia',
      conditionPresetId: conditionPresets.diabetes.id,
      alertRuleId: alertRules.hyperglycemia.id,
      priority: 2
    }
  });

  // 3. HYPERTENSION
  conditionPresets.hypertension = await prisma.conditionPreset.upsert({
    where: { id: 'preset-hypertension' },
    update: {},
    create: {
      id: 'preset-hypertension',
      name: 'Hypertension Management',
      description: 'Blood pressure monitoring and cardiovascular risk management',
      category: 'Cardiovascular',
      isStandardized: true,
      clinicalGuidelines: {
        overview: 'ACC/AHA 2017 Hypertension Clinical Practice Guidelines',
        assessmentFrequency: 'Daily BP monitoring',
        alertThresholds: 'SBP >180 or DBP >120 (critical), SBP <90 (low)',
        source: 'ACC/AHA Hypertension Guidelines (2017)'
      }
    }
  });

  // Hypertension Diagnoses
  await prisma.conditionPresetDiagnosis.upsert({
    where: { id: 'cpd-hypertension' },
    update: {},
    create: {
      id: 'cpd-hypertension',
      conditionPresetId: conditionPresets.hypertension.id,
      icd10: 'I10',
      label: 'Essential (primary) hypertension',
      isPrimary: true,
      snomed: '59621000'
    }
  });

  // Hypertension Templates
  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-htn-daily' },
    update: {},
    create: {
      id: 'cpt-htn-daily',
      conditionPresetId: conditionPresets.hypertension.id,
      templateId: templates.dailySymptoms.id,
      frequency: "1",
      isRequired: true,
      displayOrder: 1
    }
  });

  // Hypertension Alert Rules
  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-critical-bp' },
    update: {},
    create: {
      id: 'cpar-critical-bp',
      conditionPresetId: conditionPresets.hypertension.id,
      alertRuleId: alertRules.criticalHighBP.id,
      priority: 1
    }
  });

  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hypotension' },
    update: {},
    create: {
      id: 'cpar-hypotension',
      conditionPresetId: conditionPresets.hypertension.id,
      alertRuleId: alertRules.hypotension.id,
      priority: 2
    }
  });

  // 4. HEART FAILURE
  conditionPresets.heartFailure = await prisma.conditionPreset.upsert({
    where: { id: 'preset-heart-failure' },
    update: {},
    create: {
      id: 'preset-heart-failure',
      name: 'Heart Failure Monitoring',
      description: 'Comprehensive heart failure monitoring with weight, symptoms, and vital signs',
      category: 'Cardiovascular',
      isStandardized: true,
      clinicalGuidelines: {
        overview: 'ACC/AHA/HFSA Guideline for the Management of Heart Failure',
        assessmentFrequency: 'Daily weight + symptoms',
        alertThresholds: 'Weight gain >3 lbs in 24 hours, dyspnea worsening',
        source: 'ACC/AHA/HFSA Heart Failure Guidelines (2022)'
      }
    }
  });

  // Heart Failure Diagnoses
  await prisma.conditionPresetDiagnosis.upsert({
    where: { id: 'cpd-hf' },
    update: {},
    create: {
      id: 'cpd-hf',
      conditionPresetId: conditionPresets.heartFailure.id,
      icd10: 'I50.9',
      label: 'Heart failure, unspecified',
      isPrimary: true,
      snomed: '84114007'
    }
  });

  // Heart Failure Templates
  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-hf-daily' },
    update: {},
    create: {
      id: 'cpt-hf-daily',
      conditionPresetId: conditionPresets.heartFailure.id,
      templateId: templates.dailySymptoms.id,
      frequency: "1",
      isRequired: true,
      displayOrder: 1
    }
  });

  // Heart Failure Alert Rules
  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hf-critical-bp' },
    update: {},
    create: {
      id: 'cpar-hf-critical-bp',
      conditionPresetId: conditionPresets.heartFailure.id,
      alertRuleId: alertRules.criticalHighBP.id,
      priority: 1
    }
  });

  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hf-hypotension' },
    update: {},
    create: {
      id: 'cpar-hf-hypotension',
      conditionPresetId: conditionPresets.heartFailure.id,
      alertRuleId: alertRules.hypotension.id,
      priority: 2
    }
  });

  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hf-tachycardia' },
    update: {},
    create: {
      id: 'cpar-hf-tachycardia',
      conditionPresetId: conditionPresets.heartFailure.id,
      alertRuleId: alertRules.tachycardia.id,
      priority: 3
    }
  });

  // 5. COPD (CHRONIC OBSTRUCTIVE PULMONARY DISEASE)
  conditionPresets.copd = await prisma.conditionPreset.upsert({
    where: { id: 'preset-copd' },
    update: {},
    create: {
      id: 'preset-copd',
      name: 'COPD Monitoring',
      description: 'Chronic obstructive pulmonary disease monitoring with oxygen saturation and respiratory symptoms',
      category: 'Respiratory',
      isStandardized: true,
      clinicalGuidelines: {
        overview: 'GOLD (Global Initiative for Chronic Obstructive Lung Disease) Guidelines',
        assessmentFrequency: 'Daily O2 saturation + respiratory symptoms',
        alertThresholds: 'O2 sat <90%, respiratory rate >30',
        source: 'GOLD COPD Guidelines (2024)'
      }
    }
  });

  // COPD Diagnoses
  await prisma.conditionPresetDiagnosis.upsert({
    where: { id: 'cpd-copd' },
    update: {},
    create: {
      id: 'cpd-copd',
      conditionPresetId: conditionPresets.copd.id,
      icd10: 'J44.9',
      label: 'Chronic obstructive pulmonary disease, unspecified',
      isPrimary: true,
      snomed: '13645005'
    }
  });

  // COPD Templates
  await prisma.conditionPresetTemplate.upsert({
    where: { id: 'cpt-copd-daily' },
    update: {},
    create: {
      id: 'cpt-copd-daily',
      conditionPresetId: conditionPresets.copd.id,
      templateId: templates.dailySymptoms.id,
      frequency: "1",
      isRequired: true,
      displayOrder: 1
    }
  });

  // COPD Alert Rules
  await prisma.conditionPresetAlertRule.upsert({
    where: { id: 'cpar-hypoxia' },
    update: {},
    create: {
      id: 'cpar-hypoxia',
      conditionPresetId: conditionPresets.copd.id,
      alertRuleId: alertRules.hypoxia.id,
      priority: 1
    }
  });

  console.log(`  ✓ Created ${Object.keys(conditionPresets).length} standardized condition presets with full relationships\n`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('📊 Production Seed Summary:');
  console.log(`  • Metric Definitions: ${Object.keys(metrics).length}`);
  console.log(`  • Assessment Templates: ${Object.keys(templates).length}`);
  console.log(`  • Template Items: ${templateItems.length}`);
  console.log(`  • Alert Rules: ${Object.keys(alertRules).length}`);
  console.log(`  • Condition Presets: ${Object.keys(conditionPresets).length}`);

  return {
    metrics,
    templates,
    templateItems,
    alertRules,
    conditionPresets
  };
}

main()
  .then(() => {
    console.log('\n✅ Production seed completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Error in production seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
