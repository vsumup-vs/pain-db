const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAlerts() {
  console.log('🚨 Creating Test Alerts for Timer Testing...\n');

  // Find Sarah Johnson (clinician) and John Doe (patient)
  const clinician = await prisma.clinician.findFirst({
    where: {
      email: 'sarah.johnson@clinictest.com'
    }
  });

  const patient = await prisma.patient.findFirst({
    where: {
      firstName: 'John',
      lastName: 'Doe'
    }
  });

  if (!clinician || !patient) {
    console.log('❌ Could not find clinician or patient');
    return;
  }

  console.log(`👨‍⚕️ Clinician: ${clinician.firstName} ${clinician.lastName}`);
  console.log(`👤 Patient: ${patient.firstName} ${patient.lastName}\n`);

  // Get an alert rule (standardized or org-specific)
  const alertRule = await prisma.alertRule.findFirst({
    where: {
      OR: [
        { organizationId: patient.organizationId },
        { organizationId: null } // Standardized rules
      ],
      isActive: true
    }
  });

  if (!alertRule) {
    console.log('❌ No alert rule found');
    return;
  }

  // Create 3 test alerts
  const alerts = [];

  // Alert 1: Test manual resolution (without timer)
  const alert1 = await prisma.alert.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      ruleId: alertRule.id,
      severity: 'MEDIUM',
      status: 'PENDING',
      message: '🧪 TEST ALERT 1: Resolve WITHOUT timer (manual time entry)',
      data: {
        test: true,
        scenario: 'manual_resolution',
        instructions: 'Claim this alert, then click Resolve Alert and manually enter time'
      },
      riskScore: 5.0,
      priorityRank: 100,
      slaBreachTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    }
  });

  alerts.push(alert1);
  console.log(`✅ Alert 1 created: ${alert1.id}`);
  console.log(`   Scenario: Manual resolution WITHOUT timer`);
  console.log(`   Test: Claim → Resolve Alert → Enter time manually\n`);

  // Alert 2: Test timer stop & document (independent from resolution)
  const alert2 = await prisma.alert.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      ruleId: alertRule.id,
      severity: 'HIGH',
      status: 'PENDING',
      message: '🧪 TEST ALERT 2: Timer Stop & Document (independent flow)',
      data: {
        test: true,
        scenario: 'independent_timer_stop',
        instructions: 'Claim this alert (timer starts), then click Stop & Document in TimerWidget WITHOUT resolving'
      },
      riskScore: 7.5,
      priorityRank: 200,
      slaBreachTime: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
    }
  });

  alerts.push(alert2);
  console.log(`✅ Alert 2 created: ${alert2.id}`);
  console.log(`   Scenario: Timer Stop & Document INDEPENDENTLY`);
  console.log(`   Test: Claim → Wait for timer → Stop & Document (DO NOT resolve alert)\n`);

  // Alert 3: Test timer auto-stop on resolution
  const alert3 = await prisma.alert.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      ruleId: alertRule.id,
      severity: 'LOW',
      status: 'PENDING',
      message: '🧪 TEST ALERT 3: Resolve with active timer (auto-stop)',
      data: {
        test: true,
        scenario: 'auto_timer_stop_on_resolution',
        instructions: 'Claim this alert (timer starts), then click Resolve Alert WITHOUT stopping timer first'
      },
      riskScore: 3.0,
      priorityRank: 300,
      slaBreachTime: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    }
  });

  alerts.push(alert3);
  console.log(`✅ Alert 3 created: ${alert3.id}`);
  console.log(`   Scenario: Auto-stop timer when resolving alert`);
  console.log(`   Test: Claim → Wait for timer → Resolve Alert (timer should auto-stop)\n`);

  console.log('📋 Test Plan:\n');
  console.log('1️⃣  Alert 1: Test manual time entry in Resolve Alert modal');
  console.log('    - Expected: MANUAL TimeLog created');
  console.log('    - Expected: No timer running');
  console.log('');
  console.log('2️⃣  Alert 2: Test independent Timer Stop & Document');
  console.log('    - Expected: AUTO TimeLog created');
  console.log('    - Expected: Timer stops');
  console.log('    - Expected: Alert remains PENDING (NOT resolved)');
  console.log('');
  console.log('3️⃣  Alert 3: Test auto-stop timer on resolution');
  console.log('    - Expected: Timer auto-stops');
  console.log('    - Expected: Time copied to resolution modal');
  console.log('    - Expected: AUTO TimeLog OR integration with resolution?');
  console.log('');

  await prisma.$disconnect();
}

createTestAlerts().catch(console.error);
