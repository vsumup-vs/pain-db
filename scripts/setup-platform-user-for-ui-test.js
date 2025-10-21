#!/usr/bin/env node

/**
 * Setup Platform User for UI Testing
 *
 * This script creates:
 * 1. PLATFORM organization
 * 2. User associated with PLATFORM organization
 * 3. Login credentials for UI testing
 *
 * After running this script, you can:
 * - Login to the UI with: platform@test.com / Test123!
 * - Try to access patient-care features (should get 403 errors)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== Setting Up Platform User for UI Testing ===\n');

  try {
    // Step 1: Check if PLATFORM organization already exists
    console.log('1. Checking for existing PLATFORM organization...');
    let platformOrg = await prisma.organization.findFirst({
      where: { type: 'PLATFORM' }
    });

    if (platformOrg) {
      console.log(`   ✓ Found existing PLATFORM organization: ${platformOrg.name} (${platformOrg.id})`);
    } else {
      console.log('   Creating new PLATFORM organization...');
      platformOrg = await prisma.organization.create({
        data: {
          name: 'ClinMetrics Pro Platform',
          type: 'PLATFORM',
          email: 'platform@clinmetrics.com',
          phone: '555-0100',
          address: '123 Platform Street',
          settings: {
            platformOrganization: true,
            testAccount: true
          }
        }
      });
      console.log(`   ✓ Created PLATFORM organization: ${platformOrg.id}`);
    }

    // Step 2: Check if test user already exists
    console.log('\n2. Checking for existing test user...');
    let platformUser = await prisma.user.findUnique({
      where: { email: 'platform@test.com' }
    });

    if (platformUser) {
      console.log(`   ✓ Found existing user: ${platformUser.email} (${platformUser.id})`);
    } else {
      console.log('   Creating new platform test user...');
      const hashedPassword = await bcrypt.hash('Test123!', 10);

      platformUser = await prisma.user.create({
        data: {
          email: 'platform@test.com',
          passwordHash: hashedPassword,
          firstName: 'Platform',
          lastName: 'Admin',
          isActive: true,
          emailVerified: new Date()
        }
      });
      console.log(`   ✓ Created user: ${platformUser.email} (${platformUser.id})`);
    }

    // Step 3: Link user to PLATFORM organization
    console.log('\n3. Linking user to PLATFORM organization...');
    const existingLink = await prisma.userOrganization.findFirst({
      where: {
        userId: platformUser.id,
        organizationId: platformOrg.id
      }
    });

    if (existingLink) {
      console.log(`   ✓ User already linked to organization`);
    } else {
      await prisma.userOrganization.create({
        data: {
          userId: platformUser.id,
          organizationId: platformOrg.id,
          role: 'ORG_ADMIN',
          permissions: [
            'PLATFORM_ORG_CREATE',
            'PLATFORM_ORG_READ',
            'PLATFORM_ORG_UPDATE',
            'PLATFORM_USER_MANAGE',
            'PLATFORM_SUPPORT_READ',
            'PLATFORM_SUPPORT_MANAGE',
            'PLATFORM_ANALYTICS_READ',
            'PLATFORM_SETTINGS_MANAGE'
          ]
        }
      });
      console.log(`   ✓ Linked user to PLATFORM organization with ORG_ADMIN role`);
    }

    // Step 4: Also create a CLINIC organization user for comparison
    console.log('\n4. Setting up comparison CLINIC user...');
    let clinicOrg = await prisma.organization.findFirst({
      where: { type: 'CLINIC', name: 'Test Healthcare Clinic UI' }
    });

    if (!clinicOrg) {
      clinicOrg = await prisma.organization.create({
        data: {
          name: 'Test Healthcare Clinic UI',
          type: 'CLINIC',
          email: 'clinic@test.com',
          phone: '555-0101',
          address: '456 Clinic Avenue',
          settings: {
            testAccount: true
          }
        }
      });
      console.log(`   ✓ Created CLINIC organization: ${clinicOrg.id}`);
    } else {
      console.log(`   ✓ Found existing CLINIC organization: ${clinicOrg.name}`);
    }

    let clinicUser = await prisma.user.findUnique({
      where: { email: 'clinic@test.com' }
    });

    if (!clinicUser) {
      const hashedPassword = await bcrypt.hash('Test123!', 10);
      clinicUser = await prisma.user.create({
        data: {
          email: 'clinic@test.com',
          passwordHash: hashedPassword,
          firstName: 'Clinic',
          lastName: 'Admin',
          isActive: true,
          emailVerified: new Date()
        }
      });
      console.log(`   ✓ Created clinic user: ${clinicUser.email}`);
    } else {
      console.log(`   ✓ Found existing clinic user: ${clinicUser.email}`);
    }

    const existingClinicLink = await prisma.userOrganization.findFirst({
      where: {
        userId: clinicUser.id,
        organizationId: clinicOrg.id
      }
    });

    if (!existingClinicLink) {
      await prisma.userOrganization.create({
        data: {
          userId: clinicUser.id,
          organizationId: clinicOrg.id,
          role: 'ORG_ADMIN',
          permissions: [
            'ORG_SETTINGS_MANAGE',
            'ORG_USERS_MANAGE',
            'PATIENT_CREATE',
            'PATIENT_READ',
            'PATIENT_UPDATE',
            'PATIENT_DELETE',
            'CLINICIAN_CREATE',
            'CLINICIAN_READ',
            'ALERT_READ',
            'TASK_CREATE',
            'TASK_READ'
          ]
        }
      });
      console.log(`   ✓ Linked clinic user to CLINIC organization`);
    } else {
      console.log(`   ✓ Clinic user already linked to organization`);
    }

    // Summary
    console.log('\n=== Setup Complete! ===\n');
    console.log('You now have two test accounts:\n');

    console.log('1️⃣  PLATFORM Organization User (Will be BLOCKED from patient-care):');
    console.log('   📧 Email: platform@test.com');
    console.log('   🔑 Password: Test123!');
    console.log('   🏢 Organization: ClinMetrics Pro Platform (PLATFORM)');
    console.log('   ⚠️  Should get 403 errors when trying to access:');
    console.log('      - Patients page');
    console.log('      - Clinicians page');
    console.log('      - Alerts page');
    console.log('      - Tasks page');
    console.log('      - Billing page');
    console.log('      - Analytics page\n');

    console.log('2️⃣  CLINIC Organization User (Full Access):');
    console.log('   📧 Email: clinic@test.com');
    console.log('   🔑 Password: Test123!');
    console.log('   🏢 Organization: Test Healthcare Clinic UI (CLINIC)');
    console.log('   ✅ Should have full access to all patient-care features\n');

    console.log('📋 UI Testing Steps:');
    console.log('   1. Start frontend: cd frontend && npm run dev');
    console.log('   2. Open browser: http://localhost:5173');
    console.log('   3. Login as platform@test.com');
    console.log('   4. Try to navigate to Patients, Alerts, etc.');
    console.log('   5. Observe 403 error messages');
    console.log('   6. Logout and login as clinic@test.com');
    console.log('   7. Verify full access to all features\n');

    console.log('✅ Setup complete! Ready for UI testing.\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
