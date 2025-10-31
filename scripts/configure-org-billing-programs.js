const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function configureOrgBillingPrograms() {
  console.log('\n=== Configuring Organization Supported Billing Programs ===\n');

  // Get Test Clinic
  const org = await prisma.organization.findFirst({
    where: { name: 'Test Clinic' }
  });

  if (!org) {
    console.error('❌ Test Clinic not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Organization: ${org.name} (${org.id})\n`);

  // Update organization settings to include supported billing programs
  const updatedOrg = await prisma.organization.update({
    where: { id: org.id },
    data: {
      settings: {
        supportedBillingPrograms: [
          'RPM',  // Remote Patient Monitoring
          'CCM'   // Chronic Care Management
          // NOT including RTM - clinic doesn't support it
        ],
        billing: {
          cptCodes: ['99453', '99454', '99457', '99458', '99490', '99491']
        },
        timezone: 'America/New_York'
      }
    }
  });

  console.log('✅ Updated organization settings:');
  console.log(JSON.stringify(updatedOrg.settings, null, 2));
  console.log('');

  console.log('Supported Programs: RPM, CCM');
  console.log('NOT Supported: RTM');
  console.log('');

  console.log('This means:');
  console.log('  ✅ Patients can be suggested RPM packages');
  console.log('  ✅ Patients can be suggested CCM packages');
  console.log('  ❌ Patients will NOT be suggested RTM packages');

  await prisma.$disconnect();
}

configureOrgBillingPrograms()
  .catch(console.error)
  .finally(() => process.exit(0));
