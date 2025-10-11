const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const jwtService = require('./src/services/jwtService');

const prisma = new PrismaClient();

async function simulateRegistrationRoute() {
  console.log('🔍 Simulating Registration Route Logic');
  console.log('');

  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'simulate-test@example.com' }
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

    // Simulate the exact request body from our test
    const req = {
      body: {
        email: 'simulate-test@example.com',
        password: 'TestPass123!',
        firstName: 'Simulate',
        lastName: 'Test',
        organizationId: organization.id,
        role: 'PATIENT'
      }
    };

    console.log('\n📝 Simulating registration route logic...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Step 1: Extract variables (same as route)
    const { 
      email,
      password, 
      firstName, 
      lastName, 
      organizationId, 
      inviteCode,
      role = 'PATIENT'
    } = req.body;

    console.log('\n✅ Step 1: Variables extracted');
    console.log('Email:', email);
    console.log('Role:', role);
    console.log('Organization ID:', organizationId);

    // Step 2: Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('❌ User already exists');
      return;
    }
    console.log('✅ Step 2: No existing user found');

    // Step 3: Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('✅ Step 3: Password hashed');

    // Step 4: Create user (exact same logic as route)
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
    console.log('✅ Step 4: User created');
    console.log('User ID:', user.id);

    // Step 5: Handle organization assignment (exact same logic as route)
    let userOrganization = null;
    if (organizationId) {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        // Cleanup created user
        await prisma.user.delete({ where: { id: user.id } });
        console.log('❌ Invalid organization - user cleaned up');
        return;
      }

      // Validate role - use UserRole enum values
      const validRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'CLINICIAN', 'NURSE', 'BILLING_ADMIN', 'PATIENT', 'CAREGIVER', 'RESEARCHER'];
      if (!validRoles.includes(role)) {
        // Cleanup created user
        await prisma.user.delete({ where: { id: user.id } });
        console.log('❌ Invalid role - user cleaned up');
        return;
      }

      // Create user-organization relationship
      userOrganization = await prisma.userOrganization.create({
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
    }
    console.log('✅ Step 5: Organization assignment completed');

    // Step 6: Generate tokens (exact same logic as route)
    const token = await jwtService.generateUserToken(user);
    const refreshToken = await jwtService.generateRefreshToken(user.id);
    console.log('✅ Step 6: Tokens generated');

    // Step 7: Store refresh token (exact same logic as route)
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    console.log('✅ Step 7: Refresh token stored');

    // Step 8: Prepare response (exact same logic as route)
    const response = {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userOrganization?.role,
        organization: userOrganization ? {
          id: userOrganization.organizationId,
          name: userOrganization.organization.name
        } : null
      },
      requiresEmailVerification: true
    };

    console.log('✅ Step 8: Response prepared');
    console.log('\n🎉 Registration simulation completed successfully!');
    console.log('Response structure:');
    console.log('- Token length:', response.token.length);
    console.log('- Refresh token length:', response.refreshToken.length);
    console.log('- User ID:', response.user.id);
    console.log('- User role:', response.user.role);
    console.log('- Organization:', response.user.organization?.name);

    console.log('\n✅ The registration route logic is working perfectly!');
    console.log('The issue must be in the Express middleware or request handling.');

  } catch (error) {
    console.log('\n❌ Registration simulation failed:');
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

simulateRegistrationRoute();