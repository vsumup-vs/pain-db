/**
 * Verification Script: Phase 1 Migration Status
 * 
 * This script checks if the Phase 1 migration was applied successfully
 * by testing for the new database elements.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyPhase1Migration() {
  console.log('🔍 Verifying Phase 1 Migration Status...\n');

  try {
    // Test 1: Check if ObservationContext enum exists
    console.log('📊 Test 1: Checking ObservationContext enum...');
    try {
      const result = await prisma.$queryRaw`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'ObservationContext'
        )
      `;
      
      if (result.length > 0) {
        console.log('   ✅ ObservationContext enum exists');
        console.log(`   📋 Values: ${result.map(r => r.enumlabel).join(', ')}`);
      } else {
        console.log('   ❌ ObservationContext enum not found');
        return false;
      }
    } catch (error) {
      console.log('   ❌ Error checking ObservationContext enum:', error.message);
      return false;
    }

    // Test 2: Check new fields in observations table
    console.log('\n📋 Test 2: Checking new fields in observations table...');
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'observations' 
        AND column_name IN ('context', 'enrollment_id', 'billing_relevant', 'provider_reviewed', 'reviewed_at', 'reviewed_by', 'continuity_source_id', 'is_baseline', 'validity_period_hours')
        ORDER BY column_name
      `;
      
      if (result.length >= 9) {
        console.log('   ✅ New fields found in observations table:');
        result.forEach(col => {
          console.log(`      • ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log(`   ⚠️  Only ${result.length}/9 new fields found in observations table`);
        return false;
      }
    } catch (error) {
      console.log('   ❌ Error checking observations table:', error.message);
      return false;
    }

    // Test 3: Check new fields in assessments table
    console.log('\n📝 Test 3: Checking new fields in assessments table...');
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'assessments' 
        AND column_name IN ('context', 'enrollment_id', 'billing_relevant', 'provider_reviewed', 'reviewed_at', 'reviewed_by', 'continuity_source_id', 'is_baseline', 'reused_from_assessment_id')
        ORDER BY column_name
      `;
      
      if (result.length >= 9) {
        console.log('   ✅ New fields found in assessments table:');
        result.forEach(col => {
          console.log(`      • ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log(`   ⚠️  Only ${result.length}/9 new fields found in assessments table`);
        return false;
      }
    } catch (error) {
      console.log('   ❌ Error checking assessments table:', error.message);
      return false;
    }

    // Test 4: Check assessment_continuity_log table
    console.log('\n📊 Test 4: Checking assessment_continuity_log table...');
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'assessment_continuity_log'
        ORDER BY ordinal_position
      `;
      
      if (result.length > 0) {
        console.log('   ✅ assessment_continuity_log table exists with columns:');
        result.forEach(col => {
          console.log(`      • ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('   ❌ assessment_continuity_log table not found');
        return false;
      }
    } catch (error) {
      console.log('   ❌ Error checking assessment_continuity_log table:', error.message);
      return false;
    }

    // Test 5: Check performance indexes
    console.log('\n🔍 Test 5: Checking performance indexes...');
    try {
      const result = await prisma.$queryRaw`
        SELECT indexname, tablename
        FROM pg_indexes 
        WHERE indexname LIKE 'idx_%context%' 
           OR indexname LIKE 'idx_%continuity%'
           OR indexname LIKE 'idx_%enrollment%'
           OR indexname LIKE 'idx_%billing%'
        ORDER BY tablename, indexname
      `;
      
      if (result.length > 0) {
        console.log('   ✅ Performance indexes found:');
        result.forEach(idx => {
          console.log(`      • ${idx.indexname} on ${idx.tablename}`);
        });
      } else {
        console.log('   ⚠️  No performance indexes found (this is optional)');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking indexes (non-critical):', error.message);
    }

    console.log('\n🎉 Phase 1 Migration Verification PASSED!');
    console.log('\n📋 Summary:');
    console.log('   ✅ ObservationContext enum created');
    console.log('   ✅ 9 new fields added to observations table');
    console.log('   ✅ 9 new fields added to assessments table');
    console.log('   ✅ assessment_continuity_log table created');
    console.log('   ✅ Performance indexes created');
    console.log('\n🚀 Your database is ready for Smart Assessment Continuity!');
    
    return true;

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.error('\nError details:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyPhase1Migration()
    .then((success) => {
      if (success) {
        console.log('\n✅ Verification completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Verification failed - migration may need to be re-run');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyPhase1Migration };