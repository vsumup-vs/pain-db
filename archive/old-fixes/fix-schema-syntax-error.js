/**
 * Quick fix for Prisma schema syntax error
 * Fixes the space in continuitySourceId field name
 */

const fs = require('fs');
const path = require('path');

async function fixSchemaSyntaxError() {
    console.log('🔧 Fixing Prisma schema syntax error...');
    
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    
    try {
        // Read the current schema
        let schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Fix the syntax error: remove space in continuitySourceId
        schemaContent = schemaContent.replace(
            'continuitySou rceId',
            'continuitySourceId'
        );
        
        // Write the corrected schema
        fs.writeFileSync(schemaPath, schemaContent);
        
        console.log('✅ Schema syntax error fixed!');
        console.log('   Fixed: continuitySou rceId → continuitySourceId');
        
    } catch (error) {
        console.error('❌ Error fixing schema:', error.message);
        process.exit(1);
    }
}

fixSchemaSyntaxError();