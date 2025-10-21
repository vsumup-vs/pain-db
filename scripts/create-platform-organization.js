const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a PLATFORM organization for platform-level operations
 *
 * PLATFORM organizations are used for:
 * - User management
 * - Organization management
 * - System configuration
 * - Platform-level analytics
 *
 * PLATFORM organizations CANNOT:
 * - Create patients, clinicians, or enrollments
 * - Access patient-care features (alerts, observations, assessments)
 * - Access clinical analytics
 */
async function createPlatformOrganization() {
  console.log('🏢 Creating PLATFORM organization...\n');

  try {
    // Check if PLATFORM organization already exists
    const existingPlatform = await prisma.organization.findFirst({
      where: { type: 'PLATFORM' }
    });

    if (existingPlatform) {
      console.log('⚠️  PLATFORM organization already exists:');
      console.log(`   Name: ${existingPlatform.name}`);
      console.log(`   ID: ${existingPlatform.id}`);
      console.log(`   Type: ${existingPlatform.type}`);
      console.log(`   Active: ${existingPlatform.isActive}`);
      console.log('\nℹ️  No changes made. Use update script if you need to modify it.\n');
      return existingPlatform;
    }

    // Create PLATFORM organization
    const platformOrg = await prisma.organization.create({
      data: {
        name: 'ClinMetrics Platform',
        type: 'PLATFORM',
        email: 'platform@clinmetrics.com',
        phone: '555-000-0000',
        address: 'Platform Operations',
        website: 'https://clinmetrics.com',
        isActive: true,
        settings: {
          timezone: 'UTC',
          features: {
            userManagement: true,
            organizationManagement: true,
            systemConfiguration: true,
            platformAnalytics: true
          },
          restrictions: {
            patientCare: false,
            clinicalOperations: false,
            billingOperations: false
          }
        }
      }
    });

    console.log('✅ Created PLATFORM organization:');
    console.log(`   Name: ${platformOrg.name}`);
    console.log(`   ID: ${platformOrg.id}`);
    console.log(`   Type: ${platformOrg.type}`);
    console.log(`   Email: ${platformOrg.email}`);

    // Check for platform admin users and optionally assign them
    const platformAdmins = await prisma.user.findMany({
      where: { isPlatformAdmin: true }
    });

    if (platformAdmins.length > 0) {
      console.log(`\n👥 Found ${platformAdmins.length} platform admin user(s):`);

      for (const admin of platformAdmins) {
        // Check if already assigned to PLATFORM org
        const existingAssignment = await prisma.userOrganization.findFirst({
          where: {
            userId: admin.id,
            organizationId: platformOrg.id
          }
        });

        if (!existingAssignment) {
          // Assign platform admin to PLATFORM organization
          const userOrg = await prisma.userOrganization.create({
            data: {
              userId: admin.id,
              organizationId: platformOrg.id,
              role: 'ORG_ADMIN',
              permissions: [
                'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
                'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE',
                'REPORTS_VIEW', 'REPORTS_EXPORT'
              ],
              isActive: true
            }
          });

          console.log(`   ✅ Assigned ${admin.email} as ORG_ADMIN to PLATFORM organization`);
        } else {
          console.log(`   ℹ️  ${admin.email} already assigned (role: ${existingAssignment.role})`);
        }
      }
    } else {
      console.log('\n⚠️  No platform admin users found.');
      console.log('   Run make-admin-platform-admin.js to create platform admin users.');
    }

    console.log('\n📋 Platform Organization Features:');
    console.log('   ✅ User management');
    console.log('   ✅ Organization management');
    console.log('   ✅ System configuration');
    console.log('   ✅ Platform-level analytics');
    console.log('\n🚫 Restricted Features:');
    console.log('   ❌ Patient creation (blocked)');
    console.log('   ❌ Clinician creation (blocked)');
    console.log('   ❌ Enrollment creation (blocked)');
    console.log('   ❌ Clinical observations (blocked)');
    console.log('   ❌ Patient-care analytics (blocked)');
    console.log('   ❌ Alert management (blocked)');
    console.log('   ❌ Task management (blocked)');
    console.log('   ❌ Time tracking (blocked)');
    console.log('   ❌ Medication management (blocked)');
    console.log('   ❌ Encounter notes (blocked)');
    console.log('   ❌ Assessments (blocked)\n');

    console.log('✨ PLATFORM organization setup complete!\n');

    return platformOrg;

  } catch (error) {
    console.error('❌ Error creating PLATFORM organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPlatformOrganization()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
