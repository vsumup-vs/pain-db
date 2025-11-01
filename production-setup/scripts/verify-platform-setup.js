const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verification Script - Platform Admin Setup
 *
 * Verifies that Platform Admin setup is correct:
 * 1. Platform Admin user exists
 * 2. PLATFORM organization exists
 * 3. User assigned to PLATFORM org with correct permissions
 * 4. Standardized library seeded
 * 5. Billing programs seeded
 */

async function verifyPlatformSetup() {
  console.log('🔍 Verifying Platform Admin Setup...\n');

  try {
    // 1. Verify Platform Admin User
    console.log('1. Checking Platform Admin User...');
    const platformAdmin = await prisma.user.findUnique({
      where: { email: 'admin@vitaledge.com' },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!platformAdmin) {
      console.log('   ❌ Platform Admin user NOT found');
      console.log('   Run: node production-setup/scripts/4-create-platform-admin.js');
      return;
    }

    console.log(`   ✅ Platform Admin user found: ${platformAdmin.email}`);
    console.log(`   User ID: ${platformAdmin.id}`);
    console.log(`   isPlatformAdmin: ${platformAdmin.isPlatformAdmin}`);

    // 2. Verify PLATFORM Organization
    console.log('\n2. Checking PLATFORM Organization...');
    const platformOrg = await prisma.organization.findFirst({
      where: {
        type: 'PLATFORM'
      }
    });

    if (!platformOrg) {
      console.log('   ❌ PLATFORM organization NOT found');
      console.log('   Run: node production-setup/scripts/5-setup-platform-org.js');
      return;
    }

    console.log(`   ✅ PLATFORM organization found: ${platformOrg.name}`);
    console.log(`   Org ID: ${platformOrg.id}`);
    console.log(`   Type: ${platformOrg.type}`);
    console.log(`   Email: ${platformOrg.email}`);

    // 3. Verify User-Organization Assignment
    console.log('\n3. Checking User-Organization Assignment...');
    const userOrg = platformAdmin.userOrganizations.find(
      uo => uo.organizationId === platformOrg.id
    );

    if (!userOrg) {
      console.log('   ❌ Platform Admin NOT assigned to PLATFORM organization');
      console.log('   Run: node production-setup/scripts/5-setup-platform-org.js');
      return;
    }

    console.log(`   ✅ Platform Admin assigned to PLATFORM organization`);
    console.log(`   Assignment ID: ${userOrg.id}`);
    console.log(`   Role: ${userOrg.role}`);
    console.log(`   Permissions Count: ${userOrg.permissions.length}`);

    // 4. Verify Permissions
    console.log('\n4. Checking Platform-Level Permissions...');
    const expectedPlatformPermissions = [
      'PLATFORM_ORG_CREATE',
      'PLATFORM_ORG_READ',
      'PLATFORM_ORG_UPDATE',
      'PLATFORM_ORG_DELETE',
      'PLATFORM_USER_MANAGE',
      'PLATFORM_BILLING_READ',
      'PLATFORM_BILLING_MANAGE',
      'PLATFORM_SUPPORT_READ',
      'PLATFORM_SUPPORT_MANAGE',
      'PLATFORM_ANALYTICS_READ',
      'PLATFORM_SETTINGS_MANAGE',
      'METRIC_CREATE',
      'METRIC_READ',
      'METRIC_UPDATE',
      'METRIC_DELETE',
      'SYSTEM_ADMIN'
    ];

    const missingPermissions = expectedPlatformPermissions.filter(
      p => !userOrg.permissions.includes(p)
    );

    const unexpectedPermissions = userOrg.permissions.filter(
      p => !expectedPlatformPermissions.includes(p)
    );

    if (missingPermissions.length > 0) {
      console.log(`   ⚠️  Missing ${missingPermissions.length} permissions:`);
      missingPermissions.forEach(p => console.log(`      - ${p}`));
    }

    if (unexpectedPermissions.length > 0) {
      console.log(`   ⚠️  Unexpected ${unexpectedPermissions.length} permissions (should be platform-only):`);
      unexpectedPermissions.forEach(p => console.log(`      - ${p}`));
    }

    if (missingPermissions.length === 0 && unexpectedPermissions.length === 0) {
      console.log(`   ✅ All ${expectedPlatformPermissions.length} platform-level permissions assigned correctly`);
      console.log('\n   Platform Permissions:');
      expectedPlatformPermissions.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p}`);
      });
    }

    // 5. Verify Billing Programs
    console.log('\n5. Checking Billing Programs...');
    const billingPrograms = await prisma.billingProgram.count();
    const cptCodes = await prisma.billingCPTCode.count();
    const eligibilityRules = await prisma.billingEligibilityRule.count();

    if (billingPrograms === 0) {
      console.log('   ❌ No billing programs found');
      console.log('   Run: npm run seed:billing-programs');
    } else {
      console.log(`   ✅ Billing programs seeded: ${billingPrograms} programs, ${cptCodes} CPT codes, ${eligibilityRules} eligibility rules`);

      const programs = await prisma.billingProgram.findMany({
        select: {
          code: true,
          name: true,
          isActive: true
        }
      });

      programs.forEach(p => {
        console.log(`      - ${p.code} (${p.isActive ? 'Active' : 'Inactive'})`);
      });
    }

    // 6. Verify Standardized Library
    console.log('\n6. Checking Standardized Library...');
    const conditionPresets = await prisma.conditionPreset.count({
      where: { isStandardized: true }
    });
    const metrics = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });
    const templates = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    const alertRules = await prisma.alertRule.count({
      where: { isStandardized: true }
    });

    if (conditionPresets === 0 && metrics === 0 && templates === 0 && alertRules === 0) {
      console.log('   ❌ Standardized library not seeded');
      console.log('   Run: npm run seed:production');
    } else {
      console.log(`   ✅ Standardized library seeded:`);
      console.log(`      - Condition Presets: ${conditionPresets}`);
      console.log(`      - Metrics: ${metrics}`);
      console.log(`      - Assessment Templates: ${templates}`);
      console.log(`      - Alert Rules: ${alertRules}`);
    }

    // 7. Check for incorrect HOSPITAL organizations
    console.log('\n7. Checking for incorrect organization setup...');
    const incorrectOrgs = await prisma.organization.findMany({
      where: {
        type: 'HOSPITAL',
        name: { contains: 'Platform' }
      }
    });

    if (incorrectOrgs.length > 0) {
      console.log(`   ⚠️  Found ${incorrectOrgs.length} incorrect HOSPITAL organization(s) for Platform Admin:`);
      incorrectOrgs.forEach(org => {
        console.log(`      - ${org.name} (${org.id}) - Type: ${org.type}`);
      });
      console.log('   Run: node production-setup/scripts/5-setup-platform-org.js to fix');
    } else {
      console.log('   ✅ No incorrect HOSPITAL organizations found');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Platform Admin Setup Verification Complete');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. Login as Platform Admin:');
    console.log('   - URL: http://localhost:5173');
    console.log('   - Email: admin@vitaledge.com');
    console.log('   - Password: Admin123!');
    console.log('\n2. Verify correct menu items appear:');
    console.log('   ✓ Organizations');
    console.log('   ✓ Analytics (Platform-wide)');
    console.log('   ✓ Support');
    console.log('   ✓ Settings');
    console.log('\n3. Verify patient care features are NOT available:');
    console.log('   ✗ Patients');
    console.log('   ✗ Clinicians');
    console.log('   ✗ Alerts/Triage Queue');
    console.log('   ✗ Enrollments');
    console.log('\n4. Create first client organization via UI');
    console.log('5. Begin E2E testing workflow');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyPlatformSetup()
  .catch(console.error);
