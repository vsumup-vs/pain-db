const axios = require('axios');
const { spawn } = require('child_process');

async function testDebugRegistration() {
  console.log('🚀 Starting debug registration server...');
  
  const server = spawn('node', ['debug-registration-with-logs.js'], {
    cwd: '/home/vsumup/pain-db',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stdout.on('data', (data) => {
    console.log('📤 DEBUG SERVER:', data.toString());
  });

  server.stderr.on('data', (data) => {
    console.log('❌ DEBUG SERVER ERROR:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log('📝 Testing registration...');
    const registrationData = {
      email: 'debug.test@example.com',
      password: 'TestPassword123!',
      firstName: 'Debug',
      lastName: 'Test',
      organizationId: 'cmggb7s5700007k78hunun8sa'
    };

    const response = await axios.post('http://localhost:3001/api/auth/register', registrationData);
    console.log('✅ Registration successful:', response.data);

  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
    console.log('📋 Status:', error.response?.status);
  }

  // Kill server
  console.log('🛑 Stopping debug server...');
  server.kill();
}

testDebugRegistration().catch(console.error);