const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAlertRules() {
  // Check all alert rules
  const allRules = await prisma.alertRule.findMany({
    include: {
      conditionPresets: {
        include: {
          conditionPreset: true
        }
      }
    }
  });
  
  console.log(`Total alert rules in database: ${allRules.length}\n`);
  
  allRules.forEach((rule, i) => {
    console.log(`${i+1}. ${rule.name}`);
    console.log(`   ID: ${rule.id}`);
    console.log(`   isActive: ${rule.isActive}`);
    console.log(`   severity: ${rule.severity}`);
    console.log(`   conditions:`, JSON.stringify(rule.conditions, null, 2));
    console.log(`   Linked to ${rule.conditionPresets.length} condition preset(s):`);
    rule.conditionPresets.forEach(cp => {
      console.log(`     - ${cp.conditionPreset?.name} (enabled: ${cp.isEnabled})`);
    });
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkAllAlertRules();
