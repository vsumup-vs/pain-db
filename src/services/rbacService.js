const { prisma } = require('./db');

class RBACService {
  constructor() {
    // Define default role templates
    this.defaultRoleTemplates = {
      SUPER_ADMIN: {
        name: 'Super Administrator',
        permissions: ['SYSTEM_ADMIN', 'AUDIT_READ'],
        programTypes: ['RTM', 'RPM', 'CCM', 'PCM', 'BHI', 'CUSTOM']
      },
      ORG_ADMIN: {
        name: 'Organization Administrator',
        permissions: ['ORG_USER_MANAGE', 'ORG_SETTINGS_MANAGE', 'PROGRAM_READ', 'PROGRAM_WRITE', 'USER_READ', 'USER_CREATE'],
        programTypes: ['RTM', 'RPM', 'CCM', 'PCM', 'BHI', 'CUSTOM']
      },
      CLINICIAN: {
        name: 'Clinician',
        permissions: ['PATIENT_READ', 'PATIENT_WRITE', 'OBSERVATION_READ', 'OBSERVATION_WRITE', 'ASSESSMENT_READ', 'ASSESSMENT_WRITE'],
        programTypes: ['RTM', 'RPM', 'CCM', 'PCM', 'BHI']
      },
      NURSE: {
        name: 'Nurse',
        permissions: ['PATIENT_READ', 'OBSERVATION_READ', 'OBSERVATION_WRITE', 'ASSESSMENT_READ'],
        programTypes: ['RTM', 'RPM', 'CCM']
      },
      BILLING_ADMIN: {
        name: 'Billing Administrator',
        permissions: ['BILLING_READ', 'BILLING_WRITE', 'COMPLIANCE_READ', 'PATIENT_READ'],
        programTypes: ['RTM', 'RPM', 'CCM', 'PCM', 'BHI']
      }
    };
  }

  /**
   * Initialize default role templates
   */
  async initializeRoleTemplates() {
    try {
      for (const [role, template] of Object.entries(this.defaultRoleTemplates)) {
        await prisma.roleTemplate.upsert({
          where: { name: template.name },
          update: {
            permissions: template.permissions,
            programTypes: template.programTypes
          },
          create: {
            name: template.name,
            role: role,
            permissions: template.permissions,
            programTypes: template.programTypes,
            isSystem: true
          }
        });
      }
      console.log('✅ Role templates initialized');
    } catch (error) {
      console.error('❌ Error initializing role templates:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userPermissions, requiredPermission) {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('SYSTEM_ADMIN');
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(userPermissions, requiredPermissions) {
    return requiredPermissions.some(permission => this.hasPermission(userPermissions, permission));
  }

  /**
   * Check if user has all required permissions
   */
  hasAllPermissions(userPermissions, requiredPermissions) {
    return requiredPermissions.every(permission => this.hasPermission(userPermissions, permission));
  }

  /**
   * Get permissions for a role template
   */
  async getRolePermissions(role) {
    const template = await prisma.roleTemplate.findFirst({
      where: { role: role }
    });
    return template?.permissions || [];
  }

  /**
   * Assign user to organization with role
   */
  async assignUserToOrganization(userId, organizationId, role, programIds = []) {
    try {
      const rolePermissions = await this.getRolePermissions(role);
      
      return await prisma.userOrganization.create({
        data: {
          userId,
          organizationId,
          role,
          permissions: rolePermissions,
          programAccess: programIds,
          canBill: ['CLINICIAN', 'BILLING_ADMIN'].includes(role)
        }
      });
    } catch (error) {
      console.error('Error assigning user to organization:', error);
      throw error;
    }
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId, organizationId, permissions, programAccess) {
    try {
      return await prisma.userOrganization.update({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        },
        data: {
          permissions,
          programAccess
        }
      });
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw error;
    }
  }

  /**
   * Create middleware for permission checking
   */
  requirePermission(requiredPermissions) {
    return (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const userPermissions = user.permissions || [];
        
        if (Array.isArray(requiredPermissions)) {
          if (!this.hasAnyPermission(userPermissions, requiredPermissions)) {
            return res.status(403).json({ 
              error: 'Insufficient permissions',
              required: requiredPermissions,
              current: userPermissions
            });
          }
        } else {
          if (!this.hasPermission(userPermissions, requiredPermissions)) {
            return res.status(403).json({ 
              error: 'Insufficient permissions',
              required: requiredPermissions,
              current: userPermissions
            });
          }
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  }

  /**
   * Create middleware for program access checking
   */
  requireProgramAccess(programId = null) {
    return (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // If no specific program required, check if user has any program access
        if (!programId) {
          if (!user.programAccess || user.programAccess.length === 0) {
            return res.status(403).json({ error: 'No program access' });
          }
          return next();
        }

        // Check specific program access
        if (!user.programAccess.includes(programId)) {
          return res.status(403).json({ 
            error: 'Program access denied',
            required: programId,
            available: user.programAccess
          });
        }

        next();
      } catch (error) {
        console.error('Program access check error:', error);
        res.status(500).json({ error: 'Program access check failed' });
      }
    };
  }
}

module.exports = new RBACService();