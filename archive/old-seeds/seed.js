const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive RTM database seeding...');

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

  // 1. Create Patients
  console.log('👥 Creating patients...');
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        mrn: 'MRN001234',
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
        id: '550e8400-e29b-41d4-a716-446655440002',
        mrn: 'MRN001235',
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
        id: '550e8400-e29b-41d4-a716-446655440003',
        mrn: 'MRN001236',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@example.com',
        phone: '+1-555-0127',
        dateOfBirth: new Date('1978-11-08'),
        gender: 'MALE',
        address: '789 Pine St, Elsewhere, USA',
        emergencyContact: 'Lisa Brown - +1-555-0128',
        medicalHistory: 'Fibromyalgia, Chronic fatigue syndrome',
        allergies: 'None known',
        medications: 'Pregabalin 150mg, Amitriptyline 25mg',
        insuranceInfo: 'United Healthcare - Policy #11111'
      }
    })
  ]);

  // 2. Create Clinicians
  console.log('👨‍⚕️ Creating clinicians...');
  const clinicians = await Promise.all([
    prisma.clinician.create({
      data: {
        id: '660e8400-e29b-41d4-a716-446655440001',
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
        id: '660e8400-e29b-41d4-a716-446655440002',
        npi: '0987654321',
        firstName: 'Dr. Robert',
        lastName: 'Wilson',
        email: 'robert.wilson@hospital.com',
        phone: '+1-555-0201',
        specialization: 'Endocrinology',
        licenseNumber: 'MD789012',
        department: 'Internal Medicine'
      }
    }),
    prisma.clinician.create({
      data: {
        id: '660e8400-e29b-41d4-a716-446655440003',
        npi: '1122334455',
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

  // 3. Create Comprehensive Metric Definitions
  console.log('📊 Creating metric definitions...');
  const metrics = await Promise.all([
    // Pain Management Metrics
    prisma.metricDefinition.create({
      data: {
        key: 'pain_scale_0_10',
        displayName: 'Pain Scale (0-10)',
        valueType: 'numeric',
        scaleMin: 0,
        scaleMax: 10,
        unit: 'scale',
        decimalPrecision: 0,
        defaultFrequency: 'daily'
      }
    }),
    prisma.metricDefinition.create({
      data: {
        key: 'pain_location',
        displayName: 'Pain Location',
        valueType: 'categorical',
        options: {
          values: [
            { code: 'lower_back', display: 'Lower Back' },
            { code: 'upper_back', display: 'Upper Back' },
            { code: 'neck', display: 'Neck' },
            { code: 'shoulders', display: 'Shoulders' },
            { code: 'hips', display: 'Hips' },
            { code: 'knees', display: 'Knees' },
            { code: 'widespread', display: 'Widespread' }
          ]
        },
        defaultFrequency: 'daily'
      }
    }),
    // Fibromyalgia Metrics
    prisma.metricDefinition.create({
      data: {
        key: 'fatigue_level',
        displayName: 'Fatigue Level',
        valueType: 'numeric',
        scaleMin: 0,
        scaleMax: 10,
        unit: 'scale',
        decimalPrecision: 0,
        defaultFrequency: 'daily'
      }
    }),
    prisma.metricDefinition.create({
      data: {
        key: 'sleep_quality',
        displayName: 'Sleep Quality',
        valueType: 'categorical',
        options: {
          values: [
            { code: 'very_poor', display: 'Very Poor' },
            { code: 'poor', display: 'Poor' },
            { code: 'fair', display: 'Fair' },
            { code: 'good', display: 'Good' },
            { code: 'excellent', display: 'Excellent' }
          ]
        },
        defaultFrequency: 'daily'
      }
    }),
    prisma.metricDefinition.create({
      data: {
        key: 'cognitive_symptoms',
        displayName: 'Cognitive Symptoms (Brain Fog)',
        valueType: 'categorical',
        options: {
          values: [
            { code: 'none', display: 'None' },
            { code: 'mild', display: 'Mild' },
            { code: 'moderate', display: 'Moderate' },
            { code: 'severe', display: 'Severe' }
          ]
        },
        defaultFrequency: 'daily'
      }
    }),
    // Diabetes Metrics
    prisma.metricDefinition.create({
      data: {
        key: 'blood_glucose',
        displayName: 'Blood Glucose',
        valueType: 'numeric',
        scaleMin: 50,
        scaleMax: 400,
        unit: 'mg/dL',
        decimalPrecision: 0,
        defaultFrequency: 'multiple_daily'
      }
    }),
    prisma.metricDefinition.create({
      data: {
        key: 'hba1c',
        displayName: 'HbA1c',
        valueType: 'numeric',
        scaleMin: 4.0,
        scaleMax: 15.0,
        unit: '%',
        decimalPrecision: 1,
        defaultFrequency: 'quarterly'
      }
    }),
    // Hypertension Metrics
    prisma.metricDefinition.create({
      data: {
        key: 'systolic_bp',
        displayName: 'Systolic Blood Pressure',
        valueType: 'numeric',
        scaleMin: 70,
        scaleMax: 250,
        unit: 'mmHg',
        decimalPrecision: 0,
        defaultFrequency: 'daily'
      }
    }),
    prisma.metricDefinition.create({
      data: {
        key: 'diastolic_bp',
        displayName: 'Diastolic Blood Pressure',
        valueType: 'numeric',
        scaleMin: 40,
        scaleMax: 150,
        unit: 'mmHg',
        decimalPrecision: 0,
        defaultFrequency: 'daily'
      }
    }),
    // Medication Adherence
    prisma.metricDefinition.create({
      data: {
        key: 'medication_adherence',
        displayName: 'Medication Adherence',
        valueType: 'categorical',
        options: {
          values: [
            { code: 'taken_on_time', display: 'Taken on time' },
            { code: 'taken_late', display: 'Taken late' },
            { code: 'missed_dose', display: 'Missed dose' },
            { code: 'double_dose', display: 'Double dose taken' }
          ]
        },
        defaultFrequency: 'multiple_daily'
      }
    })
  ]);

  // 4. Create Assessment Templates (let Prisma generate UUIDs)
  console.log('📋 Creating assessment templates...');
  const templates = await Promise.all([
    // Pain Management Template
    prisma.assessmentTemplate.create({
      data: {
        name: 'Daily Pain Assessment',
        description: 'Comprehensive daily pain monitoring'
      }
    }),
    // Fibromyalgia Template
    prisma.assessmentTemplate.create({
      data: {
        name: 'Fibromyalgia Daily Check-in',
        description: 'Daily fibromyalgia symptom tracking'
      }
    }),
    // Diabetes Template
    prisma.assessmentTemplate.create({
      data: {
        name: 'Diabetes Monitoring',
        description: 'Blood glucose and medication tracking'
      }
    })
  ]);

  // 5. Create Assessment Template Items
  console.log('📝 Creating assessment template items...');
  await Promise.all([
    // Pain Management Template Items
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[0].id,
        metricDefinitionId: metrics[0].id, // pain_scale_0_10
        required: true,
        displayOrder: 1,
        helpText: 'Rate your current pain level from 0 (no pain) to 10 (worst pain imaginable)'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[0].id,
        metricDefinitionId: metrics[1].id, // pain_location
        required: true,
        displayOrder: 2,
        helpText: 'Select the primary location of your pain'
      }
    }),
    // Fibromyalgia Template Items
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[1].id,
        metricDefinitionId: metrics[0].id, // pain_scale_0_10
        required: true,
        displayOrder: 1,
        helpText: 'Rate your overall pain level today'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[1].id,
        metricDefinitionId: metrics[2].id, // fatigue_level
        required: true,
        displayOrder: 2,
        helpText: 'Rate your fatigue level from 0 (no fatigue) to 10 (completely exhausted)'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[1].id,
        metricDefinitionId: metrics[3].id, // sleep_quality
        required: true,
        displayOrder: 3,
        helpText: 'How would you rate last night\'s sleep quality?'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[1].id,
        metricDefinitionId: metrics[4].id, // cognitive_symptoms
        required: false,
        displayOrder: 4,
        helpText: 'Rate any brain fog or cognitive difficulties today'
      }
    }),
    // Diabetes Template Items
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[2].id,
        metricDefinitionId: metrics[5].id, // blood_glucose
        required: true,
        displayOrder: 1,
        helpText: 'Enter your blood glucose reading in mg/dL'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: templates[2].id,
        metricDefinitionId: metrics[9].id, // medication_adherence
        required: true,
        displayOrder: 2,
        helpText: 'Did you take your diabetes medication as prescribed?'
      }
    })
  ]);

  // 6. Create Condition Presets (let Prisma generate UUIDs)
  console.log('🏥 Creating condition presets...');
  const conditionPresets = await Promise.all([
    prisma.conditionPreset.create({
      data: {
        name: 'Chronic Pain Management'
      }
    }),
    prisma.conditionPreset.create({
      data: {
        name: 'Fibromyalgia Care Program'
      }
    }),
    prisma.conditionPreset.create({
      data: {
        name: 'Diabetes Management Program'
      }
    })
  ]);

  // 7. Create Condition Preset Diagnoses
  console.log('🩺 Creating condition preset diagnoses...');
  await Promise.all([
    prisma.conditionPresetDiagnosis.create({
      data: {
        presetId: conditionPresets[0].id,
        icd10: 'M79.3',
        snomed: '82423001',
        label: 'Chronic pain syndrome'
      }
    }),
    prisma.conditionPresetDiagnosis.create({
      data: {
        presetId: conditionPresets[1].id,
        icd10: 'M79.7',
        snomed: '203082005',
        label: 'Fibromyalgia'
      }
    }),
    prisma.conditionPresetDiagnosis.create({
      data: {
        presetId: conditionPresets[2].id,
        icd10: 'E11.9',
        snomed: '44054006',
        label: 'Type 2 diabetes mellitus without complications'
      }
    })
  ]);

  // 8. Link Templates to Condition Presets
  console.log('🔗 Linking templates to condition presets...');
  await Promise.all([
    prisma.conditionPresetTemplate.create({
      data: {
        presetId: conditionPresets[0].id,
        templateId: templates[0].id
      }
    }),
    prisma.conditionPresetTemplate.create({
      data: {
        presetId: conditionPresets[1].id,
        templateId: templates[1].id
      }
    }),
    prisma.conditionPresetTemplate.create({
      data: {
        presetId: conditionPresets[2].id,
        templateId: templates[2].id
      }
    })
  ]);

  // 9. Create Alert Rules (let Prisma generate UUIDs)
  console.log('🚨 Creating alert rules...');
  const alertRules = await Promise.all([
    prisma.alertRule.create({
      data: {
        name: 'High Pain Alert',
        severity: 'high',
        window: '1h',
        expression: {
          metric: 'pain_scale_0_10',
          condition: 'greater_than_or_equal',
          threshold: 8
        },
        actions: {
          notify: ['clinician'],
          message: 'Patient reported severe pain (8+/10). Immediate attention may be required.'
        }
      }
    }),
    prisma.alertRule.create({
      data: {
        name: 'High Blood Glucose Alert',
        severity: 'high',
        window: '1h',
        expression: {
          metric: 'blood_glucose',
          condition: 'greater_than',
          threshold: 250
        },
        actions: {
          notify: ['clinician'],
          message: 'Blood glucose level critically high (>250 mg/dL). Contact patient immediately.'
        }
      }
    }),
    prisma.alertRule.create({
      data: {
        name: 'Low Blood Glucose Alert',
        severity: 'high',
        window: '1h',
        expression: {
          metric: 'blood_glucose',
          condition: 'less_than',
          threshold: 70
        },
        actions: {
          notify: ['clinician'],
          message: 'Blood glucose level dangerously low (<70 mg/dL). Immediate intervention required.'
        }
      }
    }),
    prisma.alertRule.create({
      data: {
        name: 'Missed Medication Alert',
        severity: 'medium',
        window: '24h',
        expression: {
          metric: 'medication_adherence',
          condition: 'equals',
          value: 'missed_dose'
        },
        actions: {
          notify: ['clinician'],
          message: 'Patient missed medication dose. Follow up on adherence.'
        }
      }
    })
  ]);

  // 10. Link Alert Rules to Condition Presets
  console.log('🔗 Linking alert rules to condition presets...');
  await Promise.all([
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPresets[0].id,
        ruleId: alertRules[0].id
      }
    }),
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPresets[1].id,
        ruleId: alertRules[0].id
      }
    }),
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPresets[2].id,
        ruleId: alertRules[1].id
      }
    }),
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPresets[2].id,
        ruleId: alertRules[2].id
      }
    }),
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPresets[2].id,
        ruleId: alertRules[3].id
      }
    })
  ]);

  // 11. Create Enrollments
  console.log('📝 Creating enrollments...');
  const enrollments = await Promise.all([
    prisma.enrollment.create({
      data: {
        patientId: patients[0].id,
        clinicianId: clinicians[0].id,
        presetId: conditionPresets[0].id,
        diagnosisCode: 'M79.3',
        status: 'active',
        startDate: new Date('2024-01-15')
      }
    }),
    prisma.enrollment.create({
      data: {
        patientId: patients[1].id,
        clinicianId: clinicians[1].id,
        presetId: conditionPresets[2].id,
        diagnosisCode: 'E11.9',
        status: 'active',
        startDate: new Date('2024-02-01')
      }
    }),
    prisma.enrollment.create({
      data: {
        patientId: patients[2].id,
        clinicianId: clinicians[2].id,
        presetId: conditionPresets[1].id,
        diagnosisCode: 'M79.7',
        status: 'active',
        startDate: new Date('2024-01-20')
      }
    })
  ]);

  // 12. Generate Sample Observations
  console.log('📈 Generating sample observations...');
  const observations = [];
  const now = new Date();

  // Generate observations for the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // John Doe - Chronic Pain observations
    observations.push(
      prisma.observation.create({
        data: {
          patientId: patients[0].id,
          enrollmentId: enrollments[0].id,
          metricKey: 'pain_scale_0_10',
          metricDefinitionId: metrics[0].id,
          valueNumeric: Math.floor(Math.random() * 4) + 4, // 4-7 range
          recordedAt: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000),
          context: {
            activity: ['sitting', 'walking', 'standing', 'lying down'][Math.floor(Math.random() * 4)],
            weather: ['sunny', 'rainy', 'cloudy'][Math.floor(Math.random() * 3)],
            mood: ['good', 'fair', 'poor'][Math.floor(Math.random() * 3)]
          }
        }
      }),
      prisma.observation.create({
        data: {
          patientId: patients[0].id,
          enrollmentId: enrollments[0].id,
          metricKey: 'pain_location',
          metricDefinitionId: metrics[1].id,
          valueText: 'lower_back',
          recordedAt: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000),
          context: {
            duration: 'chronic',
            intensity: 'moderate'
          }
        }
      })
    );

    // Sarah Johnson - Diabetes observations
    const glucoseValue = Math.floor(Math.random() * 100) + 80; // 80-180 range mostly
    observations.push(
      prisma.observation.create({
        data: {
          patientId: patients[1].id,
          enrollmentId: enrollments[1].id,
          metricKey: 'blood_glucose',
          metricDefinitionId: metrics[5].id,
          valueNumeric: glucoseValue,
          recordedAt: new Date(date.getTime() + 8 * 60 * 60 * 1000), // Morning reading
          context: {
            meal_timing: 'fasting',
            medication_taken: true
          }
        }
      }),
      prisma.observation.create({
        data: {
          patientId: patients[1].id,
          enrollmentId: enrollments[1].id,
          metricKey: 'medication_adherence',
          metricDefinitionId: metrics[9].id,
          valueText: ['taken_on_time', 'taken_late', 'missed_dose'][Math.floor(Math.random() * 10) < 8 ? 0 : Math.floor(Math.random() * 2) + 1],
          recordedAt: new Date(date.getTime() + 9 * 60 * 60 * 1000),
          context: {
            medication: 'Metformin 1000mg',
            reminder_used: true
          }
        }
      })
    );

    // Michael Brown - Fibromyalgia observations
    observations.push(
      prisma.observation.create({
        data: {
          patientId: patients[2].id,
          enrollmentId: enrollments[2].id,
          metricKey: 'fatigue_level',
          metricDefinitionId: metrics[2].id,
          valueNumeric: Math.floor(Math.random() * 5) + 5, // 5-9 range
          recordedAt: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000),
          context: {
            sleep_hours: Math.floor(Math.random() * 4) + 5,
            stress_level: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)]
          }
        }
      }),
      prisma.observation.create({
        data: {
          patientId: patients[2].id,
          enrollmentId: enrollments[2].id,
          metricKey: 'sleep_quality',
          metricDefinitionId: metrics[3].id,
          valueText: ['poor', 'fair', 'good'][Math.floor(Math.random() * 3)],
          recordedAt: new Date(date.getTime() + 7 * 60 * 60 * 1000), // Morning report
          context: {
            sleep_duration: Math.floor(Math.random() * 4) + 5,
            wake_ups: Math.floor(Math.random() * 4)
          }
        }
      })
    );
  }

  await Promise.all(observations);

  // 13. Create Sample Alerts
  console.log('🚨 Creating sample alerts...');
  await Promise.all([
    prisma.alert.create({
      data: {
        ruleId: alertRules[0].id,
        enrollmentId: enrollments[0].id,
        triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        facts: {
          metric_value: 8,
          patient_note: 'Pain worse than usual today'
        },
        status: 'open'
      }
    }),
    prisma.alert.create({
      data: {
        ruleId: alertRules[1].id,
        enrollmentId: enrollments[1].id,
        triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        facts: {
          metric_value: 275,
          follow_up_action: 'Patient contacted, medication adjusted'
        },
        status: 'open'
      }
    })
  ]);

  // 14. Create Sample Messages
  console.log('💬 Creating sample messages...');
  await Promise.all([
    prisma.message.create({
      data: {
        enrollmentId: enrollments[0].id,
        patientId: patients[0].id,
        senderType: 'clinician',
        body: 'Hi John, I noticed your pain levels have been elevated recently. How are you feeling today?'
      }
    }),
    prisma.message.create({
      data: {
        enrollmentId: enrollments[1].id,
        patientId: patients[1].id,
        senderType: 'clinician',
        body: 'Great job maintaining your blood glucose levels this week! Keep up the good work.'
      }
    })
  ]);

  console.log('🎉 RTM database seeding completed successfully!');
  console.log('📊 Summary:');
  console.log('  - 3 Patients created');
  console.log('  - 3 Clinicians created');
  console.log('  - 10 Metric definitions created');
  console.log('  - 3 Assessment templates with items created');
  console.log('  - 3 Condition presets with diagnoses created');
  console.log('  - 4 Alert rules created');
  console.log('  - 3 Active enrollments created');
  console.log('  - ~180 Sample observations generated (30 days)');
  console.log('  - 2 Sample alerts created');
  console.log('  - 2 Sample messages created');
  console.log('');
  console.log('🏥 RTM Programs covered:');
  console.log('  - Chronic Pain Management');
  console.log('  - Fibromyalgia Care Program');
  console.log('  - Diabetes Management Program');
  console.log('  - Medication Adherence Monitoring');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });