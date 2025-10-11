const { execSync } = require('child_process');

console.log('🔧 Testing Prisma client generation...');

try {
  console.log('📦 Running Prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Prisma generate completed');
  
  // Test if we can import the client
  console.log('🔍 Testing Prisma client import...');
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ Prisma client imported successfully');
  
  // Test client instantiation
  const prisma = new PrismaClient();
  console.log('✅ Prisma client instantiated successfully');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}