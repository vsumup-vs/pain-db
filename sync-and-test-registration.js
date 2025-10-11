const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function syncAndTestRegistration() {
  console.log('🔄 Syncing database schema and testing registration...');
  
  try {
    console.log('📝 Step 1: Generating Prisma client...');
    const { stdout: genStdout } = await execAsync('npx prisma generate', { 
      cwd: '/home/vsumup/pain-db' 
    });
    console.log('✅ Prisma client generated');

    console.log('📝 Step 2: Pushing schema to database...');
    const { stdout: pushStdout } = await execAsync('npx prisma db push', { 
      cwd: '/home/vsumup/pain-db' 
    });
    console.log('✅ Schema pushed to database');
    if (pushStdout) console.log('📋 Output:', pushStdout);

    console.log('📝 Step 3: Testing registration...');
    const { stdout: testStdout } = await execAsync('node simple-registration-test.js', { 
      cwd: '/home/vsumup/pain-db' 
    });
    console.log('✅ Registration test completed');
    console.log('📋 Test output:');
    console.log(testStdout);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stdout) {
      console.log('📋 Stdout:', error.stdout);
    }
    if (error.stderr) {
      console.log('📋 Stderr:', error.stderr);
    }
  }
}

syncAndTestRegistration().catch(console.error);