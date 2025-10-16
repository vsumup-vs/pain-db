const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Get the organization where patients are
    const organization = await prisma.organization.findUnique({
      where: { id: 'cmgqm8otd00007krvfh5x2lzn' }
    });

    console.log(`✅ Found organization: ${organization.name}`);

    // Check if test user exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@test.com' }
    });

    if (user) {
      console.log('✅ Test user already exists');
    } else {
      // Create test user with password "password123"
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      user = await prisma.user.create({
        data: {
          email: 'test@test.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
          emailVerified: new Date()
        }
      });
      console.log('✅ Created test user: test@test.com');
    }

    // Check if user is in organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: organization.id
      }
    });

    if (!userOrg) {
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'ORG_ADMIN',
          permissions: ['USER_CREATE', 'USER_READ', 'USER_UPDATE', 'PATIENT_CREATE', 'PATIENT_READ', 'PATIENT_UPDATE'],
          isActive: true
        }
      });
      console.log('✅ Added user to organization');
    } else {
      console.log('✅ User already in organization');
    }

    console.log('\n📧 Login credentials:');
    console.log('  Email: test@test.com');
    console.log('  Password: password123');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
