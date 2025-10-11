#!/usr/bin/env node

/**
 * Multi-Tenant Security Implementation Script
 *
 * This script applies organizationId filtering to all controllers
 * to enforce data isolation between organizations.
 *
 * CRITICAL SECURITY FIX for HIPAA compliance
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Applying Multi-Tenant Security Fixes...\n');

// Helper function to add organization context check
const addOrgContextCheck = `
    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }
`;

// Update Observation Controller
console.log('📝 Updating Observation Controller...');
const observationController = path.join(__dirname, 'src/controllers/observationController.js');
let obsContent = fs.readFileSync(observationController, 'utf8');

// Update createObservation to include organizationId
obsContent = obsContent.replace(
  /const observation = await prisma\.observation\.create\(\{\s*data: \{/,
  `const observation = await prisma.observation.create({\n      data: {\n        organizationId,  // SECURITY: Always include organizationId`
);

// Update getAllObservations
obsContent = obsContent.replace(
  /\/\/ Build filter conditions\s*const where = \{\};/,
  `// SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Build filter conditions
    const where = {
      organizationId  // SECURITY: Always filter by organization
    };`
);

fs.writeFileSync(observationController, obsContent);
console.log('✅ Observation Controller updated\n');

// Update Enrollment Controller
console.log('📝 Updating Enrollment Controller...');
const enrollmentController = path.join(__dirname, 'src/controllers/enrollmentController.js');
let enrollContent = fs.readFileSync(enrollmentController, 'utf8');

// Update createEnrollment
enrollContent = enrollContent.replace(
  /const enrollment = await prisma\.enrollment\.create\(\{\s*data: \{/,
  `// SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const enrollment = await prisma.enrollment.create({\n      data: {\n        organizationId,  // SECURITY: Always include organizationId`
);

// Update getAllEnrollments
enrollContent = enrollContent.replace(
  /\/\/ Build where clause for filtering\s*const where = \{\};/,
  `// SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Build where clause for filtering
    const where = {
      organizationId  // SECURITY: Always filter by organization
    };`
);

fs.writeFileSync(enrollmentController, enrollContent);
console.log('✅ Enrollment Controller updated\n');

// Update Alert Controller
console.log('📝 Updating Alert Controller...');
const alertController = path.join(__dirname, 'src/controllers/alertController.js');
let alertContent = fs.readFileSync(alertController, 'utf8');

// Update createAlert to include organizationId
alertContent = alertContent.replace(
  /const alert = await prisma\.alert\.create\(\{\s*data: \{/,
  `// SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const alert = await prisma.alert.create({\n      data: {\n        organizationId,  // SECURITY: Always include organizationId`
);

// Update getAlerts
alertContent = alertContent.replace(
  /const where = \{\};[\s\S]*?if \(enrollmentId\)/,
  `// SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const where = {
      organizationId  // SECURITY: Always filter by organization
    };
    if (enrollmentId)`
);

fs.writeFileSync(alertController, alertContent);
console.log('✅ Alert Controller updated\n');

// Update Clinician Controller
console.log('📝 Updating Clinician Controller...');
const clinicianController = path.join(__dirname, 'src/controllers/clinicianController.js');
if (fs.existsSync(clinicianController)) {
  let clinContent = fs.readFileSync(clinicianController, 'utf8');

  // Update createClinician
  clinContent = clinContent.replace(
    /const clinician = await prisma\.clinician\.create\(\{\s*data: \{/,
    `// SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const clinician = await prisma.clinician.create({\n      data: {\n        organizationId,  // SECURITY: Always include organizationId`
  );

  fs.writeFileSync(clinicianController, clinContent);
  console.log('✅ Clinician Controller updated\n');
}

console.log('🎉 All controllers updated successfully!');
console.log('\n📋 Next Steps:');
console.log('1. Generate Prisma migration: npx prisma migrate dev --name add_organization_context');
console.log('2. Update existing data with organizationId');
console.log('3. Test multi-tenant isolation');
console.log('\n⚠️  IMPORTANT: Review all changes before deploying to production\n');
