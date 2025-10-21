const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrganizations() {
  try {
    const organizations = await prisma.organization.findMany({
      take: 10
    });

    console.log('Organizations in database:', organizations.length);
    organizations.forEach(org => {
      console.log(`- ${org.name} (${org.id}) - Type: ${org.type}`);
    });

    if (organizations.length === 0) {
      console.log('\nNo organizations found. Creating Test Organization...');
      const newOrg = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'CLINIC',
          email: 'admin@testorg.com',
          isActive: true
        }
      });
      console.log('✅ Created organization:', newOrg.id);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrganizations();
