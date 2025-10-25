const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnalyticsData() {
  try {
    // Find test organization
    const org = await prisma.organization.findFirst({
      where: { name: { contains: 'Test Clinic' } }
    });

    console.log('📊 Organization:', org?.name || 'Not found');
    console.log('🆔 Org ID:', org?.id || 'N/A');
    console.log('');

    if (!org) {
      console.log('❌ No test organization found');
      await prisma.$disconnect();
      return;
    }

    // Count data by entity type
    const patients = await prisma.patient.count({
      where: { organizationId: org.id }
    });

    const clinicians = await prisma.clinician.count({
      where: { organizationId: org.id }
    });

    const enrollments = await prisma.enrollment.count({
      where: { organizationId: org.id }
    });

    const observations = await prisma.observation.count({
      where: { organizationId: org.id }
    });

    const alerts = await prisma.alert.count({
      where: {
        patient: { organizationId: org.id }
      }
    });

    const timeLogs = await prisma.timeLog.count({
      where: {
        patient: { organizationId: org.id }
      }
    });

    const tasks = await prisma.task.count({
      where: { organizationId: org.id }
    });

    console.log('📈 Data Counts:');
    console.log('  - Patients:', patients);
    console.log('  - Clinicians:', clinicians);
    console.log('  - Enrollments:', enrollments);
    console.log('  - Observations:', observations);
    console.log('  - Alerts:', alerts);
    console.log('  - Time Logs:', timeLogs);
    console.log('  - Tasks:', tasks);
    console.log('');

    // Check recent data with dates
    const recentAlerts = await prisma.alert.findMany({
      where: {
        patient: { organizationId: org.id }
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        severity: true,
        status: true,
        createdAt: true
      }
    });

    console.log('🚨 Recent Alerts (last 3):');
    if (recentAlerts.length > 0) {
      recentAlerts.forEach(alert => {
        console.log(`  - ${alert.severity} alert (${alert.status}) - ${alert.createdAt.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('  (No alerts found)');
    }
    console.log('');

    // Check recent time logs
    const recentTimeLogs = await prisma.timeLog.findMany({
      where: {
        patient: { organizationId: org.id }
      },
      orderBy: { loggedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        activity: true,
        duration: true,
        loggedAt: true
      }
    });

    console.log('⏱️  Recent Time Logs (last 3):');
    if (recentTimeLogs.length > 0) {
      recentTimeLogs.forEach(log => {
        console.log(`  - ${log.activity}: ${log.duration} min - ${log.loggedAt.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('  (No time logs found)');
    }
    console.log('');

    // Check authenticated user's organization
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@testclinic.com' },
      select: {
        id: true,
        email: true,
        currentOrganization: true,
        userOrganizations: {
          select: {
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log('👤 Test User Info:');
    console.log('  - Email:', testUser?.email || 'Not found');
    console.log('  - Current Org ID:', testUser?.currentOrganization || 'N/A');
    console.log('  - Organizations:', testUser?.userOrganizations.map(uo => uo.organization.name).join(', ') || 'None');
    console.log('');

    if (testUser?.currentOrganization !== org.id) {
      console.log('⚠️  WARNING: User\'s current organization does NOT match test organization!');
      console.log(`   User Org: ${testUser?.currentOrganization}`);
      console.log(`   Data Org: ${org.id}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

checkAnalyticsData();
