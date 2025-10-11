const { execSync } = require('child_process');

async function setupAuthTests() {
  console.log('🔧 Setting up authentication tests (without Prisma dependency)...');

  try {
    // Create test environment variables
    console.log('🌍 Setting up test environment...');
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-authentication-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.DATABASE_URL = 'postgresql://pain_user:password@localhost:5432/pain_db';

    // Try to generate Prisma client (optional)
    try {
      console.log('🔄 Attempting to generate Prisma client...');
      execSync('npx prisma generate', { stdio: 'pipe' });
      console.log('✅ Prisma client generated successfully');
    } catch (prismaError) {
      console.log('⚠️  Prisma client generation skipped (will use mock for tests)');
    }

    console.log('✅ Authentication test setup complete!');
    return true;

  } catch (error) {
    console.error('❌ Failed to setup test environment:', error.message);
    return false;
  }
}

if (require.main === module) {
  setupAuthTests();
}

module.exports = setupAuthTests;