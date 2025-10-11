const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPermissionArraysTextBased() {
  console.log('🔧 Fixing Permission arrays using text-based approach...');

  try {
    // Fix role_templates table using text manipulation
    console.log('📝 Fixing role_templates.permissions...');
    
    const roleTemplatesResult = await prisma.$executeRaw`
      UPDATE role_templates 
      SET permissions = array(
        SELECT CASE 
          WHEN elem = 'PATIENT_MEDICAL_RECORD_UPDATE' 
          THEN 'PATIENT_MEDICAL_RECORD_READ'
          ELSE elem 
        END
        FROM unnest(permissions) AS elem
      )::text[]
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE' = ANY(permissions::text[])
    `;
    
    console.log(`✅ Updated ${roleTemplatesResult} records in role_templates`);

    // Fix user_organizations table using text manipulation
    console.log('📝 Fixing user_organizations.permissions...');
    
    const userOrgsResult = await prisma.$executeRaw`
      UPDATE user_organizations 
      SET permissions = array(
        SELECT CASE 
          WHEN elem = 'PATIENT_MEDICAL_RECORD_UPDATE' 
          THEN 'PATIENT_MEDICAL_RECORD_READ'
          ELSE elem 
        END
        FROM unnest(permissions) AS elem
      )::text[]
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE' = ANY(permissions::text[])
    `;
    
    console.log(`✅ Updated ${userOrgsResult} records in user_organizations`);

    // Verify the fixes using text comparison
    console.log('\n🔍 Verifying fixes...');
    
    const roleTemplatesCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM role_templates 
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE' = ANY(permissions::text[])
    `;
    
    const userOrgsCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM user_organizations 
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE' = ANY(permissions::text[])
    `;

    console.log(`role_templates remaining: ${roleTemplatesCheck[0].count}`);
    console.log(`user_organizations remaining: ${userOrgsCheck[0].count}`);

    if (Number(roleTemplatesCheck[0].count) === 0 && Number(userOrgsCheck[0].count) === 0) {
      console.log('✅ All problematic Permission values have been fixed!');
    } else {
      console.log('⚠️  Some problematic values may still remain');
    }

    // Show sample data after fix
    console.log('\n📊 Sample data after fix:');
    
    const sampleRoleTemplates = await prisma.$queryRaw`
      SELECT id, name, permissions 
      FROM role_templates 
      LIMIT 3
    `;
    
    const sampleUserOrgs = await prisma.$queryRaw`
      SELECT id, permissions 
      FROM user_organizations 
      WHERE permissions IS NOT NULL AND array_length(permissions, 1) > 0
      LIMIT 3
    `;

    console.log('Role Templates:', sampleRoleTemplates);
    console.log('User Organizations:', sampleUserOrgs);

    console.log('\n🎉 Permission array fixes completed!');

  } catch (error) {
    console.error('❌ Permission array fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixPermissionArraysTextBased()
  .then(() => {
    console.log('\n✅ Permission arrays fixed. Now try: npx prisma db push');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });