const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'sse-test@example.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      await prisma.$disconnect();
      return;
    }

    // Hash the new password
    const newPassword = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    console.log('\n✅ Password reset successfully!');
    console.log('\n📧 Login Credentials:');
    console.log(`   Email: sse-test@example.com`);
    console.log(`   Password: TestPassword123!`);
    console.log('\n🌐 Login URL: http://localhost:5173/login\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

resetPassword();
