const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a default organization and assign admin as ORG_ADMIN
 */
async function createDefaultOrganization() {
  console.log('🏥 Creating default organization...\n');

  try {
    // Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@clinmetrics.com' }
    });

    if (!admin) {
      console.error('❌ Admin user not found');
      return;
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: 'Test Clinic',
        type: 'CLINIC',
        email: 'contact@testclinic.com',
        phone: '555-123-4567',
        address: '123 Test Street, Test City, TC 12345',
        website: 'https://testclinic.com',
        isActive: true,
        settings: {
          timezone: 'America/New_York',
          billing: {
            cptCodes: ['99453', '99454', '99457', '99458', '99490', '99491']
          }
        }
      }
    });

    console.log(`✅ Created organization: ${organization.name}`);
    console.log(`   ID: ${organization.id}`);

    // Assign admin as ORG_ADMIN
    const userOrg = await prisma.userOrganization.create({
      data: {
        userId: admin.id,
        organizationId: organization.id,
        role: 'ORG_ADMIN',
        permissions: [
          'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
          'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE', 'PATIENT_DELETE',
          'CLINICIAN_READ', 'CLINICIAN_CREATE', 'CLINICIAN_UPDATE', 'CLINICIAN_DELETE',
          'ALERT_READ', 'ALERT_CREATE', 'ALERT_UPDATE', 'ALERT_DELETE', 'ALERT_ASSIGN',
          'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE', 'ORG_BILLING_MANAGE',
          'BILLING_VIEW', 'BILLING_MANAGE', 'REPORTS_VIEW', 'REPORTS_EXPORT'
        ],
        isActive: true
      }
    });

    console.log(`\n✅ Assigned ${admin.email} as ORG_ADMIN`);
    console.log(`   Role: ${userOrg.role}`);
    console.log(`   Permissions: ${userOrg.permissions.length} granted`);

    console.log('\n📋 Next Steps:');
    console.log('   1. Log out and log back in to refresh your token');
    console.log('   2. You can now access /admin/organizations');
    console.log('   3. You can create patients, clinicians, and care programs');
    console.log('   4. The triage queue and other pages will now work\n');

  } catch (error) {
    console.error('❌ Error creating organization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultOrganization().catch(console.error);
