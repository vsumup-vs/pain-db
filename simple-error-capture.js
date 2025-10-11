const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function captureRegistrationError() {
  console.log('🔍 Simple Registration Error Capture');
  console.log('');

  try {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'error-test@example.com' }
    });
    console.log('✅ Cleaned up test user');

    // Get test organization
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

    // Temporarily modify just the error logging line
    const authRoutesPath = path.join(__dirname, 'src/routes/authRoutes.js');
    const backupPath = path.join(__dirname, 'src/routes/authRoutes.js.simple-backup');
    
    fs.copyFileSync(authRoutesPath, backupPath);
    
    let content = fs.readFileSync(authRoutesPath, 'utf8');
    
    // Replace the simple error log with detailed logging
    content = content.replace(
      "console.error('Registration error:', error);",
      `console.error('=== REGISTRATION ERROR DETAILS ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      console.error('=== END ERROR DETAILS ===');`
    );
    
    fs.writeFileSync(authRoutesPath, content);
    console.log('✅ Enhanced error logging applied');

    // Start server
    console.log('🚀 Starting server...');
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
    console.log('📝 Testing registration...');
    
    const registrationData = {
      email: 'error-test@example.com',
      password: 'TestPass123!',
      firstName: 'Error',
      lastName: 'Test',
      organizationId: organization.id,
      role: 'PATIENT'
    };

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const responseData = await response.json();
      
      console.log('📊 Response:');
      console.log('Status:', response.status);
      console.log('Data:', JSON.stringify(responseData, null, 2));

    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
    }

    // Stop server
    console.log('');
    console.log('🛑 Stopping server...');
    serverProcess.kill('SIGTERM');

    // Wait for server to stop
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save all logs
    const allLogs = `=== SERVER OUTPUT ===\n${serverOutput}\n\n=== SERVER ERRORS ===\n${serverError}`;
    fs.writeFileSync('simple-error-logs.txt', allLogs);
    console.log('📋 All logs saved to simple-error-logs.txt');

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