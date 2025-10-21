const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAlertData() {
  try {
    console.log('Setting up test data for snooze/suppress tests...\n');

    // Get test organization (use any existing organization)
    const org = await prisma.organization.findFirst({
      where: { isActive: true }
    });

    if (!org) {
      console.error('❌ No active organization found');
      return;
    }

    console.log('✅ Using organization:', org.name, `(${org.id})`);

    // Get or create test clinician
    let clinician = await prisma.clinician.findFirst({
      where: {
        organizationId: org.id,
        email: 'test@example.com'
      }
    });

    if (!clinician) {
      clinician = await prisma.clinician.create({
        data: {
          organizationId: org.id,
          firstName: 'Test',
          lastName: 'Clinician',
          email: 'test@example.com',
          specialization: 'General Practice'
        }
      });
      console.log('✅ Created test clinician:', clinician.id);
    } else {
      console.log('✅ Using existing clinician:', clinician.id);
    }

    // Create test patient
    let patient = await prisma.patient.findFirst({
      where: {
        organizationId: org.id,
        email: 'patient@test.com'
      }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          organizationId: org.id,
          firstName: 'John',
          lastName: 'TestPatient',
          dateOfBirth: new Date('1980-01-01'),
          email: 'patient@test.com',
          phone: '555-0123'
        }
      });
      console.log('✅ Created test patient:', patient.id);
    } else {
      console.log('✅ Using existing patient:', patient.id);
    }

    // Create test alert rule
    let alertRule = await prisma.alertRule.findFirst({
      where: {
        organizationId: org.id,
        name: 'Test Snooze Alert Rule'
      }
    });

    if (!alertRule) {
      alertRule = await prisma.alertRule.create({
        data: {
          organizationId: org.id,
          name: 'Test Snooze Alert Rule',
          description: 'Test alert for snooze/suppress functionality',
          conditions: {
            type: 'THRESHOLD',
            metric: 'pain_level',
            operator: '>',
            value: 7
          },
          actions: {
            notifyAssignedClinician: true
          },
          severity: 'MEDIUM',
          priority: 5,
          isActive: true,
          category: 'Pain Management'
        }
      });
      console.log('✅ Created test alert rule:', alertRule.id);
    } else {
      console.log('✅ Using existing alert rule:', alertRule.id);
    }

    // Create test alerts
    const alertsToCreate = [
      {
        message: 'Test alert for snooze functionality',
        severity: 'MEDIUM',
        priorityRank: 5
      },
      {
        message: 'Test alert for suppress functionality',
        severity: 'LOW',
        priorityRank: 3
      },
      {
        message: 'Test alert for validation tests',
        severity: 'HIGH',
        priorityRank: 7
      }
    ];

    console.log('\nCreating test alerts...');
    const createdAlerts = [];

    for (const alertData of alertsToCreate) {
      const alert = await prisma.alert.create({
        data: {
          organizationId: org.id,
          patientId: patient.id,
          ruleId: alertRule.id,
          status: 'PENDING',
          severity: alertData.severity,
          priorityRank: alertData.priorityRank,
          message: alertData.message,
          data: { test: true },
          triggeredAt: new Date()
        }
      });
      createdAlerts.push(alert);
      console.log(`✅ Created alert: ${alert.id} - ${alert.message}`);
    }

    console.log('\n✅ Test data setup complete!');
    console.log('\nTest Data Summary:');
    console.log('- Organization ID:', org.id);
    console.log('- Patient ID:', patient.id);
    console.log('- Clinician ID:', clinician.id);
    console.log('- Alert Rule ID:', alertRule.id);
    console.log('- Created Alerts:', createdAlerts.length);
    console.log('\nAlert IDs for testing:');
    createdAlerts.forEach((alert, i) => {
      console.log(`  ${i + 1}. ${alert.id} - ${alert.message}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAlertData();
