const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRegistration() {
  try {
    console.log('🔍 Comprehensive Registration Debug\n');
    
    // Step 1: Check server health
    console.log('1️⃣ Checking server health...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/api/health');
      console.log('✅ Server is healthy:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      return;
    }
    
    // Step 2: Check database connection
    console.log('\n2️⃣ Checking database connection...');
    const userCount = await prisma.user.count();
    console.log('✅ Database connected. User count:', userCount);
    
    // Step 3: Check organizations
    console.log('\n3️⃣ Checking organizations...');
    const organizations = await prisma.organization.findMany();
    console.log('📊 Organizations found:', organizations.length);
    
    let testOrg = organizations[0];
    if (!testOrg) {
      console.log('💡 Creating test organization...');
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          domain: 'test-org',
          isActive: true,
          settings: {}
        }
      });
      console.log('✅ Test organization created:', testOrg.id);
    } else {
      console.log('✅ Using existing organization:', testOrg.name, 'ID:', testOrg.id);
    }
    
    // Step 4: Clean up test user
    console.log('\n4️⃣ Cleaning up existing test user...');
    await prisma.userOrganization.deleteMany({
      where: { 
        user: { email: 'debug@example.com' }
      }
    });
    await prisma.user.deleteMany({
      where: { email: 'debug@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Step 5: Test registration with detailed logging
    console.log('\n5️⃣ Testing registration...');
    const registrationData = {
      email: 'debug@example.com',
      password: 'TestPassword123!',
      firstName: 'Debug',
      lastName: 'User',
      organizationId: testOrg.id,
      role: 'CLINICIAN'
    };
    
    console.log('📤 Registration data:', JSON.stringify(registrationData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      console.log('✅ Registration successful!');
      console.log('📋 Response status:', response.status);
      console.log('📋 Response data:', JSON.stringify(response.data, null, 2));
      
      // Step 6: Verify user was created
      console.log('\n6️⃣ Verifying user creation...');
      const createdUser = await prisma.user.findUnique({
        where: { email: 'debug@example.com' },
        include: {
          userOrganizations: {
            include: {
              organization: true
            }
          }
        }
      });
      
      if (createdUser) {
        console.log('✅ User verified in database:', createdUser.email);
        console.log('📋 User organizations:', createdUser.userOrganizations.length);
      } else {
        console.log('❌ User not found in database');
      }
      
    } catch (error) {
      console.log('❌ Registration failed');
      console.log('📋 Error status:', error.response?.status);
      console.log('📋 Error data:', error.response?.data);
      console.log('📋 Error message:', error.message);
      
      if (error.response?.status === 500) {
        console.log('\n🔍 500 Error detected - checking server logs...');
        // The error is likely logged on the server side
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRegistration();