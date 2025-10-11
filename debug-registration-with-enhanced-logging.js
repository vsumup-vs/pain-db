const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRegistrationWithEnhancedLogging() {
  console.log('🔍 Debug Registration with Enhanced Logging\n');
  
  let serverProcess = null;
  
  try {
    // Step 1: Backup original authRoutes.js
    console.log('1️⃣ Backing up original authRoutes.js...');
    const authRoutesPath = '/home/vsumup/pain-db/src/routes/authRoutes.js';
    const backupPath = '/home/vsumup/pain-db/src/routes/authRoutes.js.backup';
    
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(authRoutesPath, backupPath);
      console.log('✅ Backup created');
    }
    
    // Step 2: Add enhanced logging to registration route
    console.log('\n2️⃣ Adding enhanced logging to registration route...');
    
    let authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
    
    // Replace the catch block with enhanced logging
    const originalCatch = `    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }`;
    
    const enhancedCatch = `    } catch (error) {
      console.error('🚨 REGISTRATION ERROR DETAILS:');
      console.error('🚨 Error message:', error.message);
      console.error('🚨 Error stack:', error.stack);
      console.error('🚨 Error name:', error.name);
      console.error('🚨 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Log request data for debugging
      console.error('🚨 Request body:', JSON.stringify(req.body, null, 2));
      
      res.status(500).json({ 
        error: 'Registration failed',
        details: error.message,
        stack: error.stack
      });
    }`;
    
    authRoutesContent = authRoutesContent.replace(originalCatch, enhancedCatch);
    
    // Also add step-by-step logging in the registration process
    const stepLogging = `
      console.log('📋 REGISTRATION STEP 1: Starting registration for', email);
      
      // Check if user already exists
      console.log('📋 REGISTRATION STEP 2: Checking if user exists');
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        console.log('📋 REGISTRATION STEP 2: User already exists');
        return res.status(400).json({ error: 'User already exists' });
      }
      console.log('📋 REGISTRATION STEP 2: User does not exist, proceeding');

      // Hash password
      console.log('📋 REGISTRATION STEP 3: Hashing password');
      const passwordHash = await bcrypt.hash(password, 12);
      console.log('📋 REGISTRATION STEP 3: Password hashed successfully');

      // Create user
      console.log('📋 REGISTRATION STEP 4: Creating user');
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash, // FIXED: Added missing passwordHash
          firstName,
          lastName,
          emailVerified: null, // FIXED: Changed from false to null
          isActive: true
        }
      });
      console.log('📋 REGISTRATION STEP 4: User created successfully', user.id);

      // Handle organization assignment
      console.log('📋 REGISTRATION STEP 5: Handling organization assignment');
      let userOrganization = null;
      if (organizationId) {
        console.log('📋 REGISTRATION STEP 5a: Organization ID provided:', organizationId);
        // Verify organization exists
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId }
        });
        console.log('📋 REGISTRATION STEP 5a: Organization found:', organization ? 'Yes' : 'No');

        if (!organization) {
          console.log('📋 REGISTRATION STEP 5a: Invalid organization, cleaning up user');
          // Cleanup created user
          await prisma.user.delete({ where: { id: user.id } });
          return res.status(400).json({ error: 'Invalid organization' });
        }

        // Validate role - use UserRole enum values
        console.log('📋 REGISTRATION STEP 5b: Validating role:', role);
        const validRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'CLINICIAN', 'NURSE', 'BILLING_ADMIN', 'PATIENT', 'CAREGIVER', 'RESEARCHER'];
        if (!validRoles.includes(role)) {
          console.log('📋 REGISTRATION STEP 5b: Invalid role, cleaning up user');
          // Cleanup created user
          await prisma.user.delete({ where: { id: user.id } });
          return res.status(400).json({ error: 'Invalid role' });
        }
        console.log('📋 REGISTRATION STEP 5b: Role is valid');

        // Assign user to organization - use role directly, not roleTemplateId
        console.log('📋 REGISTRATION STEP 5c: Creating user-organization relationship');
        userOrganization = await prisma.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: organizationId,
            role: role,
            permissions: ['USER_READ'], // Add default permissions
            joinedAt: new Date()
          },
          include: {
            organization: true
          }
        });
        console.log('📋 REGISTRATION STEP 5c: User-organization created successfully', userOrganization.id);
      }

      // Generate tokens
      console.log('📋 REGISTRATION STEP 6: Generating tokens');
      const token = await jwtService.generateUserToken(user.id);
      console.log('📋 REGISTRATION STEP 6: Token generated successfully');
      
      const refreshToken = await jwtService.generateRefreshToken(user.id);
      console.log('📋 REGISTRATION STEP 6: Refresh token generated successfully');

      // Log audit event
      console.log('📋 REGISTRATION STEP 7: Logging audit event');
      await auditService.logEvent({
        action: 'USER_REGISTERED',
        userId: user.id,
        organizationId: organizationId,
        details: {
          email: user.email,
          role: role
        }
      });
      console.log('📋 REGISTRATION STEP 7: Audit event logged successfully');

      console.log('📋 REGISTRATION STEP 8: Sending response');`;
    
    // Insert step logging after the role assignment validation
    const insertPoint = `      // Check if user already exists`;
    authRoutesContent = authRoutesContent.replace(insertPoint, stepLogging);
    
    // Write the enhanced version
    fs.writeFileSync(authRoutesPath, authRoutesContent);
    console.log('✅ Enhanced logging added');
    
    // Step 3: Prepare test data
    console.log('\n3️⃣ Preparing test environment...');
    
    // Ensure organization exists
    let testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });
    
    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'CLINIC',
          isActive: true,
          settings: {}
        }
      });
    }
    console.log('✅ Test organization ready:', testOrg.id);
    
    // Clean up test user
    await prisma.userOrganization.deleteMany({
      where: { user: { email: 'enhanced-debug@example.com' } }
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: 'enhanced-debug@example.com' } }
    });
    await prisma.user.deleteMany({
      where: { email: 'enhanced-debug@example.com' }
    });
    console.log('✅ Test user cleaned up');
    
    // Step 4: Start server
    console.log('\n4️⃣ Starting server...');
    
    serverProcess = spawn('node', ['index.js'], {
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let serverOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const log = data.toString();
      serverOutput += log;
      console.log('📋 SERVER:', log.trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      const log = data.toString();
      serverOutput += log;
      console.log('🚨 SERVER ERROR:', log.trim());
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Test registration
    console.log('\n5️⃣ Testing registration with enhanced logging...');
    
    const registrationData = {
      email: 'enhanced-debug@example.com',
      password: 'TestPassword123!',
      firstName: 'Enhanced',
      lastName: 'Debug',
      organizationId: testOrg.id,
      role: 'CLINICIAN'
    };
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData);
      console.log('✅ Registration successful!');
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Registration failed!');
      console.log('📋 Status:', error.response?.status);
      console.log('📋 Error data:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // Wait a bit for all logs to be captured
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save all server output
    fs.writeFileSync('enhanced-debug-logs.txt', serverOutput);
    console.log('\n📁 Enhanced debug logs saved to enhanced-debug-logs.txt');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
    }
    
    // Restore original authRoutes.js
    console.log('🔄 Restoring original authRoutes.js...');
    const authRoutesPath = '/home/vsumup/pain-db/src/routes/authRoutes.js';
    const backupPath = '/home/vsumup/pain-db/src/routes/authRoutes.js.backup';
    
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, authRoutesPath);
      console.log('✅ Original file restored');
    }
    
    await prisma.$disconnect();
  }
}

debugRegistrationWithEnhancedLogging();