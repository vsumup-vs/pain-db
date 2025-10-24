const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed script to create comprehensive test data for alert-contextual Patient Context Panel
 *
 * Creates:
 * - 4 test patients with different conditions
 * - Enrollments with billing programs
 * - Observation trends (vitals over time)
 * - Multiple alerts (some resolved, some pending) to show historical context
 * - Different alert categories (cardiovascular, diabetes, respiratory, pain)
 */

async function main() {
  console.log('🌱 Starting comprehensive alert-contextual test data seeding...\n');

  // Get clinician and their organization
  const clinician = await prisma.clinician.findFirst({
    include: { organization: true }
  });

  if (!clinician) {
    throw new Error('No clinician found. Please run seed script first.');
  }

  const organization = clinician.organization;

  if (!organization) {
    throw new Error('No organization found. Please run seed script first.');
  }

  console.log(`📋 Using organization: ${organization.name}`);
  console.log(`👨‍⚕️ Using clinician: ${clinician.firstName} ${clinician.lastName}\n`);

  // Clean up existing test patients
  console.log('🧹 Cleaning up existing test patients...');
  const existingPatients = await prisma.patient.findMany({
    where: { medicalRecordNumber: { startsWith: 'MRN-ALERT-CTX' } },
    select: { id: true }
  });

  if (existingPatients.length > 0) {
    const patientIds = existingPatients.map(p => p.id);
    await prisma.observation.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.alert.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.timeLog.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.enrollment.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    console.log(`   Deleted ${existingPatients.length} existing test patient(s)\n`);
  } else {
    console.log('   No existing test patients found\n');
  }

  // Get billing programs
  const rpmProgram = await prisma.billingProgram.findFirst({
    where: { code: 'CMS_RPM_2025' }
  });

  const rtmProgram = await prisma.billingProgram.findFirst({
    where: { code: 'CMS_RTM_2025' }
  });

  // Get care programs
  const carePrograms = await prisma.careProgram.findMany({
    where: { organizationId: organization.id }
  });

  console.log('📋 Available care programs:');
  carePrograms.forEach(p => console.log(`   - ${p.name} (type: ${p.type})`));
  console.log('');

  // Get condition presets
  const conditionPresets = await prisma.conditionPreset.findMany({
    where: {
      OR: [
        { organizationId: organization.id },
        { isStandardized: true }
      ]
    }
  });

  const getHypertensionPreset = () => conditionPresets.find(p => p.category === 'Cardiovascular' && p.name.toLowerCase().includes('hypertension'));
  const getDiabetesPreset = () => conditionPresets.find(p => p.category === 'Endocrine' && p.name.toLowerCase().includes('diabetes'));
  const getPainPreset = () => conditionPresets.find(p => p.category === 'Pain Management');
  const getCOPDPreset = () => conditionPresets.find(p => p.category === 'Respiratory' && p.name.toLowerCase().includes('copd'));

  // Get metric definitions
  const metrics = await prisma.metricDefinition.findMany({
    where: {
      OR: [
        { organizationId: organization.id },
        { isStandardized: true }
      ]
    }
  });

  const getSystolicBPMetric = () => metrics.find(m => m.displayName?.toLowerCase().includes('systolic'));
  const getDiastolicBPMetric = () => metrics.find(m => m.displayName?.toLowerCase().includes('diastolic'));
  const getHeartRateMetric = () => metrics.find(m => m.displayName?.toLowerCase().includes('heart rate'));
  const getGlucoseMetric = () => metrics.find(m => m.displayName?.toLowerCase().includes('glucose'));
  const getO2SatMetric = () => metrics.find(m => m.displayName?.toLowerCase().includes('o2') || m.displayName?.toLowerCase().includes('oxygen'));
  const getPainLevelMetric = () => metrics.find(m => m.displayName?.toLowerCase().includes('pain level'));

  // Get alert rules
  const alertRules = await prisma.alertRule.findMany({
    where: {
      OR: [
        { organizationId: organization.id },
        { isStandardized: true }
      ]
    }
  });

  const getHighBPRule = () => alertRules.find(r => r.name.toLowerCase().includes('high blood pressure'));
  const getHypoglycemiaRule = () => alertRules.find(r => r.name.toLowerCase().includes('hypoglycemia'));
  const getSeverePainRule = () => alertRules.find(r => r.name.toLowerCase().includes('severe pain'));
  const getHypoxiaRule = () => alertRules.find(r => r.name.toLowerCase().includes('hypoxia'));

  // ============================================================
  // PATIENT 1: Hypertension with Multiple BP Alerts (Trend)
  // ============================================================
  console.log('👤 Creating Patient 1: Sarah Johnson (Hypertension)...');

  const patient1 = await prisma.patient.create({
    data: {
      organizationId: organization.id,
      firstName: 'Sarah',
      lastName: 'Johnson',
      dateOfBirth: new Date('1965-03-15'),
      gender: 'FEMALE',
      email: 'sarah.johnson.alert001@test.com',
      phone: '555-0101',
      medicalRecordNumber: 'MRN-ALERT-CTX-001',
      address: '123 Maple St, Springfield, IL 62701'
    }
  });

  // Create enrollment for hypertension program
  const hypertensionProgram = carePrograms.find(p => p.type === 'HYPERTENSION');
  const enrollment1 = await prisma.enrollment.create({
    data: {
      organizationId: organization.id,
      patientId: patient1.id,
      clinicianId: clinician.id,
      careProgramId: hypertensionProgram.id,
      conditionPresetId: getHypertensionPreset().id,
      billingProgramId: rpmProgram?.id,
      status: 'ACTIVE',
      startDate: new Date('2025-09-01'),
      billingEligibility: {
        eligible: true,
        eligibilityDate: new Date('2025-09-01'),
        chronicConditions: ['I10'],
        verifiedBy: clinician.id,
        verifiedAt: new Date()
      }
    }
  });

  // Create BP trend over 30 days (gradually increasing)
  console.log('  📊 Creating BP trend (30 days)...');
  const systolicBPMetric = getSystolicBPMetric();
  const diastolicBPMetric = getDiastolicBPMetric();
  const heartRateMetric = getHeartRateMetric();

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Gradually increasing BP (worsening trend)
    const baseSystolic = 135 + (30 - i) * 2; // 135 → 195
    const baseDiastolic = 85 + (30 - i) * 1; // 85 → 115
    const systolic = baseSystolic + Math.random() * 10 - 5;
    const diastolic = baseDiastolic + Math.random() * 5 - 2.5;
    const heartRate = 70 + Math.random() * 20;

    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient1.id,
        enrollmentId: enrollment1.id,
        metricId: systolicBPMetric.id,
        value: Math.round(systolic),
        unit: 'mmHg',
        source: 'DEVICE',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: date
      }
    });

    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient1.id,
        enrollmentId: enrollment1.id,
        metricId: diastolicBPMetric.id,
        value: Math.round(diastolic),
        unit: 'mmHg',
        source: 'DEVICE',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: date
      }
    });

    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient1.id,
        enrollmentId: enrollment1.id,
        metricId: heartRateMetric.id,
        value: Math.round(heartRate),
        unit: 'bpm',
        source: 'DEVICE',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: date
      }
    });
  }

  // Create multiple high BP alerts (3 resolved, 1 pending)
  console.log('  🚨 Creating BP alerts (3 resolved, 1 pending)...');
  const highBPRule = getHighBPRule();

  // Resolved alert 1 (20 days ago)
  const resolvedAlert1 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient1.id,
      ruleId: highBPRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'RESOLVED',
      message: 'Blood pressure elevated: 185/95 mmHg',
      riskScore: 7.5,
      data: { enrollmentId: enrollment1.id, systolic: 185, diastolic: 95 },
      triggeredAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      resolutionNotes: 'Counseled patient on medication adherence. Reminded to take lisinopril daily. Patient agreed to monitor BP twice daily.'
    }
  });

  // Resolved alert 2 (10 days ago)
  const resolvedAlert2 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient1.id,
      ruleId: highBPRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'RESOLVED',
      message: 'Blood pressure elevated: 188/98 mmHg',
      riskScore: 8.0,
      data: { enrollmentId: enrollment1.id, systolic: 188, diastolic: 98 },
      triggeredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      resolutionNotes: 'Adjusted medication dosage. Increased lisinopril from 10mg to 20mg. Scheduled follow-up in 1 week.'
    }
  });

  // Resolved alert 3 (3 days ago)
  const resolvedAlert3 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient1.id,
      ruleId: highBPRule.id,
      clinicianId: clinician.id,
      severity: 'CRITICAL',
      status: 'RESOLVED',
      message: 'Blood pressure critically high: 192/102 mmHg',
      riskScore: 9.2,
      data: { enrollmentId: enrollment1.id, systolic: 192, diastolic: 102 },
      triggeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
      resolutionNotes: 'Patient experiencing headaches and dizziness. Added amlodipine 5mg daily. Advised to monitor for side effects and report immediately if symptoms worsen.'
    }
  });

  // Pending alert (now)
  const pendingAlert1 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient1.id,
      ruleId: highBPRule.id,
      clinicianId: clinician.id,
      severity: 'CRITICAL',
      status: 'PENDING',
      message: 'Blood pressure critically high: 195/105 mmHg',
      riskScore: 9.5,
      data: { enrollmentId: enrollment1.id, systolic: 195, diastolic: 105 },
      triggeredAt: new Date()
    }
  });

  console.log(`  ✅ Created patient: ${patient1.firstName} ${patient1.lastName} (${patient1.id})`);
  console.log(`     - Enrollment: ${enrollment1.id}`);
  console.log(`     - Observations: 93 (31 days × 3 metrics)`);
  console.log(`     - Alerts: 3 resolved, 1 pending\n`);

  // ============================================================
  // PATIENT 2: Type 2 Diabetes with Hypoglycemia Alerts
  // ============================================================
  console.log('👤 Creating Patient 2: Michael Chen (Type 2 Diabetes)...');

  const patient2 = await prisma.patient.create({
    data: {
      organizationId: organization.id,
      firstName: 'Michael',
      lastName: 'Chen',
      dateOfBirth: new Date('1972-07-22'),
      gender: 'MALE',
      email: 'michael.chen.alert002@test.com',
      phone: '555-0102',
      medicalRecordNumber: 'MRN-ALERT-CTX-002',
      address: '456 Oak Ave, Springfield, IL 62702'
    }
  });

  const diabetesProgram = carePrograms.find(p => p.type === 'DIABETES');
  const enrollment2 = await prisma.enrollment.create({
    data: {
      organizationId: organization.id,
      patientId: patient2.id,
      clinicianId: clinician.id,
      careProgramId: diabetesProgram.id,
      conditionPresetId: getDiabetesPreset().id,
      billingProgramId: rpmProgram?.id,
      status: 'ACTIVE',
      startDate: new Date('2025-08-15'),
      billingEligibility: {
        eligible: true,
        eligibilityDate: new Date('2025-08-15'),
        chronicConditions: ['E11.9'],
        verifiedBy: clinician.id,
        verifiedAt: new Date()
      }
    }
  });

  // Create glucose trend over 30 days
  console.log('  📊 Creating glucose trend (30 days)...');
  const glucoseMetric = getGlucoseMetric();

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Morning reading (fasting)
    const morningGlucose = 90 + Math.random() * 50; // 90-140 mg/dL
    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient2.id,
        enrollmentId: enrollment2.id,
        metricId: glucoseMetric.id,
        value: Math.round(morningGlucose),
        unit: 'mg/dL',
        source: 'DEVICE',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: new Date(date.setHours(7, 0, 0, 0))
      }
    });

    // Evening reading (post-meal)
    const eveningGlucose = 110 + Math.random() * 70; // 110-180 mg/dL
    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient2.id,
        enrollmentId: enrollment2.id,
        metricId: glucoseMetric.id,
        value: Math.round(eveningGlucose),
        unit: 'mg/dL',
        source: 'DEVICE',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: new Date(date.setHours(19, 0, 0, 0))
      }
    });
  }

  // Create hypoglycemia alerts (2 resolved, 1 pending)
  console.log('  🚨 Creating hypoglycemia alerts (2 resolved, 1 pending)...');
  const hypoglycemiaRule = getHypoglycemiaRule();

  const resolvedHypo1 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient2.id,
      ruleId: hypoglycemiaRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'RESOLVED',
      message: 'Blood glucose dangerously low: 58 mg/dL',
      riskScore: 8.5,
      data: { enrollmentId: enrollment2.id, glucose: 58 },
      triggeredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000),
      resolutionNotes: 'Patient reported feeling shaky and sweaty. Advised to consume 15g fast-acting carbs immediately. Reviewed meal timing and insulin dosing.'
    }
  });

  const resolvedHypo2 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient2.id,
      ruleId: hypoglycemiaRule.id,
      clinicianId: clinician.id,
      severity: 'CRITICAL',
      status: 'RESOLVED',
      message: 'Blood glucose critically low: 52 mg/dL',
      riskScore: 9.0,
      data: { enrollmentId: enrollment2.id, glucose: 52 },
      triggeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      resolutionNotes: 'Reduced evening insulin dose from 12 units to 10 units. Patient experiencing frequent nighttime hypoglycemia. Scheduled endocrinology consult.'
    }
  });

  const pendingHypo = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient2.id,
      ruleId: hypoglycemiaRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'PENDING',
      message: 'Blood glucose low: 62 mg/dL',
      riskScore: 8.2,
      data: { enrollmentId: enrollment2.id, glucose: 62 },
      triggeredAt: new Date()
    }
  });

  console.log(`  ✅ Created patient: ${patient2.firstName} ${patient2.lastName} (${patient2.id})`);
  console.log(`     - Enrollment: ${enrollment2.id}`);
  console.log(`     - Observations: 62 (31 days × 2 readings/day)`);
  console.log(`     - Alerts: 2 resolved, 1 pending\n`);

  // ============================================================
  // PATIENT 3: COPD with Hypoxia Alerts
  // ============================================================
  console.log('👤 Creating Patient 3: Robert Martinez (COPD)...');

  const patient3 = await prisma.patient.create({
    data: {
      organizationId: organization.id,
      firstName: 'Robert',
      lastName: 'Martinez',
      dateOfBirth: new Date('1958-11-30'),
      gender: 'MALE',
      email: 'robert.martinez.alert003@test.com',
      phone: '555-0103',
      medicalRecordNumber: 'MRN-ALERT-CTX-003',
      address: '789 Pine Rd, Springfield, IL 62703'
    }
  });

  // Create RTM enrollment for respiratory therapy
  const enrollment3 = await prisma.enrollment.create({
    data: {
      organizationId: organization.id,
      patientId: patient3.id,
      clinicianId: clinician.id,
      careProgramId: carePrograms[0].id, // Use first available program
      conditionPresetId: getCOPDPreset().id,
      billingProgramId: rtmProgram?.id,
      status: 'ACTIVE',
      startDate: new Date('2025-09-01'),
      billingEligibility: {
        eligible: true,
        eligibilityDate: new Date('2025-09-01'),
        chronicConditions: ['J44.9'],
        verifiedBy: clinician.id,
        verifiedAt: new Date()
      }
    }
  });

  // Create O2 saturation trend
  console.log('  📊 Creating O2 saturation trend (30 days)...');
  const o2SatMetric = getO2SatMetric();

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // O2 saturation varying (88-96%)
    const o2Sat = 88 + Math.random() * 8;

    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient3.id,
        enrollmentId: enrollment3.id,
        metricId: o2SatMetric.id,
        value: Math.round(o2Sat * 10) / 10,
        unit: '%',
        source: 'DEVICE',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: date
      }
    });
  }

  // Create hypoxia alerts (2 resolved, 1 pending)
  console.log('  🚨 Creating hypoxia alerts (2 resolved, 1 pending)...');
  const hypoxiaRule = getHypoxiaRule();

  const resolvedHypoxia1 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient3.id,
      ruleId: hypoxiaRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'RESOLVED',
      message: 'Oxygen saturation low: 88%',
      riskScore: 7.8,
      data: { enrollmentId: enrollment3.id, o2Sat: 88 },
      triggeredAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000),
      resolutionNotes: 'Patient reported increased shortness of breath. Reviewed rescue inhaler technique. Increased supplemental O2 from 2L to 3L/min.'
    }
  });

  const resolvedHypoxia2 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient3.id,
      ruleId: hypoxiaRule.id,
      clinicianId: clinician.id,
      severity: 'CRITICAL',
      status: 'RESOLVED',
      message: 'Oxygen saturation critically low: 85%',
      riskScore: 9.1,
      data: { enrollmentId: enrollment3.id, o2Sat: 85 },
      triggeredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000),
      resolutionNotes: 'Patient experiencing COPD exacerbation. Started prednisone 40mg daily for 5 days. Advised to use rescue inhaler q4h. Will monitor closely for 48 hours.'
    }
  });

  const pendingHypoxia = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient3.id,
      ruleId: hypoxiaRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'PENDING',
      message: 'Oxygen saturation low: 89%',
      riskScore: 7.5,
      data: { enrollmentId: enrollment3.id, o2Sat: 89 },
      triggeredAt: new Date()
    }
  });

  console.log(`  ✅ Created patient: ${patient3.firstName} ${patient3.lastName} (${patient3.id})`);
  console.log(`     - Enrollment: ${enrollment3.id}`);
  console.log(`     - Observations: 31 (31 days)`);
  console.log(`     - Alerts: 2 resolved, 1 pending\n`);

  // ============================================================
  // PATIENT 4: Chronic Pain with Multiple Pain Alerts
  // ============================================================
  console.log('👤 Creating Patient 4: Emily Rodriguez (Chronic Pain)...');

  const patient4 = await prisma.patient.create({
    data: {
      organizationId: organization.id,
      firstName: 'Emily',
      lastName: 'Rodriguez',
      dateOfBirth: new Date('1980-05-18'),
      gender: 'FEMALE',
      email: 'emily.rodriguez.alert004@test.com',
      phone: '555-0104',
      medicalRecordNumber: 'MRN-ALERT-CTX-004',
      address: '321 Elm St, Springfield, IL 62704'
    }
  });

  const painProgram = carePrograms.find(p => p.type === 'PAIN_MANAGEMENT');
  const enrollment4 = await prisma.enrollment.create({
    data: {
      organizationId: organization.id,
      patientId: patient4.id,
      clinicianId: clinician.id,
      careProgramId: painProgram.id,
      conditionPresetId: getPainPreset().id,
      billingProgramId: rtmProgram?.id,
      status: 'ACTIVE',
      startDate: new Date('2025-09-10'),
      billingEligibility: {
        eligible: true,
        eligibilityDate: new Date('2025-09-10'),
        chronicConditions: ['M79.3'],
        verifiedBy: clinician.id,
        verifiedAt: new Date()
      }
    }
  });

  // Create pain level trend
  console.log('  📊 Creating pain level trend (30 days)...');
  const painLevelMetric = getPainLevelMetric();

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Pain level fluctuating (3-9 on 0-10 scale)
    const painLevel = 3 + Math.random() * 6;

    await prisma.observation.create({
      data: {
        organizationId: organization.id,
        patientId: patient4.id,
        enrollmentId: enrollment4.id,
        metricId: painLevelMetric.id,
        value: Math.round(painLevel),
        source: 'MANUAL',
        context: 'PROGRAM_ENROLLMENT',
        recordedAt: date
      }
    });
  }

  // Create severe pain alerts (3 resolved, 1 pending)
  console.log('  🚨 Creating severe pain alerts (3 resolved, 1 pending)...');
  const severePainRule = getSeverePainRule();

  const resolvedPain1 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient4.id,
      ruleId: severePainRule.id,
      clinicianId: clinician.id,
      severity: 'MEDIUM',
      status: 'RESOLVED',
      message: 'Severe pain reported: 8/10 for 3+ consecutive days',
      riskScore: 6.5,
      data: { enrollmentId: enrollment4.id, painLevel: 8, consecutiveDays: 3 },
      triggeredAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      resolutionNotes: 'Patient experiencing pain flare-up in lower back. Reviewed physical therapy exercises. Advised to use ice/heat alternating. Continue gabapentin 300mg TID.'
    }
  });

  const resolvedPain2 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient4.id,
      ruleId: severePainRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'RESOLVED',
      message: 'Severe pain reported: 9/10 for 4+ consecutive days',
      riskScore: 8.0,
      data: { enrollmentId: enrollment4.id, painLevel: 9, consecutiveDays: 4 },
      triggeredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
      resolutionNotes: 'Patient reports pain interfering with sleep and daily activities. Increased gabapentin to 600mg TID. Referred to pain management specialist for evaluation.'
    }
  });

  const resolvedPain3 = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient4.id,
      ruleId: severePainRule.id,
      clinicianId: clinician.id,
      severity: 'MEDIUM',
      status: 'RESOLVED',
      message: 'Severe pain reported: 8/10 for 3+ consecutive days',
      riskScore: 7.0,
      data: { enrollmentId: enrollment4.id, painLevel: 8, consecutiveDays: 3 },
      triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000),
      resolutionNotes: 'Pain flare after attempting new stretching exercises. Advised to reduce intensity and frequency. Continue current medication regimen. Follow up in 1 week.'
    }
  });

  const pendingPain = await prisma.alert.create({
    data: {
      organizationId: organization.id,
      patientId: patient4.id,
      ruleId: severePainRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      status: 'PENDING',
      message: 'Severe pain reported: 9/10 for 3+ consecutive days',
      riskScore: 8.5,
      data: { enrollmentId: enrollment4.id, painLevel: 9, consecutiveDays: 3 },
      triggeredAt: new Date()
    }
  });

  console.log(`  ✅ Created patient: ${patient4.firstName} ${patient4.lastName} (${patient4.id})`);
  console.log(`     - Enrollment: ${enrollment4.id}`);
  console.log(`     - Observations: 31 (31 days)`);
  console.log(`     - Alerts: 3 resolved, 1 pending\n`);

  // ============================================================
  // Summary
  // ============================================================
  console.log('✅ Comprehensive test data seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Patients created: 4`);
  console.log(`   - Enrollments created: 4`);
  console.log(`   - Observations created: 217 (with trends over 30 days)`);
  console.log(`   - Alerts created: 16 total (12 resolved, 4 pending)`);
  console.log('');
  console.log('🧪 Test Scenarios:');
  console.log('   1. Sarah Johnson: Hypertension with worsening BP trend → Multiple resolved BP alerts');
  console.log('   2. Michael Chen: Type 2 Diabetes → Hypoglycemia alerts with medication adjustments');
  console.log('   3. Robert Martinez: COPD → Hypoxia alerts with O2 therapy adjustments');
  console.log('   4. Emily Rodriguez: Chronic Pain → Severe pain alerts with therapy escalation');
  console.log('');
  console.log('💡 To test alert-contextual Patient Context Panel:');
  console.log('   1. Go to Triage Queue');
  console.log('   2. Claim any of the 4 pending alerts');
  console.log('   3. Click on patient name (with chart icon)');
  console.log('   4. See alert-aware context section with:');
  console.log('      - Similar past alerts with resolution notes');
  console.log('      - Relevant vitals filtered by alert category');
  console.log('      - Historical context showing trends\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
