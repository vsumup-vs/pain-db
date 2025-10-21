const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserOrg() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'sse-test@example.com' },
      include: {
        userOrganizations: {
          include: {
            organization: true
          }
        }
      }
    });

    console.log('\n📊 User Organization Status:');
    console.log(`Email: ${user.email}`);
    console.log(`Organizations: ${user.userOrganizations.length}`);

    if (user.userOrganizations.length === 0) {
      console.log('❌ No organizations assigned!');
      console.log('\nLet me find an available organization and assign the user...\n');

      // Find first active organization
      const org = await prisma.organization.findFirst({
        where: { isActive: true }
      });

      if (org) {
        console.log(`Found organization: ${org.name} (${org.id})`);

        // Assign user to organization with clinician role
        await prisma.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: 'CLINICIAN',
            permissions: ['PATIENT_READ', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_CREATE'],
            isActive: true
          }
        });

        console.log('✅ User assigned to organization!');
        console.log('Role: CLINICIAN');
        console.log('Permissions: PATIENT_READ, ALERT_READ, ALERT_UPDATE, ALERT_CREATE');
      } else {
        console.log('❌ No organizations found in database!');
      }
    } else {
      console.log('✅ User has organization access:');
      user.userOrganizations.forEach(uo => {
        console.log(`  - ${uo.organization.name} (${uo.role})`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

checkUserOrg();
