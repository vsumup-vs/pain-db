const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSchema() {
  try {
    // Test a simple query without includes
    const observations = await prisma.observation.findMany({
      take: 1
    });
    console.log('✅ Basic observation query works');
    
    // Test with patient include
    const obsWithPatient = await prisma.observation.findMany({
      take: 1,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
    console.log('✅ Patient relationship works');
    
    // Test with metricDefinition include
    const obsWithMetric = await prisma.observation.findMany({
      take: 1,
      include: {
        metricDefinition: {
          select: { id: true, name: true }
        }
      }
    });
    console.log('✅ MetricDefinition relationship works');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSchema();
