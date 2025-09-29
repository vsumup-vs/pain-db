const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function testEnhancementStatus() {
  try {
    console.log('🔍 Testing Assessment Template Enhancement Status...\n');

    // Test 1: Check if standardization fields exist
    console.log('📊 Test 1: Checking standardization fields...');
    const templates = await prisma.assessmentTemplate.findMany({
      select: {
        id: true,
        name: true,
        isStandardized: true,
        category: true,
        validationInfo: true,
        standardCoding: true,
        clinicalUse: true
      },
      take: 3
    });

    console.log(`   ✅ Found ${templates.length} templates with standardization fields`);
    
    // Test 2: Check for standardized templates
    console.log('\n🏥 Test 2: Checking standardized templates...');
    const standardizedCount = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    
    const customCount = await prisma.assessmentTemplate.count({
      where: { isStandardized: false }
    });

    console.log(`   📋 Standardized templates: ${standardizedCount}`);
    console.log(`   🛠️  Custom templates: ${customCount}`);

    // Test 3: Show sample standardized template
    if (standardizedCount > 0) {
      console.log('\n📝 Test 3: Sample standardized template...');
      const sample = await prisma.assessmentTemplate.findFirst({
        where: { isStandardized: true },
        select: {
          name: true,
          category: true,
          validationInfo: true,
          clinicalUse: true
        }
      });
      
      if (sample) {
        console.log(`   📊 Template: ${sample.name}`);
        console.log(`   🏷️  Category: ${sample.category || 'Not set'}`);
        console.log(`   🏥 Clinical Use: ${sample.clinicalUse || 'Not set'}`);
      }
    }

    console.log('\n✅ Enhancement status check complete!');

  } catch (error) {
    console.error('❌ Error testing enhancement status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testEnhancementStatus();
}