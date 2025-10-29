const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');

const { prisma } = require('../services/db');
const jwtService = require('../services/jwtService');
const rbacService = require('../services/rbacService');
const socialAuthService = require('../services/socialAuthService');
const auditService = require('../services/auditService');
const { 
  requireAuth, 
  requirePermission, 
  requireRole,
  requireOrganization,
  optionalAuth 
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many failed attempts, please try again later' }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /auth/login - Local login with email/password
 */
router.post('/login', 
  strictAuthLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { email,
          passwordHash, password, mfaCode, organizationId } = req.body;

      // Find user with organizations
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userOrganizations: {
            include: {
              organization: true
            }
          }
        }
      });

      if (!user || !user.passwordHash || !user.isActive) {
        await auditService.log({
          action: 'LOGIN_FAILED',
          metadata: { email,
          passwordHash, reason: 'user_not_found_or_inactive' },
          ipAddress: req.ip
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        await auditService.log({
          action: 'LOGIN_FAILED',
          userId: user.id,
          metadata: { email,
          passwordHash, reason: 'invalid_password' },
          ipAddress: req.ip
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaCode) {
          return res.status(200).json({ 
            requiresMFA: true,
            userId: user.id // For MFA verification
          });
        }

        const isValidMFA = speakeasy.totp.verify({
          secret: user.mfaSecret,
          encoding: 'base32',
          token: mfaCode,
          window: 2
        });

        if (!isValidMFA) {
          await auditService.log({
            action: 'MFA_FAILED',
            userId: user.id,
            ipAddress: req.ip
          });
          return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }

      // Handle organization selection
      let selectedOrganization = null;
      if (organizationId) {
        selectedOrganization = user.userOrganizations.find(
          uo => uo.organizationId === organizationId
        );
        if (!selectedOrganization) {
          return res.status(400).json({ 
            error: 'Invalid organization selection' 
          });
        }
      } else if (user.userOrganizations.length === 1) {
        selectedOrganization = user.userOrganizations[0];
      }

      // Generate enhanced JWT token
      const token = await jwtService.generateUserToken(user, selectedOrganization);
      const refreshToken = await jwtService.generateRefreshToken(user.id);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Audit log
      await auditService.log({
        action: 'LOGIN_SUCCESS',
        userId: user.id,
        organizationId: selectedOrganization?.organizationId,
        ipAddress: req.ip
      });

      const response = {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isPlatformAdmin: user.isPlatformAdmin || false,
          role: selectedOrganization?.role,
          organizations: user.userOrganizations.map(uo => ({
            id: uo.organizationId,
            name: uo.organization.name,
            role: uo.role
          }))
        }
      };

      // If multiple organizations, require organization selection
      if (!selectedOrganization && user.userOrganizations.length > 1) {
        response.requiresOrganizationSelection = true;
        response.availableOrganizations = user.userOrganizations.map(uo => ({
          id: uo.organizationId,
          name: uo.organization.name,
          type: uo.organization.type,
          role: uo.role
        }));
      }

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

/**
 * POST /auth/register - User registration
 */
router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
    body('organizationId').optional().isString(),
    body('inviteCode').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { 
        email,
        password, 
        firstName, 
        lastName, 
        organizationId, 
        inviteCode,
        role = 'PATIENT' // Default role
      } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
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

      // Handle organization assignment
      let userOrganization = null;
      if (organizationId) {
        // Verify organization exists
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId }
        });

        if (!organization) {
          return res.status(400).json({ error: 'Organization not found' });
        }

        // Assign user to organization
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

      // Generate tokens AFTER user-organization relationship is created
      const token = await jwtService.generateUserToken({ id: user.id });
      const refreshToken = await jwtService.generateRefreshToken(user.id);

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Audit log
      await auditService.log({
        action: 'USER_REGISTERED',
        userId: user.id,
        organizationId: userOrganization?.organizationId,
        metadata: { role },
        ipAddress: req.ip
      });

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
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * POST /auth/refresh - Refresh JWT token
 */
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = await jwtService.verifyToken(refreshToken);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Check if refresh token exists and is valid
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() }
      }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user with current context
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new tokens
    const newToken = await jwtService.generateUserToken(user);
    const newRefreshToken = await jwtService.generateRefreshToken(user.id);

    // Update refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

/**
 * POST /auth/select-organization - Select active organization
 */
router.post('/select-organization', requireAuth, async (req, res) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Verify user has access to this organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: req.user.userId,
        organizationId: organizationId
      },
      include: {
        organization: true
      }
    });

    if (!userOrg) {
      return res.status(403).json({ error: 'Access denied to organization' });
    }

    // Generate new token with organization context
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    const token = await jwtService.generateUserToken(user, userOrg);

    // Audit log
    await auditService.log({
      action: 'ORGANIZATION_SELECTED',
      userId: req.user.userId,
      organizationId: organizationId,
      ipAddress: req.ip
    });

    res.json({
      token,
      organization: {
        id: userOrg.organizationId,
        name: userOrg.organization.name,
        type: userOrg.organization.type,
        role: userOrg.role
      }
    });
  } catch (error) {
    console.error('Organization selection error:', error);
    res.status(500).json({ error: 'Organization selection failed' });
  }
});

/**
 * POST /auth/switch-organization - Switch active organization (alias for select-organization)
 */
router.post('/switch-organization', requireAuth, async (req, res) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Verify user has access to this organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: req.user.userId,
        organizationId: organizationId
      },
      include: {
        organization: true
      }
    });

    if (!userOrg) {
      return res.status(403).json({ error: 'Access denied to organization' });
    }

    // Generate new token with organization context using switchOrganization method
    const token = await jwtService.switchOrganization(req.user.userId, organizationId);

    // Audit log
    await auditService.log({
      action: 'ORGANIZATION_SWITCHED',
      userId: req.user.userId,
      organizationId: organizationId,
      ipAddress: req.ip
    });

    res.json({
      token,
      organization: {
        id: userOrg.organizationId,
        name: userOrg.organization.name,
        type: userOrg.organization.type,
        role: userOrg.role
      }
    });
  } catch (error) {
    console.error('Organization switch error:', error);
    res.status(500).json({ error: 'Organization switch failed' });
  }
});

/**
 * POST /auth/logout - Logout user
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Invalidate refresh token if provided
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId: req.user.userId
        }
      });
    }

    // Audit log
    await auditService.log({
      action: 'LOGOUT',
      userId: req.user.userId,
      organizationId: req.user.currentOrganization,
      ipAddress: req.ip
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /auth/me - Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has a Clinician record in their current organization
    // This determines if they can perform clinical actions (claim alerts, log time, etc.)
    const currentOrgId = req.user.currentOrganization;
    let clinicianRecord = null;

    if (currentOrgId) {
      clinicianRecord = await prisma.clinician.findFirst({
        where: {
          email: user.email,
          organizationId: currentOrgId
        },
        select: {
          id: true,
          specialization: true,
          licenseNumber: true
        }
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isPlatformAdmin: user.isPlatformAdmin || false,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      organizations: user.userOrganizations.map(uo => ({
        organizationId: uo.organizationId, // Add organizationId for Layout component
        id: uo.organizationId,
        name: uo.organization.name,
        type: uo.organization.type,
        role: uo.role,
        permissions: uo.permissions,
        joinedAt: uo.joinedAt
      })),
      currentOrganization: req.user.currentOrganization,
      permissions: req.user.permissions || [],
      // Clinical access flags (Phase 1a: Role-based UI)
      hasClinician: !!clinicianRecord,
      clinician: clinicianRecord ? {
        id: clinicianRecord.id,
        specialization: clinicianRecord.specialization,
        licenseNumber: clinicianRecord.licenseNumber
      } : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * PUT /auth/profile - Update user profile
 */
router.put('/profile', 
  requireAuth,
  [
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
    body('email').optional().isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { firstName, lastName, email } = req.body;
      const updateData = {};

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) {
        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
          where: { 
            email,
                      id: { not: req.user.userId }
          }
        });
        
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        
        updateData.email = email;
        updateData.emailVerified = false; // Require re-verification
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: updateData
      });

      // Audit log
      await auditService.log({
        action: 'PROFILE_UPDATED',
        userId: req.user.userId,
        organizationId: req.user.currentOrganization,
        metadata: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip
      });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
                  firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        emailVerified: updatedUser.emailVerified
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Profile update failed' });
    }
  }
);

// ============================================================================
// PASSWORD RESET ROUTES
// ============================================================================

/**
 * POST /auth/forgot-password - Request password reset email
 */
router.post('/forgot-password',
  strictAuthLimiter,
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });

      // Don't reveal if user exists (security best practice)
      if (!user) {
        return res.json({
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing (security best practice)
      const hashedToken = await bcrypt.hash(resetToken, 10);

      // Set expiration (1 hour from now)
      const resetExpires = new Date(Date.now() + 3600000);

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: resetExpires
        }
      });

      // Send password reset email
      const notificationService = require('../services/notificationService');
      await notificationService.sendPasswordResetEmail(user.email, resetToken, user.firstName);

      // Audit log
      await auditService.log({
        action: 'PASSWORD_RESET_REQUESTED',
        userId: user.id,
        metadata: { email },
        ipAddress: req.ip
      });

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }
);

/**
 * POST /auth/reset-password - Reset password with token
 */
router.post('/reset-password',
  strictAuthLimiter,
  [
    body('token').isString().isLength({ min: 64, max: 64 }),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token, newPassword } = req.body;

      // Find all users with non-expired reset tokens
      const users = await prisma.user.findMany({
        where: {
          passwordResetToken: { not: null },
          passwordResetExpires: { gt: new Date() }
        }
      });

      // Find user by comparing token hashes
      let matchedUser = null;
      for (const user of users) {
        const isMatch = await bcrypt.compare(token, user.passwordResetToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }

      if (!matchedUser) {
        return res.status(400).json({
          error: 'Invalid or expired reset token'
        });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update user password and clear reset token
      await prisma.user.update({
        where: { id: matchedUser.id },
        data: {
          passwordHash: newPasswordHash,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      // Invalidate all refresh tokens (force re-login everywhere for security)
      await prisma.refreshToken.deleteMany({
        where: { userId: matchedUser.id }
      });

      // Send confirmation email
      const notificationService = require('../services/notificationService');
      await notificationService.sendPasswordChangedEmail(matchedUser.email, matchedUser.firstName);

      // Audit log
      await auditService.log({
        action: 'PASSWORD_RESET_COMPLETED',
        userId: matchedUser.id,
        metadata: { email: matchedUser.email },
        ipAddress: req.ip
      });

      res.json({
        message: 'Password reset successful. Please log in with your new password.'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// ============================================================================
// SOCIAL AUTHENTICATION ROUTES
// ============================================================================

// Social login initiation routes
router.get('/google', authLimiter, passport.authenticate('google', {
  scope: ['openid', 'profile', 'email']
}));

router.get('/microsoft', authLimiter, passport.authenticate('microsoft', {
  scope: ['openid', 'profile', 'email']
}));

// Social login callback routes
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const loginResponse = await socialAuthService.generateLoginResponse(req.user);
      
      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${loginResponse.token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false }),
  async (req, res) => {
    try {
      const loginResponse = await socialAuthService.generateLoginResponse(req.user);
      
      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${loginResponse.token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Microsoft callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /auth/users - List users (Admin only)
 */
router.get('/users', 
  requireAuth, 
  requirePermission('USER_READ'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, organizationId, role } = req.query;
      const skip = (page - 1) * limit;

      const where = {};

      // Check if user is platform admin
      const isPlatformAdmin = req.user.isPlatformAdmin || false;

      // Build organization filter
      const someConditions = {};

      // Non-platform admin users can only see users from their own organizations
      if (!isPlatformAdmin) {
        const userOrgIds = req.user.organizations.map(org => org.organizationId);
        someConditions.organizationId = { in: userOrgIds };
      }

      // Apply additional filters if specified
      if (organizationId) {
        // Override with specific organization if provided
        someConditions.organizationId = organizationId;
      }

      if (role) {
        someConditions.role = role;
      }

      // Apply the filter (always apply for non-platform admin, only when filters specified for platform admin)
      if (!isPlatformAdmin || organizationId || role) {
        where.userOrganizations = {
          some: someConditions
        };
      }

      const users = await prisma.user.findMany({
        where,
        include: {
          userOrganizations: {
            include: {
              organization: true
            }
          }
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.user.count({ where });

      res.json({
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          organizations: user.userOrganizations.map(uo => ({
            id: uo.organizationId,
            name: uo.organization.name,
            role: uo.role
          }))
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  }
);

/**
 * POST /auth/users/:userId/assign-role - Assign role to user
 */
router.post('/users/:userId/assign-role',
  requireAuth,
  requirePermission('ORG_USER_MANAGE'),
  [
    body('organizationId').isString(),
    body('role').isString()
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { organizationId, role } = req.body;

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify organization exists
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });

      if (!organization) {
        return res.status(400).json({ error: 'Invalid organization' });
      }

      // Create or update user organization assignment
      const userOrg = await prisma.userOrganization.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        },
        update: {
          role,
          updatedAt: new Date()
        },
        create: {
          userId,
          organizationId,
          role,
          permissions: ['USER_READ'],
          joinedAt: new Date()
        },
        include: {
          organization: true
        }
      });

      // Audit log
      await auditService.log({
        action: 'ROLE_ASSIGNED',
        userId: req.user.userId,
        organizationId,
        metadata: {
          targetUserId: userId,
          role
        },
        ipAddress: req.ip
      });

      res.json({
        message: 'Role assigned successfully',
        assignment: {
          userId,
          organizationId,
          organizationName: userOrg.organization.name,
          role: userOrg.role
        }
      });
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(500).json({ error: 'Failed to assign role' });
    }
  }
);

module.exports = router;