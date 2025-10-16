/**
 * Seed script for testing Prioritized Triage Queue (Phase 1a)
 *
 * This script creates:
 * 1. Sample patients with different risk profiles
 * 2. Observations with varying deviation from normal ranges
 * 3. Trending observations (worsening vs stable)
 * 4. Medication adherence records (good, moderate, poor)
 * 5. Alerts with different severities
 * 6. Calculates risk scores and priority ranks
 *
 * Usage: node scripts/seed-triage-queue-test-data.js
 */

const { PrismaClient } = require('@prisma/client');
const { calculateAlertRiskScore, recalculatePriorityRanks } = require('../src/services/alertRiskScoringService');

const prisma = new PrismaClient();

async function main() {
  console.log('🔥 Starting Triage Queue Test Data Seeding...\n');

  // Get or create test organization
  let organization = await prisma.organization.findFirst({
    where: { name: 'Test Clinic - Triage Queue' }
  });

  if (!organization) {
    console.log('Creating test organization...');
    organization = await prisma.organization.create({
      data: {
        name: 'Test Clinic - Triage Queue',
        type: 'CLINIC',
        email: 'triage-test@clinmetrics.com',
        isActive: true
      }
    });
    console.log(`✓ Created organization: ${organization.name}\n`);
  } else {
    console.log(`✓ Using existing organization: ${organization.name}\n`);
  }

  // Get or create test clinician
  let clinician = await prisma.clinician.findFirst({
    where: {
      organizationId: organization.id,
      email: 'dr.triage@clinmetrics.com'
    }
  });

  if (!clinician) {
    console.log('Creating test clinician...');
    clinician = await prisma.clinician.create({
      data: {
        organizationId: organization.id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'dr.triage@clinmetrics.com',
        specialization: 'Internal Medicine',
        licenseNumber: 'MD-TRIAGE-001'
      }
    });
    console.log(`✓ Created clinician: Dr. ${clinician.firstName} ${clinician.lastName}\n`);
  } else {
    console.log(`✓ Using existing clinician: Dr. ${clinician.firstName} ${clinician.lastName}\n`);
  }

  // Get or create blood pressure metric
  let bpMetric = await prisma.metricDefinition.findFirst({
    where: {
      key: 'blood_pressure_systolic',
      organizationId: null // Standardized metric
    }
  });

  if (!bpMetric) {
    console.log('Creating blood pressure metric...');
    bpMetric = await prisma.metricDefinition.create({
      data: {
        key: 'blood_pressure_systolic',
        displayName: 'Blood Pressure (Systolic)',
        description: 'Systolic blood pressure in mmHg',
        unit: 'mmHg',
        valueType: 'numeric',
        category: 'Vital Signs',
        isStandardized: true,
        normalRange: {
          minValue: 90,
          maxValue: 120
        }
      }
    });
    console.log(`✓ Created metric: ${bpMetric.displayName}\n`);
  } else {
    console.log(`✓ Using existing metric: ${bpMetric.displayName}\n`);
  }

  // Get or create alert rule
  let alertRule = await prisma.alertRule.findFirst({
    where: {
      organizationId: organization.id,
      name: 'High Blood Pressure Alert'
    }
  });

  if (!alertRule) {
    console.log('Creating alert rule...');
    alertRule = await prisma.alertRule.create({
      data: {
        organizationId: organization.id,
        name: 'High Blood Pressure Alert',
        description: 'Triggers when systolic BP exceeds 140 mmHg',
        conditions: {
          metric: 'blood_pressure_systolic',
          operator: '>',
          threshold: 140
        },
        actions: {
          notify: true,
          escalate: false
        },
        severity: 'HIGH',
        priority: 5,
        isActive: true
      }
    });
    console.log(`✓ Created alert rule: ${alertRule.name}\n`);
  } else {
    console.log(`✓ Using existing alert rule: ${alertRule.name}\n`);
  }

  // Create test drug for medication adherence
  let drug = await prisma.drug.findFirst({
    where: { name: 'Lisinopril 10mg' }
  });

  if (!drug) {
    console.log('Creating test medication...');
    drug = await prisma.drug.create({
      data: {
        name: 'Lisinopril 10mg',
        genericName: 'Lisinopril',
        brandName: 'Prinivil',
        dosageForm: 'Tablet',
        strength: '10mg',
        manufacturer: 'Generic',
        ndcNumber: '12345-678-90',
        description: 'ACE inhibitor for hypertension',
        sideEffects: ['Dizziness', 'Dry cough', 'Headache'],
        contraindications: ['Pregnancy', 'Angioedema history'],
        interactions: ['NSAIDs', 'Potassium supplements']
      }
    });
    console.log(`✓ Created drug: ${drug.name}\n`);
  } else {
    console.log(`✓ Using existing drug: ${drug.name}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Creating Test Patients with Different Risk Profiles...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test Case 1: CRITICAL RISK - High BP deviation + worsening trend + poor adherence
  console.log('📋 Test Case 1: CRITICAL RISK PATIENT');
  const criticalPatient = await createPatient(organization.id, {
    firstName: 'John',
    lastName: 'Critical',
    email: 'john.critical@test.com',
    medicalRecordNumber: 'MRN-CRITICAL-001'
  });

  // Create worsening trend (consistently increasing BP readings)
  await createObservationTrend(criticalPatient.id, bpMetric.id, [160, 165, 170, 175, 180], 'CLINICAL_MONITORING');

  // Create poor medication adherence
  const criticalMedication = await createPatientMedication(criticalPatient.id, drug.id, 'Dr. Johnson');
  await createMedicationAdherence(criticalMedication.id, 0.35); // 35% adherence (poor)

  // Create CRITICAL alert
  const criticalAlert = await createAlert(
    organization.id,
    alertRule.id,
    criticalPatient.id,
    clinician.id,
    'CRITICAL',
    'Blood pressure critically high: 180 mmHg with worsening trend',
    { metricId: bpMetric.id, value: 180, threshold: 140 }
  );

  console.log(`  ✓ Created patient: ${criticalPatient.firstName} ${criticalPatient.lastName}`);
  console.log(`  ✓ BP trend: 160 → 165 → 170 → 175 → 180 mmHg (worsening)`);
  console.log(`  ✓ Medication adherence: 35% (poor)`);
  console.log(`  ✓ Alert severity: CRITICAL`);
  console.log(`  ✓ Expected risk score: 9-10 (highest priority)\n`);

  // Test Case 2: HIGH RISK - High BP deviation + stable trend + moderate adherence
  console.log('📋 Test Case 2: HIGH RISK PATIENT');
  const highPatient = await createPatient(organization.id, {
    firstName: 'Mary',
    lastName: 'HighRisk',
    email: 'mary.high@test.com',
    medicalRecordNumber: 'MRN-HIGH-001'
  });

  await createObservationTrend(highPatient.id, bpMetric.id, [155, 158, 156, 157, 160], 'CLINICAL_MONITORING');
  const highMedication = await createPatientMedication(highPatient.id, drug.id, 'Dr. Johnson');
  await createMedicationAdherence(highMedication.id, 0.65); // 65% adherence (moderate)

  const highAlert = await createAlert(
    organization.id,
    alertRule.id,
    highPatient.id,
    clinician.id,
    'HIGH',
    'Blood pressure elevated: 160 mmHg',
    { metricId: bpMetric.id, value: 160, threshold: 140 }
  );

  console.log(`  ✓ Created patient: ${highPatient.firstName} ${highPatient.lastName}`);
  console.log(`  ✓ BP trend: 155 → 158 → 156 → 157 → 160 mmHg (stable/slight increase)`);
  console.log(`  ✓ Medication adherence: 65% (moderate)`);
  console.log(`  ✓ Alert severity: HIGH`);
  console.log(`  ✓ Expected risk score: 6-8 (high priority)\n`);

  // Test Case 3: MEDIUM RISK - Moderate BP deviation + stable trend + good adherence
  console.log('📋 Test Case 3: MEDIUM RISK PATIENT');
  const mediumPatient = await createPatient(organization.id, {
    firstName: 'Robert',
    lastName: 'MediumRisk',
    email: 'robert.medium@test.com',
    medicalRecordNumber: 'MRN-MEDIUM-001'
  });

  await createObservationTrend(mediumPatient.id, bpMetric.id, [145, 143, 146, 144, 148], 'CLINICAL_MONITORING');
  const mediumMedication = await createPatientMedication(mediumPatient.id, drug.id, 'Dr. Johnson');
  await createMedicationAdherence(mediumMedication.id, 0.85); // 85% adherence (good)

  const mediumAlert = await createAlert(
    organization.id,
    alertRule.id,
    mediumPatient.id,
    clinician.id,
    'MEDIUM',
    'Blood pressure slightly elevated: 148 mmHg',
    { metricId: bpMetric.id, value: 148, threshold: 140 }
  );

  console.log(`  ✓ Created patient: ${mediumPatient.firstName} ${mediumPatient.lastName}`);
  console.log(`  ✓ BP trend: 145 → 143 → 146 → 144 → 148 mmHg (stable)`);
  console.log(`  ✓ Medication adherence: 85% (good)`);
  console.log(`  ✓ Alert severity: MEDIUM`);
  console.log(`  ✓ Expected risk score: 4-6 (medium priority)\n`);

  // Test Case 4: LOW RISK - Minimal deviation + decreasing trend + excellent adherence
  console.log('📋 Test Case 4: LOW RISK PATIENT');
  const lowPatient = await createPatient(organization.id, {
    firstName: 'Linda',
    lastName: 'LowRisk',
    email: 'linda.low@test.com',
    medicalRecordNumber: 'MRN-LOW-001'
  });

  await createObservationTrend(lowPatient.id, bpMetric.id, [150, 145, 143, 141, 142], 'CLINICAL_MONITORING');
  const lowMedication = await createPatientMedication(lowPatient.id, drug.id, 'Dr. Johnson');
  await createMedicationAdherence(lowMedication.id, 0.95); // 95% adherence (excellent)

  const lowAlert = await createAlert(
    organization.id,
    alertRule.id,
    lowPatient.id,
    clinician.id,
    'LOW',
    'Blood pressure borderline: 142 mmHg',
    { metricId: bpMetric.id, value: 142, threshold: 140 }
  );

  console.log(`  ✓ Created patient: ${lowPatient.firstName} ${lowPatient.lastName}`);
  console.log(`  ✓ BP trend: 150 → 145 → 143 → 141 → 142 mmHg (improving)`);
  console.log(`  ✓ Medication adherence: 95% (excellent)`);
  console.log(`  ✓ Alert severity: LOW`);
  console.log(`  ✓ Expected risk score: 0-4 (low priority)\n`);

  // Test Case 5: SLA BREACH TEST - Old alert (should show as breached)
  console.log('📋 Test Case 5: SLA BREACH TEST');
  const breachedPatient = await createPatient(organization.id, {
    firstName: 'Samuel',
    lastName: 'Breached',
    email: 'samuel.breached@test.com',
    medicalRecordNumber: 'MRN-BREACH-001'
  });

  await createObservationTrend(breachedPatient.id, bpMetric.id, [165, 168, 170, 172, 175], 'CLINICAL_MONITORING');
  const breachedMedication = await createPatientMedication(breachedPatient.id, drug.id, 'Dr. Johnson');
  await createMedicationAdherence(breachedMedication.id, 0.50);

  // Create alert with triggeredAt 3 hours ago (HIGH severity SLA is 2 hours)
  const breachedAlert = await createAlert(
    organization.id,
    alertRule.id,
    breachedPatient.id,
    clinician.id,
    'HIGH',
    'Blood pressure elevated: 175 mmHg - SLA BREACHED',
    { metricId: bpMetric.id, value: 175, threshold: 140 },
    new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
  );

  console.log(`  ✓ Created patient: ${breachedPatient.firstName} ${breachedPatient.lastName}`);
  console.log(`  ✓ Alert triggered: 3 hours ago`);
  console.log(`  ✓ SLA window: 2 hours (HIGH severity)`);
  console.log(`  ✓ Expected status: SLA BREACHED (red badge with animation)\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Calculating Risk Scores for All Alerts...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Calculate risk scores for all alerts
  const allAlerts = [criticalAlert, highAlert, mediumAlert, lowAlert, breachedAlert];

  for (const alert of allAlerts) {
    const riskData = await calculateAlertRiskScore(alert, bpMetric.id);

    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        riskScore: riskData.riskScore,
        slaBreachTime: riskData.slaBreachTime
      }
    });

    const patient = await prisma.patient.findUnique({
      where: { id: alert.patientId },
      select: { firstName: true, lastName: true }
    });

    console.log(`📊 ${patient.firstName} ${patient.lastName}:`);
    console.log(`   Risk Score: ${riskData.riskScore.toFixed(2)}/10`);
    console.log(`   Components:`);
    console.log(`     - Vitals Deviation: ${riskData.components.vitalsDeviation.toFixed(2)}/10`);
    console.log(`     - Trend Velocity: ${riskData.components.trendVelocity.toFixed(2)}/10`);
    console.log(`     - Adherence Penalty: ${riskData.components.adherencePenalty.toFixed(2)}/10`);
    console.log(`     - Severity Multiplier: ${riskData.components.severityMultiplier}x`);
    console.log(`   SLA Breach Time: ${riskData.slaBreachTime.toLocaleString()}`);

    const now = new Date();
    const timeRemaining = Math.floor((riskData.slaBreachTime - now) / (60 * 1000));
    if (timeRemaining < 0) {
      console.log(`   ⚠️  SLA Status: BREACHED (${Math.abs(timeRemaining)} minutes overdue)`);
    } else if (timeRemaining < 30) {
      console.log(`   ⚠️  SLA Status: APPROACHING (${timeRemaining} minutes remaining)`);
    } else {
      console.log(`   ✓ SLA Status: OK (${timeRemaining} minutes remaining)`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Calculating Priority Ranks...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Recalculate priority ranks
  const updatedCount = await recalculatePriorityRanks(organization.id);
  console.log(`✓ Updated priority ranks for ${updatedCount} alerts\n`);

  // Display final priority order
  const rankedAlerts = await prisma.alert.findMany({
    where: {
      organizationId: organization.id,
      status: 'PENDING'
    },
    orderBy: { priorityRank: 'asc' },
    include: {
      patient: {
        select: { firstName: true, lastName: true }
      }
    }
  });

  console.log('📊 Final Priority Order (Triage Queue):\n');
  rankedAlerts.forEach((alert, index) => {
    const riskLevel = alert.riskScore >= 8 ? '🔴 CRITICAL' :
                      alert.riskScore >= 6 ? '🟠 HIGH' :
                      alert.riskScore >= 4 ? '🟡 MEDIUM' : '🟢 LOW';

    console.log(`  #${alert.priorityRank} ${riskLevel} - ${alert.patient.firstName} ${alert.patient.lastName} (Risk: ${alert.riskScore.toFixed(2)})`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Triage Queue Test Data Created Successfully!\n');
  console.log('🌐 Access the Triage Queue at: http://localhost:5173/triage-queue\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Helper function to create a patient
async function createPatient(organizationId, data) {
  const existingPatient = await prisma.patient.findFirst({
    where: {
      organizationId,
      medicalRecordNumber: data.medicalRecordNumber
    }
  });

  if (existingPatient) {
    return existingPatient;
  }

  return prisma.patient.create({
    data: {
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date('1970-01-01'),
      gender: 'Male',
      email: data.email,
      phone: '555-0100',
      address: '123 Test St, Test City, TC 12345',
      medicalRecordNumber: data.medicalRecordNumber,
      insuranceInfo: {
        provider: 'Test Insurance',
        policyNumber: 'TEST-12345'
      }
    }
  });
}

// Helper function to create observation trend
async function createObservationTrend(patientId, metricId, values, context) {
  const now = new Date();

  for (let i = 0; i < values.length; i++) {
    const recordedAt = new Date(now.getTime() - (values.length - i) * 24 * 60 * 60 * 1000); // One per day going back

    await prisma.observation.upsert({
      where: {
        patientId_metricId_recordedAt: {
          patientId,
          metricId,
          recordedAt
        }
      },
      create: {
        patientId,
        metricId,
        value: values[i],
        unit: 'mmHg',
        source: 'MANUAL',
        context,
        recordedAt,
        organizationId: (await prisma.patient.findUnique({ where: { id: patientId } })).organizationId
      },
      update: {
        value: values[i]
      }
    });
  }
}

// Helper function to create patient medication
async function createPatientMedication(patientId, drugId, prescribedBy) {
  const existing = await prisma.patientMedication.findFirst({
    where: { patientId, drugId, isActive: true }
  });

  if (existing) {
    return existing;
  }

  return prisma.patientMedication.create({
    data: {
      patientId,
      drugId,
      prescribedBy,
      dosage: '10mg',
      frequency: 'Once daily',
      route: 'Oral',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Started 90 days ago
      isActive: true,
      instructions: 'Take once daily in the morning'
    }
  });
}

// Helper function to create medication adherence records
async function createMedicationAdherence(patientMedicationId, adherenceScore) {
  // Create 30 days of adherence records
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const takenAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    await prisma.medicationAdherence.upsert({
      where: {
        patientMedicationId_takenAt: {
          patientMedicationId,
          takenAt
        }
      },
      create: {
        patientMedicationId,
        takenAt,
        doseTaken: '10mg',
        adherenceScore,
        notes: adherenceScore >= 0.8 ? 'Taken as prescribed' : adherenceScore >= 0.6 ? 'Taken late' : 'Missed dose'
      },
      update: {
        adherenceScore
      }
    });
  }
}

// Helper function to create alert
async function createAlert(organizationId, ruleId, patientId, clinicianId, severity, message, data, triggeredAt = new Date()) {
  // Check if alert already exists
  const existing = await prisma.alert.findFirst({
    where: {
      organizationId,
      ruleId,
      patientId,
      status: 'PENDING'
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.alert.create({
    data: {
      organizationId,
      ruleId,
      patientId,
      clinicianId,
      severity,
      status: 'PENDING',
      message,
      data,
      triggeredAt
    }
  });
}

main()
  .catch((e) => {
    console.error('Error seeding triage queue test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
