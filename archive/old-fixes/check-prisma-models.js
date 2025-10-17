const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkModels() {
  try {
    console.log('Available Prisma models:');
    console.log('Keys:', Object.keys(prisma));
    
    // Try to find condition preset related models
    const keys = Object.keys(prisma);
    const conditionKeys = keys.filter(key => key.toLowerCase().includes('condition'));
    console.log('Condition-related models:', conditionKeys);
    
    const presetKeys = keys.filter(key => key.toLowerCase().includes('preset'));
    console.log('Preset-related models:', presetKeys);
    
    const assessmentKeys = keys.filter(key => key.toLowerCase().includes('assessment'));
    console.log('Assessment-related models:', assessmentKeys);
    
    const templateKeys = keys.filter(key => key.toLowerCase().includes('template'));
    console.log('Template-related models:', templateKeys);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();