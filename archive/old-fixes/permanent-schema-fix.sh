#!/bin/bash

echo "🔧 Implementing Permanent Schema Field Mapping Fix..."
echo "===================================================="

# 1. Restore critical dependencies from archive
echo "📁 Restoring critical dependencies..."
if [ -f "archive/deprecated-setup/create-standardized-assessment-templates.js" ]; then
    cp archive/deprecated-setup/create-standardized-assessment-templates.js ./
    echo "   ✅ Restored create-standardized-assessment-templates.js"
else
    echo "   ❌ create-standardized-assessment-templates.js not found in archive"
fi

if [ -f "archive/old-seeds/seed-rtm-standard.js" ]; then
    cp archive/old-seeds/seed-rtm-standard.js ./
    echo "   ✅ Restored seed-rtm-standard.js"
else
    echo "   ❌ seed-rtm-standard.js not found in archive"
fi

# 2. Create Field Mapping Reference Documentation
echo "📚 Creating field mapping reference documentation..."
cat > FIELD_MAPPING_REFERENCE.md << 'EOF'
# Prisma Field Mapping Reference

This document outlines the field mappings between Prisma schema fields (camelCase) and database columns (snake_case).

## Important Rules

1. **Always use camelCase field names in JavaScript code** - these are the Prisma field names
2. **Never use snake_case field names in code** - these are database column names only
3. **Prisma automatically handles the mapping** between camelCase and snake_case

## Field Mappings

### AssessmentTemplate Model
- `isStandardized` (Prisma) → `is_standardized` (Database)
- `validationInfo` (Prisma) → `validation_info` (Database)
- `standardCoding` (Prisma) → `standard_coding` (Database)
- `scoringInfo` (Prisma) → `scoring_info` (Database)
- `copyrightInfo` (Prisma) → `copyright_info` (Database)
- `clinicalUse` (Prisma) → `clinical_use` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

### Drug Model
- `dosageForm` (Prisma) → `dosage_form` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

### Patient Model
- `firstName` (Prisma) → `first_name` (Database)
- `lastName` (Prisma) → `last_name` (Database)
- `dateOfBirth` (Prisma) → `date_of_birth` (Database)
- `phoneNumber` (Prisma) → `phone_number` (Database)
- `emergencyContact` (Prisma) → `emergency_contact` (Database)
- `emergencyPhone` (Prisma) → `emergency_phone` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

### Clinician Model
- `firstName` (Prisma) → `first_name` (Database)
- `lastName` (Prisma) → `last_name` (Database)
- `licenseNumber` (Prisma) → `license_number` (Database)
- `phoneNumber` (Prisma) → `phone_number` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

## Code Examples

### ✅ Correct Usage (camelCase)
```javascript
// Creating records
await prisma.assessmentTemplate.create({
  data: {
    name: "Pain Scale",
    isStandardized: true,  // ✅ Use camelCase
    validationInfo: "...", // ✅ Use camelCase
  }
});

// Querying records
const templates = await prisma.assessmentTemplate.findMany({
  where: {
    isStandardized: true  // ✅ Use camelCase
  }
});
```

### ❌ Incorrect Usage (snake_case)
```javascript
// DON'T DO THIS
await prisma.assessmentTemplate.create({
  data: {
    name: "Pain Scale",
    is_standardized: true,  // ❌ Don't use snake_case
    validation_info: "...", // ❌ Don't use snake_case
  }
});
```

## Validation

Run `npm run validate-fields` to check for incorrect field usage in your code.
EOF

echo "   ✅ Created FIELD_MAPPING_REFERENCE.md"

# 3. Fix all JavaScript files to use proper camelCase field names
echo "🔧 Fixing field names in JavaScript files..."

# Fix enhanced-rtm-comprehensive-setup.js
if [ -f "enhanced-rtm-comprehensive-setup.js" ]; then
    sed -i 's/is_standardized/isStandardized/g' enhanced-rtm-comprehensive-setup.js
    echo "   ✅ Fixed enhanced-rtm-comprehensive-setup.js"
fi

# Fix seed-medication-templates.js
if [ -f "seed-medication-templates.js" ]; then
    sed -i 's/is_standardized/isStandardized/g' seed-medication-templates.js
    echo "   ✅ Fixed seed-medication-templates.js"
fi

# Fix seed-preset-links.js
if [ -f "seed-preset-links.js" ]; then
    sed -i 's/is_standardized/isStandardized/g' seed-preset-links.js
    echo "   ✅ Fixed seed-preset-links.js"
fi

# Fix create-standardized-assessment-templates.js
if [ -f "create-standardized-assessment-templates.js" ]; then
    sed -i 's/is_standardized/isStandardized/g' create-standardized-assessment-templates.js
    echo "   ✅ Fixed create-standardized-assessment-templates.js"
fi

# Fix seed-rtm-standard.js
if [ -f "seed-rtm-standard.js" ]; then
    sed -i 's/is_standardized/isStandardized/g' seed-rtm-standard.js
    echo "   ✅ Fixed seed-rtm-standard.js"
fi

# Fix all other JavaScript files in the project
find . -name "*.js" -not -path "./node_modules/*" -not -path "./archive/*" -not -path "./generated/*" -exec sed -i 's/is_standardized/isStandardized/g' {} \;
echo "   ✅ Fixed all other JavaScript files"

# 4. Create field validation script
echo "🔍 Creating field validation script..."
cat > validate-field-usage.js << 'EOF'
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
EOF

chmod +x validate-field-usage.js
echo "   ✅ Created validate-field-usage.js"

# 5. Add validation script to package.json
echo "📦 Adding validation script to package.json..."
if [ -f "package.json" ]; then
    # Create a backup
    cp package.json package.json.backup
    
    # Add the validate-fields script
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts['validate-fields'] = 'node validate-field-usage.js';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    echo "   ✅ Added validate-fields script to package.json"
fi

# 6. Set up pre-commit hook (optional)
echo "🪝 Setting up pre-commit hook..."
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Validating field usage before commit..."
npm run validate-fields
if [ $? -ne 0 ]; then
    echo "❌ Commit blocked due to field usage issues."
    echo "💡 Fix the issues above or refer to FIELD_MAPPING_REFERENCE.md"
    exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
echo "   ✅ Created pre-commit hook"

# 7. Check if Prisma client path exists and fix if needed
echo "🔧 Checking Prisma client paths..."
if [ ! -d "./generated/prisma" ] && [ -d "./prisma/generated/client" ]; then
    echo "   🔗 Creating symlink for Prisma client..."
    mkdir -p generated
    ln -sf ../prisma/generated/client generated/prisma
    echo "   ✅ Prisma client path fixed"
elif [ ! -d "./generated/prisma" ] && [ -d "./node_modules/.prisma/client" ]; then
    echo "   🔗 Creating symlink for Prisma client..."
    mkdir -p generated
    ln -sf ../node_modules/.prisma/client generated/prisma
    echo "   ✅ Prisma client path fixed"
fi

# 8. Make deployment script executable
chmod +x enhanced-rtm-deployment.sh
echo "   ✅ Made deployment script executable"

# 9. Verify schema columns
echo "🔍 Verifying database schema..."
if grep -q "dosageForm" prisma/schema.prisma; then
    echo "   ✅ dosageForm column exists in schema"
else
    echo "   ❌ dosageForm column missing from schema"
fi

if grep -q "isStandardized" prisma/schema.prisma; then
    echo "   ✅ isStandardized column exists in schema"
else
    echo "   ❌ isStandardized column missing from schema"
fi

# 10. Regenerate Prisma client
echo "🔄 Regenerating Prisma client..."
npx prisma generate
echo "   ✅ Prisma client regenerated"

echo ""
echo "🎉 Permanent Schema Fix Complete!"
echo "================================="
echo ""
echo "📋 What was implemented:"
echo "   • Restored missing dependency files"
echo "   • Created comprehensive field mapping documentation"
echo "   • Fixed all JavaScript files to use proper camelCase field names"
echo "   • Created field validation script"
echo "   • Added validation to package.json scripts"
echo "   • Set up pre-commit hook for validation"
echo "   • Fixed Prisma client paths"
echo "   • Made deployment script executable"
echo "   • Regenerated Prisma client"
echo ""
echo "📚 Documentation created:"
echo "   • FIELD_MAPPING_REFERENCE.md - Complete field mapping guide"
echo ""
echo "🔧 New tools available:"
echo "   • npm run validate-fields - Check for field usage issues"
echo "   • Pre-commit hook - Automatically validates before commits"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npx prisma db push --force-reset"
echo "   2. Run: ./enhanced-rtm-deployment.sh"
echo "   3. Use: npm run validate-fields (anytime to check field usage)"
echo ""
echo "💡 This fix ensures:"
echo "   • Consistent camelCase field usage throughout the codebase"
echo "   • Automatic validation to prevent future issues"
echo "   • Clear documentation for all developers"
echo "   • Proper Prisma field mapping handling"