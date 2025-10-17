const { prisma } = require('./src/services/db');

async function checkOrganizations() {
  try {
    console.log('🏢 Checking organizations in database...');
    
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true
      }
    });
    
    console.log('📋 Found organizations:');
    organizations.forEach(org => {
      console.log(`  - ID: ${org.id}, Name: ${org.name}, Type: ${org.type}, Active: ${org.isActive}`);
    });
    
    if (organizations.length === 0) {
      console.log('❌ No organizations found in database!');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error checking organizations:', error);
    await prisma.$disconnect();
  }
}

checkOrganizations();