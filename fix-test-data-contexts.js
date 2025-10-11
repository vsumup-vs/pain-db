/**
 * Fix the test data script to use correct ObservationContext enum values
 */

const fs = require('fs');
const path = require('path');

async function fixTestDataContexts() {
    console.log('🔧 Fixing test data context values...');
    
    const testDataPath = path.join(__dirname, 'create-test-data-for-continuity.js');
    
    try {
        // Read the current test data script
        let content = fs.readFileSync(testDataPath, 'utf8');
        
        // Replace the invalid contexts with valid ones
        const oldContexts = "const contexts = ['WELLNESS', 'ACUTE_CARE', 'CHRONIC_MANAGEMENT', 'BASELINE'];";
        const newContexts = "const contexts = ['WELLNESS', 'CLINICAL_MONITORING', 'PROGRAM_ENROLLMENT', 'ROUTINE_FOLLOWUP'];";
        
        content = content.replace(oldContexts, newContexts);
        
        // Also fix the baseline check since BASELINE is no longer a valid context
        content = content.replace(
            "isBaseline: context === 'BASELINE',",
            "isBaseline: context === 'WELLNESS',"
        );
        
        // Write the corrected script
        fs.writeFileSync(testDataPath, content);
        
        console.log('✅ Test data contexts fixed!');
        console.log('   Updated contexts to: WELLNESS, CLINICAL_MONITORING, PROGRAM_ENROLLMENT, ROUTINE_FOLLOWUP');
        
    } catch (error) {
        console.error('❌ Error fixing test data contexts:', error.message);
        process.exit(1);
    }
}

fixTestDataContexts();