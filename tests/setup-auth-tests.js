const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function setupAuthTests() {
  console.log('🔧 Setting up authentication tests...');

  try {
    // Run database migrations
    console.log('📦 Running database migrations...');
    execSync('npx prisma migrate dev --name auth-service', { stdio: 'inherit' });

    // Generate Prisma client
    console.log('🔄 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Test database connection
    console.log('🔌 Testing database connection...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Create test environment variables
    console.log('🌍 Setting up test environment...');
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-authentication-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    await prisma.$disconnect();
    console.log('✅ Authentication test setup complete!');

  } catch (error) {
    console.error('❌ Error setting up authentication tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupAuthTests();
}

module.exports = setupAuthTests;