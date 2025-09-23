const { PrismaClient } = require('../generated/prisma');

// Ensure test environment is loaded
require('./env-setup');

// Create a test database instance - let Prisma use the DATABASE_URL from environment
global.prisma = new PrismaClient({
  log: ['error'], // Only log errors during tests
});

// Setup before all tests
beforeAll(async () => {
  try {
    // Connect to test database
    await global.prisma.$connect();
    
    // Verify connection works
    await global.prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Test database connected successfully');
    console.log(`📍 Using database: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@')}`);
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
    console.error('🔍 Check that:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. Test database exists');
    console.error('  3. DATABASE_URL is correct in .env.test');
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await global.prisma.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from test database:', error.message);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clean up test data in reverse order of dependencies
    await global.prisma.observation.deleteMany();
    await global.prisma.enrollment.deleteMany();
    await global.prisma.patient.deleteMany();
    await global.prisma.clinician.deleteMany();
    await global.prisma.metricDefinition.deleteMany();
    
    console.log('🧹 Test data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
    // Don't throw here, just log the error
  }
});