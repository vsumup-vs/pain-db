const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== CLEANING UP DUPLICATE METRICS ===\n');

    // Duplicate metric IDs to delete (keeping the cmguqf8* IDs, removing test IDs)
    const duplicateMetricIds = [
      'metric-p', // pain_location duplicate
      'metric-h', // heart_rate duplicate
      'metric-r', // respiratory_rate duplicate
      'metric-o', // oxygen_saturation duplicate
      'metric-w', // body_weight duplicate
      'metric-g', // blood_glucose duplicate
      // Note: there are TWO metric-h entries (heart_rate and hba1c) and TWO metric-g entries
      // Need to get the actual IDs from the database
    ];

    // Get all duplicate metrics to identify exact IDs to delete
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

    const idsToDelete = [];
    duplicateMetrics.forEach(([key, list]) => {
      // Keep the ID starting with 'cmguqf8', delete others
      const toDelete = list.filter(m => !m.id.startsWith('cmguqf8'));
      toDelete.forEach(m => {
        console.log(`Marking for deletion: ${m.id.substring(0, 8)}... | ${m.displayName} (${key})`);
        idsToDelete.push(m.id);
      });
    });

    if (idsToDelete.length > 0) {
      console.log(`\nDeleting ${idsToDelete.length} duplicate metrics...`);
      const deleteResult = await prisma.metricDefinition.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });
      console.log(`✓ Deleted ${deleteResult.count} duplicate metric records\n`);
    } else {
      console.log('No duplicate metrics to delete\n');
    }

    console.log('=== CLEANING UP DUPLICATE CONDITION PRESETS ===\n');

    // Get all duplicate presets to identify exact IDs to delete
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

    const presetIdsToDelete = [];
    duplicatePresets.forEach(([name, list]) => {
      // Keep the ID starting with 'cmguqf8', delete others
      const toDelete = list.filter(p => !p.id.startsWith('cmguqf8'));
      toDelete.forEach(p => {
        console.log(`Marking for deletion: ${p.id.substring(0, 8)}... | ${p.name}`);
        presetIdsToDelete.push(p.id);
      });
    });

    if (presetIdsToDelete.length > 0) {
      console.log(`\nDeleting ${presetIdsToDelete.length} duplicate condition presets...`);

      // First, delete related records (diagnoses, templates, alert rules)
      console.log('Deleting related ConditionPresetDiagnosis records...');
      const diagnosesDeleted = await prisma.conditionPresetDiagnosis.deleteMany({
        where: { presetId: { in: presetIdsToDelete } }
      });
      console.log(`  Deleted ${diagnosesDeleted.count} diagnosis records`);

      console.log('Deleting related ConditionPresetTemplate records...');
      const templatesDeleted = await prisma.conditionPresetTemplate.deleteMany({
        where: { presetId: { in: presetIdsToDelete } }
      });
      console.log(`  Deleted ${templatesDeleted.count} template records`);

      console.log('Deleting related ConditionPresetAlertRule records...');
      const alertRulesDeleted = await prisma.conditionPresetAlertRule.deleteMany({
        where: { presetId: { in: presetIdsToDelete } }
      });
      console.log(`  Deleted ${alertRulesDeleted.count} alert rule records`);

      console.log('Deleting duplicate condition preset records...');
      const deleteResult = await prisma.conditionPreset.deleteMany({
        where: {
          id: { in: presetIdsToDelete }
        }
      });
      console.log(`✓ Deleted ${deleteResult.count} duplicate preset records\n`);
    } else {
      console.log('No duplicate presets to delete\n');
    }

    console.log('=== CLEANUP COMPLETE ===');
    console.log('Run check-duplicates.js again to verify all duplicates removed');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
