const { execSync } = require('child_process');

console.log('🔧 Simple Authentication Test Setup...');

async function runTest() {
  try {
    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-authentication-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.DATABASE_URL = 'postgresql://pain_user:password@localhost:5432/pain_db';

    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Testing JWT service...');
    const jwtService = require('./src/services/jwtService');
    
    // Test JWT generation
    const testPayload = { userId: 'test-123', email: 'test@example.com' };
    const token = await jwtService.generateToken(testPayload);
    console.log('✅ JWT token generated successfully');
    
    // Test JWT verification
    const decoded = await jwtService.verifyToken(token);
    console.log('✅ JWT token verified successfully');
    console.log('📋 Decoded payload:', JSON.stringify(decoded, null, 2));
    
    console.log('🎉 Basic authentication service test passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔍 Let\'s try running the auth tests without Prisma dependency...');
    
    try {
      // Run auth tests without database
      console.log('🚀 Running authentication service tests...');
      execSync('./test-auth-service.sh', { stdio: 'inherit' });
    } catch (testError) {
      console.error('❌ Auth tests failed:', testError.message);
    }
  }
}

runTest();