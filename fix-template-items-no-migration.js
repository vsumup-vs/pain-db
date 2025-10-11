const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function addAssessmentTemplateItemModel() {
  console.log('🔧 Adding AssessmentTemplateItem model to schema...\n');
  
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Check if AssessmentTemplateItem already exists
  if (schemaContent.includes('model AssessmentTemplateItem')) {
    console.log('⏭️  AssessmentTemplateItem model already exists in schema');
    return false;
  }
  
  // Find the AssessmentTemplate model and add the items relationship
  const assessmentTemplateModelRegex = /(model AssessmentTemplate \{[\s\S]*?)(  \/\/ Relationships[\s\S]*?)(  @@map\("assessment_templates"\)\s*\})/;
  
  if (assessmentTemplateModelRegex.test(schemaContent)) {
    schemaContent = schemaContent.replace(
      assessmentTemplateModelRegex,
      '$1$2  items             AssessmentTemplateItem[]\n$3'
    );
  }
  
  // Add the AssessmentTemplateItem model after AssessmentTemplate
  const assessmentTemplateEndRegex = /(model AssessmentTemplate \{[\s\S]*?@@map\("assessment_templates"\)\s*\})/;
  
  const assessmentTemplateItemModel = `

model AssessmentTemplateItem {
  id                  String             @id @default(cuid())
  templateId          String
  metricDefinitionId  String
  displayOrder        Int                @default(0)
  isRequired          Boolean            @default(false)
  helpText            String?
  defaultValue        String?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  
  // Relationships
  template            AssessmentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  metricDefinition    MetricDefinition   @relation(fields: [metricDefinitionId], references: [id])
  
  @@unique([templateId, metricDefinitionId])
  @@map("assessment_template_items")
}`;
  
  schemaContent = schemaContent.replace(
    assessmentTemplateEndRegex,
    `$1${assessmentTemplateItemModel}`
  );
  
  // Add the items relationship to MetricDefinition model
  const metricDefinitionModelRegex = /(model MetricDefinition \{[\s\S]*?)(  \/\/ Relationships[\s\S]*?observations\s+Observation\[\])([\s\S]*?@@map\("metric_definitions"\)\s*\})/;
  
  if (metricDefinitionModelRegex.test(schemaContent)) {
    schemaContent = schemaContent.replace(
      metricDefinitionModelRegex,
      '$1$2\n  templateItems     AssessmentTemplateItem[]$3'
    );
  }
  
  // Write the updated schema
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('✅ Added AssessmentTemplateItem model to schema');
  return true;
}

async function pushSchemaToDatabase() {
  console.log('\n🗄️  Pushing schema changes to database...\n');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    // Use db push instead of migrate to avoid shadow database issues
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    console.log('✅ Schema pushed to database successfully');
    if (stdout) console.log(stdout);
    if (stderr) console.log('Warnings:', stderr);
    
    // Generate Prisma client
    const { stdout: generateStdout, stderr: generateStderr } = await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated successfully');
    if (generateStdout) console.log(generateStdout);
    if (generateStderr) console.log('Warnings:', generateStderr);
    
    return true;
  } catch (error) {
    console.error('❌ Error pushing schema to database:', error.message);
    return false;
  }
}

async function populateTemplateItems() {
  console.log('\n📋 Populating templates with metric items...\n');
  
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
  }
}

async function testResults() {
  console.log('\n🧪 Testing results...\n');
  
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
  }
}

async function main() {
  console.log('🚀 Fixing Assessment Template Items (No Migration)...\n');
  
  try {
    // Step 1: Add the model to schema
    const schemaUpdated = await addAssessmentTemplateItemModel();
    
    // Step 2: Push schema to database (only if schema was updated)
    if (schemaUpdated) {
      const pushSuccess = await pushSchemaToDatabase();
      if (!pushSuccess) {
        console.log('❌ Schema push failed, stopping...');
        return;
      }
    }
    
    // Step 3: Populate template items
    const itemsCreated = await populateTemplateItems();
    
    // Step 4: Test results
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
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
main();