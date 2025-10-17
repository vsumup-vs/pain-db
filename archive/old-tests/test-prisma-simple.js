console.log('Testing Prisma client...');

try {
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ PrismaClient imported successfully');
  
  const prisma = new PrismaClient();
  console.log('✅ PrismaClient instantiated successfully');
  
  // Test a simple query
  async function testConnection() {
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Database connection successful:', result);
      
      // Now test the actual models
      const conditionPresets = await prisma.conditionPreset.findMany({
        take: 1,
        select: { id: true, name: true }
      });
      console.log('✅ ConditionPreset query successful:', conditionPresets.length, 'records');
      
    } catch (error) {
      console.error('❌ Database query error:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  testConnection();
  
} catch (error) {
  console.error('❌ Prisma import/instantiation error:', error.message);
}