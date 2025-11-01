const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Setup PLATFORM Organization and Assign Platform Admin
 *
 * This script:
 * 1. Deletes any existing incorrect HOSPITAL organizations for Platform Admin
 * 2. Creates a PLATFORM type organization (SaaS provider)
 * 3. Assigns Platform Admin user with ONLY platform-level permissions
 *
 * CRITICAL: Platform Admin should NOT have patient care permissions!
 * Platform Admin manages client organizations, standardized library, and support.
 */

async function setupPlatformOrganization() {
  try {
    console.log('🏢 Setting up PLATFORM Organization...\n');

    // Get Platform Admin user
    const platformAdmin = await prisma.user.findUnique({
      where: { email: 'admin@vitaledge.com' },
      include: {
        userOrganizations: true  // Fixed: use correct relationship name
      }
    });

    if (!platformAdmin) {
      console.error('❌ Platform Admin user not found!');
      console.log('   Please run: node 4-create-platform-admin.js first');
      return;
    }

    console.log('✅ Found Platform Admin user:', platformAdmin.email);
    console.log('   User ID:', platformAdmin.id);

    // Delete any existing HOSPITAL organizations for Platform Admin
    if (platformAdmin.userOrganizations.length > 0) {
      console.log('\n🗑️  Cleaning up existing incorrect organizations...');

      for (const userOrg of platformAdmin.userOrganizations) {
        const org = await prisma.organization.findUnique({
          where: { id: userOrg.organizationId }
        });

        if (org && org.type === 'HOSPITAL') {
          console.log(`   Deleting HOSPITAL organization: ${org.name} (${org.id})`);

          // Delete user-organization assignment
          await prisma.userOrganization.delete({
            where: { id: userOrg.id }
          });

          // Delete organization
          await prisma.organization.delete({
            where: { id: org.id }
          });

          console.log('   ✅ Deleted');
        }
      }
    }

    // Check if PLATFORM organization already exists
    let platformOrg = await prisma.organization.findFirst({
      where: {
        type: 'PLATFORM',
        name: { contains: 'VitalEdge Platform' }
      }
    });

    if (platformOrg) {
      console.log('\n✅ PLATFORM organization already exists!');
      console.log('   Org ID:', platformOrg.id);
      console.log('   Org Name:', platformOrg.name);
      console.log('   Org Type:', platformOrg.type);
    } else {
      // Create PLATFORM organization
      console.log('\n🏗️  Creating PLATFORM organization...');

      platformOrg = await prisma.organization.create({
        data: {
          name: 'VitalEdge Platform Administration',
          type: 'PLATFORM', // ✅ CORRECT - SaaS provider organization type
          email: 'support@vitaledge.com',
          phone: '+1-800-VITALEDGE',
          address: '123 Platform Way, San Francisco, CA 94105, USA',
          website: 'https://vitaledge.com',
          settings: {
            branding: {
              primaryColor: '#3B82F6',
              logoUrl: '/assets/vitaledge-logo.png'
            },
            platform: {
              supportEmail: 'support@vitaledge.com',
              salesEmail: 'sales@vitaledge.com',
              documentationUrl: 'https://docs.vitaledge.com'
            }
          }
        }
      });

      console.log('✅ PLATFORM organization created!');
      console.log('   Org ID:', platformOrg.id);
      console.log('   Org Name:', platformOrg.name);
      console.log('   Org Type:', platformOrg.type);
    }

    // Check if user already assigned to PLATFORM organization
    const existingAssignment = await prisma.userOrganization.findFirst({
      where: {
        userId: platformAdmin.id,
        organizationId: platformOrg.id
      }
    });

    if (existingAssignment) {
      console.log('\n✅ Platform Admin already assigned to PLATFORM organization!');
      console.log('   Assignment ID:', existingAssignment.id);
      console.log('   Role:', existingAssignment.role);
      console.log('   Permissions:', existingAssignment.permissions.length);
      return;
    }

    // Assign Platform Admin with ONLY platform-level permissions
    console.log('\n👤 Assigning Platform Admin to PLATFORM organization...');

    // ✅ CORRECT: Only platform-level permissions (no patient care operations)
    const platformPermissions = [
      // Platform Operations (11 permissions)
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

      // Standardized Library Management (4 permissions)
      'METRIC_CREATE',
      'METRIC_READ',
      'METRIC_UPDATE',
      'METRIC_DELETE',

      // System Administration (1 permission)
      'SYSTEM_ADMIN'
    ];

    const userOrg = await prisma.userOrganization.create({
      data: {
        userId: platformAdmin.id,
        organizationId: platformOrg.id,
        role: 'ORG_ADMIN',
        permissions: platformPermissions,
        isActive: true
      }
    });

    console.log('✅ Platform Admin assigned successfully!');
    console.log('   Assignment ID:', userOrg.id);
    console.log('   Role:', userOrg.role);
    console.log('   Permissions:', userOrg.permissions.length);
    console.log('\n📋 Assigned Permissions (Platform-Level Only):');
    platformPermissions.forEach((perm, i) => {
      console.log(`   ${i + 1}. ${perm}`);
    });

    // Update user.isPlatformAdmin flag
    await prisma.user.update({
      where: { id: platformAdmin.id },
      data: { isPlatformAdmin: true }
    });

    console.log('\n✅ Updated user.isPlatformAdmin flag');

    console.log('\n🎉 PLATFORM Organization Setup Complete!');
    console.log('\n📝 Summary:');
    console.log(`   Organization: ${platformOrg.name}`);
    console.log(`   Type: ${platformOrg.type} (SaaS Provider)`);
    console.log(`   Admin User: ${platformAdmin.email}`);
    console.log(`   Permissions: ${platformPermissions.length} platform-level permissions`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   Platform Admin CANNOT create patients, clinicians, or observations.');
    console.log('   These features are BLOCKED at controller level for PLATFORM organizations.');
    console.log('   Platform Admin manages client organizations and standardized library.');
    console.log('\nNext step: Login as Platform Admin and create first client organization');

  } catch (error) {
    console.error('❌ Error setting up PLATFORM organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupPlatformOrganization()
  .catch(console.error);
