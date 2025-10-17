const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function detailedDiagnostic() {
  console.log('🔍 Detailed Authentication Diagnostic');
  console.log('=====================================');
  
  try {
    // Step 1: Test JWT Service directly
    console.log('\n1️⃣ Testing JWT Service...');
    process.env.JWT_SECRET = 'pain-management-jwt-secret-key-2024';
    
    try {
      const jwtService = require('./src/services/jwtService');
      const testPayload = { 
        userId: 'test-123', 
        email: 'test@example.com',
        role: 'CLINICIAN'
      };
      
      const token = await jwtService.generateToken(testPayload);
      console.log('✅ JWT generation: SUCCESS');
      
      const decoded = await jwtService.verifyToken(token);
      console.log('✅ JWT verification: SUCCESS');
      console.log('📋 Token payload:', { userId: decoded.userId, email: decoded.email });
    } catch (jwtError) {
      console.log('❌ JWT Service Error:', jwtError.message);
      console.log('📋 Stack:', jwtError.stack);
    }

    // Step 2: Test Database Connection
    console.log('\n2️⃣ Testing Database Connection...');
    try {
      await prisma.$connect();
      console.log('✅ Database connection: SUCCESS');
      
      const userCount = await prisma.user.count();
      const orgCount = await prisma.organization.count();
      console.log('📋 Users in DB:', userCount);
      console.log('📋 Organizations in DB:', orgCount);
      
      // Test organization fetch
      const testOrg = await prisma.organization.findFirst();
      console.log('📋 Test organization:', testOrg ? testOrg.name : 'None found');
      
    } catch (dbError) {
      console.log('❌ Database Error:', dbError.message);
    }

    // Step 3: Test Password Hashing
    console.log('\n3️⃣ Testing Password Hashing...');
    try {
      const bcrypt = require('bcrypt');
      const testPassword = 'TestPassword123!';
      const hash = await bcrypt.hash(testPassword, 10);
      console.log('✅ Password hashing: SUCCESS');
      
      const isValid = await bcrypt.compare(testPassword, hash);
      console.log('✅ Password verification:', isValid ? 'SUCCESS' : 'FAILED');
    } catch (hashError) {
      console.log('❌ Password Hashing Error:', hashError.message);
    }

    // Step 4: Test Registration Route Components
    console.log('\n4️⃣ Testing Registration Components...');
    
    // Test validation
    const { body, validationResult } = require('express-validator');
    console.log('✅ Express-validator loaded');
    
    // Test audit service
    try {
      const auditService = require('./src/services/auditService');
      console.log('✅ Audit service loaded');
    } catch (auditError) {
      console.log('❌ Audit service error:', auditError.message);
    }

    // Step 5: Make a direct registration request with detailed error handling
    console.log('\n5️⃣ Testing Registration Endpoint...');
    
    // Clean up first
    await prisma.user.deleteMany({
      where: { email: 'diagnostic@test.com' }
    });
    
    const registrationData = {
      email: 'diagnostic@test.com',
      password: 'TestPassword123!',
      firstName: 'Diagnostic',
      lastName: 'User',
      role: 'CLINICIAN'
    };

    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on error status
      });
      
      console.log('📋 Registration Response Status:', response.status);
      console.log('📋 Registration Response:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 201) {
        console.log('✅ Registration: SUCCESS');
      } else {
        console.log('❌ Registration: FAILED');
      }
      
    } catch (requestError) {
      console.log('❌ Registration Request Error:', requestError.message);
      if (requestError.response) {
        console.log('📋 Error Response:', requestError.response.data);
      }
    }

  } catch (error) {
    console.log('\n❌ Diagnostic Error:', error.message);
    console.log('📋 Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

detailedDiagnostic();