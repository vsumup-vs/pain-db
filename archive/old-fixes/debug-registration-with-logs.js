const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { prisma } = require('./src/services/db');
const jwtService = require('./src/services/jwtService');

const app = express();
app.use(express.json());

// Debug registration endpoint with extensive logging
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('organizationId').optional().isString(),
  body('inviteCode').optional().isString()
], async (req, res) => {
  console.log('🔍 Registration request received:', req.body);
  
  try {
    console.log('🔍 Step 1: Validating input...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }
    console.log('✅ Validation passed');

    console.log('🔍 Step 2: Extracting data...');
    const { 
      email,
      password, 
      firstName, 
      lastName, 
      organizationId, 
      inviteCode,
      role = 'PATIENT'
    } = req.body;
    console.log('✅ Data extracted:', { email, firstName, lastName, organizationId, role });

    console.log('🔍 Step 3: Checking existing user...');
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ error: 'User already exists' });
    }
    console.log('✅ User does not exist');

    console.log('🔍 Step 4: Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed');

    console.log('🔍 Step 5: Creating user...');
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        emailVerified: null, // FIXED: Changed from false to null
        isActive: true
      }
    });
    console.log('✅ User created:', { id: user.id, email: user.email });

    console.log('🔍 Step 6: Handling organization assignment...');
    let userOrganization = null;
    if (organizationId) {
      console.log('🔍 Step 6a: Verifying organization...');
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        console.log('❌ Invalid organization, cleaning up user...');
        await prisma.user.delete({ where: { id: user.id } });
        return res.status(400).json({ error: 'Invalid organization' });
      }
      console.log('✅ Organization verified:', organization.name);

      console.log('🔍 Step 6b: Validating role...');
      const validRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'CLINICIAN', 'NURSE', 'BILLING_ADMIN', 'PATIENT', 'CAREGIVER', 'RESEARCHER'];
      if (!validRoles.includes(role)) {
        console.log('❌ Invalid role, cleaning up user...');
        await prisma.user.delete({ where: { id: user.id } });
        return res.status(400).json({ error: 'Invalid role' });
      }
      console.log('✅ Role validated:', role);

      console.log('🔍 Step 6c: Creating user organization...');
      userOrganization = await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId,
          role,
          isActive: true
        },
        include: {
          organization: true
        }
      });
      console.log('✅ User organization created');
    }

    console.log('🔍 Step 7: Generating tokens...');
    const token = await jwtService.generateUserToken(user);
    console.log('✅ User token generated');
    
    const refreshToken = await jwtService.generateRefreshToken(user.id);
    console.log('✅ Refresh token generated');

    console.log('🔍 Step 8: Storing refresh token...');
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
    console.log('✅ Refresh token stored');

    console.log('🔍 Step 9: Sending response...');
    res.status(201).json({
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
    });
    console.log('✅ Registration completed successfully');

  } catch (error) {
    console.error('❌ Registration error at step:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.listen(3001, () => {
  console.log('🔍 Debug registration server running on port 3001');
});