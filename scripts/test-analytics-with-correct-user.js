const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAnalyticsWithCorrectUser() {
  console.log('🧪 Testing Analytics with Correct User ID\n');

  try {
    // 1. Authenticate as admin
    console.log('1️⃣  Authenticating as admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@testclinic.com',
      password: 'admin123'
    });

    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log(`✓ Authenticated as admin (User ID: ${userId})\n`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test Clinician Workflow Analytics (should use current user ID by default)
    console.log('2️⃣  Testing Clinician Workflow Analytics (default - current user)...');
    const defaultWorkflowRes = await axios.get(`${API_BASE}/analytics/clinician-workflow`, {
      headers,
      params: { timeframe: '30d' }
    });

    console.log('✓ Default Clinician Workflow Analytics Response:');
    console.log('  Data:', JSON.stringify(defaultWorkflowRes.data, null, 2));
    console.log('');

    // 3. Test with explicit clinician user ID
    console.log('3️⃣  Testing with explicit admin user ID...');
    const explicitWorkflowRes = await axios.get(`${API_BASE}/analytics/clinician-workflow`, {
      headers,
      params: { clinicianId: userId, timeframe: '30d' }
    });

    console.log('✓ Explicit User ID Analytics Response:');
    console.log('  Data:', JSON.stringify(explicitWorkflowRes.data, null, 2));
    console.log('');

    // 4. Test with nurse user (who resolved 2 alerts)
    console.log('4️⃣  Testing with nurse user ID (who resolved 2 alerts)...');

    // Get nurse user ID from previous investigation
    const nurseUserId = 'cmh2umwif00077k301gq0bxln';

    const nurseWorkflowRes = await axios.get(`${API_BASE}/analytics/clinician-workflow`, {
      headers,
      params: { clinicianId: nurseUserId, timeframe: '30d' }
    });

    console.log('✓ Nurse User Analytics Response:');
    console.log('  Data:', JSON.stringify(nurseWorkflowRes.data, null, 2));
    console.log('');

    console.log('🎉 Analytics testing complete!\n');

  } catch (error) {
    console.error('❌ Error testing analytics:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Message: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      console.error(`  Details:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

testAnalyticsWithCorrectUser();
