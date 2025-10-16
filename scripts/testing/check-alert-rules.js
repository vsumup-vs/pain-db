const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlertRules() {
  const patientId = 'cmgqm8pfx006k7krvkb5ne0vc';
  
  // Get the patient's enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      patientId,
      status: 'ACTIVE'
    },
    include: {
      conditionPreset: {
        include: {
          alertRules: {
            include: {
              rule: true
            }
          }
        }
      }
    }
  });
  
  console.log('Enrollment:', {
    id: enrollment?.id,
    conditionPresetId: enrollment?.conditionPresetId,
    conditionPresetName: enrollment?.conditionPreset?.name
  });
  
  console.log('\nAlert Rules linked to this condition preset:');
  if (enrollment?.conditionPreset?.alertRules) {
    console.log(`Found ${enrollment.conditionPreset.alertRules.length} alert rules`);
    enrollment.conditionPreset.alertRules.forEach((ar, i) => {
      console.log(`\n${i+1}. ${ar.rule.name}`);
      console.log(`   ID: ${ar.rule.id}`);
      console.log(`   isActive: ${ar.rule.isActive}`);
      console.log(`   isEnabled: ${ar.isEnabled}`);
      console.log(`   conditions:`, JSON.stringify(ar.rule.conditions, null, 2));
    });
  } else {
    console.log('None found!');
  }
  
  // Also check global alert rules
  const globalRules = await prisma.alertRule.findMany({
    where: {
      OR: [
        { organizationId: null },
        { organizationId: enrollment.organizationId }
      ],
      isActive: true
    }
  });
  
  console.log(`\nGlobal alert rules: ${globalRules.length}`);
  globalRules.forEach((rule, i) => {
    console.log(`${i+1}. ${rule.name} - ${rule.isActive ? 'ACTIVE' : 'INACTIVE'}`);
  });
  
  await prisma.$disconnect();
}

checkAlertRules();
