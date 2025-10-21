const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function createAlertViaAPI() {
  try {
    console.log('\n🧪 Creating alert via API to trigger SSE broadcast...\n');

    // Get user token
    const user = await prisma.user.findFirst({
      where: { email: 'sse-test@example.com' }
    });

    if (!user) {
      console.error('❌ User not found');
      await prisma.$disconnect();
      return;
    }

    // Generate token for this user
    const jwtService = require('./src/services/jwtService');

    // Get user's organizations
    const userOrgs = await prisma.userOrganization.findMany({
      where: { userId: user.id, isActive: true },
      include: { organization: true }
    });

    const tokenData = {
      userId: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      organizations: userOrgs.map(uo => ({
        organizationId: uo.organizationId,
        name: uo.organization.name,
        role: uo.role,
        permissions: uo.permissions
      })),
      currentOrganization: userOrgs[0]?.organizationId
    };

    const { accessToken } = jwtService.generateTokens(tokenData);

    console.log('✅ Generated auth token for', user.email);

    // Create alert via API
    const enrollmentId = 'cmgw8suaw00017ktyr8teciko';
    const ruleId = 'cmgvxx3wt00017kglh8mqo5yw';

    const alertData = JSON.stringify({
      ruleId: ruleId,
      enrollmentId: enrollmentId,
      facts: {
        message: `🧪 SSE TEST ALERT - API Call at ${new Date().toLocaleTimeString()}`,
        testTimestamp: new Date().toISOString()
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/alerts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(alertData)
      }
    };

    console.log('📡 Sending POST /api/alerts request...\n');

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log('Response body:', data);
        console.log('');
        console.log('👀 Check your browser for toast notification!');
        console.log('   SSE connection should receive the alert and display toast.');
        await prisma.$disconnect();
      });
    });

    req.on('error', async (error) => {
      console.error('❌ Request error:', error.message);
      await prisma.$disconnect();
    });

    req.write(alertData);
    req.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

createAlertViaAPI();
