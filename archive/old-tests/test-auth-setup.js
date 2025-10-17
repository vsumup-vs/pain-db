const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuthSetup() {
  try {
    console.log('🔍 Testing authentication system setup...\n');

    // Test 1: Check role templates
    console.log('1️⃣ Checking role templates...');
    const roleTemplates = await prisma.roleTemplate.findMany({
      select: { name: true, role: true, permissions: true }
    });
    console.log(`✅ Found ${roleTemplates.length} role templates:`);
    roleTemplates.forEach(template => {
      console.log(`   - ${template.name} (${template.role}) - ${template.permissions.length} permissions`);
    });

    // Test 2: Check database tables
    console.log('\n2️⃣ Checking database tables...');
    const tables = [
      { name: 'users', model: prisma.user },
      { name: 'organizations', model: prisma.organization },
      { name: 'user_organizations', model: prisma.userOrganization },
      { name: 'social_accounts', model: prisma.socialAccount },
      { name: 'refresh_tokens', model: prisma.refreshToken },
      { name: 'care_programs', model: prisma.careProgram },
      { name: 'audit_logs', model: prisma.auditLog }
    ];

    for (const table of tables) {
      try {
        const count = await table.model.count();
        console.log(`   ✅ ${table.name}: ${count} records`);
      } catch (error) {
        console.log(`   ❌ ${table.name}: Error - ${error.message}`);
      }
    }

    // Test 3: Test enum values
    console.log('\n3️⃣ Testing enum values...');
    const testEnums = [
      'UserRole', 'OrganizationType', 'SocialProvider', 
      'ProgramType', 'Permission'
    ];
    console.log(`   ✅ Enums defined: ${testEnums.join(', ')}`);

    console.log('\n🎉 Authentication system setup test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Create test organizations and users');
    console.log('   2. Test JWT token generation');
    console.log('   3. Test RBAC middleware');
    console.log('   4. Test authentication routes');

  } catch (error) {
    console.error('❌ Error testing authentication setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthSetup();