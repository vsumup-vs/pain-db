const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== SAFE CLEANUP OF DUPLICATE METRICS ===\n');

    // Get all duplicate metrics
    const metrics = await prisma.metricDefinition.findMany({
      where: {
        organizationId: null,
        isStandardized: true
      },
      select: { id: true, key: true, displayName: true }
    });

    const metricsByKey = {};
    metrics.forEach(m => {
      if (!metricsByKey[m.key]) metricsByKey[m.key] = [];
      metricsByKey[m.key].push(m);
    });

    const duplicateMetrics = Object.entries(metricsByKey).filter(([key, list]) => list.length > 1);

    for (const [key, list] of duplicateMetrics) {
      // Keep the ID starting with 'cmguqf8', delete others
      const keepId = list.find(m => m.id.startsWith('cmguqf8'));
      const deleteIds = list.filter(m => !m.id.startsWith('cmguqf8'));

      if (!keepId || deleteIds.length === 0) continue;

      console.log(`\nProcessing: ${key} (${keepId.displayName})`);
      console.log(`  Keeping: ${keepId.id}`);

      for (const deleteMetric of deleteIds) {
        console.log(`  Migrating from: ${deleteMetric.id}`);

        // Check if any observations reference this metric
        const obsCount = await prisma.observation.count({
          where: { metricId: deleteMetric.id }
        });

        if (obsCount > 0) {
          console.log(`    Found ${obsCount} observations - migrating to correct metric...`);
          await prisma.observation.updateMany({
            where: { metricId: deleteMetric.id },
            data: { metricId: keepId.id }
          });
          console.log(`    ✓ Migrated ${obsCount} observations`);
        }

        // Check if any assessment template items reference this metric
        const templateItemsCount = await prisma.assessmentTemplateItem.count({
          where: { metricDefinitionId: deleteMetric.id }
        });

        if (templateItemsCount > 0) {
          console.log(`    Found ${templateItemsCount} template items - migrating...`);
          await prisma.assessmentTemplateItem.updateMany({
            where: { metricDefinitionId: deleteMetric.id },
            data: { metricDefinitionId: keepId.id }
          });
          console.log(`    ✓ Migrated ${templateItemsCount} template items`);
        }

        // Now safe to delete
        console.log(`    Deleting duplicate metric ${deleteMetric.id}...`);
        await prisma.metricDefinition.delete({
          where: { id: deleteMetric.id }
        });
        console.log(`    ✓ Deleted`);
      }
    }

    console.log('\n=== SAFE CLEANUP OF DUPLICATE CONDITION PRESETS ===\n');

    // Get all duplicate presets
    const presets = await prisma.conditionPreset.findMany({
      where: {
        organizationId: null,
        isStandardized: true
      },
      select: { id: true, name: true }
    });

    const presetsByName = {};
    presets.forEach(p => {
      if (!presetsByName[p.name]) presetsByName[p.name] = [];
      presetsByName[p.name].push(p);
    });

    const duplicatePresets = Object.entries(presetsByName).filter(([name, list]) => list.length > 1);

    for (const [name, list] of duplicatePresets) {
      // Keep the ID starting with 'cmguqf8', delete others
      const keepId = list.find(p => p.id.startsWith('cmguqf8'));
      const deleteIds = list.filter(p => !p.id.startsWith('cmguqf8'));

      if (!keepId || deleteIds.length === 0) continue;

      console.log(`\nProcessing: ${name}`);
      console.log(`  Keeping: ${keepId.id}`);

      for (const deletePreset of deleteIds) {
        console.log(`  Migrating from: ${deletePreset.id}`);

        // Check enrollments
        const enrollmentCount = await prisma.enrollment.count({
          where: { conditionPresetId: deletePreset.id }
        });

        if (enrollmentCount > 0) {
          console.log(`    Found ${enrollmentCount} enrollments - migrating...`);
          await prisma.enrollment.updateMany({
            where: { conditionPresetId: deletePreset.id },
            data: { conditionPresetId: keepId.id }
          });
          console.log(`    ✓ Migrated ${enrollmentCount} enrollments`);
        }

        // Delete related records
        console.log(`    Deleting related records...`);

        const diagnosesDeleted = await prisma.conditionPresetDiagnosis.deleteMany({
          where: { conditionPresetId: deletePreset.id }
        });
        console.log(`      Deleted ${diagnosesDeleted.count} diagnosis records`);

        const templatesDeleted = await prisma.conditionPresetTemplate.deleteMany({
          where: { conditionPresetId: deletePreset.id }
        });
        console.log(`      Deleted ${templatesDeleted.count} template records`);

        const alertRulesDeleted = await prisma.conditionPresetAlertRule.deleteMany({
          where: { conditionPresetId: deletePreset.id }
        });
        console.log(`      Deleted ${alertRulesDeleted.count} alert rule records`);

        // Now safe to delete
        console.log(`    Deleting duplicate preset ${deletePreset.id}...`);
        await prisma.conditionPreset.delete({
          where: { id: deletePreset.id }
        });
        console.log(`    ✓ Deleted`);
      }
    }

    console.log('\n=== CLEANUP COMPLETE ===');
    console.log('Run check-duplicates.js again to verify all duplicates removed');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
