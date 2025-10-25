const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const programs = await prisma.careProgram.findMany({
      select: { id: true, name: true, settings: true }
    });

    console.log('Checking', programs.length, 'care programs for invalid metric keys...\n');

    for (const program of programs) {
      const requiredMetrics = program.settings?.requiredMetrics || [];

      if (requiredMetrics.length === 0) continue;

      const invalidMetrics = [];

      for (const metricKey of requiredMetrics) {
        const metric = await prisma.metricDefinition.findFirst({
          where: { key: metricKey }
        });

        if (!metric) {
          invalidMetrics.push(metricKey);
        }
      }

      if (invalidMetrics.length > 0) {
        console.log('⚠️ ', program.name);
        console.log('   Invalid metrics:', invalidMetrics.join(', '));
      } else if (requiredMetrics.length > 0) {
        console.log('✓', program.name, '(' + requiredMetrics.length + ' metrics, all valid)');
      }
    }

    console.log('\n✓ Check complete');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
