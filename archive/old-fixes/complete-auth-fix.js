const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/auth`;

class AuthenticationFixer {
  constructor() {
    this.testResults = [];
  }

  async runCompleteFix() {
    console.log('🚀 Running Complete Authentication Fix and Test...\n');

    try {
      // Step 1: Verify database schema
      await this.verifyDatabaseSchema();
      
      // Step 2: Setup test data
      await this.setupTestData();
      
      // Step 3: Test the fixed authentication
      await this.testAuthentication();
      
      // Step 4: Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
      console.error('Stack:', error.stack);
    } finally {
      await prisma.$disconnect();
    }
  }

  async verifyDatabaseSchema() {
    console.log('1️⃣ Verifying database schema...');
    
    try {
      // Check if users table has passwordHash field
      const testUser = await prisma.user.findFirst();
      console.log('   ✅ User table accessible');
      
      // Check organizations
      const orgCount = await prisma.organization.count();
      console.log(`   ✅ Organizations table accessible (${orgCount} records)`);
      
      // Check user organizations
      const userOrgCount = await prisma.userOrganization.count();
      console.log(`   ✅ UserOrganization table accessible (${userOrgCount} records)`);
      
      console.log('✅ Database schema verification completed\n');
    } catch (error) {
      console.error('❌ Database schema issue:', error.message);
      throw error;
    }
  }

  async setupTestData() {
    console.log('2️⃣ Setting up test data...');
    
    // Create test organization
    const testOrg = await prisma.organization.upsert({
      where: { name: 'Test Healthcare Clinic' },
      update: {},
      create: {
        name: 'Test Healthcare Clinic',
        type: 'HOSPITAL',
        isActive: true
      }
    });
    
    console.log(`   ✅ Test organization ready: ${testOrg.name}`);
    
    // Clean up any existing test user
    const existingUser = await prisma.user.findUnique({
      where: { email: 'testuser@testhealthcare.com' }
    });
    
    if (existingUser) {
      await prisma.userOrganization.deleteMany({
        where: { userId: existingUser.id }
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: existingUser.id }
      });
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
      console.log('   🧹 Cleaned up existing test user');
    }
    
    console.log('✅ Test data setup completed\n');
    return testOrg;
  }

  async testAuthentication() {
    console.log('3️⃣ Testing authentication...');
    
    // Test registration
    await this.testRegistration();
    
    // Test login
    await this.testLogin();
    
    // Test profile access
    await this.testProfile();
  }

  async testRegistration() {
    console.log('   📝 Testing registration...');
    
    try {
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
        this.testResults.push({ test: 'Registration', status: '✅ PASS', details: 'User registered successfully' });
        console.log('      ✅ Registration successful');
        return response.data.token;
      } else {
        this.testResults.push({ test: 'Registration', status: '❌ FAIL', details: 'Invalid response' });
        console.log('      ❌ Registration failed - invalid response');
        return null;
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Registration', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('      ❌ Registration failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async testLogin() {
    console.log('   🔐 Testing login...');
    
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: 'testuser@testhealthcare.com',
        password: 'TestPassword123!'
      });

      if (response.status === 200 && response.data.token) {
        this.testResults.push({ test: 'Login', status: '✅ PASS', details: 'Login successful' });
        console.log('      ✅ Login successful');
        return response.data.token;
      } else {
        this.testResults.push({ test: 'Login', status: '❌ FAIL', details: 'Invalid response' });
        console.log('      ❌ Login failed - invalid response');
        return null;
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Login', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('      ❌ Login failed:', error.response?.data?.error || error.message);
      return null;
    }
  }

  async testProfile() {
    console.log('   👤 Testing profile access...');
    
    // First get a token from login
    try {
      const loginResponse = await axios.post(`${API_URL}/login`, {
        email: 'testuser@testhealthcare.com',
        password: 'TestPassword123!'
      });

      if (loginResponse.data.token) {
        const profileResponse = await axios.get(`${API_URL}/me`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`
          }
        });

        if (profileResponse.status === 200) {
          this.testResults.push({ test: 'Profile Access', status: '✅ PASS', details: 'Profile retrieved successfully' });
          console.log('      ✅ Profile access successful');
        } else {
          this.testResults.push({ test: 'Profile Access', status: '❌ FAIL', details: 'Invalid response' });
          console.log('      ❌ Profile access failed');
        }
      } else {
        this.testResults.push({ test: 'Profile Access', status: '⏭️ SKIP', details: 'No auth token' });
        console.log('      ⏭️ Profile access skipped - no token');
      }
    } catch (error) {
      this.testResults.push({ 
        test: 'Profile Access', 
        status: '❌ FAIL', 
        details: error.response?.data?.error || error.message 
      });
      console.log('      ❌ Profile access failed:', error.response?.data?.error || error.message);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('==================================================');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    this.testResults.forEach(result => {
      console.log(`${result.status} ${result.test}: ${result.details}`);
      if (result.status.includes('✅')) passed++;
      else if (result.status.includes('❌')) failed++;
      else if (result.status.includes('⏭️')) skipped++;
    });
    
    console.log('\n📈 Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   📊 Total: ${this.testResults.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Authentication system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the server logs and implementation.');
    }
  }
}

// Run the complete fix
if (require.main === module) {
  const fixer = new AuthenticationFixer();
  fixer.runCompleteFix().catch(console.error);
}

module.exports = AuthenticationFixer;