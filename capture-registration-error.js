const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function captureRegistrationError() {
  console.log('🔍 Capturing Registration Error - Enhanced Debugging');
  console.log('');

  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'error-test@example.com' }
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
    console.log('');

    // Backup original authRoutes.js
    const authRoutesPath = path.join(__dirname, 'src/routes/authRoutes.js');
    const backupPath = path.join(__dirname, 'src/routes/authRoutes.js.error-debug-backup');
    
    fs.copyFileSync(authRoutesPath, backupPath);
    console.log('✅ Backed up authRoutes.js');

    // Read original file
    let authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');

    // Replace the generic error handling with detailed logging
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

    // Apply the enhanced error handling
    authRoutesContent = authRoutesContent.replace(originalErrorHandler, enhancedErrorHandler);
    fs.writeFileSync(authRoutesPath, authRoutesContent);
    console.log('✅ Enhanced error logging applied');

    // Start server and capture output
    console.log('🚀 Starting server with enhanced error logging...');
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
    console.log('📝 Testing registration with enhanced error capture...');
    
    const registrationData = {
      email: 'error-test@example.com',
      password: 'TestPass123!',
      firstName: 'Error',
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
        console.log('Error details captured in server logs above');
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

    // Save all output to file
    const logContent = `=== SERVER OUTPUT ===\n${serverOutput}\n\n=== SERVER ERRORS ===\n${serverError}`;
    fs.writeFileSync('registration-error-capture.log', logContent);
    console.log('📋 Server logs saved to registration-error-capture.log');

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

captureRegistrationError();