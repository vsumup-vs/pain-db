const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Create Platform Admin User
 *
 * This user will be assigned to the PLATFORM organization
 * with platform-level permissions ONLY (no patient care operations).
 */
async function createPlatformAdmin() {
  try {
    console.log('👤 Creating Platform Admin User...\n');

    const email = 'admin@vitaledge.com';
    const password = 'Admin123!';

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('✅ Platform Admin user already exists!');
      console.log('   User ID:', existing.id);
      console.log('   Email:', existing.email);

      // Ensure isPlatformAdmin flag is set
      await prisma.user.update({
        where: { id: existing.id },
        data: { isPlatformAdmin: true }
      });

      console.log('   Updated isPlatformAdmin flag: true');
      return;
    }

    // Create new platform admin user
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Platform',
        lastName: 'Administrator',
        emailVerified: new Date(),
        mfaEnabled: false,
        isPlatformAdmin: true  // Mark as platform admin
      }
    });

    console.log('✅ Platform Admin Created!');
    console.log('   User ID:', admin.id);
    console.log('   Email:', admin.email);
    console.log('   isPlatformAdmin: true');
    console.log('\n📋 Credentials (save securely):');
    console.log('   Email: admin@vitaledge.com');
    console.log('   Password: Admin123!');
    console.log('\n⚠️  IMPORTANT: Change password after first login!');
    console.log('\nNext step: Run node 5-setup-platform-org.js');

  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPlatformAdmin()
  .catch(console.error);
