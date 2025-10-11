const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCategoriesFinal() {
  console.log('🧪 Final Categories Test...\n');

  try {
    // Check if we have any assessment templates
    const templateCount = await prisma.assessmentTemplate.count();
    console.log(`📊 Total assessment templates: ${templateCount}`);

    if (templateCount === 0) {
      console.log('⚠️ No assessment templates found. Run: npm run seed:rtm');
      return;
    }

    // Check templates with categories
    const templatesWithCategories = await prisma.assessmentTemplate.count({
      where: { category: { not: null } }
    });
    console.log(`🏷️ Templates with categories: ${templatesWithCategories}`);

    // Get category distribution
    const categoryStats = await prisma.assessmentTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { category: { not: null } }
    });

    console.log('\n📈 Category Distribution:');
    categoryStats.forEach(stat => {
      console.log(`   ${stat.category}: ${stat._count.id} templates`);
    });

    // Test the API response format
    const apiTestData = await prisma.assessmentTemplate.groupBy({
      by: ['category', 'isStandardized'],
      _count: { id: true },
      where: { category: { not: null } }
    });

    console.log('\n🔍 API Response Format Test:');
    console.log('Raw groupBy result:', JSON.stringify(apiTestData, null, 2));

    // Simulate frontend processing
    const categoryMap = {};
    apiTestData.forEach(cat => {
      const categoryName = cat.category || 'Uncategorized';
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = { category: categoryName, total: 0, standardized: 0, custom: 0 };
      }
      categoryMap[categoryName].total += cat._count.id;
      if (cat.isStandardized) {
        categoryMap[categoryName].standardized += cat._count.id;
      } else {
        categoryMap[categoryName].custom += cat._count.id;
      }
    });

    const processedData = Object.values(categoryMap);
    console.log('\nProcessed API data:', JSON.stringify(processedData, null, 2));

    // Test frontend extraction
    const categoryNames = processedData.map(cat => cat.category);
    console.log('\n🎯 Frontend category names:', categoryNames);

    console.log('\n✅ Categories test completed successfully!');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testCategoriesFinal();
}