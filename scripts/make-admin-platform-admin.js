const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makePlatformAdmin() {
  const admin = await prisma.user.update({
    where: { email: 'admin@clinmetrics.com' },
    data: { isPlatformAdmin: true }
  });

  console.log(`✅ Updated ${admin.email} to Platform Admin`);
  console.log('   You can now access /admin/organizations');
  await prisma.$disconnect();
}

makePlatformAdmin().catch(console.error);
