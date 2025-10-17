const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoints() {
  console.log('🧪 Testing API endpoints after fixes...\n');

  const endpoints = [
    {
      name: 'Assessment Templates V2 - Get All',
      url: `${BASE_URL}/assessment-templates-v2`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates V2 - Standardized',
      url: `${BASE_URL}/assessment-templates-v2/standardized`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates V2 - Custom',
      url: `${BASE_URL}/assessment-templates-v2/custom`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates V2 - Categories',
      url: `${BASE_URL}/assessment-templates-v2/categories`,
      method: 'GET'
    },
    {
      name: 'Condition Presets - Get All',
      url: `${BASE_URL}/condition-presets`,
      method: 'GET'
    },
    {
      name: 'Metric Definitions',
      url: `${BASE_URL}/metric-definitions`,
      method: 'GET'
    },
    {
      name: 'Patients',
      url: `${BASE_URL}/patients`,
      method: 'GET'
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      const startTime = Date.now();
      
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const duration = Date.now() - startTime;
      
      console.log(`✅ ${endpoint.name}: ${response.status} (${duration}ms)`);
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          console.log(`   📊 Returned ${response.data.length} items`);
        } else if (response.data.templates && Array.isArray(response.data.templates)) {
          console.log(`   📊 Returned ${response.data.templates.length} templates`);
        } else if (typeof response.data === 'object') {
          console.log(`   📊 Returned object with ${Object.keys(response.data).length} properties`);
        }
      }
      
      results.push({
        endpoint: endpoint.name,
        status: 'SUCCESS',
        statusCode: response.status,
        duration
      });
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'}`);
      
      if (error.response?.status === 500) {
        console.log(`   🔍 500 Error Details: ${error.response?.data?.error || 'Unknown error'}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   🔍 Connection refused - is the server running?`);
      } else {
        console.log(`   🔍 Error: ${error.message}`);
      }
      
      results.push({
        endpoint: endpoint.name,
        status: 'FAILED',
        statusCode: error.response?.status || 'N/A',
        error: error.message
      });
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📋 Test Summary:');
  console.log('================');
  
  const successful = results.filter(r => r.status === 'SUCCESS');
  const failed = results.filter(r => r.status === 'FAILED');
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed endpoints:');
    failed.forEach(result => {
      console.log(`   - ${result.endpoint}: ${result.statusCode} ${result.error || ''}`);
    });
  }
  
  if (successful.length === results.length) {
    console.log('\n🎉 All endpoints are working correctly!');
  } else {
    console.log('\n⚠️  Some endpoints still have issues. Check the server logs for more details.');
  }
}

// Run the test
testEndpoints().catch(console.error);