const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'sarah.johnson@clinictest.com' },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User Found:', user.email);
    console.log('User ID:', user.id);
    console.log('\n📋 Organizations and Roles:');

    user.userOrganizations.forEach(org => {
      console.log(`\n- Organization: ${org.organization.name}`);
      console.log(`  ID: ${org.organizationId}`);
      console.log(`  Role: ${org.role}`);
      console.log(`  Permissions:`, org.permissions);
    });

    // Check if user has ORG_ADMIN role
    const hasOrgAdmin = user.userOrganizations.some(org => org.role === 'ORG_ADMIN');

    console.log('\n🔐 Bulk Actions Access:');
    if (hasOrgAdmin) {
      console.log('✅ User HAS ORG_ADMIN role - Bulk actions should work');
    } else {
      console.log('❌ User DOES NOT have ORG_ADMIN role - Bulk actions will fail with 403');
      console.log('   Current role(s):', user.userOrganizations.map(o => o.role).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles();
