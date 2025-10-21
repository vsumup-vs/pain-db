const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.update({
      where: { email: 'test@example.com' },
      data: {
        passwordHash: hashedPassword,
        isActive: true,
        emailVerified: new Date()
      }
    });

    console.log('✅ Password reset for test@example.com');
    console.log('   New password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
