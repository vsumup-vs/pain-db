const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDailyPainAlerts() {
  console.log('📅 Creating alerts as they would appear in production\n');

  // Clear existing alerts
  await prisma.alert.deleteMany({
    where: {
      patient: { firstName: 'Jennifer', lastName: 'Lee' }
    }
  });

  const jennifer = await prisma.patient.findFirst({
    where: { firstName: 'Jennifer', lastName: 'Lee' }
  });

  const clinician = await prisma.clinician.findFirst({
    where: { organizationId: jennifer.organizationId }
  });

  const criticalPainRule = await prisma.alertRule.findFirst({
    where: { name: 'Critical Pain Level Alert' }
  });

  const severePainRule = await prisma.alertRule.findFirst({
    where: { name: 'Severe Pain (Persistent)' }
  });

  console.log('Creating alerts for each day...\n');

  // Oct 19: First day alert
  await prisma.alert.create({
    data: {
      organizationId: jennifer.organizationId,
      patientId: jennifer.id,
      ruleId: criticalPainRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      message: 'Alert when pain score reaches 8 or higher: Pain Level (NRS 0-10) is 9',
      status: 'PENDING',
      riskScore: null,
      slaBreachTime: new Date('2025-10-19T12:00:00Z'), // 2 hours after trigger
      triggeredAt: new Date('2025-10-19T10:00:00Z')
    }
  });
  console.log('✅ Oct 19: Critical Pain Level Alert');

  // Oct 20: Second day alert
  await prisma.alert.create({
    data: {
      organizationId: jennifer.organizationId,
      patientId: jennifer.id,
      ruleId: criticalPainRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      message: 'Alert when pain score reaches 8 or higher: Pain Level (NRS 0-10) is 9',
      status: 'PENDING',
      riskScore: null,
      slaBreachTime: new Date('2025-10-20T12:00:00Z'),
      triggeredAt: new Date('2025-10-20T10:00:00Z')
    }
  });
  console.log('✅ Oct 20: Critical Pain Level Alert');

  // Oct 21: Third day alert + consecutive days alert
  await prisma.alert.create({
    data: {
      organizationId: jennifer.organizationId,
      patientId: jennifer.id,
      ruleId: criticalPainRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      message: 'Alert when pain score reaches 8 or higher: Pain Level (NRS 0-10) is 9',
      status: 'PENDING',
      riskScore: null,
      slaBreachTime: new Date('2025-10-21T12:00:00Z'),
      triggeredAt: new Date('2025-10-21T10:00:00Z')
    }
  });
  console.log('✅ Oct 21: Critical Pain Level Alert');

  await prisma.alert.create({
    data: {
      organizationId: jennifer.organizationId,
      patientId: jennifer.id,
      ruleId: severePainRule.id,
      clinicianId: clinician.id,
      severity: 'HIGH',
      message: 'Pain level >8/10 for 3+ consecutive days: Pain Level (NRS 0-10) is 9',
      status: 'PENDING',
      riskScore: null,
      slaBreachTime: new Date('2025-10-21T12:05:00Z'),
      triggeredAt: new Date('2025-10-21T10:05:00Z')
    }
  });
  console.log('✅ Oct 21: Severe Pain (Persistent)\n');

  // Show final count
  const alerts = await prisma.alert.findMany({
    where: { patientId: jennifer.id },
    include: {
      rule: { select: { name: true } }
    },
    orderBy: { triggeredAt: 'asc' }
  });

  console.log('='.repeat(80));
  console.log(`📊 Total Alerts: ${alerts.length}\n`);

  alerts.forEach((alert, i) => {
    const day = alert.triggeredAt.toISOString().split('T')[0];
    console.log(`${i + 1}. ${alert.severity.padEnd(8)} | ${day} | ${alert.rule.name}`);
  });

  console.log('\n✅ Alerts created as they would appear in production workflow!');

  await prisma.$disconnect();
}

createDailyPainAlerts().catch(console.error);
