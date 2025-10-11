const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwtService = require('./src/services/jwtService');

const prisma = new PrismaClient();

async function testJWTFix() {
  console.log('🧪 Testing JWT Fix\n');

  try {
    // Clean up any existing test user
    const testEmail = 'jwt-test@example.com';
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log('✅ Cleaned up test user');

    // Test user creation with explicit select
    console.log('\n1️⃣ Testing user creation with explicit select...');
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'JWT',
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
    console.log('User object:', {
      id: user.id,
      email: user.email,
      hasId: !!user.id,
      idType: typeof user.id
    });

    // Test JWT token generation
    console.log('\n2️⃣ Testing JWT token generation...');
    
    try {
      const token = await jwtService.generateUserToken(user);
      console.log('✅ JWT token generated successfully');
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    } catch (jwtError) {
      console.error('❌ JWT token generation failed:', jwtError.message);
      throw jwtError;
    }

    // Test refresh token generation
    console.log('\n3️⃣ Testing refresh token generation...');
    
    try {
      const refreshToken = await jwtService.generateRefreshToken(user.id);
      console.log('✅ Refresh token generated successfully');
      console.log('Refresh token length:', refreshToken.length);
    } catch (refreshError) {
      console.error('❌ Refresh token generation failed:', refreshError.message);
      throw refreshError;
    }

    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
    console.log('\n✅ Test user cleaned up');

    console.log('\n🎉 All JWT tests passed! The fix is working correctly.');

  } catch (error) {
    console.error('\n❌ JWT test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testJWTFix();