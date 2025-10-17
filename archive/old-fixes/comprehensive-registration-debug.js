const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');

const prisma = new PrismaClient();

async function comprehensiveRegistrationDebug() {
  console.log('🔍 Comprehensive Registration Debug\n');
  
  let server;
  let serverLogs = [];
  
  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'debug-test@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Ensure test organization exists
    let organization = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });
    
    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'HEALTHCARE_PROVIDER',
          email: 'test@example.com',
          isActive: true
        }
      });
    }
    console.log('✅ Test organization ready:', organization.id);
    
    // Start server with enhanced logging
    console.log('\n🚀 Starting server with enhanced logging...');
    server = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        NODE_ENV: 'development',
        DEBUG: '*'
      }
    });
    
    // Capture all server output
    server.stdout.on('data', (data) => {
      const output = data.toString();
      serverLogs.push(`STDOUT: ${output}`);
      console.log('📤', output.trim());
    });
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      serverLogs.push(`STDERR: ${output}`);
      console.log('📥', output.trim());
    });
    
    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
      
      server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    
    console.log('✅ Server started\n');
    
    // Wait a bit for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test registration with detailed logging
    console.log('📝 Testing registration...');
    const registrationData = {
      email: 'debug-test@example.com',
      password: 'TestPass123!',
      firstName: 'Debug',
      lastName: 'Test',
      organizationId: organization.id
    };
    
    console.log('📋 Registration data:', JSON.stringify(registrationData, null, 2));
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Registration successful!');
      console.log('✅ Status:', response.status);
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('\n❌ Registration failed:');
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log('   No response received');
        console.log('   Request:', error.request);
      } else {
        console.log('   Error:', error.message);
      }
    }
    
    // Wait for any additional logs
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log('❌ Test setup error:', error.message);
  } finally {
    // Stop server
    if (server) {
      server.kill();
      console.log('\n🛑 Server stopped');
    }
    
    // Save all logs
    const logContent = serverLogs.join('\n');
    fs.writeFileSync('comprehensive-debug-logs.txt', logContent);
    console.log('📄 Server logs saved to comprehensive-debug-logs.txt');
    
    // Clean up test user
    try {
      await prisma.user.deleteMany({
        where: { email: 'debug-test@example.com' }
      });
      console.log('✅ Test cleanup completed');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    }
    
    await prisma.$disconnect();
  }
}

comprehensiveRegistrationDebug().catch(console.error);