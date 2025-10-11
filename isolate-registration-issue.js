const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwtService = require('./src/services/jwtService');
const auditService = require('./src/services/auditService');

const prisma = new PrismaClient();

async function isolateRegistrationIssue() {
  console.log('🔍 Isolating Registration Issue\n');
  
  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Step 2: Test organization lookup
    console.log('\n2️⃣ Testing organization lookup...');
    const testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });
    console.log('✅ Organization found:', testOrg?.id);
    
    // Step 3: Test user creation
    console.log('\n3️⃣ Testing user creation...');
    
    // Clean up first
    await prisma.userOrganization.deleteMany({
      where: { user: { email: 'isolate-test@example.com' } }
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: 'isolate-test@example.com' } }
    });
    await prisma.user.deleteMany({
      where: { email: 'isolate-test@example.com' }
    });
    
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    const user = await prisma.user.create({
      data: {
        email: 'isolate-test@example.com',
        passwordHash,
        firstName: 'Isolate',
        lastName: 'Test',
        emailVerified: null,
        isActive: true
      }
    });
    console.log('✅ User created:', user.id);
    
    // Step 4: Test user-organization creation
    console.log('\n4️⃣ Testing user-organization creation...');
    const userOrganization = await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: testOrg.id,
        role: 'CLINICIAN',
        permissions: ['USER_READ'],
        joinedAt: new Date()
      },
      include: {
        organization: true
      }
    });
    console.log('✅ User-organization created:', userOrganization.id);
    
    // Step 5: Test JWT token generation
    console.log('\n5️⃣ Testing JWT token generation...');
    try {
      const token = await jwtService.generateUserToken(user.id);
      console.log('✅ JWT token generated successfully');
      console.log('📋 Token length:', token.length);
    } catch (error) {
      console.log('❌ JWT token generation failed:', error.message);
      console.log('📋 Error details:', error);
      throw error;
    }
    
    // Step 6: Test refresh token generation
    console.log('\n6️⃣ Testing refresh token generation...');
    try {
      const refreshToken = await jwtService.generateRefreshToken(user.id);
      console.log('✅ Refresh token generated successfully');
      console.log('📋 Refresh token length:', refreshToken.length);
    } catch (error) {
      console.log('❌ Refresh token generation failed:', error.message);
      console.log('📋 Error details:', error);
      throw error;
    }
    
    // Step 7: Test audit logging
    console.log('\n7️⃣ Testing audit logging...');
    try {
      await auditService.logEvent({
        action: 'USER_REGISTERED',
        userId: user.id,
        organizationId: testOrg.id,
        details: {
          email: user.email,
          role: 'CLINICIAN'
        }
      });
      console.log('✅ Audit logging successful');
    } catch (error) {
      console.log('❌ Audit logging failed:', error.message);
      console.log('📋 Error details:', error);
      throw error;
    }
    
    // Step 8: Test environment variables
    console.log('\n8️⃣ Testing environment variables...');
    console.log('📋 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('📋 JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'default (24h)');
    console.log('📋 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // Step 9: Cleanup
    console.log('\n9️⃣ Cleaning up...');
    await prisma.userOrganization.delete({ where: { id: userOrganization.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Cleanup successful');
    
    console.log('\n🎉 All individual components work correctly!');
    console.log('📋 The issue must be in the registration route logic or request handling.');
    
  } catch (error) {
    console.error('❌ Component test failed:', error.message);
    console.error('📋 Full error:', error);
    console.error('📋 Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

isolateRegistrationIssue();