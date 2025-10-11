const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/auth`;

class ComprehensiveAuthTester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
  }

  async runFullTest() {
    try {
      console.log('🚀 Starting Comprehensive Authentication Test...\n');
      
      // Step 1: Check if server is running
      await this.checkServer();
      
      // Step 2: Initialize roles
      await this.initializeRoles();
      
      // Step 3: Setup test data
      await this.setupTestData();
      
      // Step 4: Run authentication tests
      await this.runAuthTests();
      
      // Step 5: Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  async checkServer() {
    console.log('🔍 Checking if server is running...');
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      console.log('   ✅ Server is running and healthy\n');
    } catch (error) {
      console.log('   ❌ Server is not running or not responding');
      console.log('   💡 Please start the server with: node index.js');
      console.log('   💡 Or run: npm start\n');
      throw new Error('Server not available');
    }
  }

  async initializeRoles() {
    console.log('🔧 Initializing role templates...');
    
    const roleTemplates = [
      {
        name: 'SUPER_ADMIN',
        role: 'SUPER_ADMIN',
        permissions: [
          'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE', 'USER_INVITE', 'USER_ROLE_ASSIGN',
          'PATIENT_CREATE', 'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_ASSIGN', 'PATIENT_MEDICAL_RECORD_READ', 'PATIENT_MEDICAL_RECORD_UPDATE',
          'CLINICIAN_CREATE', 'CLINICIAN_READ', 'CLINICIAN_UPDATE', 'CLINICIAN_DELETE', 'CLINICIAN_ASSIGN',
          'ORG_CREATE', 'ORG_READ', 'ORG_UPDATE', 'ORG_DELETE', 'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE', 'ORG_BILLING_MANAGE',
          'PROGRAM_CREATE', 'PROGRAM_READ', 'PROGRAM_UPDATE', 'PROGRAM_DELETE', 'PROGRAM_ASSIGN',
          'ASSESSMENT_CREATE', 'ASSESSMENT_READ', 'ASSESSMENT_UPDATE', 'ASSESSMENT_DELETE',
          'METRIC_CREATE', 'METRIC_READ', 'METRIC_UPDATE', 'METRIC_DELETE',
          'OBSERVATION_CREATE', 'OBSERVATION_READ', 'OBSERVATION_UPDATE', 'OBSERVATION_DELETE',
          'ALERT_CREATE', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_DELETE', 'ALERT_ACKNOWLEDGE',
          'MEDICATION_CREATE', 'MEDICATION_READ', 'MEDICATION_UPDATE', 'MEDICATION_DELETE', 'MEDICATION_PRESCRIBE',
          'REPORT_READ', 'REPORT_CREATE', 'ANALYTICS_READ',
          'SYSTEM_ADMIN', 'AUDIT_READ',
          'BILLING_READ', 'BILLING_MANAGE', 'COMPLIANCE_READ'
        ],
        description: 'Super administrator with full system access',
        isActive: true
      },
      {
        name: 'CLINICIAN',
        role: 'CLINICIAN',
        permissions: [
          'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_MEDICAL_RECORD_READ', 'PATIENT_MEDICAL_RECORD_UPDATE',
          'ASSESSMENT_CREATE', 'ASSESSMENT_READ', 'ASSESSMENT_UPDATE',
          'METRIC_READ', 'METRIC_UPDATE',
          'OBSERVATION_CREATE', 'OBSERVATION_READ', 'OBSERVATION_UPDATE',
          'ALERT_READ', 'ALERT_UPDATE', 'ALERT_ACKNOWLEDGE',
          'MEDICATION_READ', 'MEDICATION_UPDATE', 'MEDICATION_PRESCRIBE',
          'REPORT_READ'
        ],
        description: 'Healthcare provider with patient care access',
        isActive: true
      },
      {
        name: 'PATIENT',
        role: 'PATIENT',
        permissions: [
          'PATIENT_READ',
          'OBSERVATION_READ', 'OBSERVATION_CREATE',
          'MEDICATION_READ',
          'ALERT_READ'
        ],
        description: 'Patient with limited self-care access',
        isActive: true
      }
    ];

    for (const template of roleTemplates) {
      try {
        await prisma.roleTemplate.upsert({
          where: { name: template.name },
          update: template,
          create: template
        });
        console.log(`   ✅ Role template '${template.name}' initialized`);
      } catch (error) {
        console.log(`   ❌ Failed to initialize role template '${template.name}':`, error.message);
      }
    }
    
    console.log('✅ Role templates initialization completed\n');
  }

  async setupTestData() {
    console.log('🏥 Setting up test organization...');
    
    // Check if test organization already exists
    let testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Healthcare Clinic' }
    });
    
    // Create test organization if it doesn't exist
    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Healthcare Clinic',
          type: 'HOSPITAL',
          email: 'admin@testhealthcare.com',
          phone: '+1-555-0123',
          address: '123 Healthcare Ave, Medical City, MC 12345',
          isActive: true
        }
      });
    }
    
    console.log(`   ✅ Test organization ready: ${testOrg.name}`);
    console.log('✅ Test data setup completed\n');
    
    return testOrg;
  }

  async runAuthTests() {
    console.log('🧪 Running authentication tests...\n');
    
    // Test 1: Registration
    await this.testRegistration();
    
    // Test 2: Login
    await this.testLogin();
    
    // Test 3: Get Profile
    await this.testGetProfile();
    
    // Test 4: Token Refresh
    await this.testTokenRefresh();
    
    // Test 5: Logout
    await this.testLogout();
  }

  async testRegistration() {
    console.log('1️⃣ Testing user registration...');
    
    try {
      // Clean up any existing test user first
      await prisma.user.deleteMany({
        where: { email: 'testuser@testhealthcare.com' }
      });

      // Get test organization
      const testOrg = await prisma.organization.findFirst({
        where: { name: 'Test Healthcare Clinic' }
      });

      const response = await axios.post(`${API_URL}/register`, {
        email: 'testuser@testhealthcare.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        organizationId: testOrg.id,
        role: 'CLINICIAN'
      });

      if (response.status === 201 && response.data.token) {
        this.authToken = response.data.token;
        this.testResults.push({ test: 'Registration', status: '✅ PASS', details: 'User registered successfully' });
        console.log('   ✅ Registration successful');
        console.log(`   📧 Email: ${response.data.user.email}`);
        console.log(`   👤 Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
      } else {
        this.testResults.push({ test: 'Registration', status: '❌ FAIL', details: 'Invalid response' });
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Registration', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('   ❌ Registration failed:', error.response?.data?.error || error.message);
      if (error.response?.data?.details) {
        console.log('   📝 Details:', error.response.data.details);
      }
    }
  }

  async testLogin() {
    console.log('\n2️⃣ Testing user login...');
    
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: 'testuser@testhealthcare.com',
        password: 'TestPassword123!'
      });

      if (response.status === 200 && response.data.token) {
        this.authToken = response.data.token;
        this.testResults.push({ test: 'Login', status: '✅ PASS', details: 'User logged in successfully' });
        console.log('   ✅ Login successful');
        console.log(`   🔑 Token received: ${response.data.token.substring(0, 20)}...`);
      } else {
        this.testResults.push({ test: 'Login', status: '❌ FAIL', details: 'Invalid response' });
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Login', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('   ❌ Login failed:', error.response?.data?.error || error.message);
    }
  }

  async testGetProfile() {
    console.log('\n3️⃣ Testing get profile...');
    
    if (!this.authToken) {
      this.testResults.push({ test: 'Get Profile', status: '⏭️ SKIP', details: 'No auth token available' });
      console.log('   ⏭️ Skipped - no auth token');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.status === 200 && response.data.user) {
        this.testResults.push({ test: 'Get Profile', status: '✅ PASS', details: 'Profile retrieved successfully' });
        console.log('   ✅ Profile retrieved successfully');
        console.log(`   👤 User: ${response.data.user.firstName} ${response.data.user.lastName}`);
        console.log(`   📧 Email: ${response.data.user.email}`);
      } else {
        this.testResults.push({ test: 'Get Profile', status: '❌ FAIL', details: 'Invalid response' });
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Get Profile', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('   ❌ Get profile failed:', error.response?.data?.error || error.message);
    }
  }

  async testTokenRefresh() {
    console.log('\n4️⃣ Testing token refresh...');
    
    if (!this.authToken) {
      this.testResults.push({ test: 'Token Refresh', status: '⏭️ SKIP', details: 'No auth token available' });
      console.log('   ⏭️ Skipped - no auth token');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/refresh`, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.status === 200 && response.data.token) {
        this.authToken = response.data.token;
        this.testResults.push({ test: 'Token Refresh', status: '✅ PASS', details: 'Token refreshed successfully' });
        console.log('   ✅ Token refreshed successfully');
      } else {
        this.testResults.push({ test: 'Token Refresh', status: '❌ FAIL', details: 'Invalid response' });
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Token Refresh', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('   ❌ Token refresh failed:', error.response?.data?.error || error.message);
    }
  }

  async testLogout() {
    console.log('\n5️⃣ Testing logout...');
    
    if (!this.authToken) {
      this.testResults.push({ test: 'Logout', status: '⏭️ SKIP', details: 'No auth token available' });
      console.log('   ⏭️ Skipped - no auth token');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.status === 200) {
        this.testResults.push({ test: 'Logout', status: '✅ PASS', details: 'User logged out successfully' });
        console.log('   ✅ Logout successful');
        this.authToken = null;
      } else {
        this.testResults.push({ test: 'Logout', status: '❌ FAIL', details: 'Invalid response' });
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Logout', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('   ❌ Logout failed:', error.response?.data?.error || error.message);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    this.testResults.forEach(result => {
      console.log(`${result.status} ${result.test}: ${result.details}`);
    });
    
    const passed = this.testResults.filter(r => r.status.includes('✅')).length;
    const failed = this.testResults.filter(r => r.status.includes('❌')).length;
    const skipped = this.testResults.filter(r => r.status.includes('⏭️')).length;
    
    console.log('=' .repeat(50));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Authentication system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the authentication system.');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new ComprehensiveAuthTester();
  tester.runFullTest().catch(console.error);
}

module.exports = ComprehensiveAuthTester;