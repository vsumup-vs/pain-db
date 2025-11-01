const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cleanup Test Users
 *
 * Removes all test users (except Platform Admin)
 * Use this to clean up development/testing artifacts.
 */

async function cleanupTestUsers() {
  try {
    console.log('🧹 Cleaning up test users...\n');

    // Find all non-platform-admin users
    const testUsers = await prisma.user.findMany({
      where: {
        AND: [
          { email: { not: 'admin@vitaledge.com' } },
          { isPlatformAdmin: { not: true } }
        ]
      },
      include: {
        organizations: true,
        _count: {
          select: {
            auditLogs: true,
            timeLogs: true
          }
        }
      }
    });

    if (testUsers.length === 0) {
      console.log('✅ No test users found. Database is clean.');
      return;
    }

    console.log(`Found ${testUsers.length} test users:\n`);
    testUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email} (${user.firstName} ${user.lastName})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Organizations: ${user.organizations.length}`);
      console.log(`   Audit Logs: ${user._count.auditLogs}`);
      console.log(`   Time Logs: ${user._count.timeLogs}`);
      console.log('');
    });

    console.log('⚠️  WARNING: This will delete all listed users!');
    console.log('⚠️  Press Ctrl+C to abort or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete users
    for (const user of testUsers) {
      console.log(`Deleting: ${user.email}...`);

      // Delete user-organization assignments
      await prisma.userOrganization.deleteMany({
        where: { userId: user.id }
      });

      // Delete user (cascade will handle related data)
      await prisma.user.delete({
        where: { id: user.id }
      });

      console.log(`   ✅ Deleted`);
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`   Removed ${testUsers.length} users`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestUsers()
  .catch(console.error);
