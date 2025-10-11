const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixedRegistrationDebug() {
  console.log('🔍 Fixed Registration Debug - Capturing Real Server Errors\n');

  let serverProcess = null;
  const logFile = 'fixed-registration-debug.log';

  try {
    // Clean up any existing test user
    const testEmail = 'fixed-test@example.com';
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log('✅ Cleaned up test user');

    // Ensure test organization exists
    let organization = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'HEALTHCARE_PROVIDER',
          isActive: true
        }
      });
    }
    console.log('✅ Test organization ready:', organization.id);

    // Start server normally (without modifications to avoid issues)
    console.log('\n🚀 Starting server...');
    
    // Clear previous log file
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }

    serverProcess = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.log('SERVER:', output.trim());
      fs.appendFileSync(logFile, `STDOUT: ${output}`);
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.error('SERVER ERROR:', output.trim());
      fs.appendFileSync(logFile, `STDERR: ${output}`);
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test server health (correct endpoint)
    console.log('\n🏥 Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/health');
      console.log('✅ Server is healthy:', healthResponse.status);
      console.log('Health data:', healthResponse.data);
    } catch (error) {
      console.error('❌ Server health check failed:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      throw error;
    }

    // Attempt registration with detailed logging
    console.log('\n📝 Attempting registration...');
    
    const registrationData = {
      email: testEmail,
      password: 'TestPass123!',
      firstName: 'Fixed',
      lastName: 'Test',
      organizationId: organization.id,
      role: 'PATIENT'
    };

    console.log('Registration data:', registrationData);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: function (status) {
          return status < 600; // Accept any status code less than 600
        }
      });

      console.log('📊 Registration response received:');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Registration successful!');
        
        // Test login with the new user
        console.log('\n🔐 Testing login with new user...');
        try {
          const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            email: testEmail,
            password: 'TestPass123!'
          });
          console.log('✅ Login successful!');
          console.log('Login response:', loginResponse.data);
        } catch (loginError) {
          console.error('❌ Login failed:', loginError.response?.data || loginError.message);
        }
        
      } else {
        console.error('❌ Registration failed with status:', response.status);
        console.error('Response data:', response.data);
      }

    } catch (error) {
      console.error('❌ Registration request failed');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error:', error.message);
      }

      // Read the detailed log file
      if (fs.existsSync(logFile)) {
        console.log('\n📋 Server logs during registration:');
        const logs = fs.readFileSync(logFile, 'utf8');
        console.log(logs);
      }
    }

    // Wait a bit to capture any delayed logs
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('\n❌ Fixed registration debug failed:', error.message);
    
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Show final logs
    if (fs.existsSync(logFile)) {
      console.log('\n📋 Final server logs:');
      const logs = fs.readFileSync(logFile, 'utf8');
      console.log(logs);
    }

    await prisma.$disconnect();
    console.log('✅ Cleanup completed');
  }
}

fixedRegistrationDebug();