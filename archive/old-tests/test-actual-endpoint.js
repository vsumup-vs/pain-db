const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testActualEndpoint() {
  console.log('🔍 Testing Actual Registration Endpoint with Enhanced Error Capture');
  console.log('');

  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'endpoint-test@example.com' }
    });
    console.log('✅ Cleaned up test user');

    // Ensure test organization exists
    let organization = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'HEALTHCARE_PROVIDER',
          isActive: true
        }
      });
    }
    console.log('✅ Test organization ready:', organization.id);

    // Backup and modify authRoutes.js for detailed error logging
    const authRoutesPath = path.join(__dirname, 'src/routes/authRoutes.js');
    const backupPath = path.join(__dirname, 'src/routes/authRoutes.js.endpoint-test-backup');
    
    fs.copyFileSync(authRoutesPath, backupPath);
    console.log('✅ Backed up authRoutes.js');

    // Read and modify the file
    let authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');

    // Replace the generic error handler with detailed logging
    const originalErrorHandler = `    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }`;

    const enhancedErrorHandler = `    } catch (error) {
      console.error('=== DETAILED REGISTRATION ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error stack:', error.stack);
      console.error('Error code:', error.code);
      console.error('Error meta:', error.meta);
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      console.error('=== END REGISTRATION ERROR ===');
      res.status(500).json({ 
        error: 'Registration failed',
        details: error.message,
        type: error.name
      });
    }`;

    // Also add validation error logging
    const originalValidationCheck = `      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }`;

    const enhancedValidationCheck = `      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('=== VALIDATION ERRORS ===');
        console.error('Validation errors:', JSON.stringify(errors.array(), null, 2));
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        console.error('=== END VALIDATION ERRORS ===');
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }`;

    // Apply both modifications
    authRoutesContent = authRoutesContent.replace(originalErrorHandler, enhancedErrorHandler);
    authRoutesContent = authRoutesContent.replace(originalValidationCheck, enhancedValidationCheck);
    
    fs.writeFileSync(authRoutesPath, authRoutesContent);
    console.log('✅ Enhanced error and validation logging applied');

    // Start server
    console.log('🚀 Starting server with enhanced logging...');
    const serverProcess = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let serverOutput = '';
    let serverError = '';

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.log('SERVER:', output.trim());
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      serverError += error;
      console.log('ERROR:', error.trim());
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test registration
    console.log('');
    console.log('📝 Testing registration endpoint...');
    
    const registrationData = {
      email: 'endpoint-test@example.com',
      password: 'TestPass123!',
      firstName: 'Endpoint',
      lastName: 'Test',
      organizationId: organization.id,
      role: 'PATIENT'
    };

    console.log('Registration data:', JSON.stringify(registrationData, null, 2));

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const responseData = await response.json();
      
      console.log('📊 Registration response:');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(responseData, null, 2));

      if (response.status === 500) {
        console.log('❌ Registration failed with 500 error');
        console.log('Check the detailed error logs above');
      } else if (response.status === 400) {
        console.log('❌ Registration failed with validation error');
        console.log('Check the validation error logs above');
      } else {
        console.log('✅ Registration succeeded!');
      }

    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
    }

    // Stop server
    console.log('');
    console.log('🛑 Stopping server...');
    serverProcess.kill('SIGTERM');

    // Wait for server to stop
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save logs
    const logContent = `=== SERVER OUTPUT ===\n${serverOutput}\n\n=== SERVER ERRORS ===\n${serverError}`;
    fs.writeFileSync('endpoint-test-logs.txt', logContent);
    console.log('📋 Server logs saved to endpoint-test-logs.txt');

    // Restore original file
    fs.copyFileSync(backupPath, authRoutesPath);
    fs.unlinkSync(backupPath);
    console.log('✅ Restored original authRoutes.js');

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Cleanup completed');
  }
}

testActualEndpoint();