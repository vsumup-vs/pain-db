const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRegistration() {
  try {
    console.log('🧪 Simple Registration Test');
    console.log('============================');
    
    // Step 1: Check server health
    console.log('\n1️⃣ Checking server health...');
    try {
      const health = await axios.get('http://localhost:3000/health', { timeout: 5000 });
      console.log('✅ Server is healthy:', health.data.status);
    } catch (error) {
      console.log('❌ Server not responding. Please start with: node index.js');
      return;
    }

    // Step 2: Clean up test user
    console.log('\n2️⃣ Cleaning up test user...');
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
    console.log('✅ Test user cleaned up');

    // Step 3: Get test organization
    console.log('\n3️⃣ Finding test organization...');
    const org = await prisma.organization.findFirst();
    console.log('✅ Organization found:', org ? org.name : 'None');

    // Step 4: Test registration
    console.log('\n4️⃣ Testing registration...');
    const registrationData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationId: org?.id,
      role: 'CLINICIAN'
    };

    console.log('📤 Sending registration request...');
    const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
    
    console.log('✅ Registration successful!');
    console.log('📋 Response status:', response.status);
    console.log('📋 User created:', response.data.user?.email);
    console.log('📋 Token received:', response.data.token ? 'Yes' : 'No');

  } catch (error) {
    console.log('\n❌ Registration failed!');
    console.log('📋 Error:', error.message);
    if (error.response) {
      console.log('📋 Status:', error.response.status);
      console.log('📋 Response:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRegistration();