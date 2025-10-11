console.log('🔧 Quick Authentication Test...');

async function runTest() {
  try {
    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-authentication-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    console.log('✅ Testing JWT service...');
    const jwtService = require('./src/services/jwtService');
    
    // Test JWT generation
    const testPayload = { userId: 'test-123', email: 'test@example.com' };
    const token = await jwtService.generateToken(testPayload);
    console.log('✅ JWT token generated successfully');
    console.log('🔑 Token preview:', token.substring(0, 50) + '...');
    
    // Test JWT verification
    const decoded = await jwtService.verifyToken(token);
    console.log('✅ JWT token verified successfully');
    console.log('📋 Decoded payload:', JSON.stringify(decoded, null, 2));
    
    console.log('🎉 Authentication service is working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

runTest();