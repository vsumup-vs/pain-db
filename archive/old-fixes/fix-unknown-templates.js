const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function fixUnknownTemplates() {
  try {
    console.log('🔍 DIAGNOSING UNKNOWN TEMPLATE ISSUE');
    console.log('=' .repeat(50));

    // 1. Check all condition presets with their template relationships
    const presets = await prisma.conditionPreset.findMany({
      include: {
        templates: {
          include: {
            template: true // Include full template data
          }
        }
      }
    });

    console.log(`\n📋 Found ${presets.length} condition presets`);

    let orphanedLinks = [];
    let templatesWithoutNames = [];

    for (const preset of presets) {
      console.log(`\n🔍 Checking preset: ${preset.name}`);
      console.log(`   Template links: ${preset.templates.length}`);

      for (const link of preset.templates) {
        if (!link.template) {
          // Template doesn't exist but link does
          orphanedLinks.push({
            presetId: preset.id,
            presetName: preset.name,
            linkId: link.id,
            templateId: link.templateId
          });
          console.log(`   ❌ Orphaned link to template ID: ${link.templateId}`);
        } else if (!link.template.name) {
          // Template exists but has no name
          templatesWithoutNames.push({
            presetId: preset.id,
            presetName: preset.name,
            templateId: link.template.id,
            template: link.template
          });
          console.log(`   ⚠️  Template exists but has no name: ${link.template.id}`);
        } else {
          console.log(`   ✅ Valid template: ${link.template.name}`);
        }
      }
    }

    // 2. Report findings
    console.log('\n📊 DIAGNOSTIC RESULTS:');
    console.log('-'.repeat(30));

    if (orphanedLinks.length > 0) {
      console.log(`\n❌ Found ${orphanedLinks.length} orphaned template links:`);
      for (const orphan of orphanedLinks) {
        console.log(`   - Preset: ${orphan.presetName} → Missing template ID: ${orphan.templateId}`);
      }
    }

    if (templatesWithoutNames.length > 0) {
      console.log(`\n⚠️  Found ${templatesWithoutNames.length} templates without names:`);
      for (const template of templatesWithoutNames) {
        console.log(`   - Preset: ${template.presetName} → Template ID: ${template.templateId}`);
      }
    }

    if (orphanedLinks.length === 0 && templatesWithoutNames.length === 0) {
      console.log('\n✅ No issues found! All template links are valid.');
      return;
    }

    // 3. Offer to fix issues
    console.log('\n🔧 FIXING ISSUES:');
    console.log('-'.repeat(20));

    // Remove orphaned links
    if (orphanedLinks.length > 0) {
      console.log(`\n🗑️  Removing ${orphanedLinks.length} orphaned template links...`);
      for (const orphan of orphanedLinks) {
        await prisma.conditionPresetTemplate.delete({
          where: { id: orphan.linkId }
        });
        console.log(`   ✅ Removed orphaned link from ${orphan.presetName}`);
      }
    }

    // Report templates without names (manual intervention needed)
    if (templatesWithoutNames.length > 0) {
      console.log(`\n⚠️  Templates without names need manual review:`);
      for (const template of templatesWithoutNames) {
        console.log(`   - Template ID: ${template.templateId}`);
        console.log(`     Description: ${template.template.description || 'No description'}`);
        console.log(`     Created: ${template.template.createdAt}`);
      }
    }

    console.log('\n✅ Cleanup completed!');

  } catch (error) {
    console.error('❌ Error fixing unknown templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUnknownTemplates();