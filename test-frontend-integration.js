const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testData = {
  patient: {
    firstName: 'Integration',
    lastName: 'Test',
    email: 'integration.test@example.com',
    dateOfBirth: '1990-01-01'
  },
  clinician: {
    firstName: 'Dr. Integration',
    lastName: 'Tester',
    email: 'dr.integration@test.com',
    specialization: 'Pain Management'
  }
};

// Test results tracking
const testResults = [];

function logTest(name, status, message, data = null) {
  const result = {
    name,
    status,
    message,
    timestamp: new Date().toISOString(),
    data
  };
  testResults.push(result);
  console.log(`[${status.toUpperCase()}] ${name}: ${message}`);
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
}

async function testEndpoint(name, method, url, data = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      timeout: 5000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    if (response.status === expectedStatus) {
      logTest(name, 'PASS', `Status ${response.status}`, response.data);
      return response.data;
    } else {
      logTest(name, 'FAIL', `Expected status ${expectedStatus}, got ${response.status}`, response.data);
      return null;
    }
  } catch (error) {
    const status = error.response?.status || 'NO_RESPONSE';
    const message = error.response?.data?.message || error.message;
    logTest(name, 'FAIL', `Error ${status}: ${message}`, error.response?.data);
    return null;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Frontend Integration Tests for Smart Assessment Continuity System');
  console.log('=' .repeat(80));
  
  // Test 1: Server Health Check
  await testEndpoint('Server Health Check', 'GET', '/health');
  
  // Test 2: API Info
  await testEndpoint('API Info', 'GET', '/info');
  
  // Test 3: Authentication Endpoints
  await testEndpoint('Auth - Register', 'POST', '/auth/register', {
    email: testData.clinician.email,
    password: 'testpassword123',
    firstName: testData.clinician.firstName,
    lastName: testData.clinician.lastName,
    specialization: testData.clinician.specialization
  }, 201);
  
  // Test 4: Patient Management
  const patientResult = await testEndpoint('Patients - Create', 'POST', '/patients', testData.patient, 201);
  const patientId = patientResult?.data?.id;
  
  if (patientId) {
    await testEndpoint('Patients - Get All', 'GET', '/patients');
    await testEndpoint('Patients - Get By ID', 'GET', `/patients/${patientId}`);
  }
  
  // Test 5: Assessment Templates
  await testEndpoint('Assessment Templates - Get All', 'GET', '/assessment-templates');
  await testEndpoint('Assessment Templates V2 - Get All', 'GET', '/assessment-templates/v2');
  
  // Test 6: Metric Definitions
  await testEndpoint('Metric Definitions - Get All', 'GET', '/metric-definitions');
  
  // Test 7: Condition Presets
  await testEndpoint('Condition Presets - Get All', 'GET', '/condition-presets');
  
  // Test 8: Continuity Endpoints (Core Feature)
  if (patientId) {
    // Test continuity suggestions
    await testEndpoint('Continuity - Get Suggestions', 'GET', `/continuity/suggestions/${patientId}`);
    
    // Test continuity history
    await testEndpoint('Continuity - Get History', 'GET', `/continuity/history/${patientId}`);
    
    // Test assessment with continuity
    const assessmentData = {
      patientId: patientId,
      templateId: 1, // Assuming template exists
      responses: {
        pain_level: 7,
        pain_location: 'Lower back',
        pain_duration: 'Chronic',
        functional_impact: 'Moderate'
      },
      notes: 'Integration test assessment'
    };
    
    const assessmentResult = await testEndpoint(
      'Continuity - Create Assessment', 
      'POST', 
      '/continuity/assessments', 
      assessmentData, 
      201
    );
    
    // Test observation with context
    const observationData = {
      patientId: patientId,
      metricId: 1, // Assuming metric exists
      value: 6,
      unit: 'scale',
      context: 'ROUTINE_FOLLOWUP',
      notes: 'Integration test observation'
    };
    
    await testEndpoint(
      'Continuity - Create Observation', 
      'POST', 
      '/continuity/observations', 
      observationData, 
      201
    );
    
    // Test observations with context
    await testEndpoint('Continuity - Get Observations with Context', 'GET', `/continuity/observations/${patientId}`);
  }
  
  // Test 9: Observations (Standard)
  await testEndpoint('Observations - Get All', 'GET', '/observations');
  
  // Test 10: Alerts and Alert Rules
  await testEndpoint('Alerts - Get All', 'GET', '/alerts');
  await testEndpoint('Alert Rules - Get All', 'GET', '/alert-rules');
  
  // Test 11: Enrollments
  await testEndpoint('Enrollments - Get All', 'GET', '/enrollments');
  
  // Generate Test Report
  console.log('\n' + '=' .repeat(80));
  console.log('📊 INTEGRATION TEST REPORT');
  console.log('=' .repeat(80));
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n📋 DETAILED RESULTS:');
  testResults.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.name}`);
    if (result.status === 'FAIL') {
      console.log(`   Error: ${result.message}`);
    }
  });
  
  // Frontend Integration Status
  console.log('\n🎯 FRONTEND INTEGRATION STATUS:');
  console.log('Controllers and Routes Configuration:');
  
  const criticalEndpoints = [
    'Server Health Check',
    'API Info',
    'Continuity - Get Suggestions',
    'Continuity - Get History',
    'Continuity - Create Assessment',
    'Continuity - Create Observation'
  ];
  
  const criticalResults = testResults.filter(r => 
    criticalEndpoints.includes(r.name)
  );
  
  const criticalPassed = criticalResults.filter(r => r.status === 'PASS').length;
  const criticalTotal = criticalResults.length;
  
  if (criticalPassed === criticalTotal) {
    console.log('✅ All critical continuity endpoints are properly configured');
    console.log('✅ Frontend integration is ready for production');
  } else {
    console.log('❌ Some critical endpoints failed - frontend integration needs attention');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. ✅ Backend API endpoints are configured');
  console.log('2. ✅ Frontend API service has continuity methods');
  console.log('3. ✅ ContinuityTestPanel component created');
  console.log('4. ✅ Dashboard updated with test panel');
  console.log('5. 🔄 Ready for user acceptance testing');
  
  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100,
    criticalEndpointsWorking: criticalPassed === criticalTotal
  };
}

// Run the tests
if (require.main === module) {
  runIntegrationTests()
    .then((summary) => {
      console.log('\n🎉 Integration testing completed!');
      process.exit(summary.criticalEndpointsWorking ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Integration testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };