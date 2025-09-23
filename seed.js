const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Patients
  console.log('👥 Creating patients...');
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        mrn: 'MRN001234'
      }
    }),
    prisma.patient.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        mrn: 'MRN001235'
      }
    }),
    prisma.patient.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        mrn: 'MRN001236'
      }
    })
  ]);

  // 2. Create Clinicians
  console.log('👨‍⚕️ Creating clinicians...');
  const clinicians = await Promise.all([
    prisma.clinician.create({
      data: {
        id: '660e8400-e29b-41d4-a716-446655440001',
        npi: '1234567890'
      }
    }),
    prisma.clinician.create({
      data: {
        id: '660e8400-e29b-41d4-a716-446655440002',
        npi: '1234567891'
      }
    })
  ]);

  // 3. Create Metric Definitions
  console.log('📏 Creating metric definitions...');
  const metricDefinitions = await Promise.all([
    prisma.metricDefinition.create({
      data: {
        id: '770e8400-e29b-41d4-a716-446655440001',
        key: 'pain_scale_0_10',
        displayName: 'Pain Scale (0-10)',
        valueType: 'numeric',
        unit: 'scale',
        scaleMin: 0,
        scaleMax: 10,
        decimalPrecision: 0,
        requiredDefault: true,
        defaultFrequency: 'daily',
        coding: {
          system: 'http://loinc.org',
          code: '72133-2',
          display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
        },
        validation: {
          min: 0,
          max: 10,
          type: 'integer'
        }
      }
    }),
    prisma.metricDefinition.create({
      data: {
        id: '770e8400-e29b-41d4-a716-446655440002',
        key: 'pain_location',
        displayName: 'Pain Location',
        valueType: 'categorical',
        options: {
          values: [
            { code: 'back', display: 'Back' },
            { code: 'neck', display: 'Neck' },
            { code: 'shoulder', display: 'Shoulder' },
            { code: 'knee', display: 'Knee' },
            { code: 'hip', display: 'Hip' },
            { code: 'other', display: 'Other' }
          ]
        }
      }
    }),
    prisma.metricDefinition.create({
      data: {
        id: '770e8400-e29b-41d4-a716-446655440003',
        key: 'pain_interference',
        displayName: 'Pain Interference with Daily Activities',
        valueType: 'ordinal',
        unit: 'scale',
        scaleMin: 0,
        scaleMax: 4,
        options: {
          values: [
            { code: '0', display: 'Not at all' },
            { code: '1', display: 'A little bit' },
            { code: '2', display: 'Moderately' },
            { code: '3', display: 'Quite a bit' },
            { code: '4', display: 'Extremely' }
          ]
        }
      }
    }),
    prisma.metricDefinition.create({
      data: {
        id: '770e8400-e29b-41d4-a716-446655440004',
        key: 'medication_taken',
        displayName: 'Pain Medication Taken',
        valueType: 'boolean'
      }
    })
  ]);

  // 4. Create Assessment Template
  console.log('📋 Creating assessment template...');
  const assessmentTemplate = await prisma.assessmentTemplate.create({
    data: {
      id: '880e8400-e29b-41d4-a716-446655440001',
      name: 'Daily Pain Assessment',
      description: 'Standard daily pain assessment for chronic pain patients'
    }
  });

  // 5. Create Assessment Template Items
  console.log('📝 Creating assessment template items...');
  await Promise.all([
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: assessmentTemplate.id,
        metricDefinitionId: metricDefinitions[0].id, // pain_scale_0_10
        required: true,
        displayOrder: 1,
        helpText: 'Rate your current pain level from 0 (no pain) to 10 (worst possible pain)'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: assessmentTemplate.id,
        metricDefinitionId: metricDefinitions[1].id, // pain_location
        required: true,
        displayOrder: 2,
        helpText: 'Select the primary location of your pain'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: assessmentTemplate.id,
        metricDefinitionId: metricDefinitions[2].id, // pain_interference
        required: false,
        displayOrder: 3,
        helpText: 'How much does pain interfere with your daily activities?'
      }
    }),
    prisma.assessmentTemplateItem.create({
      data: {
        templateId: assessmentTemplate.id,
        metricDefinitionId: metricDefinitions[3].id, // medication_taken
        required: false,
        displayOrder: 4,
        helpText: 'Did you take pain medication today?'
      }
    })
  ]);

  // 6. Create Condition Preset
  console.log('🏥 Creating condition preset...');
  const conditionPreset = await prisma.conditionPreset.create({
    data: {
      id: '990e8400-e29b-41d4-a716-446655440001',
      name: 'Chronic Lower Back Pain'
    }
  });

  // 7. Create Condition Preset Diagnosis
  await prisma.conditionPresetDiagnosis.create({
    data: {
      presetId: conditionPreset.id,
      icd10: 'M54.5',
      snomed: '279039007',
      label: 'Low back pain'
    }
  });

  // 8. Link Template to Preset
  await prisma.conditionPresetTemplate.create({
    data: {
      presetId: conditionPreset.id,
      templateId: assessmentTemplate.id
    }
  });

  // 9. Create Alert Rules
  console.log('🚨 Creating alert rules...');
  const alertRules = await Promise.all([
    prisma.alertRule.create({
      data: {
        id: 'aa0e8400-e29b-41d4-a716-446655440001',
        name: 'High Pain Alert',
        severity: 'high',
        window: '1d',
        expression: {
          condition: 'pain_scale_0_10 >= 8',
          description: 'Trigger when pain scale is 8 or higher'
        },
        dedupeKey: 'high_pain',
        cooldown: '4h',
        actions: {
          notify: ['clinician'],
          escalate: true
        }
      }
    }),
    prisma.alertRule.create({
      data: {
        id: 'aa0e8400-e29b-41d4-a716-446655440002',
        name: 'Missing Assessment Alert',
        severity: 'medium',
        window: '2d',
        expression: {
          condition: 'no_assessment_for > 24h',
          description: 'Trigger when no assessment submitted for 24+ hours'
        },
        dedupeKey: 'missing_assessment',
        cooldown: '12h',
        actions: {
          notify: ['patient', 'clinician'],
          reminder: true
        }
      }
    })
  ]);

  // 10. Link Alert Rules to Preset
  await Promise.all([
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPreset.id,
        ruleId: alertRules[0].id
      }
    }),
    prisma.conditionPresetAlertRule.create({
      data: {
        presetId: conditionPreset.id,
        ruleId: alertRules[1].id
      }
    })
  ]);

  // 11. Create Enrollments
  console.log('📋 Creating enrollments...');
  const enrollments = await Promise.all([
    prisma.enrollment.create({
      data: {
        id: 'bb0e8400-e29b-41d4-a716-446655440001',
        patientId: patients[0].id,
        presetId: conditionPreset.id,
        diagnosisCode: 'M54.5',
        clinicianId: clinicians[0].id,
        startDate: new Date('2024-01-01'),
        status: 'active',
        consentAt: new Date('2024-01-01T10:00:00Z')
      }
    }),
    prisma.enrollment.create({
      data: {
        id: 'bb0e8400-e29b-41d4-a716-446655440002',
        patientId: patients[1].id,
        presetId: conditionPreset.id,
        diagnosisCode: 'M54.5',
        clinicianId: clinicians[1].id,
        startDate: new Date('2024-01-15'),
        status: 'active',
        consentAt: new Date('2024-01-15T09:30:00Z')
      }
    }),
    prisma.enrollment.create({
      data: {
        id: 'bb0e8400-e29b-41d4-a716-446655440003',
        patientId: patients[2].id,
        presetId: conditionPreset.id,
        diagnosisCode: 'M54.5',
        clinicianId: clinicians[0].id,
        startDate: new Date('2023-12-01'),
        endDate: new Date('2024-01-31'),
        status: 'ended',
        consentAt: new Date('2023-12-01T14:00:00Z')
      }
    })
  ]);

  // 12. Create Observations (Pain Data)
  console.log('📊 Creating observations...');
  const baseDate = new Date('2024-01-01');
  const observations = [];

  // Generate 30 days of data for active patients
  for (let day = 0; day < 30; day++) {
    const recordDate = new Date(baseDate);
    recordDate.setDate(baseDate.getDate() + day);

    // Patient 1 observations
    observations.push(
      prisma.observation.create({
        data: {
          patientId: patients[0].id,
          enrollmentId: enrollments[0].id,
          templateId: assessmentTemplate.id,
          metricKey: 'pain_scale_0_10',
          metricDefinitionId: metricDefinitions[0].id,
          recordedAt: recordDate,
          source: 'patient',
          valueNumeric: Math.floor(Math.random() * 6) + 3, // Random 3-8
          unit: 'scale'
        }
      }),
      prisma.observation.create({
        data: {
          patientId: patients[0].id,
          enrollmentId: enrollments[0].id,
          templateId: assessmentTemplate.id,
          metricKey: 'pain_location',
          metricDefinitionId: metricDefinitions[1].id,
          recordedAt: recordDate,
          source: 'patient',
          valueCode: 'back'
        }
      }),
      prisma.observation.create({
        data: {
          patientId: patients[0].id,
          enrollmentId: enrollments[0].id,
          templateId: assessmentTemplate.id,
          metricKey: 'pain_interference',
          metricDefinitionId: metricDefinitions[2].id,
          recordedAt: recordDate,
          source: 'patient',
          valueCode: Math.floor(Math.random() * 5).toString() // 0-4
        }
      })
    );

    // Patient 2 observations (different pattern)
    if (day >= 14) { // Started later
      observations.push(
        prisma.observation.create({
          data: {
            patientId: patients[1].id,
            enrollmentId: enrollments[1].id,
            templateId: assessmentTemplate.id,
            metricKey: 'pain_scale_0_10',
            metricDefinitionId: metricDefinitions[0].id,
            recordedAt: recordDate,
            source: 'patient',
            valueNumeric: Math.floor(Math.random() * 4) + 5, // Random 5-8
            unit: 'scale'
          }
        }),
        prisma.observation.create({
          data: {
            patientId: patients[1].id,
            enrollmentId: enrollments[1].id,
            templateId: assessmentTemplate.id,
            metricKey: 'pain_location',
            metricDefinitionId: metricDefinitions[1].id,
            recordedAt: recordDate,
            source: 'patient',
            valueCode: 'neck'
          }
        })
      );
    }
  }

  await Promise.all(observations);

  // 13. Create Alerts
  console.log('🚨 Creating alerts...');
  await Promise.all([
    prisma.alert.create({
      data: {
        ruleId: alertRules[0].id,
        enrollmentId: enrollments[0].id,
        triggeredAt: new Date('2024-01-15T08:30:00Z'),
        facts: {
          painLevel: 9,
          trigger: 'pain_scale_0_10 >= 8',
          patientMrn: 'MRN001234'
        },
        status: 'ack'
      }
    }),
    prisma.alert.create({
      data: {
        ruleId: alertRules[0].id,
        enrollmentId: enrollments[1].id,
        triggeredAt: new Date('2024-01-20T14:15:00Z'),
        facts: {
          painLevel: 8,
          trigger: 'pain_scale_0_10 >= 8',
          patientMrn: 'MRN001235'
        },
        status: 'open'
      }
    })
  ]);

  // 14. Create Time Logs
  console.log('⏰ Creating time logs...');
  await Promise.all([
    prisma.timeLog.create({
      data: {
        patientId: patients[0].id,
        enrollmentId: enrollments[0].id,
        cptCode: 'CPT_99457',
        minutes: 20,
        startedAt: new Date('2024-01-10T09:00:00Z'),
        endedAt: new Date('2024-01-10T09:20:00Z'),
        actorId: clinicians[0].id,
        activityRef: 'initial_setup',
        audit: {
          action: 'enrollment_setup',
          notes: 'Initial patient enrollment and assessment setup'
        }
      }
    }),
    prisma.timeLog.create({
      data: {
        patientId: patients[1].id,
        enrollmentId: enrollments[1].id,
        cptCode: 'CPT_99458',
        minutes: 15,
        startedAt: new Date('2024-01-25T11:30:00Z'),
        endedAt: new Date('2024-01-25T11:45:00Z'),
        actorId: clinicians[1].id,
        activityRef: 'care_plan_review',
        audit: {
          action: 'care_plan_adjustment',
          notes: 'Reviewed pain trends and adjusted care plan'
        }
      }
    })
  ]);

  // 15. Create Messages
  console.log('💬 Creating messages...');
  await Promise.all([
    prisma.message.create({
      data: {
        enrollmentId: enrollments[0].id,
        patientId: patients[0].id,
        senderType: 'patient',
        body: 'My pain has been getting worse over the past few days. Should I be concerned?'
      }
    }),
    prisma.message.create({
      data: {
        enrollmentId: enrollments[0].id,
        patientId: patients[0].id,
        senderType: 'clinician',
        body: 'Thank you for reaching out. I can see your pain scores have increased. Let\'s schedule a follow-up call to discuss your treatment plan.'
      }
    }),
    prisma.message.create({
      data: {
        enrollmentId: enrollments[1].id,
        patientId: patients[1].id,
        senderType: 'system',
        body: 'Reminder: Please complete your daily pain assessment.'
      }
    })
  ]);

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log('- 3 Patients created');
  console.log('- 2 Clinicians created');
  console.log('- 4 Metric Definitions created');
  console.log('- 1 Assessment Template with 4 items created');
  console.log('- 1 Condition Preset with diagnosis created');
  console.log('- 2 Alert Rules created');
  console.log('- 3 Enrollments created');
  console.log('- ~90 Observations created (30 days of data)');
  console.log('- 2 Alerts created');
  console.log('- 2 Time Logs created');
  console.log('- 3 Messages created');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });