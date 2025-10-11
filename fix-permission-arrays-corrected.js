const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPermissionArrays() {
  console.log('🔧 Fixing Permission arrays...');

  try {
    // Fix role_templates table
    console.log('📝 Fixing role_templates.permissions...');
    
    const roleTemplatesResult = await prisma.$executeRaw`
      UPDATE role_templates 
      SET permissions = array_replace(permissions, 'PATIENT_MEDICAL_RECORD_UPDATE'::"Permission", 'PATIENT_MEDICAL_RECORD_READ'::"Permission")
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE'::"Permission" = ANY(permissions)
    `;
    
    console.log(`✅ Updated ${roleTemplatesResult} records in role_templates`);

    // Fix user_organizations table
    console.log('📝 Fixing user_organizations.permissions...');
    
    const userOrgsResult = await prisma.$executeRaw`
      UPDATE user_organizations 
      SET permissions = array_replace(permissions, 'PATIENT_MEDICAL_RECORD_UPDATE'::"Permission", 'PATIENT_MEDICAL_RECORD_READ'::"Permission")
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE'::"Permission" = ANY(permissions)
    `;
    
    console.log(`✅ Updated ${userOrgsResult} records in user_organizations`);

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    
    const roleTemplatesCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM role_templates 
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE'::"Permission" = ANY(permissions)
    `;
    
    const userOrgsCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM user_organizations 
      WHERE 'PATIENT_MEDICAL_RECORD_UPDATE'::"Permission" = ANY(permissions)
    `;

    console.log(`role_templates remaining: ${roleTemplatesCheck[0].count}`);
    console.log(`user_organizations remaining: ${userOrgsCheck[0].count}`);

    if (Number(roleTemplatesCheck[0].count) === 0 && Number(userOrgsCheck[0].count) === 0) {
      console.log('✅ All problematic Permission values have been fixed!');
    } else {
      console.log('⚠️  Some problematic values may still remain');
    }

    console.log('\n🎉 Permission array fixes completed!');

  } catch (error) {
    console.error('❌ Permission array fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixPermissionArrays()
  .then(() => {
    console.log('\n✅ Permission arrays fixed. Now try: npx prisma db push');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });