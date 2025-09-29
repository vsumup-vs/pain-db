const { PrismaClient } = require('./generated/prisma');
const { createStandardizedAssessmentTemplates, standardizedAssessmentTemplates } = require('./create-standardized-assessment-templates');

const prisma = new PrismaClient();

async function fixStandardizedTemplates() {
  try {
    console.log('🔧 Fixing standardized templates...');
    
    // First, create the templates if they don't exist
    console.log('📋 Step 1: Creating standardized templates...');
    await createStandardizedAssessmentTemplates();
    
    // Then, update existing templates to mark them as standardized
    console.log('\n🏆 Step 2: Marking templates as standardized...');
    
    const standardizedTemplateNames = standardizedAssessmentTemplates.map(t => t.name);
    
    for (const templateName of standardizedTemplateNames) {
      const result = await prisma.assessmentTemplate.updateMany({
        where: { 
          name: templateName,
          isStandardized: { not: true } // Only update if not already standardized
        },
        data: { 
          isStandardized: true,
          standardizedVersion: '1.0',
          validationStatus: 'validated'
        }
      });
      
      if (result.count > 0) {
        console.log(`   ✅ Marked as standardized: ${templateName}`);
      } else {
        console.log(`   ⏭️  Already standardized: ${templateName}`);
      }
    }
    
    // Verify the fix
    console.log('\n📊 Step 3: Verifying standardized templates...');
    const standardizedCount = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    
    const totalCount = await prisma.assessmentTemplate.count();
    
    console.log(`   📋 Total templates: ${totalCount}`);
    console.log(`   🏆 Standardized templates: ${standardizedCount}`);
    console.log(`   🛠️  Custom templates: ${totalCount - standardizedCount}`);
    
    if (standardizedCount >= 5) {
      console.log('\n🎉 Success! All expected standardized templates are now properly marked.');
    } else {
      console.log('\n⚠️  Warning: Expected at least 5 standardized templates.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing standardized templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixStandardizedTemplates()
    .catch(console.error);
}

module.exports = { fixStandardizedTemplates };