const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/auth';

async function testRegistration() {
  try {
    console.log('🧪 Testing registration endpoint...');
    
    // Clean up any existing test user first
    await prisma.user.deleteMany({
      where: { email: 'testuser@testhealthcare.com' }
    });

    // Get test organization
    const testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Healthcare Clinic' }
    });

    console.log('🏥 Test organization:', testOrg ? testOrg.id : 'Not found');

    const requestData = {
      email: 'testuser@testhealthcare.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationId: testOrg?.id,
      role: 'CLINICIAN'
    };

    console.log('📤 Sending registration request:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(`${API_URL}/register`, requestData);
    
    console.log('✅ Registration successful!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Registration failed!');
    console.log('📋 Error status:', error.response?.status);
    console.log('📋 Error data:', JSON.stringify(error.response?.data, null, 2));
    console.log('📋 Error message:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRegistration();