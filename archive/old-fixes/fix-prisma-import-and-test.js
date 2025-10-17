const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

async function fixPrismaImportAndTest() {
  try {
    console.log('🔧 Fixing Prisma import in index.js...');
    
    // Read the current index.js file
    const indexPath = '/home/vsumup/pain-db/index.js';
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Replace the incorrect import
    const oldImport = "const { PrismaClient } = require('./generated/prisma');";
    const newImport = "const { PrismaClient } = require('@prisma/client');";
    
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      fs.writeFileSync(indexPath, content);
      console.log('✅ Fixed Prisma import in index.js');
    } else {
      console.log('ℹ️ Prisma import already correct or not found');
    }
    
    console.log('🔄 Restarting server...');
    
    // Kill any existing server process
    exec('pkill -f "node index.js"', (error) => {
      // Ignore errors - process might not be running
    });
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start the server
    const serverProcess = exec('node index.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Server error:', error);
      }
    });
    
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test server health
    console.log('🏥 Testing server health...');
    try {
      const health = await axios.get('http://localhost:3000/health', { timeout: 5000 });
      console.log('✅ Server is healthy:', health.data.status);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      return;
    }
    
    // Test registration
    console.log('🧪 Testing registration...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
    
    // Get test organization
    const org = await prisma.organization.findFirst();
    
    const registrationData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationId: org?.id,
      role: 'CLINICIAN'
    };
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      console.log('✅ Registration successful!');
      console.log('📋 User created:', response.data.user?.email);
      console.log('📋 Token received:', response.data.token ? 'Yes' : 'No');
    } catch (error) {
      console.log('❌ Registration failed!');
      console.log('📋 Error:', error.message);
      if (error.response) {
        console.log('📋 Status:', error.response.status);
        console.log('📋 Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    await prisma.$disconnect();
    
    // Kill the server process
    serverProcess.kill();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

fixPrismaImportAndTest();