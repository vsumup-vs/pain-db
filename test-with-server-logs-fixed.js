const { spawn } = require('child_process');
const axios = require('axios');

async function testWithServerLogs() {
  console.log('🚀 Starting server with logging...');
  
  // Start the server
  const server = spawn('npm', ['start'], {
    cwd: '/home/vsumup/pain-db',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Capture server output
  server.stdout.on('data', (data) => {
    console.log('📤 SERVER:', data.toString());
  });

  server.stderr.on('data', (data) => {
    console.log('❌ SERVER ERROR:', data.toString());
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Test server health
    console.log('🏥 Testing server health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Server health:', healthResponse.data);

    // Test registration with correct organizationId
    console.log('📝 Testing registration with correct organizationId...');
    const registrationData = {
      email: 'test.user.debug@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'cmggb7s5700007k78hunun8sa' // Using the actual organization ID
    };

    console.log('📤 Sending registration request...');
    const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
    console.log('✅ Registration successful:', response.data);

  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
    console.log('📋 Status:', error.response?.status);
    
    if (error.response?.data) {
      console.log('📋 Full response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Wait a bit more to capture any server logs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Kill server
  console.log('🛑 Stopping server...');
  server.kill();
  
  // Wait for server to stop
  await new Promise(resolve => setTimeout(resolve, 1000));
}

testWithServerLogs().catch(console.error);