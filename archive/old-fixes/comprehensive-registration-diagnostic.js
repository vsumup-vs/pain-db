const { spawn } = require('child_process');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function comprehensiveRegistrationDiagnostic() {
  console.log('🔍 Comprehensive Registration Diagnostic\n');
  
  let serverProcess = null;
  let serverLogs = [];
  
  try {
    // Step 1: Prepare test data
    console.log('1️⃣ Preparing test environment...');
    
    // Ensure organization exists
    let testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });
    
    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'CLINIC',
          isActive: true,
          settings: {}
        }
      });
    }
    console.log('✅ Test organization ready:', testOrg.id);
    
    // Clean up test user
    await prisma.userOrganization.deleteMany({
      where: { user: { email: 'diagnostic@example.com' } }
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: 'diagnostic@example.com' } }
    });
    await prisma.user.deleteMany({
      where: { email: 'diagnostic@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Step 2: Start server with detailed logging
    console.log('\n2️⃣ Starting server with detailed logging...');
    
    serverProcess = spawn('node', ['index.js'], {
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Capture all server output
    serverProcess.stdout.on('data', (data) => {
      const log = data.toString();
      serverLogs.push(log);
      console.log('📋 SERVER:', log.trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      const log = data.toString();
      serverLogs.push(log);
      console.log('🚨 SERVER ERROR:', log.trim());
    });
    
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Test server health
    console.log('\n3️⃣ Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/health');
      console.log('✅ Server health check passed:', healthResponse.status);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      throw new Error('Server not responding');
    }
    
    // Step 4: Test registration with detailed error capture
    console.log('\n4️⃣ Testing registration...');
    
    const registrationData = {
      email: 'diagnostic@example.com',
      password: 'TestPassword123!',
      firstName: 'Diagnostic',
      lastName: 'Test',
      organizationId: testOrg.id,
      role: 'CLINICIAN'
    };
    
    console.log('📋 Registration data:', JSON.stringify(registrationData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      console.log('✅ Registration successful!');
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Registration failed!');
      console.log('📋 Status:', error.response?.status);
      console.log('📋 Error data:', JSON.stringify(error.response?.data, null, 2));
      console.log('📋 Error message:', error.message);
      
      // Capture server logs at time of error
      console.log('\n🔍 Server logs during error:');
      serverLogs.slice(-10).forEach(log => {
        console.log('📋', log.trim());
      });
    }
    
    // Step 5: Manual database test
    console.log('\n5️⃣ Testing manual database operations...');
    
    try {
      // Test user creation
      const testUser = await prisma.user.create({
        data: {
          email: 'manual-test@example.com',
          passwordHash: 'test-hash',
          firstName: 'Manual',
          lastName: 'Test',
          isActive: true
        }
      });
      console.log('✅ Manual user creation successful:', testUser.id);
      
      // Test user-organization creation
      const testUserOrg = await prisma.userOrganization.create({
        data: {
          userId: testUser.id,
          organizationId: testOrg.id,
          role: 'CLINICIAN',
          permissions: ['USER_READ'],
          joinedAt: new Date()
        }
      });
      console.log('✅ Manual user-organization creation successful:', testUserOrg.id);
      
      // Cleanup
      await prisma.userOrganization.delete({ where: { id: testUserOrg.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log('✅ Manual test cleanup successful');
      
    } catch (error) {
      console.log('❌ Manual database operation failed:', error.message);
      console.log('📋 Error details:', error);
    }
    
    // Step 6: Check schema consistency
    console.log('\n6️⃣ Checking schema consistency...');
    
    try {
      // Test all required models exist
      const userCount = await prisma.user.count();
      const orgCount = await prisma.organization.count();
      const userOrgCount = await prisma.userOrganization.count();
      
      console.log('✅ Schema check passed:');
      console.log('📋 Users:', userCount);
      console.log('📋 Organizations:', orgCount);
      console.log('📋 User-Organizations:', userOrgCount);
      
    } catch (error) {
      console.log('❌ Schema check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
    }
    
    await prisma.$disconnect();
    
    // Save logs to file
    fs.writeFileSync('registration-diagnostic-logs.txt', serverLogs.join('\n'));
    console.log('📁 Server logs saved to registration-diagnostic-logs.txt');
  }
}

comprehensiveRegistrationDiagnostic();