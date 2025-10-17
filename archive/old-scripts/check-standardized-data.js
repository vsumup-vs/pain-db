#!/usr/bin/env node
/**
 * Check Standardized Data Status
 *
 * Verifies that all production-ready standardized data exists:
 * - Condition Presets
 * - Metric Definitions
 * - Assessment Templates
 * - Alert Rules
 * - Diagnoses (ICD-10/SNOMED)
 * - All relationships and mappings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStandardizedData() {
  console.log('=== Standardized Data Status Check ===\n');

  try {
    // Count all standardized entities
    const counts = {
      conditionPresets: await prisma.conditionPreset.count(),
      metricDefinitions: await prisma.metricDefinition.count({ where: { isStandardized: true } }),
      assessmentTemplates: await prisma.assessmentTemplate.count(),
      alertRules: await prisma.alertRule.count({ where: { isStandardized: true } }),
      diagnoses: await prisma.conditionPresetDiagnosis.count(),
      templateItems: await prisma.assessmentTemplateItem.count(),
      presetTemplates: await prisma.conditionPresetTemplate.count(),
      presetAlertRules: await prisma.conditionPresetAlertRule.count()
    };

    console.log('📊 Standardized Data Counts:');
    console.log(`  ✓ Condition Presets: ${counts.conditionPresets}`);
    console.log(`  ✓ Metric Definitions (standardized): ${counts.metricDefinitions}`);
    console.log(`  ✓ Assessment Templates: ${counts.assessmentTemplates}`);
    console.log(`  ✓ Alert Rules (standardized): ${counts.alertRules}`);
    console.log(`  ✓ Diagnoses (ICD-10/SNOMED): ${counts.diagnoses}`);
    console.log(`  ✓ Template Items (metric mappings): ${counts.templateItems}`);
    console.log(`  ✓ Preset-Template Links: ${counts.presetTemplates}`);
    console.log(`  ✓ Preset-AlertRule Links: ${counts.presetAlertRules}\n`);

    // Check for orphaned or incomplete relationships
    console.log('🔍 Relationship Integrity Check:\n');

    const orphans = {
      templatesWithoutItems: await prisma.assessmentTemplate.count({
        where: { items: { none: {} } }
      }),
      presetsWithoutDiagnoses: await prisma.conditionPreset.count({
        where: { diagnoses: { none: {} } }
      }),
      presetsWithoutTemplates: await prisma.conditionPreset.count({
        where: { templates: { none: {} } }
      }),
      presetsWithoutAlertRules: await prisma.conditionPreset.count({
        where: { alertRules: { none: {} } }
      })
    };

    let hasIssues = false;

    if (orphans.templatesWithoutItems > 0) {
      console.log(`  ⚠️  Templates without items: ${orphans.templatesWithoutItems}`);
      hasIssues = true;
    } else {
      console.log(`  ✓ All templates have items`);
    }

    if (orphans.presetsWithoutDiagnoses > 0) {
      console.log(`  ⚠️  Presets without diagnoses: ${orphans.presetsWithoutDiagnoses}`);
      hasIssues = true;
    } else {
      console.log(`  ✓ All presets have diagnoses`);
    }

    if (orphans.presetsWithoutTemplates > 0) {
      console.log(`  ⚠️  Presets without templates: ${orphans.presetsWithoutTemplates}`);
      hasIssues = true;
    } else {
      console.log(`  ✓ All presets have assessment templates`);
    }

    if (orphans.presetsWithoutAlertRules > 0) {
      console.log(`  ⚠️  Presets without alert rules: ${orphans.presetsWithoutAlertRules}`);
      hasIssues = true;
    } else {
      console.log(`  ✓ All presets have alert rules`);
    }

    console.log();

    // Sample each condition preset
    const presets = await prisma.conditionPreset.findMany({
      include: {
        diagnoses: true,
        templates: { include: { template: true } },
        alertRules: { include: { rule: true } }
      }
    });

    console.log('📋 Condition Preset Details:\n');

    presets.forEach(preset => {
      console.log(`  ${preset.name}:`);
      console.log(`    Diagnoses: ${preset.diagnoses.length}`);
      console.log(`    Templates: ${preset.templates.length}`);
      console.log(`    Alert Rules: ${preset.alertRules.length}`);
    });

    console.log();

    // Production readiness assessment
    console.log('🚀 Production Readiness Assessment:\n');

    const productionReady = {
      hasConditionPresets: counts.conditionPresets >= 5,
      hasMetrics: counts.metricDefinitions >= 20,
      hasTemplates: counts.assessmentTemplates >= 5,
      hasAlertRules: counts.alertRules >= 5,
      hasDiagnoses: counts.diagnoses >= 5,
      hasCompleteRelationships: !hasIssues
    };

    const allReady = Object.values(productionReady).every(v => v === true);

    if (productionReady.hasConditionPresets) {
      console.log(`  ✓ Condition Presets: Sufficient (${counts.conditionPresets})`);
    } else {
      console.log(`  ✗ Condition Presets: Insufficient (need >= 5, have ${counts.conditionPresets})`);
    }

    if (productionReady.hasMetrics) {
      console.log(`  ✓ Metric Definitions: Sufficient (${counts.metricDefinitions})`);
    } else {
      console.log(`  ✗ Metric Definitions: Insufficient (need >= 20, have ${counts.metricDefinitions})`);
    }

    if (productionReady.hasTemplates) {
      console.log(`  ✓ Assessment Templates: Sufficient (${counts.assessmentTemplates})`);
    } else {
      console.log(`  ✗ Assessment Templates: Insufficient (need >= 5, have ${counts.assessmentTemplates})`);
    }

    if (productionReady.hasAlertRules) {
      console.log(`  ✓ Alert Rules: Sufficient (${counts.alertRules})`);
    } else {
      console.log(`  ✗ Alert Rules: Insufficient (need >= 5, have ${counts.alertRules})`);
    }

    if (productionReady.hasDiagnoses) {
      console.log(`  ✓ Diagnoses: Sufficient (${counts.diagnoses})`);
    } else {
      console.log(`  ✗ Diagnoses: Insufficient (need >= 5, have ${counts.diagnoses})`);
    }

    if (productionReady.hasCompleteRelationships) {
      console.log(`  ✓ Relationships: Complete`);
    } else {
      console.log(`  ✗ Relationships: Incomplete (see warnings above)`);
    }

    console.log();

    if (allReady) {
      console.log('✅ PRODUCTION READY: All standardized data is complete and properly linked.');
    } else {
      console.log('⚠️  NOT PRODUCTION READY: Some standardized data is missing or incomplete.');
      console.log('\nRecommendation: Run `npm run seed:production` to populate standardized data.');
    }

  } catch (error) {
    console.error('❌ Error checking standardized data:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkStandardizedData();
}

module.exports = { checkStandardizedData };
