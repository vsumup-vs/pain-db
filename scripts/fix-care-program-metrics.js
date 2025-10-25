const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping of invalid metric keys to correct ones
const metricKeyMapping = {
  'weight': 'body_weight',
  'blood_pressure_systolic': 'systolic_blood_pressure',
  'blood_pressure_diastolic': 'diastolic_blood_pressure',
  'pain_level': 'pain_scale_0_10',
  'mood': 'mood_rating',
  'exercise_duration': 'days_exercised',
  'chest_pain': 'pain_scale_0_10',
  'functional_status': 'activity_level',  // best approximation
  'anxiety_level': 'gad7_total_score',
  'stress_level': 'mood_rating',  // best approximation
  'blood_pressure': 'systolic_blood_pressure'  // will need manual review
};

(async () => {
  try {
    const programs = await prisma.careProgram.findMany();

    console.log('Fixing metric keys in', programs.length, 'care programs...\n');

    let updatedCount = 0;

    for (const program of programs) {
      const requiredMetrics = program.settings?.requiredMetrics || [];

      if (requiredMetrics.length === 0) continue;

      // Check if any metrics need fixing
      const needsUpdate = requiredMetrics.some(key => metricKeyMapping[key]);

      if (!needsUpdate) continue;

      // Map old keys to new keys
      const fixedMetrics = requiredMetrics.map(key => {
        const newKey = metricKeyMapping[key];
        if (newKey) {
          console.log('  Fixing:', program.name);
          console.log('    -', key, '→', newKey);
          return newKey;
        }
        return key;
      });

      // Remove duplicates (in case multiple old keys map to same new key)
      const uniqueMetrics = [...new Set(fixedMetrics)];

      // Update the program
      await prisma.careProgram.update({
        where: { id: program.id },
        data: {
          settings: {
            ...program.settings,
            requiredMetrics: uniqueMetrics
          }
        }
      });

      updatedCount++;
      console.log('    ✓ Updated\n');
    }

    console.log('=== FIX COMPLETE ===');
    console.log('Updated', updatedCount, 'care programs');

    console.log('\nNote: Some metrics may need manual review:');
    console.log('  - stress_level → mood_rating (approximation)');
    console.log('  - functional_status → activity_level (approximation)');
    console.log('  - blood_pressure → systolic_blood_pressure (incomplete, may need diastolic too)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
