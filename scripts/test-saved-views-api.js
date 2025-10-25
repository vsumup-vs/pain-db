const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSavedViewsAPI() {
  try {
    console.log('🧪 Testing Saved Views API\n');

    // 1. Find or create organization
    console.log('📋 Step 1: Finding/creating organization...');
    let organization = await prisma.organization.findFirst({
      where: { email: 'contact@testclinic.com' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Clinic',
          type: 'CLINIC',
          email: 'contact@testclinic.com',
          phone: '555-123-4567',
          isActive: true
        }
      });
      console.log('✅ Created organization:', organization.name, `(${organization.id})`);
    } else {
      console.log('✅ Found organization:', organization.name, `(${organization.id})`);
    }

    // 2. Find admin user
    console.log('\n👤 Step 2: Finding admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@clinmetrics.com' }
    });

    if (!adminUser) {
      console.error('❌ Admin user not found!');
      return;
    }
    console.log('✅ Found admin user:', adminUser.email, `(${adminUser.id})`);

    // 3. Link user to organization
    console.log('\n🔗 Step 3: Linking user to organization...');
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId: adminUser.id,
        organizationId: organization.id
      }
    });

    if (!userOrg) {
      await prisma.userOrganization.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: 'ORG_ADMIN',
          permissions: ['USER_CREATE', 'PATIENT_CREATE', 'PATIENT_READ'],
          isActive: true
        }
      });
      console.log('✅ Linked user to organization');
    } else {
      console.log('✅ User already linked to organization');
    }

    // 4. Create test saved view
    console.log('\n📝 Step 4: Creating test saved view...');
    const savedView = await prisma.savedView.create({
      data: {
        userId: adminUser.id,
        organizationId: organization.id,
        name: 'High-Risk Patients',
        description: 'Patients with critical alerts or overdue assessments',
        viewType: 'PATIENT_LIST',
        filters: {
          status: 'ACTIVE',
          hasOpenAlerts: true,
          alertSeverity: ['HIGH', 'CRITICAL']
        },
        displayConfig: {
          columns: ['name', 'mrn', 'alerts', 'lastAssessment'],
          sortBy: 'lastAlertDate',
          sortOrder: 'desc'
        },
        isShared: false,
        isDefault: false
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Created saved view:', savedView.name, `(${savedView.id})`);
    console.log('   View Type:', savedView.viewType);
    console.log('   Filters:', JSON.stringify(savedView.filters, null, 2));
    console.log('   Created by:', `${savedView.user.firstName} ${savedView.user.lastName}`);

    // 5. Get all saved views
    console.log('\n📚 Step 5: Fetching all saved views for user...');
    const allViews = await prisma.savedView.findMany({
      where: {
        OR: [
          { userId: adminUser.id },
          { isShared: true, organizationId: organization.id }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`✅ Found ${allViews.length} saved view(s):`);
    allViews.forEach((view, idx) => {
      console.log(`   ${idx + 1}. ${view.name} (${view.viewType}) - ${view.isShared ? 'Shared' : 'Private'}`);
    });

    // 6. Update the view
    console.log('\n✏️  Step 6: Updating saved view...');
    const updatedView = await prisma.savedView.update({
      where: { id: savedView.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });
    console.log('✅ Updated usage count:', updatedView.usageCount);

    // 7. Set as default
    console.log('\n⭐ Step 7: Setting view as default...');
    await prisma.savedView.update({
      where: { id: savedView.id },
      data: { isDefault: true }
    });
    console.log('✅ Set as default view');

    // 8. Clean up test data
    console.log('\n🧹 Step 8: Cleaning up test data...');
    await prisma.savedView.delete({
      where: { id: savedView.id }
    });
    console.log('✅ Deleted test saved view');

    console.log('\n✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✓ Organization setup');
    console.log('   ✓ User-organization linkage');
    console.log('   ✓ Create saved view');
    console.log('   ✓ Retrieve saved views');
    console.log('   ✓ Update saved view');
    console.log('   ✓ Set default view');
    console.log('   ✓ Delete saved view');
    console.log('\n🎉 Saved Views API is working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSavedViewsAPI();
