const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { spawn } = require('child_process');

const prisma = new PrismaClient();

async function testRegistrationAfterFix() {
  console.log('🧪 Testing Registration After JWT Fix\n');
  
  let server;
  
  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'test-fix@example.com' }
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
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Wait for server to start
    await new Promise((resolve) => {
      server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port')) {
          resolve();
        }
      });
    });
    
    console.log('✅ Server started');
    
    // Test registration
    console.log('\n📝 Testing registration...');
    const registrationData = {
      email: 'test-fix@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Fix',
      organizationId: organization.id
    };
    
    const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
    
    if (response.status === 201) {
      console.log('✅ Registration successful!');
      console.log('✅ JWT token received:', response.data.token ? 'Yes' : 'No');
      console.log('✅ User data:', {
        id: response.data.user.id,
        email: response.data.user.email,
        role: response.data.user.role,
        organization: response.data.user.organization?.name
      });
      
      // Test token by calling /me endpoint
      console.log('\n🔍 Testing JWT token...');
      const meResponse = await axios.get('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${response.data.token}` }
      });
      
      if (meResponse.status === 200) {
        console.log('✅ JWT token is valid!');
        console.log('✅ User organizations:', meResponse.data.organizations?.length || 0);
      }
      
    } else {
      console.log('❌ Registration failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Registration failed:');
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('❌ Test error:', error.message);
    }
  } finally {
    // Clean up
    if (server) {
      server.kill();
      console.log('\n🛑 Server stopped');
    }
    
    await prisma.user.deleteMany({
      where: { email: 'test-fix@example.com' }
    });
    console.log('✅ Test cleanup completed');
    
    await prisma.$disconnect();
  }
}

testRegistrationAfterFix().catch(console.error);