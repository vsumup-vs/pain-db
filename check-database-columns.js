/**
 * Quick check of current database columns in observations table
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseColumns() {
  console.log('🔍 Checking current database columns...\n');

  try {
    // Check all columns in observations table
    console.log('📋 Observations table columns:');
    const observationColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'observations' 
      ORDER BY ordinal_position
    `;
    
    observationColumns.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type}) - Default: ${col.column_default || 'NULL'}`);
    });

    // Check if ObservationContext enum exists
    console.log('\n📊 ObservationContext enum check:');
    const enumCheck = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'ObservationContext'
      )
    `;
    
    if (enumCheck.length > 0) {
      console.log('   ✅ ObservationContext enum exists');
      console.log(`   📋 Values: ${enumCheck.map(r => r.enumlabel).join(', ')}`);
    } else {
      console.log('   ❌ ObservationContext enum not found');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseColumns();