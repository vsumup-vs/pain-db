const fs = require('fs');
const http = require('http');

const postData = JSON.stringify({
  email: 'test@example.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Login response:', JSON.stringify(response, null, 2));

      const token = response.token || response.accessToken;
      if (token) {
        fs.writeFileSync(process.env.HOME + '/.pain-db-token', token);
        console.log('\n✅ Token saved to ~/.pain-db-token');
        console.log('Token:', token.substring(0, 20) + '...');
      } else {
        console.error('\n❌ No token in response');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
