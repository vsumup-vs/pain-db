const { PrismaClient } = require('./generated/prisma');

async function getTemplateIds() {
  const prisma = new PrismaClient();
  
  try {
    const templates = await prisma.assessmentTemplate.findMany({
      where: { isStandardized: true },
      select: {
        id: true,
        name: true
      },
      take: 3
    });
    
    console.log('Available Template IDs for testing:');
    templates.forEach(template => {
      console.log(`ID: ${template.id} - Name: ${template.name}`);
    });
    
    if (templates.length > 0) {
      console.log(`\nTest command:`);
      console.log(`curl http://localhost:3001/api/assessment-templates-v2/${templates[0].id}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getTemplateIds();