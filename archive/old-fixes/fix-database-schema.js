const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function fixDatabaseSchema() {
    console.log('🔧 Fixing database schema...');
    
    try {
        // Step 1: Generate Prisma client
        console.log('📦 Step 1: Generating Prisma client...');
        const generateResult = await execAsync('npx prisma generate');
        console.log('✅ Prisma client generated successfully');
        console.log(generateResult.stdout);
        
        // Step 2: Push schema to database (this will create missing columns)
        console.log('🗄️ Step 2: Pushing schema to database...');
        const pushResult = await execAsync('npx prisma db push');
        console.log('✅ Schema pushed to database successfully');
        console.log(pushResult.stdout);
        
        // Step 3: Verify the fix by checking if passwordHash column exists
        console.log('🔍 Step 3: Verifying the fix...');
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        // Try to query the users table to see if passwordHash is accessible
        const result = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'passwordHash'
        `;
        
        if (result.length > 0) {
            console.log('✅ passwordHash column exists in database');
        } else {
            console.log('❌ passwordHash column still missing');
        }
        
        await prisma.$disconnect();
        console.log('🎉 Database schema fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing database schema:', error.message);
        if (error.stdout) console.log('STDOUT:', error.stdout);
        if (error.stderr) console.log('STDERR:', error.stderr);
        process.exit(1);
    }
}

fixDatabaseSchema();