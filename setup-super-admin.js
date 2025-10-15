const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupSuperAdmin() {
  try {
    console.log('🔧 Setting up Platform Admin user...\n');

    // 1. Create a default platform organization
    let platformOrg = await prisma.organization.findFirst({
      where: { name: 'Platform Administration' }
    });

    if (!platformOrg) {
      platformOrg = await prisma.organization.create({
        data: {
          name: 'Platform Administration',
          type: 'HOSPITAL',
          email: 'platform@clinmetrics.com',
          isActive: true
        }
      });
      console.log('✅ Created platform organization:', platformOrg.id);
    } else {
      console.log('✅ Platform organization exists:', platformOrg.id);
    }

    // 2. Check if test@example.com exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      include: {
        userOrganizations: true
      }
    });

    if (!user) {
      // Create the user with isPlatformAdmin = true
      const passwordHash = await bcrypt.hash('TestPass123!', 12);

      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: passwordHash,
          firstName: 'Test',
          lastName: 'User',
          isPlatformAdmin: true,
          isActive: true,
          emailVerified: new Date()
        }
      });
      console.log('✅ Created Platform Admin user:', user.id);
    } else {
      // Update existing user to be platform admin
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isPlatformAdmin: true }
      });
      console.log('✅ Updated user to Platform Admin:', user.id);
    }

    // 3. Check if user has ORG_ADMIN role in platform organization
    const existingOrgAdminRole = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: platformOrg.id
      }
    });

    if (!existingOrgAdminRole) {
      // Assign ORG_ADMIN role to platform organization
      const userOrg = await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: platformOrg.id,
          role: 'ORG_ADMIN',
          permissions: [
            // System Administration
            'SYSTEM_ADMIN',
            'AUDIT_READ',
            'COMPLIANCE_READ',

            // Organization Management
            'ORG_CREATE',
            'ORG_READ',
            'ORG_UPDATE',
            'ORG_DELETE',
            'ORG_SETTINGS_MANAGE',
            'ORG_USERS_MANAGE',
            'ORG_BILLING_MANAGE',

            // User Management
            'USER_CREATE',
            'USER_READ',
            'USER_UPDATE',
            'USER_DELETE',
            'USER_INVITE',
            'USER_ROLE_ASSIGN',

            // Platform Configuration (Templates, Metrics, Alerts - not patient data)
            'METRIC_CREATE',
            'METRIC_READ',
            'METRIC_UPDATE',
            'METRIC_DELETE',
            'ASSESSMENT_CREATE',
            'ASSESSMENT_READ',
            'ASSESSMENT_UPDATE',
            'ASSESSMENT_DELETE',
            'ALERT_CREATE',
            'ALERT_READ',
            'ALERT_UPDATE',
            'ALERT_DELETE',

            // Analytics & Reporting (platform-wide, not patient-specific)
            'ANALYTICS_READ',
            'REPORT_READ',
            'REPORT_CREATE',

            // Billing (platform-wide)
            'BILLING_READ',
            'BILLING_MANAGE'
          ],
          isActive: true
        }
      });
      console.log('✅ Assigned ORG_ADMIN role to user');
    } else {
      console.log('✅ User already has ORG_ADMIN role in platform organization');
    }

    // 4. Display summary
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log('\n📊 Platform Admin Setup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', finalUser.email);
    console.log('Password: TestPass123!');
    console.log('Platform Admin:', finalUser.isPlatformAdmin);
    console.log('Organization Role:', finalUser.userOrganizations[0]?.role);
    console.log('Organization:', finalUser.userOrganizations[0]?.organization.name);
    console.log('Permissions:', finalUser.userOrganizations[0]?.permissions.length, 'permissions');
    console.log('\n🌐 Login at: http://localhost:5173/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error setting up Platform Admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupSuperAdmin()
  .catch(console.error);
