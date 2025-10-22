const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAlerts() {
  console.log('Creating 3 new test alerts for continued testing...\n');

  // Get required IDs
  const testOrg = await prisma.organization.findFirst({
    where: { email: 'clinic@test.com' }
  });

  const johnDoe = await prisma.patient.findFirst({
    where: {
      firstName: 'John',
      lastName: 'Doe',
      organizationId: testOrg.id
    }
  });

  const sarahClinician = await prisma.clinician.findFirst({
    where: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      organizationId: testOrg.id
    }
  });

  // Find an existing alert rule to use
  let alertRule = await prisma.alertRule.findFirst({
    where: {
      organizationId: testOrg.id,
      isActive: true
    }
  });

  if (!alertRule) {
    console.log('No active alert rules found. Creating a test rule first...');

    // Create a generic test alert rule
    alertRule = await prisma.alertRule.create({
      data: {
        organization: { connect: { id: testOrg.id } },
        name: 'Test Alert Rule',
        description: 'Generic rule for test alerts',
        conditions: {
          type: 'THRESHOLD',
          operator: '>',
          value: 7
        },
        actions: {
          createAlert: true,
          severity: 'HIGH'
        },
        severity: 'HIGH',
        category: 'Clinical',
        isActive: true
      }
    });

    console.log('✅ Created test alert rule:', alertRule.id);
    console.log('');
  }

  console.log('Using:');
  console.log('- Organization:', testOrg.name, '(ID:', testOrg.id + ')');
  console.log('- Patient:', johnDoe.firstName, johnDoe.lastName, '(ID:', johnDoe.id + ')');
  console.log('- Clinician:', sarahClinician.firstName, sarahClinician.lastName, '(ID:', sarahClinician.id + ')');
  console.log('- Alert Rule:', alertRule.name, '(ID:', alertRule.id + ')');
  console.log('');

  // Create Alert 1: High Pain Level
  const alert1 = await prisma.alert.create({
    data: {
      organization: { connect: { id: testOrg.id } },
      patient: { connect: { id: johnDoe.id } },
      rule: { connect: { id: alertRule.id } },
      severity: 'HIGH',
      status: 'PENDING',
      message: '🧪 TEST: High Pain Level (8/10) - Patient reports severe pain',
      data: {
        metric: 'Pain Level',
        value: 8,
        threshold: 7,
        testScenario: 'High pain threshold breach for testing timer workflows'
      },
      triggeredAt: new Date(),
      riskScore: 7.5,
      priorityRank: 1
    }
  });

  console.log('✅ Created Alert 1:', alert1.id);
  console.log('   Message:', alert1.message);
  console.log('   Severity:', alert1.severity, '| Risk Score:', alert1.riskScore);
  console.log('');

  // Create Alert 2: Medication Adherence Issue
  const alert2 = await prisma.alert.create({
    data: {
      organization: { connect: { id: testOrg.id } },
      patient: { connect: { id: johnDoe.id } },
      rule: { connect: { id: alertRule.id } },
      severity: 'MEDIUM',
      status: 'PENDING',
      message: '🧪 TEST: Medication Adherence - 3 missed doses in past week',
      data: {
        metric: 'Medication Adherence',
        missedDoses: 3,
        totalDoses: 14,
        adherenceRate: 78.6,
        testScenario: 'Medication non-adherence for testing alert workflows'
      },
      triggeredAt: new Date(),
      riskScore: 5.5,
      priorityRank: 3
    }
  });

  console.log('✅ Created Alert 2:', alert2.id);
  console.log('   Message:', alert2.message);
  console.log('   Severity:', alert2.severity, '| Risk Score:', alert2.riskScore);
  console.log('');

  // Create Alert 3: Elevated Blood Pressure
  const alert3 = await prisma.alert.create({
    data: {
      organization: { connect: { id: testOrg.id } },
      patient: { connect: { id: johnDoe.id } },
      rule: { connect: { id: alertRule.id } },
      severity: 'HIGH',
      status: 'PENDING',
      message: '🧪 TEST: Elevated Blood Pressure - SBP 155 / DBP 98',
      data: {
        metric: 'Blood Pressure',
        systolic: 155,
        diastolic: 98,
        threshold: { systolic: 140, diastolic: 90 },
        testScenario: 'Hypertension threshold breach for testing resolution workflows'
      },
      triggeredAt: new Date(),
      riskScore: 8.0,
      priorityRank: 1
    }
  });

  console.log('✅ Created Alert 3:', alert3.id);
  console.log('   Message:', alert3.message);
  console.log('   Severity:', alert3.severity, '| Risk Score:', alert3.riskScore);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Successfully created 3 new test alerts for John Doe');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('These alerts are ready for testing:');
  console.log('1. Claim alerts to start timers');
  console.log('2. Test timer auto-stop when resolving');
  console.log('3. Verify enrollmentId linkage in TimeLogs');
  console.log('4. Check "Time logged" badge display');
  console.log('');
  console.log('✅ Separation of Duties Enforced:');
  console.log('   - clinic@test.com (admin) can NO LONGER resolve alerts');
  console.log('   - Only Sarah Johnson (clinician) can claim and resolve');

  await prisma.$disconnect();
}

createTestAlerts().catch(console.error);
