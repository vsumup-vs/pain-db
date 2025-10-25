const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check for duplicate metrics by key
    const metrics = await prisma.metricDefinition.findMany({
      select: { id: true, key: true, displayName: true, organizationId: true, isStandardized: true }
    });

    const metricsByKey = {};
    metrics.forEach(m => {
      if (!metricsByKey[m.key]) metricsByKey[m.key] = [];
      metricsByKey[m.key].push(m);
    });

    const duplicateMetrics = Object.entries(metricsByKey).filter(([key, list]) => list.length > 1);

    console.log('=== DUPLICATE METRICS ===');
    console.log('Total metrics:', metrics.length);
    if (duplicateMetrics.length > 0) {
      console.log('Found', duplicateMetrics.length, 'duplicate metric keys:\n');
      duplicateMetrics.forEach(([key, list]) => {
        console.log('Key:', key, '(' + list.length + ' entries)');
        list.forEach(m => {
          console.log('  -', m.id.substring(0, 8), '|', m.displayName, '| Org:', m.organizationId || 'PLATFORM', '| Std:', m.isStandardized);
        });
        console.log('');
      });
    } else {
      console.log('No duplicate metrics found');
    }

    console.log('\n=== DUPLICATE CONDITION PRESETS ===');

    // Check for duplicate condition presets by name
    const presets = await prisma.conditionPreset.findMany({
      select: { id: true, name: true, organizationId: true, isStandardized: true, isActive: true }
    });

    const presetsByName = {};
    presets.forEach(p => {
      if (!presetsByName[p.name]) presetsByName[p.name] = [];
      presetsByName[p.name].push(p);
    });

    const duplicatePresets = Object.entries(presetsByName).filter(([name, list]) => list.length > 1);

    console.log('Total presets:', presets.length);
    if (duplicatePresets.length > 0) {
      console.log('Found', duplicatePresets.length, 'duplicate preset names:\n');
      duplicatePresets.forEach(([name, list]) => {
        console.log('Name:', name, '(' + list.length + ' entries)');
        list.forEach(p => {
          console.log('  -', p.id.substring(0, 8), '| Org:', p.organizationId || 'PLATFORM', '| Std:', p.isStandardized, '| Active:', p.isActive);
        });
        console.log('');
      });
    } else {
      console.log('No duplicate presets found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
