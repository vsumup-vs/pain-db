const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupPlatformAdminTestUser() {
  console.log('🔧 Setting up platform admin test user and organizations...\n');

  try {
    // 1. Check if platform admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'platform-admin@clinmetrics.com' }
    });

    let platformAdmin;

    if (existingUser) {
      console.log('✅ Platform admin user already exists:', existingUser.email);

      // Update to ensure isPlatformAdmin is true
      platformAdmin = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          isPlatformAdmin: true,
          isActive: true,
          emailVerified: new Date() // DateTime field, not boolean
        }
      });
      console.log('✅ Updated isPlatformAdmin flag to true\n');
    } else {
      // 2. Create platform admin user
      const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

      platformAdmin = await prisma.user.create({
        data: {
          email: 'platform-admin@clinmetrics.com',
          passwordHash,
          firstName: 'Platform',
          lastName: 'Admin',
          isPlatformAdmin: true,
          isActive: true,
          emailVerified: new Date() // DateTime field, not boolean
        }
      });

      console.log('✅ Created platform admin user:', platformAdmin.email);
      console.log('   Password: SecurePassword123!\n');
    }

    // 3. Create test organizations if they don't exist
    const testOrganizations = [
      {
        name: 'ABC Clinic',
        email: 'admin@abcclinic.com',
        phone: '555-111-2222',
        address: '123 Main St, City, State 12345',
        website: 'https://abcclinic.com',
        type: 'CLINIC',
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate: new Date('2025-01-01'),
        maxUsers: 50,
        maxPatients: 500,
        maxClinicians: 25,
        isActive: true,
        settings: {
          billing: {
            contact: {
              name: 'Jane Doe',
              email: 'billing@abcclinic.com',
              phone: '555-222-3333'
            }
          }
        }
      },
      {
        name: 'XYZ Hospital',
        email: 'admin@xyzhospital.com',
        phone: '555-444-5555',
        address: '456 Hospital Ave, City, State 67890',
        website: 'https://xyzhospital.com',
        type: 'HOSPITAL',
        subscriptionTier: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate: new Date('2024-06-01'),
        maxUsers: 200,
        maxPatients: 2000,
        maxClinicians: 100,
        isActive: true,
        settings: {
          billing: {
            contact: {
              name: 'John Smith',
              email: 'billing@xyzhospital.com',
              phone: '555-666-7777'
            }
          }
        }
      },
      {
        name: 'Small Practice',
        email: 'admin@smallpractice.com',
        phone: '555-888-9999',
        address: '789 Oak St, City, State 11111',
        website: 'https://smallpractice.com',
        type: 'PRACTICE',
        subscriptionTier: 'BASIC',
        subscriptionStatus: 'TRIAL',
        subscriptionStartDate: new Date('2025-10-01'),
        subscriptionEndDate: new Date('2025-11-01'),
        maxUsers: 10,
        maxPatients: 100,
        maxClinicians: 5,
        isActive: true,
        settings: {
          billing: {
            contact: {
              name: 'Sarah Johnson',
              email: 'billing@smallpractice.com',
              phone: '555-333-4444'
            }
          }
        }
      },
      {
        name: 'Research Institute',
        email: 'admin@researchinst.org',
        phone: '555-777-8888',
        address: '321 Science Blvd, City, State 22222',
        website: 'https://researchinst.org',
        type: 'RESEARCH',
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionStartDate: new Date('2024-12-01'),
        maxUsers: 30,
        maxPatients: 300,
        maxClinicians: 15,
        isActive: true,
        settings: {
          billing: {
            contact: {
              name: 'Dr. Michael Chen',
              email: 'billing@researchinst.org',
              phone: '555-999-0000'
            }
          }
        }
      },
      {
        name: 'Suspended Clinic',
        email: 'admin@suspendedclinic.com',
        phone: '555-000-1111',
        address: '999 Inactive Rd, City, State 33333',
        website: 'https://suspendedclinic.com',
        type: 'CLINIC',
        subscriptionTier: 'BASIC',
        subscriptionStatus: 'SUSPENDED',
        subscriptionStartDate: new Date('2025-01-01'),
        maxUsers: 10,
        maxPatients: 100,
        maxClinicians: 5,
        isActive: false,
        settings: {
          billing: {
            contact: {
              name: 'Bob Williams',
              email: 'billing@suspendedclinic.com',
              phone: '555-111-2222'
            }
          }
        }
      }
    ];

    console.log('📊 Creating test organizations...\n');

    for (const orgData of testOrganizations) {
      const existingOrg = await prisma.organization.findFirst({
        where: { email: orgData.email }
      });

      if (existingOrg) {
        console.log(`   ⏭️  Organization "${orgData.name}" already exists`);
      } else {
        const org = await prisma.organization.create({
          data: orgData
        });
        console.log(`   ✅ Created organization: ${org.name} (${org.type})`);
      }
    }

    console.log('\n✅ Setup complete!\n');
    console.log('Platform Admin Credentials:');
    console.log('  Email: platform-admin@clinmetrics.com');
    console.log('  Password: SecurePassword123!');
    console.log('\nTest Organizations Created: 5');
    console.log('  - ABC Clinic (PRO, ACTIVE)');
    console.log('  - XYZ Hospital (ENTERPRISE, ACTIVE)');
    console.log('  - Small Practice (BASIC, TRIAL)');
    console.log('  - Research Institute (PRO, ACTIVE)');
    console.log('  - Suspended Clinic (BASIC, SUSPENDED)\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupPlatformAdminTestUser()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
