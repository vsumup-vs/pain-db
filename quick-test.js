const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickTest() {
  try {
    const template = await prisma.assessmentTemplate.findFirst({
      include: {
        items: {
          include: {
            metricDefinition: true
          }
        }
      }
    });
    
    console.log('Template:', template?.name);
    console.log('Items count:', template?.items?.length || 0);
    console.log('Items:', template?.items?.map(i => i.metricDefinition?.name));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();