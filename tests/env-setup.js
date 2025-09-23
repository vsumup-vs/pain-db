const path = require('path');

// Load test environment variables
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.test')
});

// Ensure we're in test mode
process.env.NODE_ENV = 'test';

console.log('🔧 Test environment loaded');
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV}`);

// Override any Prisma Accelerate URLs with local PostgreSQL
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('accelerate')) {
  process.env.DATABASE_URL = "postgresql://pain_test_user:test_password@localhost:5432/pain_db_test";
}