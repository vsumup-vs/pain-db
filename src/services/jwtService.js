const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('./db');

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate JWT token with enhanced user, organization, and program context
   */
  async generateToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      isPlatformAdmin: payload.isPlatformAdmin || false,
      organizations: payload.organizations || [],
      currentOrganization: payload.currentOrganization || null,
      role: payload.role || null,
      permissions: payload.permissions || [],
      programAccess: payload.programAccess || [], // New: programs user can access
      currentProgram: payload.currentProgram || null, // New: currently selected program
      billingContext: payload.billingContext || null, // New: billing permissions
      type: 'access'
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'pain-management-platform', // FIXED: consistent issuer
      audience: 'healthcare-users'
    });
  }

  /**
   * Generate refresh token with unique JTI to prevent duplicate tokens
   */
  async generateRefreshToken(userId) {
    const payload = {
      userId,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex') // Add unique JWT ID to ensure each refresh token is unique
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
    try {
      // Validate user object has required id field
      if (!user || !user.id) {
        throw new Error('User object must have an id field');
      }
      const userWithOrgs = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userOrganizations: {
            where: { isActive: true },
            include: {
              organization: {
                include: {
                  carePrograms: {
                    where: { isActive: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!userWithOrgs) {
        throw new Error('User not found');
      }

      // Build organizations array with enhanced context
      const organizations = userWithOrgs.userOrganizations.map(access => ({
        organizationId: access.organization.id, // FIXED: Use organizationId to match middleware expectations
        name: access.organization.name,
        domain: access.organization.domain,
        isActive: access.organization.isActive,
        role: access.role,
        permissions: access.permissions,
        programAccess: access.programAccess,
        canBill: access.canBill,
        billingRate: access.billingRate,
        availablePrograms: access.organization.carePrograms.map(program => ({
          id: program.id,
          name: program.name,
          type: program.type,
          cptCodes: program.cptCodes,
          requiredPermissions: program.requiredPermissions
        }))
      }));

      // Default to first organization if available
      const firstOrg = organizations.length > 0 ? organizations[0] : null;
      const currentOrganization = firstOrg?.organizationId || null;

      // Get accessible programs for current organization
      const accessiblePrograms = firstOrg?.availablePrograms.filter(program =>
        firstOrg.programAccess.includes(program.id) ||
        this.hasRequiredPermissions(firstOrg.permissions, program.requiredPermissions)
      ) || [];

      return this.generateToken({
        userId: userWithOrgs.id,
        email: userWithOrgs.email,
        isPlatformAdmin: userWithOrgs.isPlatformAdmin || false,
        organizations,
        currentOrganization,
        role: firstOrg?.role,
        permissions: firstOrg?.permissions || [],
        programAccess: accessiblePrograms.map(p => p.id),
        currentProgram: accessiblePrograms.length > 0 ? accessiblePrograms[0] : null,
        billingContext: firstOrg ? {
          canBill: firstOrg.canBill,
          billingRate: firstOrg.billingRate
        } : null
      });
    } catch (error) {
      console.error('Error generating user token:', error);
      throw error;
    }
  }

  /**
   * Check if user has required permissions
   */
  hasRequiredPermissions(userPermissions, requiredPermissions) {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (!userPermissions || userPermissions.length === 0) return false;
    
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Switch to a different organization context
   */
  async switchOrganization(userId, organizationId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOrganizations: {
          where: { isActive: true },
          include: {
            organization: {
              include: {
                carePrograms: {
                  where: { isActive: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify user has access to this organization
    const orgAccess = user.userOrganizations.find(
      uo => uo.organization.id === organizationId
    );

    if (!orgAccess) {
      throw new Error('User does not have access to this organization');
    }

    // Build organizations array
    const organizations = user.userOrganizations.map(access => ({
      organizationId: access.organization.id,
      name: access.organization.name,
      domain: access.organization.domain,
      isActive: access.organization.isActive,
      role: access.role,
      permissions: access.permissions,
      programAccess: access.programAccess,
      canBill: access.canBill,
      billingRate: access.billingRate,
      availablePrograms: access.organization.carePrograms.map(program => ({
        id: program.id,
        name: program.name,
        type: program.type,
        cptCodes: program.cptCodes,
        requiredPermissions: program.requiredPermissions
      }))
    }));

    // Get accessible programs for selected organization
    const accessiblePrograms = orgAccess.organization.carePrograms.filter(program =>
      orgAccess.programAccess.includes(program.id) ||
      this.hasRequiredPermissions(orgAccess.permissions, program.requiredPermissions)
    ).map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      cptCodes: p.cptCodes,
      requiredPermissions: p.requiredPermissions
    }));

    return this.generateToken({
      userId: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin || false,
      organizations,
      currentOrganization: organizationId,
      role: orgAccess.role,
      permissions: orgAccess.permissions || [],
      programAccess: accessiblePrograms.map(p => p.id),
      currentProgram: accessiblePrograms.length > 0 ? accessiblePrograms[0] : null,
      billingContext: {
        canBill: orgAccess.canBill,
        billingRate: orgAccess.billingRate
      }
    });
  }

  /**
   * Switch to a different program context
   */
  async switchProgram(token, programId) {
    const decoded = await this.verifyToken(token);

    // Find the program in user's accessible programs
    const program = decoded.programAccess.find(p => p.id === programId);
    if (!program) {
      throw new Error('Program not accessible to user');
    }

    // Generate new token with updated program context
    return this.generateToken({
      ...decoded,
      currentProgram: program
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