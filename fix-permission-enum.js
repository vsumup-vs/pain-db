const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPermissionEnum() {
  console.log('🔧 Fixing Permission enum issue...');

  try {
    // Find all tables that use Permission enum
    const permissionTables = await prisma.$queryRaw`
      SELECT t.table_name, c.column_name
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE c.udt_name = 'Permission'
      AND t.table_schema = 'public'
    `;

    console.log('📊 Tables using Permission enum:');
    console.table(permissionTables);

    if (permissionTables.length === 0) {
      console.log('ℹ️  No tables found using Permission enum');
      return;
    }

    // Check and fix the problematic Permission value in each table
    for (const table of permissionTables) {
      try {
        console.log(`\n🔍 Checking ${table.table_name}.${table.column_name}...`);
        
        // Check if the problematic value exists
        const problematicCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM ${table.table_name} 
          WHERE ${table.column_name}::text = 'PATIENT_MEDICAL_RECORD_UPDATE'
        `;

        const count = Number(problematicCount[0].count);
        console.log(`Found ${count} records with PATIENT_MEDICAL_RECORD_UPDATE`);

        if (count > 0) {
          // Update to a valid permission value
          const updateResult = await prisma.$executeRaw`
            UPDATE ${table.table_name} 
            SET ${table.column_name} = 'PATIENT_MEDICAL_RECORD_READ'::Permission
            WHERE ${table.column_name}::text = 'PATIENT_MEDICAL_RECORD_UPDATE'
          `;
          
          console.log(`✅ Updated ${updateResult} records to use PATIENT_MEDICAL_RECORD_READ`);
        } else {
          console.log('✅ No problematic records found');
        }

      } catch (error) {
        console.log(`⚠️  Could not process ${table.table_name}.${table.column_name}: ${error.message}`);
      }
    }

    console.log('\n🎉 Permission enum fix completed!');

  } catch (error) {
    console.error('❌ Permission enum fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixPermissionEnum()
  .then(() => {
    console.log('\n✅ Permission enum fixed. Now you can run: npx prisma db push');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });