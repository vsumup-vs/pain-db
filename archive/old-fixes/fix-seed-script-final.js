const fs = require('fs');

// Fix the seed script for multiple issues
const seedFile = '/home/vsumup/pain-db/seed-rtm-standard.js';
let content = fs.readFileSync(seedFile, 'utf8');

// Fix 1: Prisma import path
const oldImport = "const { PrismaClient } = require('./generated/prisma');";
const newImport = "const { PrismaClient } = require('@prisma/client');";

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('✅ Fixed Prisma import in seed script');
  console.log('Changed from: ./generated/prisma');
  console.log('Changed to: @prisma/client');
} else {
  console.log('ℹ️ Import already correct or not found');
}

// Fix 2: ValueType enum mappings
// Map lowercase valueType values to uppercase enum values
const valueTypeMappings = {
  'numeric': 'NUMERIC',
  'categorical': 'TEXT',  // categorical data should be stored as TEXT
  'ordinal': 'TEXT',      // ordinal data should be stored as TEXT
  'text': 'TEXT',
  'boolean': 'BOOLEAN',
  'date': 'DATE',
  'time': 'TIME',
  'datetime': 'DATETIME',
  'json': 'JSON'
};

// Replace valueType values in the standardizedMetrics array
Object.keys(valueTypeMappings).forEach(oldValue => {
  const pattern = new RegExp(`valueType: '${oldValue}'`, 'g');
  if (content.match(pattern)) {
    content = content.replace(pattern, `valueType: '${valueTypeMappings[oldValue]}'`);
    console.log(`✅ Fixed valueType: '${oldValue}' → '${valueTypeMappings[oldValue]}'`);
  }
});

// Fix valueType usage in the create call
const createCallPattern = /valueType: metric\.valueType\.toUpperCase\(\)/g;
if (content.match(createCallPattern)) {
  content = content.replace(createCallPattern, 'valueType: metric.valueType');
  console.log('✅ Fixed valueType usage in create call');
}

// Fix 3: ConditionPresetDiagnosis field mappings
// The schema expects: icd10, snomed, label
// But the seed script uses: icd10Code, snomedCode, diagnosisLabel
const fieldMappings = [
  { old: 'icd10Code: diagnosis.icd10', new: 'icd10: diagnosis.icd10' },
  { old: 'snomedCode: diagnosis.snomed', new: 'snomed: diagnosis.snomed' },
  { old: 'diagnosisLabel: diagnosis.label', new: 'label: diagnosis.label' }
];

fieldMappings.forEach(mapping => {
  if (content.includes(mapping.old)) {
    content = content.replace(new RegExp(mapping.old, 'g'), mapping.new);
    console.log(`✅ Fixed field mapping: ${mapping.old} → ${mapping.new}`);
  }
});

// Fix 4: AssessmentTemplate missing questions field
// The schema requires a 'questions' field of type Json, but the seed script doesn't provide it
const assessmentTemplateCreatePattern = /const created = await prisma\.assessmentTemplate\.create\(\{\s*data: \{\s*name: template\.name,\s*description: template\.description,\s*version: template\.version\s*\}\s*\}\);/g;

const newAssessmentTemplateCreate = `const created = await prisma.assessmentTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          questions: template.items || []
        }
      });`;

if (content.match(assessmentTemplateCreatePattern)) {
  content = content.replace(assessmentTemplateCreatePattern, newAssessmentTemplateCreate);
  console.log('✅ Fixed AssessmentTemplate creation to include required questions field');
} else {
  console.log('ℹ️ AssessmentTemplate creation pattern not found or already fixed');
}

// Fix 5: ConditionPresetTemplate field mappings
// The schema expects: conditionPresetId, templateId
// But the seed script uses: presetId, templateId
const presetTemplateFieldMapping = 'presetId: preset.id';
const newPresetTemplateFieldMapping = 'conditionPresetId: preset.id';

if (content.includes(presetTemplateFieldMapping)) {
  content = content.replace(new RegExp(presetTemplateFieldMapping, 'g'), newPresetTemplateFieldMapping);
  console.log('✅ Fixed ConditionPresetTemplate field mapping: presetId → conditionPresetId');
} else {
  console.log('ℹ️ ConditionPresetTemplate field mapping already correct or not found');
}

// Write the corrected content back
fs.writeFileSync(seedFile, content);

console.log('✅ Seed script has been corrected for all known issues:');
console.log('   - Prisma import path');
console.log('   - ValueType enum mappings');
console.log('   - ConditionPresetDiagnosis field mappings');
console.log('   - AssessmentTemplate questions field');
console.log('   - ConditionPresetTemplate field mappings');
console.log('🔄 Now you can run the seed script successfully');