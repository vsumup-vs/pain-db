const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupSuperAdmin() {
  try {
    console.log('🔧 Setting up SUPER_ADMIN user...\n');

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
      // Create the user
      const passwordHash = await bcrypt.hash('TestPass123!', 12);

      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          emailVerified: new Date()
        }
      });
      console.log('✅ Created SUPER_ADMIN user:', user.id);
    } else {
      console.log('✅ User exists:', user.id);
    }

    // 3. Check if user already has SUPER_ADMIN role
    const existingSuperAdminRole = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        role: 'SUPER_ADMIN'
      }
    });

    if (!existingSuperAdminRole) {
      // Assign SUPER_ADMIN role to platform organization
      const userOrg = await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: platformOrg.id,
          role: 'SUPER_ADMIN',
          permissions: [
            'SYSTEM_ADMIN',
            'AUDIT_READ',
            'ORG_CREATE',
            'ORG_READ',
            'ORG_UPDATE',
            'ORG_DELETE',
            'USER_CREATE',
            'USER_READ',
            'USER_UPDATE',
            'USER_DELETE',
            'USER_INVITE',
            'USER_ROLE_ASSIGN',
            'PATIENT_READ',
            'CLINICIAN_READ',
            'PROGRAM_READ',
            'PROGRAM_CREATE'
          ],
          isActive: true
        }
      });
      console.log('✅ Assigned SUPER_ADMIN role to user');
    } else {
      console.log('✅ User already has SUPER_ADMIN role');
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

    console.log('\n📊 SUPER_ADMIN Setup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', finalUser.email);
    console.log('Password: TestPass123!');
    console.log('Role:', finalUser.userOrganizations[0]?.role);
    console.log('Organization:', finalUser.userOrganizations[0]?.organization.name);
    console.log('Permissions:', finalUser.userOrganizations[0]?.permissions.length, 'permissions');
    console.log('\n🌐 Login at: http://localhost:5173/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error setting up SUPER_ADMIN:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupSuperAdmin()
  .catch(console.error);
