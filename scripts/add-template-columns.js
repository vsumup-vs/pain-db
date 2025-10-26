const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTemplateColumns() {
  try {
    console.log('Adding template columns to saved_views table...\n');

    // Add is_template column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE saved_views
      ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✓ Added is_template column');

    // Add suggested_role column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE saved_views
      ADD COLUMN IF NOT EXISTS suggested_role TEXT
    `);
    console.log('✓ Added suggested_role column');

    // Try to create index, ignore if exists
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX saved_views_is_template_idx ON saved_views(is_template)
      `);
      console.log('✓ Created index on is_template');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ Index on is_template already exists');
      } else {
        console.log('⚠ Could not create index (may already exist):', error.message);
      }
    }

    console.log('\n✅ Template columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding template columns:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTemplateColumns();
