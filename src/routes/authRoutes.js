const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');

const { prisma } = require('../services/db');
const jwtService = require('../services/jwtService');
const socialAuthService = require('../services/socialAuthService');
const auditService = require('../services/auditService');

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
  handleSocialCallback
);

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false }),
  handleSocialCallback
);

// Local authentication routes
router.post('/login', 
  strictAuthLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
  ],
  handleLocalLogin
);

router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 })
  ],
  handleRegistration
);

// Token refresh
router.post('/refresh', authLimiter, handleTokenRefresh);

// MFA routes
router.post('/mfa/setup', requireAuth, handleMFASetup);
router.post('/mfa/verify', authLimiter, handleMFAVerification);
router.post('/mfa/disable', requireAuth, handleMFADisable);

// Organization selection
router.post('/select-organization', requireAuth, handleOrganizationSelection);

// Logout
router.post('/logout', requireAuth, handleLogout);

// Password reset
router.post('/forgot-password', authLimiter, handleForgotPassword);
router.post('/reset-password', authLimiter, handleResetPassword);

async function handleSocialCallback(req, res) {
  try {
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
    }

    const loginResponse = await socialAuthService.generateLoginResponse(user);

    // Check if MFA is required but not enabled
    if (socialAuthService.requiresMFA(user) && !user.mfaEnabled) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/setup-mfa?token=${loginResponse.token}`);
    }

    // Check if organization selection is needed
    if (loginResponse.organizations.length > 1) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/select-organization?token=${loginResponse.token}`);
    }

    // Set secure cookies
    res.cookie('authToken', loginResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie('refreshToken', loginResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Successful login
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Social callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
}

async function handleLocalLogin(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, mfaCode } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizationAccess: {
          include: { organization: true }
        }
      }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await auditService.log({
        action: 'LOGIN_FAILED',
        metadata: { email, reason: 'invalid_password' },
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(200).json({ requiresMFA: true });
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

    // Generate tokens
    const loginResponse = await socialAuthService.generateLoginResponse(user);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Audit log
    await auditService.log({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      ipAddress: req.ip
    });

    res.json(loginResponse);
  } catch (error) {
    console.error('Local login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

async function handleRegistration(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, firstName, lastName, organizationDomain } = req.body;

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
        emailVerified: new Date() // In production, send verification email
      }
    });

    // Auto-assign to organization if domain provided
    if (organizationDomain) {
      const organization = await socialAuthService.findOrganizationByDomain(organizationDomain);
      if (organization) {
        await socialAuthService.assignUserToOrganization(user.id, organization.id, 'CLINICIAN');
      }
    }

    // Generate tokens
    const loginResponse = await socialAuthService.generateLoginResponse(user);

    // Audit log
    await auditService.log({
      action: 'USER_REGISTERED',
      userId: user.id,
      ipAddress: req.ip
    });

    res.status(201).json(loginResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function handleTokenRefresh(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const newToken = await jwtService.refreshToken(refreshToken);
    
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function handleMFASetup(req, res) {
  try {
    const userId = req.user.userId;
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Pain Management Platform (${req.user.email})`,
      issuer: 'Pain Management Platform'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not activated until verified)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 }
    });

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
}

async function handleMFAVerification(req, res) {
  try {
    const { token, userId } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not set up' });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA code' });
    }

    // Activate MFA
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });

    await auditService.log({
      action: 'MFA_ENABLED',
      userId,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
}

async function handleMFADisable(req, res) {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Verify password for security
    if (user.passwordHash) {
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: []
      }
    });

    await auditService.log({
      action: 'MFA_DISABLED',
      userId,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'MFA disable failed' });
  }
}

async function handleOrganizationSelection(req, res) {
  try {
    const { organizationId } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this organization
    const access = await prisma.userOrganizationAccess.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true
      },
      include: { organization: true }
    });

    if (!access) {
      return res.status(403).json({ error: 'Access denied to organization' });
    }

    // Generate new token with organization context
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const token = await jwtService.generateToken({
      userId: user.id,
      email: user.email,
      currentOrganization: {
        id: access.organizationId,
        name: access.organization.name,
        type: access.organization.type
      },
      role: access.role,
      permissions: access.permissions || []
    });

    res.json({ token });
  } catch (error) {
    console.error('Organization selection error:', error);
    res.status(500).json({ error: 'Organization selection failed' });
  }
}

async function handleLogout(req, res) {
  try {
    await auditService.log({
      action: 'LOGOUT',
      userId: req.user.userId,
      ipAddress: req.ip
    });

    // Clear cookies
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // TODO: Send email with reset link
    // await emailService.sendPasswordReset(email, resetToken);

    await auditService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      ipAddress: req.ip
    });

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
}

async function handleResetPassword(req, res) {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    await auditService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      userId: user.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
}

// Authentication middleware
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = await jwtService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = router;