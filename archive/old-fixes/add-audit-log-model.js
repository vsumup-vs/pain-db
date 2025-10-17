const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function addAuditLogModel() {
  console.log('🔧 Adding AuditLog model to database...');
  
  try {
    console.log('📝 Step 1: Generating Prisma client...');
    await execAsync('npx prisma generate', { cwd: '/home/vsumup/pain-db' });
    console.log('✅ Prisma client generated');

    console.log('📝 Step 2: Pushing schema to database...');
    const { stdout, stderr } = await execAsync('npx prisma db push', { cwd: '/home/vsumup/pain-db' });
    console.log('✅ Schema pushed to database');
    console.log('📋 Output:', stdout);
    
    if (stderr) {
      console.log('⚠️ Warnings:', stderr);
    }

    console.log('📝 Step 3: Verifying AuditLog table...');
    const { prisma } = require('./src/services/db');
    
    // Test creating an audit log entry
    const testLog = await prisma.auditLog.create({
      data: {
        action: 'TEST_ACTION',
        metadata: { test: true }
      }
    });
    console.log('✅ AuditLog table working:', testLog.id);
    
    // Clean up test entry
    await prisma.auditLog.delete({ where: { id: testLog.id } });
    console.log('✅ Test entry cleaned up');
    
    console.log('\n🎉 AuditLog model successfully added!');
    
  } catch (error) {
    console.error('❌ Error adding AuditLog model:', error.message);
    throw error;
  }
}

addAuditLogModel().catch(console.error);