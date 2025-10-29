const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.savedView.findMany({
      where: { isTemplate: true },
      select: {
        id: true,
        name: true,
        viewType: true,
        isTemplate: true,
        organizationId: true,
        filters: true
      }
    });
    
    console.log('Template Saved Views found:', templates.length);
    if (templates.length > 0) {
      console.log('\nTemplates:');
      templates.forEach(t => {
        console.log(`- ${t.name} (${t.viewType})`);
      });
    } else {
      console.log('\n⚠️  No template saved views found in database');
      console.log('   Templates need to be seeded for the Template Library to work');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();
