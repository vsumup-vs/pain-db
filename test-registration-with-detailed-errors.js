const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { spawn } = require('child_process');

const prisma = new PrismaClient();

async function testRegistrationWithDetailedErrors() {
  console.log('🧪 Testing Registration with Detailed Error Logging\n');
  
  let server;
  
  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'detailed-test@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Ensure test organization exists
    let organization = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });
    
    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'HEALTHCARE_PROVIDER',
          email: 'test@example.com',
          isActive: true
        }
      });
    }
    console.log('✅ Test organization ready:', organization.id);
    
    // Start server
    console.log('\n🚀 Starting server...');
    server = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    // Capture server output
    server.stdout.on('data', (data) => {
      console.log('📤 SERVER:', data.toString().trim());
    });
    
    server.stderr.on('data', (data) => {
      console.log('📥 ERROR:', data.toString().trim());
    });
    
    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 15000);
      
      server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    
    console.log('✅ Server started\n');
    
    // Wait for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test registration
    console.log('📝 Testing registration...');
    const registrationData = {
      email: 'detailed-test@example.com',
      password: 'TestPass123!',
      firstName: 'Detailed',
      lastName: 'Test',
      organizationId: organization.id
    };
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData, {
        timeout: 15000
      });
      
      console.log('✅ Registration successful!');
      console.log('✅ Status:', response.status);
      console.log('✅ User ID:', response.data.user?.id);
      console.log('✅ JWT Token length:', response.data.token?.length);
      
    } catch (error) {
      console.log('\n❌ Registration failed:');
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Error:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('   Network/Timeout Error:', error.message);
      }
    }
    
    // Wait for any additional server logs
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log('❌ Test setup error:', error.message);
  } finally {
    // Stop server
    if (server) {
      server.kill();
      console.log('\n🛑 Server stopped');
    }
    
    // Clean up
    try {
      await prisma.user.deleteMany({
        where: { email: 'detailed-test@example.com' }
      });
      console.log('✅ Test cleanup completed');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    }
    
    await prisma.$disconnect();
  }
}

testRegistrationWithDetailedErrors().catch(console.error);