const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deepPermissionCleanup() {
  console.log('🔍 Deep Permission enum cleanup...');

  try {
    // First, let's check the actual enum values in the database
    console.log('📊 Checking current Permission enum values in database...');
    
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'Permission'
      )
      ORDER BY enumlabel
    `;

    console.log('Current Permission enum values:');
    console.table(enumValues);

    // Find ALL tables and columns that might use Permission enum
    console.log('\n🔍 Finding all Permission enum usage...');
    
    const allPermissionUsage = await prisma.$queryRaw`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.udt_name
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE (
        c.udt_name = 'Permission' 
        OR c.data_type LIKE '%Permission%'
        OR c.column_name LIKE '%permission%'
      )
      AND t.table_schema = 'public'
      ORDER BY t.table_name, c.column_name
    `;

    console.log('All potential Permission usage:');
    console.table(allPermissionUsage);

    // Check for the problematic value in ALL tables
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    console.log('\n🔍 Searching for PATIENT_MEDICAL_RECORD_UPDATE in all tables...');

    for (const table of allTables) {
      try {
        // Get all columns for this table
        const columns = await prisma.$queryRaw`
          SELECT column_name, data_type, udt_name
          FROM information_schema.columns 
          WHERE table_name = ${table.table_name}
          AND table_schema = 'public'
        `;

        // Check each column that might contain the problematic value
        for (const column of columns) {
          if (column.udt_name === 'Permission' || 
              column.data_type.includes('Permission') ||
              column.column_name.toLowerCase().includes('permission')) {
            
            try {
              const count = await prisma.$queryRaw`
                SELECT COUNT(*) as count 
                FROM ${table.table_name} 
                WHERE ${column.column_name}::text = 'PATIENT_MEDICAL_RECORD_UPDATE'
              `;

              if (Number(count[0].count) > 0) {
                console.log(`⚠️  Found ${count[0].count} problematic records in ${table.table_name}.${column.column_name}`);
                
                // Show sample records
                const samples = await prisma.$queryRaw`
                  SELECT * FROM ${table.table_name} 
                  WHERE ${column.column_name}::text = 'PATIENT_MEDICAL_RECORD_UPDATE'
                  LIMIT 3
                `;
                console.log('Sample records:');
                console.table(samples);

                // Fix the records
                const updateResult = await prisma.$executeRaw`
                  UPDATE ${table.table_name} 
                  SET ${column.column_name} = 'PATIENT_MEDICAL_RECORD_READ'::Permission
                  WHERE ${column.column_name}::text = 'PATIENT_MEDICAL_RECORD_UPDATE'
                `;
                
                console.log(`✅ Updated ${updateResult} records in ${table.table_name}.${column.column_name}`);
              }
            } catch (error) {
              // Skip columns that can't be checked
              console.log(`ℹ️  Skipped ${table.table_name}.${column.column_name}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not process table ${table.table_name}: ${error.message}`);
      }
    }

    // If we still have the problematic enum value, we need to remove it directly
    console.log('\n🔧 Attempting to remove problematic enum value...');
    
    try {
      // This is a more aggressive approach - directly modify the enum
      await prisma.$executeRaw`
        ALTER TYPE "Permission" RENAME TO "Permission_old"
      `;
      
      // Create new enum without the problematic value
      await prisma.$executeRaw`
        CREATE TYPE "Permission" AS ENUM (
          'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE', 'USER_INVITE', 'USER_ROLE_ASSIGN',
          'PATIENT_CREATE', 'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_ASSIGN', 'PATIENT_MEDICAL_RECORD_READ',
          'CLINICIAN_CREATE', 'CLINICIAN_READ', 'CLINICIAN_UPDATE', 'CLINICIAN_DELETE', 'CLINICIAN_ASSIGN',
          'ORG_CREATE', 'ORG_READ', 'ORG_UPDATE', 'ORG_DELETE', 'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE', 'ORG_BILLING_MANAGE',
          'PROGRAM_CREATE', 'PROGRAM_READ', 'PROGRAM_UPDATE', 'PROGRAM_DELETE', 'PROGRAM_ASSIGN',
          'ASSESSMENT_CREATE', 'ASSESSMENT_READ', 'ASSESSMENT_UPDATE', 'ASSESSMENT_DELETE',
          'METRIC_CREATE', 'METRIC_READ', 'METRIC_UPDATE', 'METRIC_DELETE',
          'OBSERVATION_CREATE', 'OBSERVATION_READ', 'OBSERVATION_UPDATE', 'OBSERVATION_DELETE',
          'ALERT_CREATE', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_DELETE', 'ALERT_ACKNOWLEDGE',
          'MEDICATION_CREATE', 'MEDICATION_READ', 'MEDICATION_UPDATE', 'MEDICATION_DELETE', 'MEDICATION_PRESCRIBE',
          'REPORT_READ', 'REPORT_CREATE', 'ANALYTICS_READ',
          'SYSTEM_ADMIN', 'AUDIT_READ',
          'BILLING_READ', 'BILLING_MANAGE', 'COMPLIANCE_READ'
        )
      `;
      
      // Drop the old enum
      await prisma.$executeRaw`
        DROP TYPE "Permission_old"
      `;
      
      console.log('✅ Successfully recreated Permission enum without problematic value');
      
    } catch (enumError) {
      console.log(`⚠️  Could not recreate enum: ${enumError.message}`);
    }

    console.log('\n🎉 Deep cleanup completed!');

  } catch (error) {
    console.error('❌ Deep cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deep cleanup
deepPermissionCleanup()
  .then(() => {
    console.log('\n✅ Deep cleanup completed. Try running: npx prisma db push');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Deep cleanup failed:', error);
    process.exit(1);
  });