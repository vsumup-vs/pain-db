const axios = require('axios');

const BASE_URL = 'http://localhost:5173';

async function testAPIFixes() {
  console.log('🔧 Testing API fixes...\n');

  try {
    // Test 1: Recent Patients
    console.log('1. Testing /api/patients/recent...');
    const patientsResponse = await axios.get(`${BASE_URL}/api/patients/recent?limit=5`);
    console.log('✅ Recent patients endpoint working');
    console.log(`   Found ${patientsResponse.data.data.length} patients`);
    
    // Test 2: Clinician Stats
    console.log('\n2. Testing /api/clinicians/stats...');
    const statsResponse = await axios.get(`${BASE_URL}/api/clinicians/stats`);
    console.log('✅ Clinician stats endpoint working');
    console.log(`   Total clinicians: ${statsResponse.data.data.total}`);
    console.log(`   Active clinicians: ${statsResponse.data.data.active}`);
    
    // Test 3: API Info (should still work)
    console.log('\n3. Testing /api/info...');
    const infoResponse = await axios.get(`${BASE_URL}/api/info`);
    console.log('✅ API info endpoint working');
    
    console.log('\n🎉 All API endpoints are now working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n🔍 Server logs should contain more details about the error.');
    }
  }
}

// Run the test
testAPIFixes();