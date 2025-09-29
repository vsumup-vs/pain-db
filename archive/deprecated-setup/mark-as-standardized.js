const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function markAsStandardized() {
  try {
    console.log('🔧 Marking templates as standardized...');
    
    const standardizedTemplateNames = [
      'Brief Pain Inventory (BPI)',
      'Patient Health Questionnaire-9 (PHQ-9)',
      'Generalized Anxiety Disorder-7 (GAD-7)',
      'Fibromyalgia Impact Questionnaire (FIQ)',
      'Summary of Diabetes Self-Care Activities (SDSCA)'
    ];
    
    for (const templateName of standardizedTemplateNames) {
      const result = await prisma.assessmentTemplate.updateMany({
        where: { name: templateName },
        data: { 
          isStandardized: true,
          standardizedVersion: '1.0',
          validationStatus: 'validated'
        }
      });
      
      if (result.count > 0) {
        console.log(`   ✅ Marked as standardized: ${templateName}`);
      } else {
        console.log(`   ❌ Template not found: ${templateName}`);
      }
    }
    
    // Check results
    const standardizedCount = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    
    console.log(`\n📊 Result: ${standardizedCount} templates marked as standardized`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

markAsStandardized();