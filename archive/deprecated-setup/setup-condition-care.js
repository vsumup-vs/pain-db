const { seedFibromyalgiaMetrics } = require('./seed-fibromyalgia-metrics');
const { seedArthritisMetrics } = require('./seed-arthritis-metrics');
const { createConditionAssessmentTemplates } = require('./seed-condition-templates');

async function setupConditionCare() {
  console.log('🚀 Setting up Fibromyalgia Care and Arthritis Management...\n');
  
  try {
    // Step 1: Seed condition presets (already done manually)
    console.log('📋 Step 1: Condition presets should already be seeded');
    console.log('   Run: node seed-condition-presets.js (if not done yet)\n');
    
    // Step 2: Seed fibromyalgia metrics
    console.log('📊 Step 2: Seeding fibromyalgia metrics...');
    await seedFibromyalgiaMetrics();
    console.log('');
    
    // Step 3: Seed arthritis metrics
    console.log('📊 Step 3: Seeding arthritis metrics...');
    await seedArthritisMetrics();
    console.log('');
    
    // Step 4: Create assessment templates
    console.log('🏥 Step 4: Creating assessment templates...');
    await createConditionAssessmentTemplates();
    console.log('');
    
    console.log('🎉 SETUP COMPLETE! 🎉');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Fibromyalgia Care metrics and assessment template');
    console.log('✅ Arthritis Management metrics and assessment template');
    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Restart your application to load new metrics');
    console.log('2. Test bulk enrollment with "Fibromyalgia Care" and "Arthritis Management"');
    console.log('3. Verify assessment templates appear in the UI');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupConditionCare();
}

module.exports = { setupConditionCare };