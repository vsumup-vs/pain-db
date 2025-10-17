const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Find Default Healthcare Organization
  const org = await prisma.organization.findFirst({
    where: { name: 'Default Healthcare Organization' }
  });

  if (!org) {
    console.log('❌ Organization not found');
    process.exit(1);
  }

  // Create or update demo user
  const hashedPassword = await bcrypt.hash('Demo123!', 10);
  
  let user = await prisma.user.findUnique({
    where: { email: 'demo@test.com' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'demo@test.com',
        passwordHash: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
        isActive: true,
        emailVerified: new Date()
      }
    });
    console.log('✅ Created demo user');
  } else {
    user = await prisma.user.update({
      where: { email: 'demo@test.com' },
      data: { passwordHash: hashedPassword }
    });
    console.log('✅ Updated demo user password');
  }

  // Ensure user has ORG_ADMIN role in Default Healthcare Organization
  const userOrg = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id
      }
    }
  });

  if (!userOrg) {
    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ORG_ADMIN',
        permissions: ['USER_READ', 'USER_CREATE', 'USER_UPDATE', 'PATIENT_READ', 'PATIENT_CREATE', 'ORG_BILLING_READ', 'ORG_BILLING_MANAGE']
      }
    });
    console.log('✅ Assigned ORG_ADMIN role');
  }

  console.log('\n✅ Test user ready!');
  console.log('   Email: demo@test.com');
  console.log('   Password: Demo123!');
  console.log('   Organization: Default Healthcare Organization');
  console.log('   Role: ORG_ADMIN');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
