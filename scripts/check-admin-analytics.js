const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminAnalytics() {
  try {
    // Get admin user with organization
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@testclinic.com' },
      select: {
        id: true,
        email: true,
        userOrganizations: {
          select: {
            organizationId: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    if (admin.userOrganizations.length === 0) {
      console.log('❌ Admin user has no organization associations');
      return;
    }

    const orgId = admin.userOrganizations[0].organizationId;
    const orgName = admin.userOrganizations[0].organization.name;

    console.log('👤 Admin User:');
    console.log('  ID:', admin.id);
    console.log('  Email:', admin.email);
    console.log('  Org ID:', orgId);
    console.log('  Org Name:', orgName);
    console.log('');

    // Check alerts resolved by admin
    const resolvedAlerts = await prisma.alert.count({
      where: {
        organizationId: orgId,
        resolvedById: admin.id,
        status: 'RESOLVED'
      }
    });

    console.log('🚨 Alerts resolved by admin:', resolvedAlerts);

    // Check all resolved alerts
    const allResolvedAlerts = await prisma.alert.findMany({
      where: {
        organizationId: orgId,
        status: 'RESOLVED'
      },
      select: {
        id: true,
        resolvedById: true,
        resolvedAt: true
      }
    });

    console.log('🚨 Total resolved alerts:', allResolvedAlerts.length);
    console.log('');

    if (allResolvedAlerts.length > 0) {
      console.log('Resolved alert details:');
      allResolvedAlerts.forEach((alert, i) => {
        console.log(`  ${i + 1}. Resolved by: ${alert.resolvedById}, at: ${alert.resolvedAt?.toISOString()}`);
      });
      console.log('');
      console.log('Admin ID matches resolved alerts?',
        allResolvedAlerts.some(a => a.resolvedById === admin.id) ? 'YES ✓' : 'NO ✗');
    }

    // Get all users to see who resolved the alerts
    const users = await prisma.user.findMany({
      where: {
        userOrganizations: {
          some: { organizationId: orgId }
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    console.log('');
    console.log('👥 All users in organization:');
    users.forEach(u => {
      const resolvedCount = allResolvedAlerts.filter(a => a.resolvedById === u.id).length;
      console.log(`  - ${u.email} (${u.id}): ${resolvedCount} resolved alerts`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAdminAnalytics();
