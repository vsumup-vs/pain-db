const { PrismaClient } = require('../generated/prisma');
const path = require('path');

// Load test environment variables
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.test')
});

// Force test environment and disable Accelerate
process.env.NODE_ENV = 'test';
process.env.PRISMA_ACCELERATE_DISABLE = 'true';
process.env.PRISMA_DISABLE_ACCELERATE = 'true';

// Override any Accelerate URL with local PostgreSQL
const localDatabaseUrl = 'postgresql://pain_test_user:test_password@localhost:5432/pain_db_test';

// Create Prisma client with explicit local configuration
global.prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: localDatabaseUrl
    }
  },
  // Explicitly disable any advanced features that might trigger Accelerate
  errorFormat: 'minimal'
});

beforeAll(async () => {
  try {
    console.log('🔧 Connecting to test database...');
    console.log('Database URL:', localDatabaseUrl.replace(/:[^:@]*@/, ':***@'));
    
    await global.prisma.$connect();
    
    // Test connection with a simple query
    const result = await global.prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Clean up any existing test data
    console.log('🧹 Cleaning test database...');
    
    // Delete in correct order to avoid foreign key constraints
    await global.prisma.observation.deleteMany({});
    await global.prisma.enrollment.deleteMany({});
    await global.prisma.alert.deleteMany({});
    await global.prisma.metricDefinition.deleteMany({});
    await global.prisma.conditionPreset.deleteMany({});
    await global.prisma.patient.deleteMany({});
    await global.prisma.clinician.deleteMany({});
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    console.log('🧹 Cleaning up after tests...');
    
    // Clean up test data
    await global.prisma.observation.deleteMany({});
    await global.prisma.enrollment.deleteMany({});
    await global.prisma.alert.deleteMany({});
    await global.prisma.metricDefinition.deleteMany({});
    await global.prisma.conditionPreset.deleteMany({});
    await global.prisma.patient.deleteMany({});
    await global.prisma.clinician.deleteMany({});
    
    await global.prisma.$disconnect();
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});