const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantOrgAdminRole() {
  try {
    const userEmail = 'sarah.johnson@clinictest.com';

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found:', userEmail);
      process.exit(1);
    }

    console.log('✅ User Found:', user.email);
    console.log('User ID:', user.id);

    if (user.userOrganizations.length === 0) {
      console.log('❌ User has no organization memberships');
      process.exit(1);
    }

    // Get the organization membership
    const orgMembership = user.userOrganizations[0];
    console.log('\n📋 Current Organization Membership:');
    console.log('Organization:', orgMembership.organization.name);
    console.log('Current Role:', orgMembership.role);
    console.log('Current Permissions:', orgMembership.permissions);

    // ORG_ADMIN permissions according to RBAC specification
    // Only using permissions that exist in the Permission enum
    const orgAdminPermissions = [
      'ORG_SETTINGS_MANAGE',
      'ORG_USERS_MANAGE',
      'ORG_BILLING_MANAGE',
      'USER_CREATE',
      'USER_READ',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_INVITE',
      'USER_ROLE_ASSIGN',
      'PATIENT_CREATE',
      'PATIENT_READ',
      'PATIENT_UPDATE',
      'PATIENT_DELETE',
      'PATIENT_ASSIGN',
      'PATIENT_MEDICAL_RECORD_READ',
      'CLINICIAN_CREATE',
      'CLINICIAN_READ',
      'CLINICIAN_UPDATE',
      'CLINICIAN_DELETE',
      'CLINICIAN_ASSIGN',
      'PROGRAM_CREATE',
      'PROGRAM_READ',
      'PROGRAM_UPDATE',
      'PROGRAM_DELETE',
      'PROGRAM_ASSIGN',
      'ASSESSMENT_CREATE',
      'ASSESSMENT_READ',
      'ASSESSMENT_UPDATE',
      'ASSESSMENT_DELETE',
      'METRIC_CREATE',
      'METRIC_READ',
      'METRIC_UPDATE',
      'METRIC_DELETE',
      'OBSERVATION_CREATE',
      'OBSERVATION_READ',
      'OBSERVATION_UPDATE',
      'OBSERVATION_DELETE',
      'ALERT_CREATE',
      'ALERT_READ',
      'ALERT_UPDATE',
      'ALERT_DELETE',
      'ALERT_ACKNOWLEDGE',
      'MEDICATION_CREATE',
      'MEDICATION_READ',
      'MEDICATION_UPDATE',
      'MEDICATION_DELETE',
      'MEDICATION_PRESCRIBE',
      'TASK_CREATE',
      'TASK_READ',
      'TASK_UPDATE',
      'TASK_DELETE',
      'TASK_ASSIGN',
      'REPORT_READ',
      'REPORT_CREATE',
      'ANALYTICS_READ',
      'BILLING_READ',
      'BILLING_MANAGE'
    ];

    // Update role to ORG_ADMIN
    console.log('\n🔄 Updating role to ORG_ADMIN...');

    const updated = await prisma.userOrganization.update({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgMembership.organizationId
        }
      },
      data: {
        role: 'ORG_ADMIN',
        permissions: orgAdminPermissions
      },
      include: {
        organization: true
      }
    });

    console.log('✅ Role Updated Successfully!');
    console.log('\n📋 New Organization Membership:');
    console.log('Organization:', updated.organization.name);
    console.log('New Role:', updated.role);
    console.log('New Permissions Count:', updated.permissions.length);
    console.log('\n✅ User can now use bulk alert actions!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

grantOrgAdminRole();
