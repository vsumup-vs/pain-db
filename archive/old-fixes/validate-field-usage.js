#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the field mappings that should be checked
const FIELD_MAPPINGS = {
  'is_standardized': 'isStandardized',
  'validation_info': 'validationInfo',
  'standard_coding': 'standardCoding',
  'scoring_info': 'scoringInfo',
  'copyright_info': 'copyrightInfo',
  'clinical_use': 'clinicalUse',
  'dosage_form': 'dosageForm',
  'first_name': 'firstName',
  'last_name': 'lastName',
  'date_of_birth': 'dateOfBirth',
  'phone_number': 'phoneNumber',
  'emergency_contact': 'emergencyContact',
  'emergency_phone': 'emergencyPhone',
  'license_number': 'licenseNumber',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt'
};

function findJavaScriptFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', 'archive', 'generated', '.git'].includes(item)) {
      findJavaScriptFiles(fullPath, files);
    } else if (stat.isFile() && item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    // Skip comments and strings
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    for (const [snakeCase, camelCase] of Object.entries(FIELD_MAPPINGS)) {
      // Look for snake_case usage in Prisma operations
      const prismaRegex = new RegExp(`(prisma\\.[a-zA-Z]+\\.[a-zA-Z]+.*${snakeCase})|(${snakeCase}\\s*:)`, 'g');
      if (prismaRegex.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          issue: `Use '${camelCase}' instead of '${snakeCase}'`
        });
      }
    }
  });
  
  return issues;
}

function main() {
  console.log('🔍 Validating field usage in JavaScript files...\n');
  
  const jsFiles = findJavaScriptFiles('.');
  let totalIssues = 0;
  
  for (const file of jsFiles) {
    const issues = validateFile(file);
    if (issues.length > 0) {
      console.log(`❌ ${file}:`);
      issues.forEach(issue => {
        console.log(`   Line ${issue.line}: ${issue.issue}`);
        console.log(`   Content: ${issue.content}`);
      });
      console.log('');
      totalIssues += issues.length;
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ All field usage is correct!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalIssues} field usage issues.`);
    console.log('\n💡 Refer to FIELD_MAPPING_REFERENCE.md for correct usage.');
    process.exit(1);
  }
}

main();
