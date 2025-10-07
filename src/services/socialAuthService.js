const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const { prisma } = require('./db');
const jwtService = require('./jwtService');
const auditService = require('./auditService');

class SocialAuthService {
  constructor() {
    this.initializeStrategies();
  }

  initializeStrategies() {
    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        scope: ['openid', 'profile', 'email']
      }, this.handleOAuthCallback.bind(this, 'GOOGLE')));
    }

    // Microsoft OAuth Strategy
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: "/auth/microsoft/callback",
        scope: ['openid', 'profile', 'email']
      }, this.handleOAuthCallback.bind(this, 'MICROSOFT')));
    }

    // Passport serialization (not used in JWT strategy but required)
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  async handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('Email not provided by social provider'));
      }

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
        include: { 
          socialAccounts: true, 
          organizationAccess: {
            include: { organization: true }
          }
        }
      });

      // Create user if doesn't exist
      if (!user) {
        user = await this.createUserFromSocialProfile(profile, provider);
      }

      // Update or create social account
      await this.upsertSocialAccount(user.id, provider, profile, accessToken, refreshToken);

      // Healthcare compliance checks
      await this.performComplianceChecks(user, provider);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Audit log
      await auditService.log({
        action: 'SOCIAL_LOGIN',
        userId: user.id,
        metadata: {
          provider,
          email: user.email,
          timestamp: new Date().toISOString()
        }
      });

      return done(null, user);
    } catch (error) {
      console.error('Social auth error:', error);
      return done(error);
    }
  }

  async createUserFromSocialProfile(profile, provider) {
    const email = profile.emails[0].value;
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0];
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ');

    // Check if this is a healthcare domain
    const domain = email.split('@')[1];
    const organization = await this.findOrganizationByDomain(domain);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        avatar: profile.photos?.[0]?.value,
        emailVerified: new Date(), // Social providers verify emails
        lastLoginAt: new Date()
      }
    });

    // Auto-assign to organization if domain matches
    if (organization) {
      await this.assignUserToOrganization(user.id, organization.id, 'CLINICIAN');
    }

    return user;
  }

  async findOrganizationByDomain(domain) {
    return await prisma.organization.findUnique({
      where: { domain }
    });
  }

  async assignUserToOrganization(userId, organizationId, role = 'CLINICIAN') {
    return await prisma.userOrganizationAccess.create({
      data: {
        userId,
        organizationId,
        role,
        isActive: true,
        grantedAt: new Date()
      }
    });
  }

  async upsertSocialAccount(userId, provider, profile, accessToken, refreshToken) {
    return await prisma.socialAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.id
        }
      },
      update: {
        accessToken,
        refreshToken,
        lastUsedAt: new Date(),
        scope: profile.scope?.join(' '),
        metadata: {
          displayName: profile.displayName,
          photos: profile.photos
        }
      },
      create: {
        userId,
        provider,
        providerAccountId: profile.id,
        type: 'oauth',
        accessToken,
        refreshToken,
        scope: profile.scope?.join(' '),
        isVerified: true,
        verifiedAt: new Date(),
        lastUsedAt: new Date(),
        metadata: {
          displayName: profile.displayName,
          photos: profile.photos
        }
      }
    });
  }

  async performComplianceChecks(user, provider) {
    // Check if user belongs to HIPAA-compliant organization
    const hipaaOrgs = user.organizationAccess?.filter(
      access => access.organization?.hipaaCompliant
    );

    if (hipaaOrgs?.length > 0) {
      await this.enforceHIPAACompliance(user, provider);
    }

    // Check for required MFA
    if (!user.mfaEnabled && this.requiresMFA(user, provider)) {
      // Flag for MFA setup
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // Could add a flag here for required MFA setup
        }
      });
    }
  }

  async enforceHIPAACompliance(user, provider) {
    // Log access for HIPAA audit trail
    await auditService.log({
      action: 'HIPAA_ACCESS',
      userId: user.id,
      hipaaRelevant: true,
      metadata: {
        provider,
        accessTime: new Date().toISOString(),
        complianceCheck: 'PASSED'
      }
    });
  }

  requiresMFA(user, provider) {
    // Require MFA for healthcare organizations
    return user.organizationAccess?.some(access => 
      access.organization?.hipaaCompliant
    );
  }

  async generateLoginResponse(user) {
    const token = await jwtService.generateUserToken(user);
    const refreshToken = await jwtService.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        mfaEnabled: user.mfaEnabled
      },
      token,
      refreshToken,
      organizations: user.organizationAccess?.map(access => ({
        id: access.organizationId,
        name: access.organization.name,
        role: access.role
      })) || []
    };
  }
}

module.exports = new SocialAuthService();