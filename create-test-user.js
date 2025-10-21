const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if test user exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (user) {
      console.log('✅ Test user already exists: test@example.com');
      console.log('   User ID:', user.id);
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Get or create test organization
    let org = await prisma.organization.findFirst({
      where: { name: 'Test Organization' }
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          type: 'CLINIC',
          email: 'admin@testorg.com'
        }
      });
      console.log('✅ Created test organization:', org.id);
    }

    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        emailVerified: true
      }
    });

    console.log('✅ Created test user: test@example.com');
    console.log('   User ID:', user.id);

    // Create user-organization relationship
    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'CLINICIAN',
        permissions: ['PATIENT_READ', 'PATIENT_CREATE', 'ALERT_READ', 'ALERT_UPDATE'],
        isActive: true
      }
    });

    console.log('✅ Linked user to organization with CLINICIAN role');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: test@example.com');
    console.log('  Password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
