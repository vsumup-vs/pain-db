const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testStandardizedEndpoints() {
  console.log('🔍 Testing Standardized API Endpoints...\n');

  const tests = [
    {
      name: 'Assessment Templates - All',
      url: `${BASE_URL}/assessment-templates`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates - Standardized',
      url: `${BASE_URL}/assessment-templates?isStandardized=true`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates - Custom',
      url: `${BASE_URL}/assessment-templates?isStandardized=false`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates - By Category (Pain)',
      url: `${BASE_URL}/assessment-templates?category=Pain`,
      method: 'GET'
    },
    {
      name: 'Assessment Templates - Categories',
      url: `${BASE_URL}/assessment-templates/categories`,
      method: 'GET'
    },
    {
      name: 'Condition Presets - All',
      url: `${BASE_URL}/condition-presets`,
      method: 'GET'
    },
    {
      name: 'Condition Presets - Standardized',
      url: `${BASE_URL}/condition-presets?isStandardized=true`,
      method: 'GET'
    },
    {
      name: 'Condition Presets - Custom',
      url: `${BASE_URL}/condition-presets?isStandardized=false`,
      method: 'GET'
    },
    {
      name: 'Condition Presets - By Category',
      url: `${BASE_URL}/condition-presets?category=Pain`,
      method: 'GET'
    },
    {
      name: 'Metric Definitions - All',
      url: `${BASE_URL}/metric-definitions`,
      method: 'GET'
    },
    {
      name: 'Metric Definitions - Standardized',
      url: `${BASE_URL}/metric-definitions?isStandardized=true`,
      method: 'GET'
    },
    {
      name: 'Alert Rules - All',
      url: `${BASE_URL}/alert-rules`,
      method: 'GET'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios({
        method: test.method,
        url: test.url,
        timeout: 10000
      });

      if (response.status === 200) {
        console.log(`✅ ${test.name} - Status: ${response.status}, Items: ${response.data.length || 'N/A'}`);
        
        // Log sample data for standardization fields
        if (response.data.length > 0 && response.data[0].hasOwnProperty('isStandardized')) {
          const standardized = response.data.filter(item => item.isStandardized).length;
          const custom = response.data.filter(item => !item.isStandardized).length;
          console.log(`   📊 Standardized: ${standardized}, Custom: ${custom}`);
        }
        
        passed++;
      } else {
        console.log(`❌ ${test.name} - Status: ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.response?.status || error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All standardized endpoints are working correctly!');
  } else {
    console.log('⚠️  Some endpoints need attention.');
  }
}

testStandardizedEndpoints();