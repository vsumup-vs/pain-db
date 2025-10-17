const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAndTestRegistration() {
  try {
    console.log('🔧 Fix and Test Registration\n');
    
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
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Test organization created:', testOrg.id);
    } else {
      console.log('✅ Test organization exists:', testOrg.id);
    }
    
    // Step 2: Clean up any existing test user
    console.log('\n2️⃣ Cleaning up test user...');
    await prisma.userOrganization.deleteMany({
      where: { 
        user: { email: 'fixtest@example.com' }
      }
    });
    await prisma.refreshToken.deleteMany({
      where: { 
        user: { email: 'fixtest@example.com' }
      }
    });
    await prisma.user.deleteMany({
      where: { email: 'fixtest@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Step 3: Test registration without organizationId first
    console.log('\n3️⃣ Testing registration without organization...');
    const simpleRegistrationData = {
      email: 'fixtest@example.com',
      password: 'TestPassword123!',
      firstName: 'Fix',
      lastName: 'Test'
    };
    
    try {
      const simpleResponse = await axios.post('http://localhost:3000/api/auth/register', simpleRegistrationData);
      console.log('✅ Simple registration successful!');
      console.log('📋 Status:', simpleResponse.status);
      
      // Clean up for next test
      await prisma.user.deleteMany({
        where: { email: 'fixtest@example.com' }
      });
      
    } catch (error) {
      console.log('❌ Simple registration failed:', error.response?.status, error.response?.data?.error);
    }
    
    // Step 4: Test registration with organizationId
    console.log('\n4️⃣ Testing registration with organization...');
    const fullRegistrationData = {
      email: 'fixtest@example.com',
      password: 'TestPassword123!',
      firstName: 'Fix',
      lastName: 'Test',
      organizationId: testOrg.id,
      role: 'CLINICIAN'
    };
    
    try {
      const fullResponse = await axios.post('http://localhost:3000/api/auth/register', fullRegistrationData);
      console.log('✅ Full registration successful!');
      console.log('📋 Status:', fullResponse.status);
      console.log('📋 User:', fullResponse.data.user?.email);
      console.log('📋 Organization:', fullResponse.data.user?.organization?.name);
      
    } catch (error) {
      console.log('❌ Full registration failed:', error.response?.status, error.response?.data?.error);
      
      if (error.response?.status === 500) {
        console.log('\n🔍 Investigating 500 error...');
        
        // Check if it's a database constraint issue
        try {
          console.log('🔍 Testing database operations manually...');
          
          // Test user creation
          const testUser = await prisma.user.create({
            data: {
              email: 'manualtest@example.com',
              passwordHash: '$2b$12$test.hash.here',
              firstName: 'Manual',
              lastName: 'Test',
              emailVerified: null,
              isActive: true
            }
          });
          console.log('✅ Manual user creation successful:', testUser.id);
          
          // Test user organization creation
          const testUserOrg = await prisma.userOrganization.create({
            data: {
              userId: testUser.id,
              organizationId: testOrg.id,
              role: 'CLINICIAN',
              joinedAt: new Date(),
              isActive: true
            }
          });
          console.log('✅ Manual user organization creation successful');
          
          // Clean up manual test
          await prisma.userOrganization.delete({ where: { id: testUserOrg.id } });
          await prisma.user.delete({ where: { id: testUser.id } });
          console.log('✅ Manual test cleanup complete');
          
          console.log('\n💡 Database operations work manually. The issue is likely in the registration route logic.');
          
        } catch (dbError) {
          console.log('❌ Manual database test failed:', dbError.message);
          console.log('🔍 This suggests a database schema or constraint issue');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Fix script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAndTestRegistration();