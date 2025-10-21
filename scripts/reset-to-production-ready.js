const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Reset database to production-ready state:
 * - Clear all user-generated data (patients, orgs, alerts, etc.)
 * - Keep standardized seed data (condition presets, metrics, templates, alert rules)
 * - Create a single org admin user ready to create their organization
 */

async function resetToProductionReady() {
  console.log('🔄 Resetting database to production-ready state...\n');

  try {
    // Step 1: Delete all organization-specific data (in correct order to avoid FK violations)
    console.log('📦 Deleting organization-specific data...');

    // Delete audit logs
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`   ✓ Deleted ${auditLogs.count} audit logs`);

    // Delete social accounts
    const socialAccounts = await prisma.socialAccount.deleteMany({});
    console.log(`   ✓ Deleted ${socialAccounts.count} social accounts`);

    // Delete time logs
    const timeLogs = await prisma.timeLog.deleteMany({});
    console.log(`   ✓ Deleted ${timeLogs.count} time logs`);

    // Delete alerts
    const alerts = await prisma.alert.deleteMany({});
    console.log(`   ✓ Deleted ${alerts.count} alerts`);

    // Delete assessments
    const assessments = await prisma.assessment.deleteMany({});
    console.log(`   ✓ Deleted ${assessments.count} assessments`);

    // Delete observations
    const observations = await prisma.observation.deleteMany({});
    console.log(`   ✓ Deleted ${observations.count} observations`);

    // Delete medication adherence logs
    const adherenceLogs = await prisma.medicationAdherence.deleteMany({});
    console.log(`   ✓ Deleted ${adherenceLogs.count} medication adherence logs`);

    // Delete patient medications
    const patientMeds = await prisma.patientMedication.deleteMany({});
    console.log(`   ✓ Deleted ${patientMeds.count} patient medications`);

    // Delete enrollments
    const enrollments = await prisma.enrollment.deleteMany({});
    console.log(`   ✓ Deleted ${enrollments.count} enrollments`);

    // Delete patients
    const patients = await prisma.patient.deleteMany({});
    console.log(`   ✓ Deleted ${patients.count} patients`);

    // Delete clinicians
    const clinicians = await prisma.clinician.deleteMany({});
    console.log(`   ✓ Deleted ${clinicians.count} clinicians`);

    // Delete organization-specific condition presets, templates, alert rules, metrics
    console.log('\n📦 Deleting organization-specific configurations...');

    // Delete org-specific condition preset relationships first
    const presetDiagnoses = await prisma.conditionPresetDiagnosis.deleteMany({
      where: {
        conditionPreset: {
          isStandardized: false
        }
      }
    });
    console.log(`   ✓ Deleted ${presetDiagnoses.count} org-specific preset diagnoses`);

    const presetTemplates = await prisma.conditionPresetTemplate.deleteMany({
      where: {
        conditionPreset: {
          isStandardized: false
        }
      }
    });
    console.log(`   ✓ Deleted ${presetTemplates.count} org-specific preset templates`);

    const presetAlertRules = await prisma.conditionPresetAlertRule.deleteMany({
      where: {
        conditionPreset: {
          isStandardized: false
        }
      }
    });
    console.log(`   ✓ Deleted ${presetAlertRules.count} org-specific preset alert rules`);

    // Delete org-specific condition presets
    const orgPresets = await prisma.conditionPreset.deleteMany({
      where: { isStandardized: false }
    });
    console.log(`   ✓ Deleted ${orgPresets.count} org-specific condition presets`);

    // Delete org-specific assessment templates
    const orgTemplateItems = await prisma.assessmentTemplateItem.deleteMany({
      where: {
        template: {
          isStandardized: false
        }
      }
    });
    console.log(`   ✓ Deleted ${orgTemplateItems.count} org-specific template items`);

    const orgTemplates = await prisma.assessmentTemplate.deleteMany({
      where: { isStandardized: false }
    });
    console.log(`   ✓ Deleted ${orgTemplates.count} org-specific assessment templates`);

    // Delete org-specific alert rules
    const orgAlertRules = await prisma.alertRule.deleteMany({
      where: { isStandardized: false }
    });
    console.log(`   ✓ Deleted ${orgAlertRules.count} org-specific alert rules`);

    // Delete org-specific metrics
    const orgMetrics = await prisma.metricDefinition.deleteMany({
      where: { isStandardized: false }
    });
    console.log(`   ✓ Deleted ${orgMetrics.count} org-specific metrics`);

    // Delete care programs
    const carePrograms = await prisma.careProgram.deleteMany({});
    console.log(`   ✓ Deleted ${carePrograms.count} care programs`);

    // Delete user-organization relationships
    const userOrgs = await prisma.userOrganization.deleteMany({});
    console.log(`   ✓ Deleted ${userOrgs.count} user-organization relationships`);

    // Delete organizations
    const organizations = await prisma.organization.deleteMany({});
    console.log(`   ✓ Deleted ${organizations.count} organizations`);

    // Delete all users
    const users = await prisma.user.deleteMany({});
    console.log(`   ✓ Deleted ${users.count} users`);

    console.log('\n✅ All user-generated data cleared!\n');

    // Step 2: Create org admin user
    console.log('👤 Creating org admin user...');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const orgAdmin = await prisma.user.create({
      data: {
        email: 'admin@clinmetrics.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isPlatformAdmin: false, // Regular org admin, not platform admin
        isActive: true,
        emailVerified: new Date(), // Mark email as verified
        mfaEnabled: false
      }
    });

    console.log(`   ✓ Created org admin: ${orgAdmin.email}`);
    console.log(`   ✓ User ID: ${orgAdmin.id}`);
    console.log(`   ✓ Password: admin123`);

    console.log('\n📊 Verifying standardized seed data...');

    // Verify standardized data exists
    const stdPresets = await prisma.conditionPreset.count({
      where: { isStandardized: true }
    });
    console.log(`   ✓ ${stdPresets} standardized condition presets`);

    const stdMetrics = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });
    console.log(`   ✓ ${stdMetrics} standardized metrics`);

    const stdTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    console.log(`   ✓ ${stdTemplates} standardized assessment templates`);

    const stdRules = await prisma.alertRule.count({
      where: { isStandardized: true }
    });
    console.log(`   ✓ ${stdRules} standardized alert rules`);

    const billingPrograms = await prisma.billingProgram.count({
      where: { isActive: true }
    });
    console.log(`   ✓ ${billingPrograms} billing programs`);

    console.log('\n✅ Database reset complete!\n');

    console.log('📝 Next Steps:');
    console.log('   1. Login with: admin@clinmetrics.com / admin123');
    console.log('   2. Create your organization');
    console.log('   3. Assign yourself ORG_ADMIN role');
    console.log('   4. Clone standardized presets to your organization');
    console.log('   5. Create care programs, enroll patients, etc.\n');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetToProductionReady()
  .catch(console.error);
