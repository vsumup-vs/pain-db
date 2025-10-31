const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBillingProgramStructure() {
  console.log('\n=== Billing Package Templates - Program Structure ===\n');

  const templates = await prisma.billingPackageTemplate.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      programCombinations: true,
      organizationId: true
    }
  });

  console.log(`Total Active Templates: ${templates.length}\n`);

  templates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   Code: ${t.code}`);
    console.log(`   Organization: ${t.organizationId || 'Platform-wide'}`);
    console.log(`   Program Combinations: ${JSON.stringify(t.programCombinations, null, 2)}`);
    console.log('');
  });

  console.log('\n=== Organization Billing Settings ===\n');

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      settings: true
    }
  });

  orgs.forEach((org, i) => {
    console.log(`${i + 1}. ${org.name}`);
    console.log(`   Settings: ${JSON.stringify(org.settings, null, 2)}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkBillingProgramStructure()
  .catch(console.error)
  .finally(() => process.exit(0));
