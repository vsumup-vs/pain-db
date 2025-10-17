/**
 * Fix Prisma field mapping to match database column names
 * The database uses snake_case but Prisma schema uses camelCase
 */

const fs = require('fs');
const path = require('path');

async function fixPrismaFieldMapping() {
    console.log('🔧 Fixing Prisma field mapping to match database columns...');
    
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    
    try {
        // Read the current schema
        let schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Fix the field mappings for the Observation model
        const fieldMappings = [
            { from: 'enrollmentId          String?', to: 'enrollmentId          String?             @map("enrollment_id")' },
            { from: 'billingRelevant       Boolean             @default(false)', to: 'billingRelevant       Boolean             @default(false) @map("billing_relevant")' },
            { from: 'providerReviewed      Boolean             @default(false)', to: 'providerReviewed      Boolean             @default(false) @map("provider_reviewed")' },
            { from: 'reviewedAt            DateTime?', to: 'reviewedAt            DateTime?           @map("reviewed_at")' },
            { from: 'reviewedBy            String?', to: 'reviewedBy            String?             @map("reviewed_by")' },
            { from: 'continuitySourceId   String?', to: 'continuitySourceId    String?             @map("continuity_source_id")' },
            { from: 'isBaseline            Boolean             @default(false)', to: 'isBaseline            Boolean             @default(false) @map("is_baseline")' },
            { from: 'validityPeriodHours   Int                 @default(168)', to: 'validityPeriodHours   Int                 @default(168) @map("validity_period_hours")' }
        ];
        
        // Apply each mapping
        fieldMappings.forEach(mapping => {
            schemaContent = schemaContent.replace(mapping.from, mapping.to);
        });
        
        // Write the corrected schema
        fs.writeFileSync(schemaPath, schemaContent);
        
        console.log('✅ Prisma field mapping fixed!');
        console.log('   Added @map directives for:');
        console.log('   • enrollmentId → enrollment_id');
        console.log('   • billingRelevant → billing_relevant');
        console.log('   • providerReviewed → provider_reviewed');
        console.log('   • reviewedAt → reviewed_at');
        console.log('   • reviewedBy → reviewed_by');
        console.log('   • continuitySourceId → continuity_source_id');
        console.log('   • isBaseline → is_baseline');
        console.log('   • validityPeriodHours → validity_period_hours');
        
    } catch (error) {
        console.error('❌ Error fixing field mapping:', error.message);
        process.exit(1);
    }
}

fixPrismaFieldMapping();