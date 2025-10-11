/**
 * Comprehensive API Test for Smart Assessment Continuity System
 * 
 * Tests all continuity endpoints to ensure they're functional
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

class ContinuityAPITester {
  constructor() {
    this.testResults = [];
    this.testData = {};
    this.serverProcess = null;
  }

  async runTests() {
    console.log('🚀 Smart Assessment Continuity API Testing Suite\n');
    console.log('=' .repeat(60));

    try {
      // Step 1: Start server
      await this.startServer();
      
      // Step 2: Verify test data exists
      await this.verifyTestData();
      
      // Step 3: Test all continuity endpoints
      await this.testContinuityEndpoints();
      
      // Step 4: Test error scenarios
      await this.testErrorScenarios();
      
      // Step 5: Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async startServer() {
    console.log('🔧 Starting server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let serverOutput = '';
      this.serverProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
        if (serverOutput.includes('Server running on port')) {
          console.log('   ✅ Server started successfully');
          setTimeout(resolve, 1000); // Give server time to fully initialize
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  async verifyTestData() {
    console.log('\n📋 Verifying test data...');
    
    try {
      // Get test patient
      const testPatient = await prisma.patient.findFirst({
        where: { firstName: 'Patient' },
        include: { enrollments: true }
      });

      if (!testPatient) {
        throw new Error('No test patient found. Run: node create-test-data-for-continuity.js');
      }

      // Get test clinician
      const testClinician = await prisma.clinician.findFirst({
        where: { email: 'dr.continuity@test.com' }
      });

      if (!testClinician) {
        throw new Error('No test clinician found. Run: node create-test-data-for-continuity.js');
      }

      // Get test metric definitions
      const metricDefinitions = await prisma.metricDefinition.findMany({
        where: { name: { contains: 'Pain Scale' } }
      });

      // Get test assessment template
      const assessmentTemplate = await prisma.assessmentTemplate.findFirst({
        where: { name: 'Continuity Test Assessment' }
      });

      this.testData = {
        patient: testPatient,
        clinician: testClinician,
        metricDefinitions,
        assessmentTemplate,
        enrollment: testPatient.enrollments[0]
      };

      console.log('   ✅ Test patient found:', testPatient.firstName, testPatient.lastName);
      console.log('   ✅ Test clinician found:', testClinician.firstName, testClinician.lastName);
      console.log('   ✅ Metric definitions found:', metricDefinitions.length);
      console.log('   ✅ Assessment template found:', assessmentTemplate ? 'Yes' : 'No');
      console.log('   ✅ Enrollments found:', testPatient.enrollments.length);

    } catch (error) {
      throw new Error(`Test data verification failed: ${error.message}`);
    }
  }

  async testContinuityEndpoints() {
    console.log('\n🧪 Testing Continuity API Endpoints...');
    console.log('-'.repeat(50));

    // Test 1: Create Assessment with Continuity
    await this.testCreateAssessmentWithContinuity();

    // Test 2: Get Continuity Suggestions
    await this.testGetContinuitySuggestions();

    // Test 3: Get Continuity History
    await this.testGetContinuityHistory();

    // Test 4: Create Observation with Context
    await this.testCreateObservationWithContext();

    // Test 5: Get Observations with Context
    await this.testGetObservationsWithContext();

    // Test 6: Update Provider Review
    await this.testUpdateProviderReview();
  }

  async testCreateAssessmentWithContinuity() {
    console.log('\n1️⃣ Testing: POST /api/continuity/assessments/with-continuity');
    
    try {
      const requestData = {
        patientId: this.testData.patient.id,
        clinicianId: this.testData.clinician.id,
        templateId: this.testData.assessmentTemplate?.id || 'test-template',
        context: 'CLINICAL_MONITORING',
        enrollmentId: this.testData.enrollment?.id,
        billingRelevant: true,
        reuseOptions: {
          allowAssessmentReuse: true,
          allowObservationReuse: true,
          validityHours: 168
        }
      };

      const response = await axios.post(
        `${API_URL}/continuity/assessments/with-continuity`,
        requestData,
        { timeout: 5000 }
      );

      if (response.status === 200 || response.status === 201) {
        this.testResults.push({
          test: 'Create Assessment with Continuity',
          status: '✅ PASS',
          details: `Status: ${response.status}, Continuity Used: ${response.data.data?.continuityUsed || false}`
        });
        console.log('   ✅ Assessment created successfully');
        console.log(`   📊 Continuity used: ${response.data.data?.continuityUsed || false}`);
        
        // Store assessment ID for later tests
        this.testData.createdAssessment = response.data.data?.assessment;
      }

    } catch (error) {
      this.testResults.push({
        test: 'Create Assessment with Continuity',
        status: '❌ FAIL',
        details: error.response?.data?.message || error.message
      });
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
    }
  }

  async testGetContinuitySuggestions() {
    console.log('\n2️⃣ Testing: GET /api/continuity/patients/:patientId/continuity-suggestions');
    
    try {
      const url = `${API_URL}/continuity/patients/${this.testData.patient.id}/continuity-suggestions`;
      const params = {
        templateId: this.testData.assessmentTemplate?.id,
        metricDefinitionIds: this.testData.metricDefinitions.map(m => m.id).join(',')
      };

      const response = await axios.get(url, { params, timeout: 5000 });

      if (response.status === 200) {
        const suggestions = response.data.data || response.data;
        this.testResults.push({
          test: 'Get Continuity Suggestions',
          status: '✅ PASS',
          details: `Found ${suggestions.reusableObservations?.length || 0} reusable observations, ${suggestions.reusableAssessments?.length || 0} reusable assessments`
        });
        console.log('   ✅ Suggestions retrieved successfully');
        console.log(`   📊 Reusable observations: ${suggestions.reusableObservations?.length || 0}`);
        console.log(`   📊 Reusable assessments: ${suggestions.reusableAssessments?.length || 0}`);
      }

    } catch (error) {
      this.testResults.push({
        test: 'Get Continuity Suggestions',
        status: '❌ FAIL',
        details: error.response?.data?.message || error.message
      });
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
    }
  }

  async testGetContinuityHistory() {
    console.log('\n3️⃣ Testing: GET /api/continuity/patients/:patientId/continuity-history');
    
    try {
      const url = `${API_URL}/continuity/patients/${this.testData.patient.id}/continuity-history`;
      const params = { limit: 10, offset: 0 };

      const response = await axios.get(url, { params, timeout: 5000 });

      if (response.status === 200) {
        const history = response.data.data || response.data;
        this.testResults.push({
          test: 'Get Continuity History',
          status: '✅ PASS',
          details: `Found ${Array.isArray(history) ? history.length : 0} history entries`
        });
        console.log('   ✅ History retrieved successfully');
        console.log(`   📊 History entries: ${Array.isArray(history) ? history.length : 0}`);
      }

    } catch (error) {
      this.testResults.push({
        test: 'Get Continuity History',
        status: '❌ FAIL',
        details: error.response?.data?.message || error.message
      });
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
    }
  }

  async testCreateObservationWithContext() {
    console.log('\n4️⃣ Testing: POST /api/continuity/observations/with-context');
    
    try {
      const requestData = {
        patientId: this.testData.patient.id,
        clinicianId: this.testData.clinician.id,
        metricDefinitionId: this.testData.metricDefinitions[0]?.id || 'test-metric',
        value: { numeric: 7 },
        context: 'WELLNESS',
        enrollmentId: this.testData.enrollment?.id,
        billingRelevant: false,
        notes: 'API test observation'
      };

      const response = await axios.post(
        `${API_URL}/continuity/observations/with-context`,
        requestData,
        { timeout: 5000 }
      );

      if (response.status === 200 || response.status === 201) {
        this.testResults.push({
          test: 'Create Observation with Context',
          status: '✅ PASS',
          details: `Status: ${response.status}, Observation ID: ${response.data.data?.id || 'N/A'}`
        });
        console.log('   ✅ Observation created successfully');
        
        // Store observation ID for later tests
        this.testData.createdObservation = response.data.data;
      }

    } catch (error) {
      this.testResults.push({
        test: 'Create Observation with Context',
        status: '❌ FAIL',
        details: error.response?.data?.message || error.message
      });
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
    }
  }

  async testGetObservationsWithContext() {
    console.log('\n5️⃣ Testing: GET /api/continuity/patients/:patientId/observations/context');
    
    try {
      const url = `${API_URL}/continuity/patients/${this.testData.patient.id}/observations/context`;
      const params = {
        context: 'WELLNESS',
        billingRelevant: false,
        limit: 10
      };

      const response = await axios.get(url, { params, timeout: 5000 });

      if (response.status === 200) {
        const observations = response.data.data || response.data;
        this.testResults.push({
          test: 'Get Observations with Context',
          status: '✅ PASS',
          details: `Found ${Array.isArray(observations) ? observations.length : 0} observations`
        });
        console.log('   ✅ Observations retrieved successfully');
        console.log(`   📊 Observations found: ${Array.isArray(observations) ? observations.length : 0}`);
      }

    } catch (error) {
      this.testResults.push({
        test: 'Get Observations with Context',
        status: '❌ FAIL',
        details: error.response?.data?.message || error.message
      });
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
    }
  }

  async testUpdateProviderReview() {
    console.log('\n6️⃣ Testing: PATCH /api/continuity/observations/:observationId/review');
    
    try {
      // Get an existing observation to review
      const observation = await prisma.observation.findFirst({
        where: { patientId: this.testData.patient.id }
      });

      if (!observation) {
        console.log('   ⚠️  No observations found to review');
        return;
      }

      const requestData = {
        providerReviewed: true,
        reviewedBy: this.testData.clinician.id,
        notes: 'Reviewed via API test'
      };

      const response = await axios.patch(
        `${API_URL}/continuity/observations/${observation.id}/review`,
        requestData,
        { timeout: 5000 }
      );

      if (response.status === 200) {
        this.testResults.push({
          test: 'Update Provider Review',
          status: '✅ PASS',
          details: `Observation ${observation.id} reviewed successfully`
        });
        console.log('   ✅ Provider review updated successfully');
      }

    } catch (error) {
      this.testResults.push({
        test: 'Update Provider Review',
        status: '❌ FAIL',
        details: error.response?.data?.message || error.message
      });
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
    }
  }

  async testErrorScenarios() {
    console.log('\n🚨 Testing Error Scenarios...');
    console.log('-'.repeat(50));

    // Test 1: Invalid patient ID
    await this.testInvalidPatientId();

    // Test 2: Missing required fields
    await this.testMissingRequiredFields();

    // Test 3: Invalid observation ID
    await this.testInvalidObservationId();
  }

  async testInvalidPatientId() {
    console.log('\n❌ Testing: Invalid Patient ID');
    
    try {
      const response = await axios.get(
        `${API_URL}/continuity/patients/invalid-id/continuity-suggestions`,
        { timeout: 5000 }
      );

      // Should not reach here
      this.testResults.push({
        test: 'Invalid Patient ID Error Handling',
        status: '❌ FAIL',
        details: 'Should have returned error for invalid patient ID'
      });

    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        this.testResults.push({
          test: 'Invalid Patient ID Error Handling',
          status: '✅ PASS',
          details: `Correctly returned ${error.response.status} error`
        });
        console.log(`   ✅ Correctly handled invalid patient ID (${error.response.status})`);
      } else {
        this.testResults.push({
          test: 'Invalid Patient ID Error Handling',
          status: '❌ FAIL',
          details: `Unexpected error: ${error.message}`
        });
        console.log('   ❌ Unexpected error:', error.message);
      }
    }
  }

  async testMissingRequiredFields() {
    console.log('\n❌ Testing: Missing Required Fields');
    
    try {
      const response = await axios.post(
        `${API_URL}/continuity/assessments/with-continuity`,
        { /* missing required fields */ },
        { timeout: 5000 }
      );

      // Should not reach here
      this.testResults.push({
        test: 'Missing Required Fields Error Handling',
        status: '❌ FAIL',
        details: 'Should have returned validation error'
      });

    } catch (error) {
      if (error.response?.status === 400) {
        this.testResults.push({
          test: 'Missing Required Fields Error Handling',
          status: '✅ PASS',
          details: 'Correctly returned 400 validation error'
        });
        console.log('   ✅ Correctly handled missing required fields (400)');
      } else {
        this.testResults.push({
          test: 'Missing Required Fields Error Handling',
          status: '❌ FAIL',
          details: `Unexpected error: ${error.message}`
        });
        console.log('   ❌ Unexpected error:', error.message);
      }
    }
  }

  async testInvalidObservationId() {
    console.log('\n❌ Testing: Invalid Observation ID');
    
    try {
      const response = await axios.patch(
        `${API_URL}/continuity/observations/invalid-id/review`,
        { providerReviewed: true },
        { timeout: 5000 }
      );

      // Should not reach here
      this.testResults.push({
        test: 'Invalid Observation ID Error Handling',
        status: '❌ FAIL',
        details: 'Should have returned error for invalid observation ID'
      });

    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        this.testResults.push({
          test: 'Invalid Observation ID Error Handling',
          status: '✅ PASS',
          details: `Correctly returned ${error.response.status} error`
        });
        console.log(`   ✅ Correctly handled invalid observation ID (${error.response.status})`);
      } else {
        this.testResults.push({
          test: 'Invalid Observation ID Error Handling',
          status: '❌ FAIL',
          details: `Unexpected error: ${error.message}`
        });
        console.log('   ❌ Unexpected error:', error.message);
      }
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(60));

    const passed = this.testResults.filter(r => r.status.includes('PASS')).length;
    const failed = this.testResults.filter(r => r.status.includes('FAIL')).length;

    console.log(`\n🎯 Overall Results: ${passed} passed, ${failed} failed\n`);

    this.testResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}`);
      console.log(`   ${result.status}`);
      console.log(`   ${result.details}\n`);
    });

    if (failed === 0) {
      console.log('🎉 All tests passed! The Continuity API is fully functional.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    try {
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        console.log('   ✅ Server stopped');
      }
      
      await prisma.$disconnect();
      console.log('   ✅ Database connection closed');
      
    } catch (error) {
      console.log('   ⚠️  Cleanup error:', error.message);
    }
  }
}

// Run the tests
async function runContinuityAPITests() {
  const tester = new ContinuityAPITester();
  await tester.runTests();
}

if (require.main === module) {
  runContinuityAPITests().catch(console.error);
}

module.exports = { ContinuityAPITester };