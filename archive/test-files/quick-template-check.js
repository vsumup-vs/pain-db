const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function quickTemplateCheck() {
  try {
    console.log('🔍 Quick Template Status Check');
    console.log('==============================\n');

    const templates = await prisma.assessmentTemplate.findMany({
      select: {
        id: true,
        name: true,
        isStandardized: true,
        category: true,
        items: {
          select: {
            id: true,
            metricDefinition: {
              select: {
                key: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const standardized = templates.filter(t => t.isStandardized === true);
    const custom = templates.filter(t => t.isStandardized !== true);

    console.log(`📊 Total Templates: ${templates.length}`);
    console.log(`🏆 Standardized: ${standardized.length}`);
    console.log(`🛠️  Custom: ${custom.length}\n`);

    if (standardized.length > 0) {
      console.log('🏆 STANDARDIZED TEMPLATES:');
      standardized.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name} (${t.items.length} items)`);
      });
      console.log('');
    }

    if (custom.length > 0) {
      console.log('🛠️  CUSTOM TEMPLATES:');
      custom.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name} (${t.items.length} items)`);
        
        // Check if this might be a standardized template
        const name = t.name.toLowerCase();
        let possibleStandardized = [];
        
        if (name.includes('bpi') || name.includes('brief pain inventory')) {
          possibleStandardized.push('Brief Pain Inventory (BPI)');
        }
        if (name.includes('phq') || name.includes('patient health questionnaire')) {
          possibleStandardized.push('Patient Health Questionnaire-9 (PHQ-9)');
        }
        if (name.includes('gad') || name.includes('generalized anxiety')) {
          possibleStandardized.push('Generalized Anxiety Disorder-7 (GAD-7)');
        }
        if (name.includes('fiq') || name.includes('fibromyalgia impact')) {
          possibleStandardized.push('Fibromyalgia Impact Questionnaire (FIQ)');
        }
        if (name.includes('sdsca') || name.includes('diabetes self-care')) {
          possibleStandardized.push('Summary of Diabetes Self-Care Activities (SDSCA)');
        }

        if (possibleStandardized.length > 0) {
          console.log(`      🎯 POSSIBLE STANDARDIZED: ${possibleStandardized.join(', ')}`);
        }

        // Show some metric keys for analysis
        const metricKeys = t.items.map(item => item.metricDefinition?.key).filter(Boolean);
        if (metricKeys.length > 0) {
          console.log(`      🔑 Metrics: ${metricKeys.slice(0, 3).join(', ')}${metricKeys.length > 3 ? '...' : ''}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickTemplateCheck().catch(console.error);