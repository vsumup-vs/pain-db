const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate JWT token with user and organization context
   */
  async generateToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      organizations: payload.organizations || [],
      currentOrganization: payload.currentOrganization || null,
      role: payload.role || null,
      permissions: payload.permissions || [],
      type: 'access'
    };

    return jwt.sign(tokenPayload, this.secret, { 
      expiresIn: this.expiresIn,
      issuer: 'pain-management-platform',
      audience: 'healthcare-users'
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId) {
    const payload = {
      userId,
      type: 'refresh'
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn: this.refreshExpiresIn,
      issuer: 'pain-management-platform',
      audience: 'healthcare-users'
    });
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'pain-management-platform',
        audience: 'healthcare-users'
      });
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * Generate token with full user context
   */
  async generateUserToken(user) {
    // Get user's organization access
    const userWithAccess = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organizationAccess: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                type: true,
                hipaaCompliant: true
              }
            }
          }
        }
      }
    });

    if (!userWithAccess) {
      throw new Error('User not found');
    }

    const organizations = userWithAccess.organizationAccess.map(access => ({
      id: access.organizationId,
      name: access.organization.name,
      type: access.organization.type,
      role: access.role,
      permissions: access.permissions || [],
      hipaaCompliant: access.organization.hipaaCompliant
    }));

    // Use primary organization as current
    const currentOrganization = organizations[0] || null;

    return this.generateToken({
      userId: user.id,
      email: user.email,
      organizations,
      currentOrganization,
      role: currentOrganization?.role,
      permissions: currentOrganization?.permissions
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const decoded = await this.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return this.generateUserToken(user);
  }
}

module.exports = new JWTService();