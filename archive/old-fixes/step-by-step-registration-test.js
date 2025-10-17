const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwtService = require('./src/services/jwtService');

const prisma = new PrismaClient();

async function stepByStepRegistrationTest() {
  console.log('🔍 Step-by-Step Registration Test');
  console.log('');

  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'step-test@example.com' }
    });
    console.log('✅ Cleaned up test user');

    // Ensure test organization exists
    let organization = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'HEALTHCARE_PROVIDER',
          isActive: true
        }
      });
    }
    console.log('✅ Test organization ready:', organization.id);

    // Step 1: Test password hashing
    console.log('\n📝 Step 1: Testing password hashing...');
    const password = 'TestPass123!';
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed successfully');

    // Step 2: Test user creation with explicit select
    console.log('\n📝 Step 2: Testing user creation...');
    const user = await prisma.user.create({
      data: {
        email: 'step-test@example.com',
        passwordHash,
        firstName: 'Step',
        lastName: 'Test',
        emailVerified: null,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    console.log('✅ User created successfully');
    console.log('User object:', JSON.stringify(user, null, 2));

    // Step 3: Test user-organization creation
    console.log('\n📝 Step 3: Testing user-organization creation...');
    const userOrganization = await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'PATIENT',
        permissions: ['USER_READ'],
        joinedAt: new Date()
      },
      include: {
        organization: true
      }
    });
    console.log('✅ User-organization created successfully');
    console.log('UserOrganization object:', JSON.stringify(userOrganization, null, 2));

    // Step 4: Test JWT token generation
    console.log('\n📝 Step 4: Testing JWT token generation...');
    try {
      const token = await jwtService.generateUserToken(user);
      console.log('✅ JWT token generated successfully');
      console.log('Token length:', token.length);
    } catch (jwtError) {
      console.log('❌ JWT token generation failed:');
      console.log('Error message:', jwtError.message);
      console.log('Error name:', jwtError.name);
      console.log('Error stack:', jwtError.stack);
      throw jwtError;
    }

    // Step 5: Test refresh token generation
    console.log('\n📝 Step 5: Testing refresh token generation...');
    try {
      const refreshToken = await jwtService.generateRefreshToken(user.id);
      console.log('✅ Refresh token generated successfully');
      console.log('Refresh token length:', refreshToken.length);
    } catch (refreshError) {
      console.log('❌ Refresh token generation failed:');
      console.log('Error message:', refreshError.message);
      console.log('Error name:', refreshError.name);
      console.log('Error stack:', refreshError.stack);
      throw refreshError;
    }

    // Step 6: Test refresh token storage
    console.log('\n📝 Step 6: Testing refresh token storage...');
    try {
      const refreshToken = await jwtService.generateRefreshToken(user.id);
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('✅ Refresh token stored successfully');
    } catch (storageError) {
      console.log('❌ Refresh token storage failed:');
      console.log('Error message:', storageError.message);
      console.log('Error name:', storageError.name);
      console.log('Error stack:', storageError.stack);
      throw storageError;
    }

    console.log('\n🎉 All registration steps completed successfully!');
    console.log('The registration route should work. The issue might be elsewhere.');

  } catch (error) {
    console.log('\n❌ Step-by-step test failed:');
    console.log('Error message:', error.message);
    console.log('Error name:', error.name);
    console.log('Error stack:', error.stack);
    console.log('Error code:', error.code);
    console.log('Error meta:', error.meta);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database disconnected');
  }
}

stepByStepRegistrationTest();