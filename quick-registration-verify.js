const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const axios = require('axios');

const prisma = new PrismaClient();

async function quickRegistrationTest() {
    console.log('🔍 Quick Registration Verification Test');
    console.log('=====================================');

    let server;
    
    try {
        // Clean up any existing test user
        console.log('🧹 Cleaning up test data...');
        await prisma.user.deleteMany({
            where: { email: 'verify-test@example.com' }
        });

        // Ensure test organization exists
        console.log('🏢 Ensuring test organization exists...');
        let testOrg = await prisma.organization.findFirst({
            where: { name: 'Test Organization' }
        });

        if (!testOrg) {
            testOrg = await prisma.organization.create({
                data: {
                    name: 'Test Organization',
                    isActive: true
                }
            });
        }

        console.log(`✅ Test organization ready: ${testOrg.id}`);

        // Start server
        console.log('🚀 Starting server...');
        server = spawn('node', ['index.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'test' }
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test registration
        console.log('📝 Testing registration...');
        const registrationData = {
            email: 'verify-test@example.com',
            password: 'TestPass123!',
            firstName: 'Verify',
            lastName: 'Test',
            organizationId: testOrg.id
        };

        const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);

        console.log('✅ Registration Status:', response.status);
        console.log('✅ Response includes token:', !!response.data.token);
        console.log('✅ Response includes user:', !!response.data.user);
        console.log('✅ User has organization:', !!response.data.user?.organization);

        // Verify JWT token structure
        if (response.data.token) {
            const tokenParts = response.data.token.split('.');
            console.log('✅ JWT has 3 parts:', tokenParts.length === 3);
            
            // Decode payload (without verification for testing)
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log('✅ JWT contains userId:', !!payload.userId);
            console.log('✅ JWT contains organizations:', !!payload.organizations);
            console.log('✅ JWT contains role:', !!payload.role);
        }

        console.log('\n🎉 Registration verification PASSED!');
        return true;

    } catch (error) {
        console.error('❌ Registration verification FAILED:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        return false;
    } finally {
        // Cleanup
        if (server) {
            console.log('🛑 Stopping server...');
            server.kill();
        }
        
        console.log('🧹 Final cleanup...');
        await prisma.user.deleteMany({
            where: { email: 'verify-test@example.com' }
        });
        
        await prisma.$disconnect();
        console.log('✅ Cleanup completed');
    }
}

quickRegistrationTest()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });