const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAlerts() {
  try {
    console.log('Creating test alerts...\n');

    // Get the first patient and clinician
    const patient = await prisma.patient.findFirst();
    const clinician = await prisma.clinician.findFirst();

    if (!patient) {
      console.log('❌ No patients found. Please create a patient first.');
      return;
    }

    if (!clinician) {
      console.log('❌ No clinicians found. Please create a clinician first.');
      return;
    }

    console.log(`Found patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})`);
    console.log(`Found clinician: ${clinician.firstName} ${clinician.lastName} (ID: ${clinician.id})\n`);

    // Get or create a metric definition
    let metric = await prisma.metricDefinition.findFirst({
      where: { organizationId: patient.organizationId }
    });

    if (!metric) {
      console.log('Creating test metric...');
      metric = await prisma.metricDefinition.create({
        data: {
          key: 'BP_SYSTOLIC',
          displayName: 'Blood Pressure - Systolic',
          valueType: 'numeric',
          organizationId: patient.organizationId,
          category: 'Vital Signs',
          unit: 'mmHg',
          description: 'Systolic blood pressure measurement'
        }
      });
      console.log(`✅ Created metric: ${metric.displayName}\n`);
    }

    // Get or create an alert rule
    let alertRule = await prisma.alertRule.findFirst({
      where: { organizationId: patient.organizationId }
    });

    if (!alertRule) {
      console.log('Creating test alert rule...');
      alertRule = await prisma.alertRule.create({
        data: {
          name: 'High Blood Pressure Alert',
          description: 'Alert when systolic BP exceeds 140',
          organizationId: patient.organizationId,
          metricId: metric.id,
          severity: 'HIGH',
          priority: 2,
          isActive: true,
          conditions: {
            threshold: 140,
            operator: 'greater_than'
          },
          actions: {
            notify: ['clinician']
          }
        }
      });
      console.log(`✅ Created alert rule: ${alertRule.name}\n`);
    }

    // Create test observation
    const observation = await prisma.observation.create({
      data: {
        patientId: patient.id,
        metricId: metric.id,
        organizationId: patient.organizationId,
        value: { numeric: 165 },
        source: 'MANUAL',
        recordedAt: new Date(),
        context: 'CLINICAL_MONITORING'
      }
    });
    console.log(`✅ Created observation with value: 165 mmHg\n`);

    // Create 3 test alerts with different statuses and severities
    console.log('Creating test alerts...');

    const alert1 = await prisma.alert.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        ruleId: alertRule.id,
        organizationId: patient.organizationId,
        severity: 'HIGH',
        status: 'PENDING',
        message: 'Systolic BP reading of 165 mmHg exceeds threshold of 140 mmHg',
        data: {
          observationId: observation.id,
          value: 165,
          threshold: 140
        }
      }
    });

    const alert2 = await prisma.alert.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        ruleId: alertRule.id,
        organizationId: patient.organizationId,
        severity: 'MEDIUM',
        status: 'PENDING',
        message: 'Patient missed scheduled assessment',
        data: {
          alertType: 'MISSED_ASSESSMENT'
        }
      }
    });

    const alert3 = await prisma.alert.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        ruleId: alertRule.id,
        organizationId: patient.organizationId,
        severity: 'CRITICAL',
        status: 'PENDING',
        message: 'Systolic BP reading of 180 mmHg - Critical threshold exceeded',
        data: {
          observationId: observation.id,
          value: 180,
          threshold: 140
        }
      }
    });

    console.log('\n✅ Successfully created 3 test alerts:\n');
    console.log(`  1. Alert ID: ${alert1.id}`);
    console.log(`     Severity: ${alert1.severity} | Status: ${alert1.status}`);
    console.log(`     Message: ${alert1.message}\n`);

    console.log(`  2. Alert ID: ${alert2.id}`);
    console.log(`     Severity: ${alert2.severity} | Status: ${alert2.status}`);
    console.log(`     Message: ${alert2.message}\n`);

    console.log(`  3. Alert ID: ${alert3.id}`);
    console.log(`     Severity: ${alert3.severity} | Status: ${alert3.status}`);
    console.log(`     Message: ${alert3.message}\n`);

    console.log('🎉 Test alerts are ready! Visit http://localhost:5174/triage-queue to test the workflow.');

  } catch (error) {
    console.error('❌ Error creating test alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAlerts();
