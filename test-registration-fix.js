const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRegistrationFix() {
  try {
    console.log('🧪 Testing Registration Fix\n');
    
    // Step 1: Ensure organization exists
    console.log('1️⃣ Ensuring test organization exists...');
    let testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });
    
    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'CLINIC',
          isActive: true,
          settings: {}
        }
      });
    }
    console.log('✅ Test organization ready:', testOrg.id);
    
    // Step 2: Clean up test user
    console.log('\n2️⃣ Cleaning up test user...');
    await prisma.userOrganization.deleteMany({
      where: { user: { email: 'regtest@example.com' } }
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: 'regtest@example.com' } }
    });
    await prisma.user.deleteMany({
      where: { email: 'regtest@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Step 3: Test registration
    console.log('\n3️⃣ Testing registration...');
    const registrationData = {
      email: 'regtest@example.com',
      password: 'TestPassword123!',
      firstName: 'Registration',
      lastName: 'Test',
      organizationId: testOrg.id,
      role: 'CLINICIAN'
    };
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      console.log('✅ Registration successful!');
      console.log('📋 Status:', response.status);
      console.log('📋 User ID:', response.data.user?.id);
      console.log('📋 User Email:', response.data.user?.email);
      console.log('📋 User Role:', response.data.user?.role);
      console.log('📋 Organization:', response.data.user?.organization?.name);
      console.log('📋 Token received:', response.data.token ? 'Yes' : 'No');
      
      // Step 4: Verify in database
      console.log('\n4️⃣ Verifying in database...');
      const createdUser = await prisma.user.findUnique({
        where: { email: 'regtest@example.com' },
        include: {
          userOrganizations: {
            include: {
              organization: true
            }
          }
        }
      });
      
      if (createdUser) {
        console.log('✅ User found in database');
        console.log('📋 User organizations:', createdUser.userOrganizations.length);
        if (createdUser.userOrganizations.length > 0) {
          const userOrg = createdUser.userOrganizations[0];
          console.log('📋 Role:', userOrg.role);
          console.log('📋 Permissions:', userOrg.permissions);
          console.log('📋 Organization:', userOrg.organization.name);
        }
      }
      
      // Step 5: Test login with new user
      console.log('\n5️⃣ Testing login with new user...');
      const loginData = {
        email: 'regtest@example.com',
        password: 'TestPassword123!'
      };
      
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', loginData);
      console.log('✅ Login successful!');
      console.log('📋 Login status:', loginResponse.status);
      
      console.log('\n🎉 All tests passed! Registration is working correctly.');
      
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.status, error.response?.data?.error);
      if (error.response?.data?.details) {
        console.log('📋 Details:', error.response.data.details);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRegistrationFix();