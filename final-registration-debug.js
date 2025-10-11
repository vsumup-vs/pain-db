const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function finalRegistrationDebug() {
  console.log('🔍 Final Registration Debug - Capturing Real Server Errors\n');

  let serverProcess = null;
  const logFile = 'final-registration-debug.log';

  try {
    // Clean up any existing test user
    const testEmail = 'final-test@example.com';
    await prisma.user.deleteMany({ where: { email: testEmail } });
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

    // Start server with detailed error logging
    console.log('\n🚀 Starting server with enhanced error logging...');
    
    // Create a temporary modified index.js with enhanced error logging
    const originalIndexPath = path.join(__dirname, 'index.js');
    const tempIndexPath = path.join(__dirname, 'index-debug.js');
    
    let indexContent = fs.readFileSync(originalIndexPath, 'utf8');
    
    // Add comprehensive error logging
    const errorLoggingCode = `
// Enhanced error logging for debugging
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  fs.appendFileSync('${logFile}', \`UNCAUGHT EXCEPTION: \${error.stack}\\n\`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  fs.appendFileSync('${logFile}', \`UNHANDLED REJECTION: \${reason}\\n\`);
});

// Override console.error to capture all errors
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError(...args);
  fs.appendFileSync('${logFile}', \`CONSOLE ERROR: \${args.join(' ')}\\n\`);
};
`;

    // Insert error logging at the top of the file
    indexContent = errorLoggingCode + indexContent;
    
    // Add middleware to log all requests and responses
    const middlewareCode = `
// Log all requests and responses
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.path === '/api/auth/register') {
      fs.appendFileSync('${logFile}', \`REGISTRATION REQUEST: \${JSON.stringify({
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers
      }, null, 2)}\\n\`);
      
      fs.appendFileSync('${logFile}', \`REGISTRATION RESPONSE: \${JSON.stringify({
        statusCode: res.statusCode,
        data: data
      }, null, 2)}\\n\`);
    }
    return originalSend.call(this, data);
  };
  next();
});
`;

    // Insert middleware after app creation
    indexContent = indexContent.replace(
      /const app = express\(\);/,
      `const app = express();\n${middlewareCode}`
    );

    fs.writeFileSync(tempIndexPath, indexContent);

    // Clear previous log file
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }

    serverProcess = spawn('node', [tempIndexPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.log('SERVER:', output.trim());
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.error('SERVER ERROR:', output.trim());
      fs.appendFileSync(logFile, `SERVER STDERR: ${output}`);
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test server health
    console.log('\n🏥 Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/api/health');
      console.log('✅ Server is healthy:', healthResponse.status);
    } catch (error) {
      console.error('❌ Server health check failed:', error.message);
      throw error;
    }

    // Attempt registration with detailed logging
    console.log('\n📝 Attempting registration...');
    
    const registrationData = {
      email: testEmail,
      password: 'TestPass123!',
      firstName: 'Final',
      lastName: 'Test',
      organizationId: organization.id,
      role: 'PATIENT'
    };

    console.log('Registration data:', registrationData);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', registrationData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Registration successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

    } catch (error) {
      console.error('❌ Registration failed');
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error:', error.message);
      }

      // Read the detailed log file
      if (fs.existsSync(logFile)) {
        console.log('\n📋 Detailed server logs:');
        const logs = fs.readFileSync(logFile, 'utf8');
        console.log(logs);
      }

      throw error;
    }

  } catch (error) {
    console.error('\n❌ Final registration debug failed:', error.message);
    
    // Always show the log file content if it exists
    if (fs.existsSync(logFile)) {
      console.log('\n📋 Final server logs:');
      const logs = fs.readFileSync(logFile, 'utf8');
      console.log(logs);
    }
    
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Clean up temporary files
    const tempIndexPath = path.join(__dirname, 'index-debug.js');
    if (fs.existsSync(tempIndexPath)) {
      fs.unlinkSync(tempIndexPath);
    }

    await prisma.$disconnect();
    console.log('✅ Cleanup completed');
  }
}

finalRegistrationDebug();