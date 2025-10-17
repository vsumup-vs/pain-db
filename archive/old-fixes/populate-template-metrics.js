const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateTemplateMetrics() {
  console.log('🔗 Populating Assessment Template Metrics...\n');

  try {
    // Step 1: Check what we have to work with
    const templates = await prisma.assessmentTemplate.findMany();
    const allMetrics = await prisma.metricDefinition.findMany();
    
    console.log(`📋 Found ${templates.length} templates`);
    console.log(`📊 Found ${allMetrics.length} metrics`);

    if (allMetrics.length === 0) {
      console.log('\n❌ No metrics found in database!');
      console.log('🔧 Creating basic metrics first...');
      await ensureBasicMetrics();
      
      // Refresh metrics list
      const newMetrics = await prisma.metricDefinition.findMany();
      console.log(`📊 Created ${newMetrics.length} basic metrics`);
      allMetrics.push(...newMetrics);
    }

    if (templates.length === 0) {
      console.log('\n❌ No templates found in database!');
      console.log('   Please run the template restoration script first.');
      return;
    }

    // Step 2: Group existing metrics by category for smart matching
    const metricsByCategory = {};
    allMetrics.forEach(metric => {
      const category = metric.category || 'General';
      if (!metricsByCategory[category]) {
        metricsByCategory[category] = [];
      }
      metricsByCategory[category].push(metric);
    });

    console.log('\n📊 Available metrics by category:');
    Object.keys(metricsByCategory).forEach(category => {
      console.log(`   ${category}: ${metricsByCategory[category].length} metrics`);
    });

    // Step 3: Smart association - use existing metrics that match template categories
    console.log('\n🔗 Creating smart template-metric associations...');

    let totalAssociations = 0;

    for (const template of templates) {
      console.log(`\n📋 Processing: ${template.name}`);
      console.log(`   Category: ${template.category || 'No category'}`);
      
      // Find metrics for this template
      let candidateMetrics = [];
      
      // First, try exact category match
      if (template.category && metricsByCategory[template.category]) {
        candidateMetrics = metricsByCategory[template.category];
        console.log(`   🎯 Found ${candidateMetrics.length} metrics in matching category`);
      }
      
      // If no exact match, try related categories
      if (candidateMetrics.length === 0) {
        const relatedCategories = getRelatedCategories(template.category);
        for (const relatedCategory of relatedCategories) {
          if (metricsByCategory[relatedCategory]) {
            candidateMetrics.push(...metricsByCategory[relatedCategory]);
          }
        }
        console.log(`   🔍 Found ${candidateMetrics.length} metrics in related categories`);
      }
      
      // If still no matches, use any available metrics (up to 3)
      if (candidateMetrics.length === 0) {
        candidateMetrics = allMetrics.slice(0, 3);
        console.log(`   🎲 Using ${candidateMetrics.length} general metrics as fallback`);
      }

      // Limit to 5 metrics per template to avoid overwhelming
      candidateMetrics = candidateMetrics.slice(0, 5);

      // Create associations
      let templateAssociations = 0;
      for (let i = 0; i < candidateMetrics.length; i++) {
        const metric = candidateMetrics[i];
        
        try {
          // Check if association already exists
          const existingItem = await prisma.assessmentTemplateItem.findUnique({
            where: {
              templateId_metricDefinitionId: {
                templateId: template.id,
                metricDefinitionId: metric.id
              }
            }
          });

          if (!existingItem) {
            await prisma.assessmentTemplateItem.create({
              data: {
                templateId: template.id,
                metricDefinitionId: metric.id,
                displayOrder: i + 1,
                isRequired: i < 2, // First 2 metrics are required
                helpText: `Please provide your ${metric.name.toLowerCase()}`
              }
            });
            
            templateAssociations++;
            totalAssociations++;
            console.log(`     ✅ Associated: ${metric.name}`);
          } else {
            console.log(`     ⏭️  Already exists: ${metric.name}`);
          }
        } catch (error) {
          console.log(`     ❌ Failed to associate ${metric.name}: ${error.message}`);
        }
      }
      
      console.log(`   📊 Template associations: ${templateAssociations}`);
    }

    console.log(`\n✅ Successfully created ${totalAssociations} new template-metric associations`);

    // Step 4: Verify results
    console.log('\n📊 Final verification:');
    for (const template of templates) {
      const itemCount = await prisma.assessmentTemplateItem.count({
        where: { templateId: template.id }
      });
      console.log(`   ${template.name}: ${itemCount} metrics`);
    }

  } catch (error) {
    console.error('❌ Error populating template metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getRelatedCategories(category) {
  const categoryMappings = {
    'Pain Management': ['General Health', 'Functional Assessment'],
    'Mental Health': ['General Health', 'Pain Management'],
    'Cardiovascular': ['General Health', 'Functional Assessment'],
    'General Health': ['Pain Management', 'Mental Health'],
    'Functional Assessment': ['Pain Management', 'General Health']
  };
  
  return categoryMappings[category] || ['General Health'];
}

async function ensureBasicMetrics() {
  console.log('\n🔧 Creating basic metrics...');
  
  const basicMetrics = [
    {
      key: 'pain_intensity_numeric',
      name: 'Pain Intensity (0-10)',
      description: 'Numeric pain intensity rating scale',
      valueType: 'NUMERIC',
      category: 'Pain Management',
      isStandardized: false,
      validationInfo: { min: 0, max: 10 },
      unit: 'scale'
    },
    {
      key: 'mood_rating',
      name: 'Mood Rating',
      description: 'Overall mood assessment',
      valueType: 'NUMERIC',
      category: 'Mental Health',
      isStandardized: false,
      validationInfo: { min: 1, max: 5 },
      unit: 'scale'
    },
    {
      key: 'energy_level',
      name: 'Energy Level',
      description: 'Daily energy level assessment',
      valueType: 'NUMERIC',
      category: 'General Health',
      isStandardized: false,
      validationInfo: { min: 0, max: 10 },
      unit: 'scale'
    },
    {
      key: 'functional_status',
      name: 'Functional Status',
      description: 'Overall functional capacity',
      valueType: 'NUMERIC',
      category: 'Functional Assessment',
      isStandardized: false,
      validationInfo: { min: 0, max: 10 },
      unit: 'scale'
    },
    {
      key: 'overall_wellness',
      name: 'Overall Wellness',
      description: 'General wellness assessment',
      valueType: 'NUMERIC',
      category: 'General Health',
      isStandardized: false,
      validationInfo: { min: 0, max: 10 },
      unit: 'scale'
    }
  ];

  for (const metric of basicMetrics) {
    try {
      await prisma.metricDefinition.upsert({
        where: { key: metric.key },
        update: metric,
        create: metric
      });
      console.log(`   ✅ Created: ${metric.name}`);
    } catch (error) {
      console.log(`   ❌ Failed to create ${metric.name}: ${error.message}`);
    }
  }
}

// Run the population
populateTemplateMetrics();