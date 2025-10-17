const { exec } = require('child_process');
const util = require('util');
const { PrismaClient } = require('@prisma/client');

const execAsync = util.promisify(exec);

async function pushSchemaAndGenerate() {
  console.log('🗄️  Pushing schema to database...\n');
  
  try {
    // Push schema to database
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    console.log('✅ Schema pushed successfully');
    if (stdout) console.log(stdout);
    if (stderr) console.log('Warnings:', stderr);
    
    // Generate Prisma client
    const { stdout: genStdout, stderr: genStderr } = await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated successfully');
    if (genStdout) console.log(genStdout);
    if (genStderr) console.log('Warnings:', genStderr);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function populateTemplateItems() {
  console.log('\n📋 Populating templates with metric items...\n');
  
  // Create a new Prisma client instance after generation
  const prisma = new PrismaClient();
  
  try {
    // Get all templates
    const templates = await prisma.assessmentTemplate.findMany();
    console.log(`Found ${templates.length} templates`);
    
    // Get all metric definitions
    const metrics = await prisma.metricDefinition.findMany();
    console.log(`Found ${metrics.length} metric definitions`);
    
    // Template-to-metric mappings based on categories
    const templateMetricMappings = {
      'Pain Management': [
        'pain_intensity_numeric',
        'pain_interference_brief'
      ],
      'Diabetes': [
        'glucose_fasting',
        'hba1c_percentage'
      ],
      'Endocrine': [
        'glucose_fasting',
        'hba1c_percentage'
      ],
      'Cardiovascular': [
        'blood_pressure_systolic',
        'blood_pressure_diastolic'
      ],
      'Mental Health': [
        'phq9_depression_score',
        'gad7_anxiety_score'
      ],
      'Musculoskeletal': [
        'pain_intensity_numeric'
      ]
    };
    
    let totalItemsCreated = 0;
    
    for (const template of templates) {
      console.log(`\n📋 Processing: ${template.name} (${template.category})`);
      
      // Check if template already has items
      const existingItems = await prisma.assessmentTemplateItem.findMany({
        where: { templateId: template.id }
      });
      
      if (existingItems.length > 0) {
        console.log(`   ⏭️  Already has ${existingItems.length} items, skipping`);
        continue;
      }
      
      // Get metrics for this template's category
      const categoryMetricKeys = templateMetricMappings[template.category] || [];
      
      if (categoryMetricKeys.length === 0) {
        console.log(`   ⚠️  No metric mapping found for category: ${template.category}`);
        continue;
      }
      
      // Find matching metrics
      const templateMetrics = metrics.filter(metric => 
        categoryMetricKeys.includes(metric.key)
      );
      
      if (templateMetrics.length === 0) {
        console.log(`   ⚠️  No matching metrics found for keys: ${categoryMetricKeys.join(', ')}`);
        continue;
      }
      
      // Create template items
      for (let i = 0; i < templateMetrics.length; i++) {
        const metric = templateMetrics[i];
        
        await prisma.assessmentTemplateItem.create({
          data: {
            templateId: template.id,
            metricDefinitionId: metric.id,
            displayOrder: i,
            isRequired: i === 0, // First metric is required
            helpText: `${metric.description || metric.name} measurement`
          }
        });
        
        console.log(`   ✅ Added: ${metric.name}`);
        totalItemsCreated++;
      }
    }
    
    console.log(`\n📊 Summary: Created ${totalItemsCreated} template items`);
    return totalItemsCreated;
    
  } catch (error) {
    console.error('❌ Error populating template items:', error);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

async function testResults() {
  console.log('\n🧪 Testing results...\n');
  
  // Create a new Prisma client instance
  const prisma = new PrismaClient();
  
  try {
    // Get templates with their items
    const templatesWithItems = await prisma.assessmentTemplate.findMany({
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                name: true,
                key: true,
                category: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    
    console.log('📋 Template Items Summary:');
    templatesWithItems.forEach(template => {
      console.log(`\n   ${template.name} (${template.category})`);
      console.log(`   📊 ${template.items.length} metrics:`);
      
      template.items.forEach((item, index) => {
        const required = item.isRequired ? ' (Required)' : '';
        console.log(`      ${index + 1}. ${item.metricDefinition.name}${required}`);
      });
    });
    
    // Summary stats
    const totalTemplates = templatesWithItems.length;
    const templatesWithMetrics = templatesWithItems.filter(t => t.items.length > 0).length;
    const totalItems = templatesWithItems.reduce((sum, t) => sum + t.items.length, 0);
    
    console.log(`\n📊 Final Summary:`);
    console.log(`   📋 Templates: ${totalTemplates} total, ${templatesWithMetrics} with metrics`);
    console.log(`   📊 Total metric items: ${totalItems}`);
    
    return {
      totalTemplates,
      templatesWithMetrics,
      totalItems
    };
    
  } catch (error) {
    console.error('❌ Error testing results:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Pushing Schema and Populating Template Items...\n');
  
  try {
    // Step 1: Push schema and generate client
    const pushSuccess = await pushSchemaAndGenerate();
    if (!pushSuccess) {
      console.log('❌ Schema push failed, stopping...');
      return;
    }
    
    // Step 2: Populate template items
    const itemsCreated = await populateTemplateItems();
    
    // Step 3: Test results
    const results = await testResults();
    
    if (results && results.templatesWithMetrics > 0) {
      console.log('\n🎉 Template items fix completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Restart your frontend development server');
      console.log('   2. Refresh your browser');
      console.log('   3. Templates should now show the correct number of metrics');
    } else {
      console.log('\n⚠️  Fix completed but no template items were created');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
main();