const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClinician() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'sse-test@example.com' },
      include: {
        userOrganizations: {
          include: { organization: true }
        }
      }
    });

    console.log('\n📧 User:', user.email);
    console.log('👤 User ID:', user.id);

    if (user.userOrganizations.length > 0) {
      const org = user.userOrganizations[0].organization;
      console.log('🏥 Organization:', org.name);
      
      // Find clinician in this organization
      const clinician = await prisma.clinician.findFirst({
        where: { 
          organizationId: org.id,
          email: user.email
        }
      });

      if (clinician) {
        console.log('✅ Clinician found:', clinician.id);
        console.log('   Name:', clinician.firstName, clinician.lastName);
      } else {
        console.log('❌ No clinician record for this user');
        console.log('   Creating clinician record...');
        
        const newClinician = await prisma.clinician.create({
          data: {
            organizationId: org.id,
            firstName: user.firstName || 'SSE',
            lastName: user.lastName || 'Test',
            email: user.email,
            specialization: 'General Practice'
          }
        });
        
        console.log('✅ Clinician created:', newClinician.id);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

checkClinician();
