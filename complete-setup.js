const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentState() {
  console.log('🔍 Checking current database state...\n');
  
  try {
    // Check assessment templates
    const templateCount = await prisma.assessmentTemplate.count();
    console.log(`📋 Assessment Templates: ${templateCount}`);
    
    // Check metric definitions
    const metricCount = await prisma.metricDefinition.count();
    const standardizedMetricCount = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });
    console.log(`📊 Metric Definitions: ${metricCount} (${standardizedMetricCount} standardized)`);
    
    return { templateCount, metricCount, standardizedMetricCount };
  } catch (error) {
    console.error('❌ Error checking current state:', error);
    return { templateCount: 0, metricCount: 0, standardizedMetricCount: 0 };
  }
}

async function addStandardizedMetrics() {
  console.log('\n📊 Adding standardized metrics with LOINC/SNOMED coding...\n');
  
  const standardizedMetrics = [
    // Pain Management Metrics
    {
      key: 'pain_intensity_numeric',
      name: 'Pain Intensity (Numeric Rating Scale)',
      description: 'Numeric rating scale for pain intensity (0-10)',
      unit: 'score',
      valueType: 'NUMERIC',
      normalRange: { min: 0, max: 10 },
      isStandardized: true,
      category: 'Pain Management',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '72133-2',
          display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '225908003',
            display: 'Pain score'
          }
        ],
        mappings: {
          icd10: 'R52',
          description: 'Pain, unspecified'
        }
      },
      validationInfo: {
        clinicalGuidelines: 'WHO Pain Assessment Guidelines',
        validationStudies: ['Numeric Rating Scale validation studies'],
        reliability: 'High inter-rater reliability (r > 0.9)'
      }
    },
    {
      key: 'pain_interference_brief',
      name: 'Pain Interference (Brief Pain Inventory)',
      description: 'Brief Pain Inventory interference scale',
      unit: 'score',
      valueType: 'NUMERIC',
      normalRange: { min: 0, max: 10 },
      isStandardized: true,
      category: 'Pain Management',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '75261-7',
          display: 'Pain interference with general activity in past 24 hours [Score] BPI'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '225624000',
            display: 'Pain interference with activity'
          }
        ]
      }
    },
    // Diabetes Metrics
    {
      key: 'glucose_fasting',
      name: 'Fasting Blood Glucose',
      description: 'Fasting plasma glucose level',
      unit: 'mg/dL',
      valueType: 'NUMERIC',
      normalRange: { min: 70, max: 100 },
      isStandardized: true,
      category: 'Diabetes',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '1558-6',
          display: 'Fasting glucose [Mass/volume] in Serum or Plasma'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '33747003',
            display: 'Glucose measurement'
          }
        ],
        mappings: {
          icd10: 'E11.9',
          description: 'Type 2 diabetes mellitus without complications'
        }
      }
    },
    {
      key: 'hba1c_percentage',
      name: 'Hemoglobin A1c',
      description: 'Glycated hemoglobin percentage',
      unit: '%',
      valueType: 'NUMERIC',
      normalRange: { min: 4.0, max: 5.6 },
      isStandardized: true,
      category: 'Diabetes',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '4548-4',
          display: 'Hemoglobin A1c/Hemoglobin.total in Blood'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '43396009',
            display: 'Hemoglobin A1c measurement'
          }
        ]
      }
    },
    // Cardiovascular Metrics
    {
      key: 'blood_pressure_systolic',
      name: 'Systolic Blood Pressure',
      description: 'Systolic blood pressure measurement',
      unit: 'mmHg',
      valueType: 'NUMERIC',
      normalRange: { min: 90, max: 120 },
      isStandardized: true,
      category: 'Cardiovascular',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '8480-6',
          display: 'Systolic blood pressure'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '271649006',
            display: 'Systolic blood pressure'
          }
        ]
      }
    },
    {
      key: 'blood_pressure_diastolic',
      name: 'Diastolic Blood Pressure',
      description: 'Diastolic blood pressure measurement',
      unit: 'mmHg',
      valueType: 'NUMERIC',
      normalRange: { min: 60, max: 80 },
      isStandardized: true,
      category: 'Cardiovascular',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '8462-4',
          display: 'Diastolic blood pressure'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '271650006',
            display: 'Diastolic blood pressure'
          }
        ]
      }
    },
    // Mental Health Metrics
    {
      key: 'phq9_depression_score',
      name: 'PHQ-9 Depression Score',
      description: 'Patient Health Questionnaire-9 depression screening',
      unit: 'score',
      valueType: 'NUMERIC',
      normalRange: { min: 0, max: 27 },
      isStandardized: true,
      category: 'Mental Health',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '44249-1',
          display: 'PHQ-9 quick depression assessment panel'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '715252007',
            display: 'Depression screening using Patient Health Questionnaire Nine Item score'
          }
        ]
      }
    },
    {
      key: 'gad7_anxiety_score',
      name: 'GAD-7 Anxiety Score',
      description: 'Generalized Anxiety Disorder 7-item scale',
      unit: 'score',
      valueType: 'NUMERIC',
      normalRange: { min: 0, max: 21 },
      isStandardized: true,
      category: 'Mental Health',
      standardCoding: {
        primary: {
          system: 'http://loinc.org',
          code: '70274-6',
          display: 'Generalized anxiety disorder 7 item (GAD-7) total score'
        },
        secondary: [
          {
            system: 'http://snomed.info/sct',
            code: '717440006',
            display: 'Generalized anxiety disorder 7 item score'
          }
        ]
      }
    }
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const metric of standardizedMetrics) {
    try {
      // Check if metric already exists
      const existing = await prisma.metricDefinition.findUnique({
        where: { key: metric.key }
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${metric.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create the metric
      await prisma.metricDefinition.create({
        data: metric
      });

      console.log(`✅ Added: ${metric.name}`);
      addedCount++;
    } catch (error) {
      console.error(`❌ Error adding ${metric.name}:`, error.message);
    }
  }

  console.log(`\n📊 Standardized Metrics Summary:`);
  console.log(`   ✅ Added: ${addedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  
  return addedCount;
}

async function runRTMStandardSeed() {
  console.log('\n🌱 Running RTM Standard seed for assessment templates...\n');
  
  try {
    // Import and run the seed script
    const seedScript = require('./seed-rtm-standard.js');
    
    // If the seed script exports a function, call it
    if (typeof seedScript === 'function') {
      await seedScript();
    }
    
    console.log('✅ RTM Standard seed completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error running RTM Standard seed:', error);
    return false;
  }
}

async function addCategoriesToTemplates() {
  console.log('\n🏷️  Adding categories to assessment templates...\n');
  
  // Category mapping based on template names/content
  const categoryPatterns = [
    { pattern: /pain|neuropathic|chronic pain|brief pain inventory|bpi/i, category: 'Pain Management' },
    { pattern: /diabetes|glucose|hba1c|diabetic/i, category: 'Diabetes' },
    { pattern: /cardiovascular|heart|blood pressure|cardiac/i, category: 'Cardiovascular' },
    { pattern: /fibromyalgia|fatigue|sleep|cognitive/i, category: 'Fibromyalgia' },
    { pattern: /arthritis|joint|stiffness|rheumatoid/i, category: 'Arthritis' },
    { pattern: /depression|anxiety|phq|gad|mental health|mood/i, category: 'Mental Health' },
    { pattern: /medication|drug|prescription|adherence/i, category: 'Medication' },
    { pattern: /quality of life|qol|functional|disability/i, category: 'Quality of Life' }
  ];

  try {
    // Get templates without categories
    const templatesWithoutCategories = await prisma.assessmentTemplate.findMany({
      where: {
        OR: [
          { category: null },
          { category: '' }
        ]
      }
    });

    console.log(`📋 Found ${templatesWithoutCategories.length} templates without categories`);

    let updatedCount = 0;

    for (const template of templatesWithoutCategories) {
      let assignedCategory = 'General'; // Default category

      // Check template name and description against patterns
      const searchText = `${template.name} ${template.description || ''}`.toLowerCase();
      
      for (const { pattern, category } of categoryPatterns) {
        if (pattern.test(searchText)) {
          assignedCategory = category;
          break;
        }
      }

      // Update the template with the assigned category
      await prisma.assessmentTemplate.update({
        where: { id: template.id },
        data: { category: assignedCategory }
      });

      console.log(`✅ ${template.name} → ${assignedCategory}`);
      updatedCount++;
    }

    console.log(`\n🏷️  Categories Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} templates`);
    
    return updatedCount;
  } catch (error) {
    console.error('❌ Error adding categories:', error);
    return 0;
  }
}

async function testFinalResults() {
  console.log('\n🧪 Testing final results...\n');
  
  try {
    // Count assessment templates
    const templateCount = await prisma.assessmentTemplate.count();
    const templatesWithCategories = await prisma.assessmentTemplate.count({
      where: {
        AND: [
          { category: { not: null } },
          { category: { not: '' } }
        ]
      }
    });

    console.log(`📋 Assessment Templates: ${templateCount} total, ${templatesWithCategories} with categories`);

    // Count metric definitions
    const metricCount = await prisma.metricDefinition.count();
    const standardizedMetricCount = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });

    console.log(`📊 Metric Definitions: ${metricCount} total, ${standardizedMetricCount} standardized`);

    // Show category distribution for templates
    const categoryStats = await prisma.assessmentTemplate.groupBy({
      by: ['category'],
      _count: { category: true },
      where: {
        category: { not: null }
      }
    });

    console.log('\n📊 Template Category Distribution:');
    categoryStats.forEach(stat => {
      console.log(`   ${stat.category}: ${stat._count.category} templates`);
    });

    // Show metric category distribution
    const metricCategoryStats = await prisma.metricDefinition.groupBy({
      by: ['category'],
      _count: { category: true },
      where: {
        category: { not: null }
      }
    });

    console.log('\n📊 Metric Category Distribution:');
    metricCategoryStats.forEach(stat => {
      console.log(`   ${stat.category}: ${stat._count.category} metrics`);
    });

    // Simulate frontend API response for categories
    console.log('\n🔄 Simulating frontend API response...');
    
    const categoriesResponse = {
      success: true,
      data: categoryStats.map(stat => ({
        name: stat.category,
        count: stat._count.category
      }))
    };

    // Extract category names (what frontend expects)
    const categories = categoriesResponse?.data?.map(cat => cat.name) || [];
    
    console.log('📤 API Response format:', JSON.stringify(categoriesResponse, null, 2));
    console.log('📥 Frontend categories array:', categories);

    return {
      templateCount,
      templatesWithCategories,
      metricCount,
      standardizedMetricCount,
      categories
    };
  } catch (error) {
    console.error('❌ Error testing results:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting complete setup process...\n');
  
  try {
    // Step 1: Check current state
    const currentState = await checkCurrentState();
    
    // Step 2: Add standardized metrics if needed
    if (currentState.standardizedMetricCount === 0) {
      await addStandardizedMetrics();
    } else {
      console.log('\n⏭️  Skipping standardized metrics (already exist)');
    }
    
    // Step 3: Run RTM standard seed if no templates exist
    if (currentState.templateCount === 0) {
      await runRTMStandardSeed();
    } else {
      console.log('\n⏭️  Skipping RTM seed (templates already exist)');
    }
    
    // Step 4: Add categories to templates
    await addCategoriesToTemplates();
    
    // Step 5: Test final results
    const results = await testFinalResults();
    
    if (results) {
      console.log('\n🎉 Setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Restart your frontend development server');
      console.log('   2. Refresh your browser');
      console.log('   3. Check the categories dropdown in assessment templates');
      console.log('   4. Verify that standardized metrics are available');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
main();