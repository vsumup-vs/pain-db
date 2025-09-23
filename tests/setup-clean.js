const { PrismaClient } = require('../generated/prisma');
const path = require('path');

// Load test environment variables first
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.test')
});

// Ensure we're in test mode
process.env.NODE_ENV = 'test';

// Create a clean Prisma client instance without any advanced features
global.prisma = new PrismaClient({
  log: ['error'],
  // Ensure we're using the local database URL
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://pain_test_user:test_password@localhost:5432/pain_db_test'
    }
  }
});

beforeAll(async () => {
  try {
    console.log('🔧 Connecting to test database...');
    await global.prisma.$connect();
    
    // Simple connection test
    await global.prisma.$queryRaw`SELECT 1 as test`;
    
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
    console.error('Database URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@'));
    throw error;
  }
});

afterAll(async () => {
  try {
    await global.prisma.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting:', error.message);
  }
});

afterEach(async () => {
  try {
    // Clean up test data in dependency order
    await global.prisma.observation.deleteMany();
    await global.prisma.enrollment.deleteMany();
    await global.prisma.patient.deleteMany();
    await global.prisma.clinician.deleteMany();
    await global.prisma.metricDefinition.deleteMany();
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
  }
});