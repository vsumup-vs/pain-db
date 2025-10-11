const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwtService = require('./src/services/jwtService');
const auditService = require('./src/services/auditService');

const prisma = new PrismaClient();

async function directRegistrationTest() {
  console.log('🔍 Direct Registration Logic Test');
  console.log('');

  try {
    // Clean up
    await prisma.user.deleteMany({
      where: { email: 'direct-test@example.com' }
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

    // Test each step individually
    const email = 'direct-test@example.com';
    const password = 'TestPass123!';
    const firstName = 'Direct';
    const lastName = 'Test';
    const organizationId = organization.id;
    const role = 'PATIENT';

    console.log('');
    console.log('📋 Step 1: Check if user exists');
    const existingUser = await prisma.user.findUnique({ where: { email } });
    console.log('User exists:', existingUser ? 'Yes' : 'No');

    console.log('');
    console.log('📋 Step 2: Hash password');
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('Password hashed successfully');

    console.log('');
    console.log('📋 Step 3: Create user');
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
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

    console.log('');
    console.log('📋 Step 4: Verify organization exists');
    const orgCheck = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    console.log('Organization found:', orgCheck ? 'Yes' : 'No');

    console.log('');
    console.log('📋 Step 5: Create user-organization relationship');
    const userOrganization = await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        role: role,
        permissions: ['USER_READ'],
        joinedAt: new Date()
      },
      include: {
        organization: true
      }
    });
    console.log('✅ User-organization created:', userOrganization.id);

    console.log('');
    console.log('📋 Step 6: Generate JWT token');
    const token = await jwtService.generateUserToken(user.id);
    console.log('✅ JWT token generated');

    console.log('');
    console.log('📋 Step 7: Generate refresh token');
    const refreshToken = await jwtService.generateRefreshToken(user.id);
    console.log('✅ Refresh token generated');

    console.log('');
    console.log('📋 Step 8: Store refresh token');
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    console.log('✅ Refresh token stored');

    console.log('');
    console.log('📋 Step 9: Create audit log');
    await auditService.log({
      action: 'USER_REGISTERED',
      userId: user.id,
      organizationId: userOrganization?.organizationId,
      metadata: { role },
      ipAddress: '127.0.0.1'
    });
    console.log('✅ Audit log created');

    console.log('');
    console.log('🎉 All registration steps completed successfully!');
    console.log('');
    console.log('📊 Final result:');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Role:', userOrganization.role);
    console.log('Organization:', userOrganization.organization.name);

  } catch (error) {
    console.error('');
    console.error('❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

directRegistrationTest();