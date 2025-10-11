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
    const healthResponse = await axios.get('http://localhost:3000/health'); // FIXED: Correct endpoint
    console.log('✅ Server health:', healthResponse.data);

    // Test registration directly
    console.log('📝 Testing registration...');
    const registrationData = {
      email: 'test.user.debug@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationId: '1' // Using default organization
    };

    console.log('📤 Sending registration request...');
    const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
    console.log('✅ Registration successful:', response.data);

  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
    console.log('📋 Status:', error.response?.status);
    
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