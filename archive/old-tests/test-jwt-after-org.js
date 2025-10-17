const { PrismaClient } = require('@prisma/client');
const jwtService = require('./src/services/jwtService');

const prisma = new PrismaClient();

async function testJWTAfterOrg() {
  console.log('🔍 Testing JWT Generation After Organization Assignment');
  console.log('');

  try {
    // Clean up
    await prisma.user.deleteMany({
      where: { email: 'jwt-test@example.com' }
    });

    // Get organization
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

    console.log('✅ Organization ready:', organization.id);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'jwt-test@example.com',
        passwordHash: 'hashedpassword',
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
    console.log('✅ User created:', user.id);

    // Create user-organization relationship
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
    console.log('✅ User-organization created:', userOrganization.id);

    // Now test JWT generation
    console.log('');
    console.log('📋 Testing JWT generation...');
    console.log('User object being passed to JWT service:');
    console.log(JSON.stringify(user, null, 2));

    const token = await jwtService.generateUserToken(user);
    console.log('✅ JWT token generated successfully!');
    console.log('Token length:', token.length);

    // Verify the token
    const decoded = await jwtService.verifyToken(token);
    console.log('✅ Token verified successfully!');
    console.log('Decoded user ID:', decoded.userId);
    console.log('Decoded organizations:', decoded.organizations?.length || 0);

  } catch (error) {
    console.error('');
    console.error('❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testJWTAfterOrg();