const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cleanup Billing Test Data
 *
 * Removes all test enrollments, observations, time logs, and billing-related data
 * Preserves organizations, users, and standardized library
 * Use this to reset billing calculations without full database reset
 */

async function cleanupBillingData() {
  try {
    console.log('🧹 Cleaning up billing test data...\n');

    // Count records before deletion
    const counts = {
      observations: await prisma.observation.count(),
      timeLogs: await prisma.timeLog.count(),
      alerts: await prisma.alert.count(),
      assessments: await prisma.assessment.count(),
      enrollments: await prisma.enrollment.count(),
      medications: await prisma.patientMedication.count(),
      adherence: await prisma.medicationAdherence.count()
    };

    console.log('📊 Current billing data counts:');
    console.log(`   Observations: ${counts.observations}`);
    console.log(`   Time Logs: ${counts.timeLogs}`);
    console.log(`   Alerts: ${counts.alerts}`);
    console.log(`   Assessments: ${counts.assessments}`);
    console.log(`   Enrollments: ${counts.enrollments}`);
    console.log(`   Patient Medications: ${counts.medications}`);
    console.log(`   Medication Adherence: ${counts.adherence}`);
    console.log('');

    if (Object.values(counts).every(c => c === 0)) {
      console.log('✅ No billing data found. Database is clean.');
      return;
    }

    console.log('⚠️  WARNING: This will delete all billing-related data!');
    console.log('⚠️  Organizations, users, and standardized library will be preserved.');
    console.log('⚠️  Press Ctrl+C to abort or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting billing data...\n');

    // Delete in correct order (respect foreign key constraints)

    // 1. Medication Adherence
    if (counts.adherence > 0) {
      console.log(`Deleting ${counts.adherence} medication adherence records...`);
      await prisma.medicationAdherence.deleteMany({});
      console.log('   ✅ Deleted');
    }

    // 2. Patient Medications
    if (counts.medications > 0) {
      console.log(`Deleting ${counts.medications} patient medications...`);
      await prisma.patientMedication.deleteMany({});
      console.log('   ✅ Deleted');
    }

    // 3. Assessments
    if (counts.assessments > 0) {
      console.log(`Deleting ${counts.assessments} assessments...`);
      await prisma.assessment.deleteMany({});
      console.log('   ✅ Deleted');
    }

    // 4. Alerts
    if (counts.alerts > 0) {
      console.log(`Deleting ${counts.alerts} alerts...`);
      await prisma.alert.deleteMany({});
      console.log('   ✅ Deleted');
    }

    // 5. Observations
    if (counts.observations > 0) {
      console.log(`Deleting ${counts.observations} observations...`);
      await prisma.observation.deleteMany({});
      console.log('   ✅ Deleted');
    }

    // 6. Time Logs
    if (counts.timeLogs > 0) {
      console.log(`Deleting ${counts.timeLogs} time logs...`);
      await prisma.timeLog.deleteMany({});
      console.log('   ✅ Deleted');
    }

    // 7. Enrollments
    if (counts.enrollments > 0) {
      console.log(`Deleting ${counts.enrollments} enrollments...`);
      await prisma.enrollment.deleteMany({});
      console.log('   ✅ Deleted');
    }

    console.log('\n✅ Billing data cleanup complete!');
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Deleted ${counts.observations} observations`);
    console.log(`   Deleted ${counts.timeLogs} time logs`);
    console.log(`   Deleted ${counts.alerts} alerts`);
    console.log(`   Deleted ${counts.assessments} assessments`);
    console.log(`   Deleted ${counts.enrollments} enrollments`);
    console.log(`   Deleted ${counts.medications} patient medications`);
    console.log(`   Deleted ${counts.adherence} medication adherence records`);
    console.log('\n✅ Preserved:');
    console.log('   - Organizations');
    console.log('   - Users');
    console.log('   - Clinicians');
    console.log('   - Patients');
    console.log('   - Standardized library (presets, metrics, templates, rules)');
    console.log('   - Billing programs and CPT codes');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupBillingData()
  .catch(console.error);
