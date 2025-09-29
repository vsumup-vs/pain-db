const axios = require('axios');

async function testFilteredMetrics() {
  try {
    // First, let's get a list of enrollments to find one to test with
    console.log('Fetching enrollments...');
    const enrollmentsResponse = await axios.get('http://localhost:3001/api/enrollments?limit=1');
    
    if (!enrollmentsResponse.data.data || enrollmentsResponse.data.data.length === 0) {
      console.log('No enrollments found. Please create an enrollment first.');
      return;
    }

    const enrollmentId = enrollmentsResponse.data.data[0].id;
    console.log(`Testing with enrollment ID: ${enrollmentId}`);

    // Test the new filtered metrics endpoint
    console.log('Fetching enrollment with filtered metrics...');
    const filteredResponse = await axios.get(`http://localhost:3001/api/enrollments/${enrollmentId}/filtered-metrics`);
    
    console.log('✅ Success! Filtered metrics response:');
    console.log(JSON.stringify(filteredResponse.data, null, 2));

    // Compare with regular enrollment endpoint
    console.log('\nFetching regular enrollment details...');
    const regularResponse = await axios.get(`http://localhost:3001/api/enrollments/${enrollmentId}`);
    
    console.log('Regular enrollment response (preset info):');
    console.log({
      presetId: regularResponse.data.data.presetId,
      presetName: regularResponse.data.data.preset?.name
    });

  } catch (error) {
    console.error('❌ Error testing filtered metrics:', error.response?.data || error.message);
  }
}

testFilteredMetrics();