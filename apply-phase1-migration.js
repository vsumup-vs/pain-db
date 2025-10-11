/**
 * Phase 1 Migration Script: Smart Assessment Continuity System
 * 
 * This script applies the database schema changes for Phase 1 by executing
 * each SQL command individually to avoid Prisma's multiple command limitation.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyPhase1Migration() {
  console.log('🚀 Starting Phase 1 Migration: Smart Assessment Continuity System\n');

  try {
    // Step 1: Create new enum for observation context
    console.log('📊 Step 1: Creating ObservationContext enum...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "ObservationContext" AS ENUM ('WELLNESS', 'PROGRAM_ENROLLMENT', 'CLINICAL_MONITORING', 'ROUTINE_FOLLOWUP')
      `);
      console.log('   ✅ ObservationContext enum created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  ObservationContext enum already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Step 2: Add new fields to observations table
    console.log('\n📋 Step 2: Adding new fields to observations table...');
    
    const observationFields = [
      { name: 'context', sql: 'ADD COLUMN IF NOT EXISTS context "ObservationContext" DEFAULT \'WELLNESS\'' },
      { name: 'enrollment_id', sql: 'ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(255)' },
      { name: 'billing_relevant', sql: 'ADD COLUMN IF NOT EXISTS billing_relevant BOOLEAN DEFAULT FALSE' },
      { name: 'provider_reviewed', sql: 'ADD COLUMN IF NOT EXISTS provider_reviewed BOOLEAN DEFAULT FALSE' },
      { name: 'reviewed_at', sql: 'ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP' },
      { name: 'reviewed_by', sql: 'ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255)' },
      { name: 'continuity_source_id', sql: 'ADD COLUMN IF NOT EXISTS continuity_source_id VARCHAR(255)' },
      { name: 'is_baseline', sql: 'ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE' },
      { name: 'validity_period_hours', sql: 'ADD COLUMN IF NOT EXISTS validity_period_hours INTEGER DEFAULT 168' }
    ];

    for (const field of observationFields) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE observations ${field.sql}`);
        console.log(`   ✅ Added ${field.name} to observations table`);
      } catch (error) {
        console.log(`   ⚠️  Field ${field.name} might already exist, continuing...`);
      }
    }

    // Step 3: Add new fields to assessments table
    console.log('\n📝 Step 3: Adding new fields to assessments table...');
    
    const assessmentFields = [
      { name: 'context', sql: 'ADD COLUMN IF NOT EXISTS context "ObservationContext" DEFAULT \'WELLNESS\'' },
      { name: 'enrollment_id', sql: 'ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(255)' },
      { name: 'billing_relevant', sql: 'ADD COLUMN IF NOT EXISTS billing_relevant BOOLEAN DEFAULT FALSE' },
      { name: 'provider_reviewed', sql: 'ADD COLUMN IF NOT EXISTS provider_reviewed BOOLEAN DEFAULT FALSE' },
      { name: 'reviewed_at', sql: 'ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP' },
      { name: 'reviewed_by', sql: 'ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255)' },
      { name: 'continuity_source_id', sql: 'ADD COLUMN IF NOT EXISTS continuity_source_id VARCHAR(255)' },
      { name: 'is_baseline', sql: 'ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE' },
      { name: 'reused_from_assessment_id', sql: 'ADD COLUMN IF NOT EXISTS reused_from_assessment_id VARCHAR(255)' }
    ];

    for (const field of assessmentFields) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE assessments ${field.sql}`);
        console.log(`   ✅ Added ${field.name} to assessments table`);
      } catch (error) {
        console.log(`   ⚠️  Field ${field.name} might already exist, continuing...`);
      }
    }

    // Step 4: Create assessment_continuity_log table
    console.log('\n📊 Step 4: Creating assessment_continuity_log table...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS assessment_continuity_log (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          patient_id VARCHAR(255) NOT NULL,
          source_assessment_id VARCHAR(255),
          source_observation_ids TEXT[],
          target_assessment_id VARCHAR(255),
          target_context "ObservationContext" NOT NULL,
          reuse_reason TEXT,
          clinician_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          
          FOREIGN KEY (patient_id) REFERENCES patients(id),
          FOREIGN KEY (source_assessment_id) REFERENCES assessments(id),
          FOREIGN KEY (target_assessment_id) REFERENCES assessments(id),
          FOREIGN KEY (clinician_id) REFERENCES clinicians(id)
        )
      `);
      console.log('   ✅ assessment_continuity_log table created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  assessment_continuity_log table already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Step 5: Create performance indexes for observations
    console.log('\n🔍 Step 5: Creating performance indexes for observations...');
    
    const observationIndexes = [
      { name: 'idx_observations_context', sql: 'CREATE INDEX IF NOT EXISTS idx_observations_context ON observations(context)' },
      { name: 'idx_observations_enrollment', sql: 'CREATE INDEX IF NOT EXISTS idx_observations_enrollment ON observations(enrollment_id)' },
      { name: 'idx_observations_billing', sql: 'CREATE INDEX IF NOT EXISTS idx_observations_billing ON observations(billing_relevant)' },
      { name: 'idx_observations_continuity', sql: 'CREATE INDEX IF NOT EXISTS idx_observations_continuity ON observations(continuity_source_id)' },
      { name: 'idx_observations_patient_recorded', sql: 'CREATE INDEX IF NOT EXISTS idx_observations_patient_recorded ON observations(patient_id, recorded_at DESC)' }
    ];

    for (const index of observationIndexes) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        console.log(`   ✅ Created index ${index.name}`);
      } catch (error) {
        console.log(`   ⚠️  Index ${index.name} might already exist, continuing...`);
      }
    }

    // Step 6: Create performance indexes for assessments
    console.log('\n🔍 Step 6: Creating performance indexes for assessments...');
    
    const assessmentIndexes = [
      { name: 'idx_assessments_context', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_context ON assessments(context)' },
      { name: 'idx_assessments_enrollment', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_enrollment ON assessments(enrollment_id)' },
      { name: 'idx_assessments_billing', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_billing ON assessments(billing_relevant)' },
      { name: 'idx_assessments_continuity', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_continuity ON assessments(continuity_source_id)' },
      { name: 'idx_assessments_patient_completed', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_patient_completed ON assessments(patient_id, completed_at DESC)' }
    ];

    for (const index of assessmentIndexes) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        console.log(`   ✅ Created index ${index.name}`);
      } catch (error) {
        console.log(`   ⚠️  Index ${index.name} might already exist, continuing...`);
      }
    }

    // Step 7: Create performance indexes for continuity log
    console.log('\n🔍 Step 7: Creating performance indexes for continuity log...');
    
    const continuityIndexes = [
      { name: 'idx_continuity_log_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_continuity_log_patient ON assessment_continuity_log(patient_id)' },
      { name: 'idx_continuity_log_created', sql: 'CREATE INDEX IF NOT EXISTS idx_continuity_log_created ON assessment_continuity_log(created_at DESC)' }
    ];

    for (const index of continuityIndexes) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        console.log(`   ✅ Created index ${index.name}`);
      } catch (error) {
        console.log(`   ⚠️  Index ${index.name} might already exist, continuing...`);
      }
    }

    console.log('\n🎉 Phase 1 Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   • Created ObservationContext enum');
    console.log('   • Added 9 new fields to observations table');
    console.log('   • Added 9 new fields to assessments table');
    console.log('   • Created assessment_continuity_log table');
    console.log('   • Created 12 performance indexes');
    console.log('\n✨ Your database is now ready for Smart Assessment Continuity!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  applyPhase1Migration()
    .then(() => {
      console.log('\n🚀 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { applyPhase1Migration };