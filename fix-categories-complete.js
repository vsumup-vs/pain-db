const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixCategoriesComplete() {
  console.log('🔧 Complete Categories Fix...\n');

  try {
    // Step 1: Add categories to existing templates
    console.log('1️⃣ Adding categories to assessment templates...');
    
    const categoryMappings = [
      { pattern: /pain|chronic.*pain/i, category: 'Pain Management' },
      { pattern: /fibromyalgia/i, category: 'Fibromyalgia' },
      { pattern: /arthritis/i, category: 'Arthritis' },
      { pattern: /diabetes/i, category: 'Diabetes' },
      { pattern: /cardiovascular|blood.*pressure|heart/i, category: 'Cardiovascular' },
      { pattern: /mental.*health|depression|anxiety|phq|gad/i, category: 'Mental Health' },
      { pattern: /respiratory|copd|asthma|breathing/i, category: 'Respiratory' },
      { pattern: /musculoskeletal|mobility|strength/i, category: 'Musculoskeletal' }
    ];

    const templates = await prisma.assessmentTemplate.findMany({
      where: {
        OR: [
          { category: null },
          { category: '' }
        ]
      }
    });

    console.log(`   Found ${templates.length} templates without categories`);

    for (const template of templates) {
      let assignedCategory = 'General';
      
      for (const mapping of categoryMappings) {
        if (mapping.pattern.test(template.name) || 
            (template.description && mapping.pattern.test(template.description))) {
          assignedCategory = mapping.category;
          break;
        }
      }

      await prisma.assessmentTemplate.update({
        where: { id: template.id },
        data: { category: assignedCategory }
      });

      console.log(`   ✅ Updated "${template.name}" -> Category: ${assignedCategory}`);
    }

    // Step 2: Fix frontend code
    console.log('\n2️⃣ Fixing frontend code...');
    
    const frontendFile = path.join(__dirname, 'frontend/src/pages/AssessmentTemplatesEnhanced.jsx');
    
    if (fs.existsSync(frontendFile)) {
      let content = fs.readFileSync(frontendFile, 'utf8');
      
      // Replace the categories query
      const oldQuery = `  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['template-categories'],
    queryFn: () => api.getTemplateCategories(),
  })`;

      const newQuery = `  // Fetch categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['template-categories'],
    queryFn: () => api.getTemplateCategories(),
  })

  // Extract category names from the API response
  const categories = categoriesResponse?.data?.map(cat => cat.category) || []`;

      if (content.includes(oldQuery)) {
        content = content.replace(oldQuery, newQuery);
        fs.writeFileSync(frontendFile, content);
        console.log('   ✅ Frontend code updated successfully');
      } else {
        console.log('   ⚠️ Frontend code pattern not found - manual update needed');
      }
    } else {
      console.log('   ⚠️ Frontend file not found');
    }

    // Step 3: Verify the fix
    console.log('\n3️⃣ Verifying the fix...');
    
    const categoryStats = await prisma.assessmentTemplate.groupBy({
      by: ['category', 'isStandardized'],
      _count: { id: true },
      where: { category: { not: null } }
    });

    console.log('   Category statistics:');
    const categoryMap = {};
    categoryStats.forEach(stat => {
      const categoryName = stat.category || 'Uncategorized';
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = { total: 0, standardized: 0, custom: 0 };
      }
      categoryMap[categoryName].total += stat._count.id;
      if (stat.isStandardized) {
        categoryMap[categoryName].standardized += stat._count.id;
      } else {
        categoryMap[categoryName].custom += stat._count.id;
      }
    });

    Object.entries(categoryMap).forEach(([category, stats]) => {
      console.log(`   ${category}: ${stats.total} templates (${stats.standardized} standardized, ${stats.custom} custom)`);
    });

    console.log('\n✅ Categories fix completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your frontend development server');
    console.log('   2. Refresh the browser');
    console.log('   3. The categories dropdown should now work properly');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixCategoriesComplete();
}

module.exports = { fixCategoriesComplete };