const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🧪 Testing API endpoints...\n');
  
  const endpoints = [
    '/patients/stats',
    '/clinicians/stats', 
    '/alerts/stats',
    '/patients?limit=1',
    '/alerts?limit=1'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const start = Date.now();
      const response = await axios.get(`${baseURL}${endpoint}`, { timeout: 5000 });
      const duration = Date.now() - start;
      console.log(`✅ ${endpoint} - ${response.status} (${duration}ms)`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.message}\n`);
    }
  }
}

testAPI();