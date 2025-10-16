const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAndRecreate() {
  // Delete all existing alert rules
  await prisma.conditionPresetAlertRule.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.alertRule.deleteMany({});
  console.log('✅ Deleted existing alert rules\n');
  await prisma.$disconnect();
}

deleteAndRecreate();
