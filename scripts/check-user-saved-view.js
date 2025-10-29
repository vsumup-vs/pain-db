const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserView() {
  try {
    // Find the Active Male Patients view
    const view = await prisma.savedView.findFirst({
      where: {
        name: { contains: 'Active Male Patients' }
      },
      select: {
        id: true,
        name: true,
        viewType: true,
        isTemplate: true,
        isDefault: true,
        userId: true,
        organizationId: true,
        filters: true,
        createdAt: true
      }
    });
    
    if (view) {
      console.log('Found saved view:');
      console.log(`  Name: ${view.name}`);
      console.log(`  View Type: ${view.viewType}`);
      console.log(`  Is Template: ${view.isTemplate}`);
      console.log(`  Is Default: ${view.isDefault}`);
      console.log(`  User ID: ${view.userId}`);
      console.log(`  Organization ID: ${view.organizationId}`);
      console.log(`  Created: ${view.createdAt}`);
      console.log(`\n  Filters:`, JSON.stringify(view.filters, null, 2));
      
      if (view.isTemplate) {
        console.log('\n✅ This is a template (can be cloned)');
      } else {
        console.log('\n✅ This is a user-created saved view (possibly cloned from a template)');
      }
    } else {
      console.log('❌ No saved view found matching "Active Male Patients"');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserView();
