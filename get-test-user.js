const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTestUser() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      },
      take: 5
    });

    console.log('\n📋 Available test users:');
    users.forEach((u, i) => {
      const name = `${u.firstName || 'N/A'} ${u.lastName || 'N/A'}`;
      console.log(`  ${i+1}. ${u.email} (${name})`);
    });
    console.log('');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

getTestUser();
