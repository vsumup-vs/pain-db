const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlerts() {
  const alerts = await prisma.alert.findMany({
    include: {
      patient: { select: { firstName: true, lastName: true } },
      rule: { select: { name: true } }
    },
    orderBy: { triggeredAt: 'desc' },
    take: 5
  });
  
  console.log(`Found ${alerts.length} alerts in database:\n`);
  alerts.forEach((alert, i) => {
    console.log(`${i+1}. ${alert.rule.name} - ${alert.severity}`);
    console.log(`   Patient: ${alert.patient.firstName} ${alert.patient.lastName}`);
    console.log(`   Status: ${alert.status}`);
    console.log(`   Triggered: ${alert.triggeredAt}`);
    console.log(`   Message: ${alert.message}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkAlerts();
