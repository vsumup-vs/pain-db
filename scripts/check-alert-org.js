const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlertOrganization() {
  // Find the most recent resolved John Smith alert
  const johnSmith = await prisma.patient.findFirst({
    where: {
      firstName: 'John',
      lastName: 'Smith'
    }
  });

  if (!johnSmith) {
    console.log('❌ John Smith not found');
    return;
  }

  const recentAlert = await prisma.alert.findFirst({
    where: {
      patientId: johnSmith.id,
      status: 'RESOLVED'
    },
    orderBy: {
      resolvedAt: 'desc'
    },
    include: {
      patient: {
        include: {
          organization: true
        }
      }
    }
  });

  if (!recentAlert) {
    console.log('❌ No resolved alerts found for John Smith');
    return;
  }

  console.log('=== Most Recent Resolved Alert ===');
  console.log('Alert ID:', recentAlert.id);
  console.log('Alert Organization ID:', recentAlert.organizationId);
  console.log('');
  console.log('=== Patient Info ===');
  console.log('Patient ID:', recentAlert.patient.id);
  console.log('Patient Name:', `${recentAlert.patient.firstName} ${recentAlert.patient.lastName}`);
  console.log('Patient Organization ID:', recentAlert.patient.organizationId);
  console.log('Patient Org Name:', recentAlert.patient.organization?.name || 'N/A');
  console.log('');
  console.log('=== Organization Match ===');
  if (recentAlert.organizationId === recentAlert.patient.organizationId) {
    console.log('✅ Alert and Patient organizations MATCH');
  } else {
    console.log('❌ Alert and Patient organizations MISMATCH!');
    console.log('   Alert Org ID:', recentAlert.organizationId);
    console.log('   Patient Org ID:', recentAlert.patient.organizationId);
  }

  await prisma.$disconnect();
}

checkAlertOrganization().catch(console.error);
