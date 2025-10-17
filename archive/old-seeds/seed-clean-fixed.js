const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function generateUUID() {
  return crypto.randomUUID();
}

async function safeDelete(modelName, tableName) {
  try {
    const result = await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
    console.log(`✓ Cleared ${result} records from ${modelName}`);
  } catch (error) {
    if (error.code === 'P2003') {
      console.log(`⚠ Cannot clear ${modelName} due to foreign key constraints. Skipping...`);
    } else {
      console.error(`✗ Error clearing ${modelName}:`, error.message);
    }
  }
}

const standardizedMetrics = [
  {
    key: 'pain_scale_0_10',
    displayName: 'Pain Scale (0-10)',
    valueType: 'NUMERIC',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily'
  },
  {
    key: 'pain_location',
    displayName: 'Pain Location',
    valueType: 'TEXT',
    defaultFrequency: 'daily'
  },
  {
    key: 'pain_interference',
    displayName: 'Pain Interference with Daily Activities',
    valueType: 'NUMERIC',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily'
  }
];

async function seedClean() {
  try {
    console.log('🧹 Cleaning existing data...');
    
    // Clear data in correct order (respecting foreign key constraints)
    await safeDelete('MetricDefinition', 'MetricDefinition');

    console.log('\n📊 Creating standardized metrics...');
    const createdMetrics = {};
    for (const metric of standardizedMetrics) {
      const created = await prisma.MetricDefinition.upsert({
        where: { key: metric.key },
        update: {
          displayName: metric.displayName,
          description: metric.description || `${metric.displayName} measurement`,
          unit: metric.unit,
          valueType: metric.valueType,
          isStandardized: true,
          category: metric.category || 'General'
        },
        create: {
          id: generateUUID(),
          key: metric.key,
          displayName: metric.displayName,
          description: metric.description || `${metric.displayName} measurement`,
          unit: metric.unit,
          valueType: metric.valueType,
          isStandardized: true,
          category: metric.category || 'General'
        }
      });
      createdMetrics[metric.key] = created;
    }
    console.log(`✓ Created ${Object.keys(createdMetrics).length} metric definitions`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedClean()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}