const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkUserToOrganization() {
  try {
    // Test user and organization IDs from previous steps
    const userId = 'cmgvyq0cm000g7kxig9fkl7qb';
    const organizationId = 'cmgv3qs7m00007knezlq1suon';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      console.error('❌ Organization not found');
      return;
    }

    // Check if UserOrganization relationship already exists
    const existing = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      }
    });

    if (existing) {
      console.log('ℹ️  UserOrganization relationship already exists');
      console.log('   Updating to ensure correct permissions...');

      await prisma.userOrganization.update({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        },
        data: {
          role: 'CLINICIAN',
          permissions: ['PATIENT_READ', 'PATIENT_CREATE', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_ACKNOWLEDGE'],
          isActive: true
        }
      });

      console.log('✅ Updated UserOrganization relationship');
    } else {
      // Create new UserOrganization relationship
      await prisma.userOrganization.create({
        data: {
          userId,
          organizationId,
          role: 'CLINICIAN',
          permissions: ['PATIENT_READ', 'PATIENT_CREATE', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_ACKNOWLEDGE'],
          isActive: true
        }
      });

      console.log('✅ Created UserOrganization relationship');
    }

    console.log('\nUser:', user.email);
    console.log('Organization:', org.name);
    console.log('Role: CLINICIAN');
    console.log('Permissions: PATIENT_READ, PATIENT_CREATE, ALERT_READ, ALERT_UPDATE, ALERT_ACKNOWLEDGE');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkUserToOrganization();
