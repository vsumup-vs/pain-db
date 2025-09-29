const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function diagnoseTemplateIssues() {
  try {
    console.log('🔍 TEMPLATE RELATIONSHIP DIAGNOSTIC');
    console.log('=' .repeat(50));

    // Get all condition presets with their template relationships
    const presets = await prisma.conditionPreset.findMany({
      include: {
        templates: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    console.log(`\n📋 Found ${presets.length} condition presets`);

    let issues = {
      orphanedLinks: [],
      templatesWithoutNames: [],
      validTemplates: 0
    };

    // Check each preset
    for (const preset of presets) {
      console.log(`\n🔍 Checking: ${preset.name}`);
      console.log(`   Template links: ${preset.templates.length}`);

      for (const link of preset.templates) {
        if (!link.template) {
          // Orphaned link - template doesn't exist
          issues.orphanedLinks.push({
            presetId: preset.id,
            presetName: preset.name,
            linkId: link.id,
            templateId: link.templateId
          });
          console.log(`   ❌ Orphaned link to template ID: ${link.templateId}`);
        } else if (!link.template.name || link.template.name.trim() === '') {
          // Template exists but has no name
          issues.templatesWithoutNames.push({
            presetId: preset.id,
            presetName: preset.name,
            templateId: link.template.id,
            template: link.template
          });
          console.log(`   ⚠️  Template has no name: ID ${link.template.id}`);
        } else {
          issues.validTemplates++;
          console.log(`   ✅ Valid: ${link.template.name}`);
        }
      }
    }

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(30));
    console.log(`✅ Valid templates: ${issues.validTemplates}`);
    console.log(`❌ Orphaned links: ${issues.orphanedLinks.length}`);
    console.log(`⚠️  Templates without names: ${issues.templatesWithoutNames.length}`);

    // Detailed issues
    if (issues.orphanedLinks.length > 0) {
      console.log('\n🗑️  ORPHANED LINKS (will be removed):');
      issues.orphanedLinks.forEach(orphan => {
        console.log(`   - ${orphan.presetName} → Missing Template ID: ${orphan.templateId}`);
      });
    }

    if (issues.templatesWithoutNames.length > 0) {
      console.log('\n⚠️  TEMPLATES WITHOUT NAMES (need manual review):');
      issues.templatesWithoutNames.forEach(template => {
        console.log(`   - Template ID: ${template.templateId}`);
        console.log(`     Description: ${template.template.description || 'No description'}`);
        console.log(`     Created: ${template.template.createdAt}`);
        console.log(`     In preset: ${template.presetName}`);
      });
    }

    // Auto-fix orphaned links
    if (issues.orphanedLinks.length > 0) {
      console.log('\n🔧 FIXING ORPHANED LINKS...');
      for (const orphan of issues.orphanedLinks) {
        await prisma.conditionPresetTemplate.delete({
          where: { id: orphan.linkId }
        });
        console.log(`   ✅ Removed orphaned link from ${orphan.presetName}`);
      }
    }

    if (issues.orphanedLinks.length === 0 && issues.templatesWithoutNames.length === 0) {
      console.log('\n🎉 No issues found! All templates are properly linked and named.');
    } else {
      console.log('\n✅ Diagnostic completed. Orphaned links have been cleaned up.');
      if (issues.templatesWithoutNames.length > 0) {
        console.log('⚠️  Templates without names require manual review.');
      }
    }

  } catch (error) {
    console.error('❌ Error running diagnostic:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 Database connection issue. Make sure:');
      console.log('   1. PostgreSQL is running');
      console.log('   2. Database credentials in .env.local are correct');
      console.log('   3. Database "pain_db" exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function diagnoseTemplateIssues() {
  try {
    console.log('🔍 TEMPLATE RELATIONSHIP DIAGNOSTIC');
    console.log('=' .repeat(50));

    // Get all condition presets with their template relationships
    const presets = await prisma.conditionPreset.findMany({
      include: {
        templates: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    console.log(`\n📋 Found ${presets.length} condition presets`);

    let issues = {
      orphanedLinks: [],
      templatesWithoutNames: [],
      validTemplates: 0
    };

    // Check each preset
    for (const preset of presets) {
      console.log(`\n🔍 Checking: ${preset.name}`);
      console.log(`   Template links: ${preset.templates.length}`);

      for (const link of preset.templates) {
        if (!link.template) {
          // Orphaned link - template doesn't exist
          issues.orphanedLinks.push({
            presetId: preset.id,
            presetName: preset.name,
            linkId: link.id,
            templateId: link.templateId
          });
          console.log(`   ❌ Orphaned link to template ID: ${link.templateId}`);
        } else if (!link.template.name || link.template.name.trim() === '') {
          // Template exists but has no name
          issues.templatesWithoutNames.push({
            presetId: preset.id,
            presetName: preset.name,
            templateId: link.template.id,
            template: link.template
          });
          console.log(`   ⚠️  Template has no name: ID ${link.template.id}`);
        } else {
          issues.validTemplates++;
          console.log(`   ✅ Valid: ${link.template.name}`);
        }
      }
    }

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(30));
    console.log(`✅ Valid templates: ${issues.validTemplates}`);
    console.log(`❌ Orphaned links: ${issues.orphanedLinks.length}`);
    console.log(`⚠️  Templates without names: ${issues.templatesWithoutNames.length}`);

    // Detailed issues
    if (issues.orphanedLinks.length > 0) {
      console.log('\n🗑️  ORPHANED LINKS (will be removed):');
      issues.orphanedLinks.forEach(orphan => {
        console.log(`   - ${orphan.presetName} → Missing Template ID: ${orphan.templateId}`);
      });
    }

    if (issues.templatesWithoutNames.length > 0) {
      console.log('\n⚠️  TEMPLATES WITHOUT NAMES (need manual review):');
      issues.templatesWithoutNames.forEach(template => {
        console.log(`   - Template ID: ${template.templateId}`);
        console.log(`     Description: ${template.template.description || 'No description'}`);
        console.log(`     Created: ${template.template.createdAt}`);
        console.log(`     In preset: ${template.presetName}`);
      });
    }

    // Auto-fix orphaned links
    if (issues.orphanedLinks.length > 0) {
      console.log('\n🔧 FIXING ORPHANED LINKS...');
      for (const orphan of issues.orphanedLinks) {
        await prisma.conditionPresetTemplate.delete({
          where: { id: orphan.linkId }
        });
        console.log(`   ✅ Removed orphaned link from ${orphan.presetName}`);
      }
    }

    if (issues.orphanedLinks.length === 0 && issues.templatesWithoutNames.length === 0) {
      console.log('\n🎉 No issues found! All templates are properly linked and named.');
    } else {
      console.log('\n✅ Diagnostic completed. Orphaned links have been cleaned up.');
      if (issues.templatesWithoutNames.length > 0) {
        console.log('⚠️  Templates without names require manual review.');
      }
    }

  } catch (error) {
    console.error('❌ Error running diagnostic:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 Database connection issue. Make sure:');
      console.log('   1. PostgreSQL is running');
      console.log('   2. Database credentials in .env.local are correct');
      console.log('   3. Database "pain_db" exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseTemplateIssues();