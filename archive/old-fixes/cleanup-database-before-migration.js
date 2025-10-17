const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...');

  try {
    // 1. Check for duplicate keys in metric_definitions
    console.log('📊 Checking for duplicate keys in metric_definitions...');
    
    const duplicateKeys = await prisma.$queryRaw`
      SELECT key, COUNT(*) as count 
      FROM metric_definitions 
      WHERE key IS NOT NULL 
      GROUP BY key 
      HAVING COUNT(*) > 1
    `;

    if (duplicateKeys.length > 0) {
      console.log('⚠️  Found duplicate keys:', duplicateKeys);
      
      // Remove duplicates, keeping the first one
      for (const duplicate of duplicateKeys) {
        console.log(`🔧 Removing duplicate entries for key: ${duplicate.key}`);
        
        const records = await prisma.$queryRaw`
          SELECT id FROM metric_definitions 
          WHERE key = ${duplicate.key} 
          ORDER BY "createdAt" ASC
        `;
        
        // Keep the first record, delete the rest
        const idsToDelete = records.slice(1).map(r => r.id);
        
        if (idsToDelete.length > 0) {
          await prisma.$queryRaw`
            DELETE FROM metric_definitions 
            WHERE id = ANY(${idsToDelete})
          `;
          console.log(`✅ Removed ${idsToDelete.length} duplicate records for key: ${duplicate.key}`);
        }
      }
    } else {
      console.log('✅ No duplicate keys found in metric_definitions');
    }

    // 2. Check for the problematic Permission enum value
    console.log('🔍 Checking for PATIENT_MEDICAL_RECORD_UPDATE permission usage...');
    
    const permissionUsage = await prisma.$queryRaw`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE data_type = 'USER-DEFINED' 
      AND udt_name = 'Permission'
    `;

    console.log('📋 Tables using Permission enum:', permissionUsage);

    // Check if the problematic value exists in any tables
    for (const usage of permissionUsage) {
      try {
        const count = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM ${usage.table_name} 
          WHERE ${usage.column_name} = 'PATIENT_MEDICAL_RECORD_UPDATE'
        `;
        
        if (count[0].count > 0) {
          console.log(`⚠️  Found ${count[0].count} records with PATIENT_MEDICAL_RECORD_UPDATE in ${usage.table_name}.${usage.column_name}`);
          
          // Update to a valid permission value
          await prisma.$queryRaw`
            UPDATE ${usage.table_name} 
            SET ${usage.column_name} = 'PATIENT_MEDICAL_RECORD_READ' 
            WHERE ${usage.column_name} = 'PATIENT_MEDICAL_RECORD_UPDATE'
          `;
          
          console.log(`✅ Updated records to use PATIENT_MEDICAL_RECORD_READ instead`);
        }
      } catch (error) {
        console.log(`ℹ️  Could not check ${usage.table_name}.${usage.column_name}:`, error.message);
      }
    }

    console.log('✅ Database cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => {
    console.log('🎉 Ready to apply schema changes with: npx prisma db push');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });