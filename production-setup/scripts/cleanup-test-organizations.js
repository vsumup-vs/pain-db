const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cleanup Test Organizations
 *
 * Removes all test organizations (except PLATFORM organization)
 * Use this to clean up development/testing artifacts.
 */

async function cleanupTestOrganizations() {
  try {
    console.log('🧹 Cleaning up test organizations...\n');

    // Find all non-PLATFORM organizations
    const testOrgs = await prisma.organization.findMany({
      where: {
        type: {
          not: 'PLATFORM'
        }
      },
      include: {
        _count: {
          select: {
            patients: true,
            clinicians: true,
            enrollments: true,
            users: true
          }
        }
      }
    });

    if (testOrgs.length === 0) {
      console.log('✅ No test organizations found. Database is clean.');
      return;
    }

    console.log(`Found ${testOrgs.length} test organizations:\n`);
    testOrgs.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name} (${org.type})`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Patients: ${org._count.patients}`);
      console.log(`   Clinicians: ${org._count.clinicians}`);
      console.log(`   Enrollments: ${org._count.enrollments}`);
      console.log(`   Users: ${org._count.users}`);
      console.log('');
    });

    // Confirmation prompt (in Node.js, we'll just warn)
    console.log('⚠️  WARNING: This will delete all listed organizations and related data!');
    console.log('⚠️  Press Ctrl+C to abort or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete organizations (cascade will handle related data)
    for (const org of testOrgs) {
      console.log(`Deleting: ${org.name}...`);

      // Delete user-organization assignments first
      await prisma.userOrganization.deleteMany({
        where: { organizationId: org.id }
      });

      // Delete organization (Prisma cascade will delete related data)
      await prisma.organization.delete({
        where: { id: org.id }
      });

      console.log(`   ✅ Deleted`);
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`   Removed ${testOrgs.length} organizations`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestOrganizations()
  .catch(console.error);
