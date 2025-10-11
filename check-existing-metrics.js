const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingMetrics() {
  console.log('🔍 Checking existing metrics in database...\n');

  try {
    // Get all current metrics
    const allMetrics = await prisma.metricDefinition.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        isStandardized: true,
        valueType: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Total metrics found: ${allMetrics.length}\n`);

    if (allMetrics.length === 0) {
      console.log('❌ No metrics found in database!');
      console.log('   This explains why templates show "0 metrics"');
      return;
    }

    // Group by category
    const metricsByCategory = {};
    allMetrics.forEach(metric => {
      const category = metric.category || 'Uncategorized';
      if (!metricsByCategory[category]) {
        metricsByCategory[category] = [];
      }
      metricsByCategory[category].push(metric);
    });

    console.log('📋 Metrics by category:');
    Object.keys(metricsByCategory).forEach(category => {
      console.log(`\n🏷️ ${category} (${metricsByCategory[category].length} metrics):`);
      metricsByCategory[category].forEach(metric => {
        const standardized = metric.isStandardized ? '⭐' : '🔧';
        console.log(`   ${standardized} ${metric.name} (key: ${metric.key})`);
      });
    });

    // Check template associations
    console.log('\n🔗 Checking template-metric associations...');
    const templateItems = await prisma.assessmentTemplateItem.findMany({
      include: {
        template: { select: { name: true } },
        metricDefinition: { select: { name: true, key: true } }
      }
    });

    console.log(`📊 Total template-metric associations: ${templateItems.length}`);

    if (templateItems.length === 0) {
      console.log('❌ No template-metric associations found!');
      console.log('   This is why templates show "0 metrics"');
    } else {
      const associationsByTemplate = {};
      templateItems.forEach(item => {
        const templateName = item.template.name;
        if (!associationsByTemplate[templateName]) {
          associationsByTemplate[templateName] = [];
        }
        associationsByTemplate[templateName].push(item.metricDefinition);
      });

      console.log('\n📋 Associations by template:');
      Object.keys(associationsByTemplate).forEach(templateName => {
        console.log(`\n📝 ${templateName} (${associationsByTemplate[templateName].length} metrics):`);
        associationsByTemplate[templateName].forEach(metric => {
          console.log(`   📊 ${metric.name} (${metric.key})`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Error checking metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingMetrics();