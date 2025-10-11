const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Prisma import paths in controller files...');

// Define the controllers directory
const controllersDir = '/home/vsumup/pain-db/src/controllers';

// Define the incorrect and correct import patterns
const incorrectImport = "const { PrismaClient } = require('../../generated/prisma');";
const correctImport = "const { PrismaClient } = require('@prisma/client');";

// Get all JavaScript files in the controllers directory
const controllerFiles = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(controllersDir, file));

let fixedFiles = 0;
let totalFiles = 0;

controllerFiles.forEach(filePath => {
  totalFiles++;
  const fileName = path.basename(filePath);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(incorrectImport)) {
      content = content.replace(incorrectImport, correctImport);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed import in: ${fileName}`);
      fixedFiles++;
    } else if (content.includes(correctImport)) {
      console.log(`ℹ️ Already correct: ${fileName}`);
    } else {
      console.log(`⚠️ No Prisma import found: ${fileName}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
  }
});

console.log('\n📊 Summary:');
console.log(`   Total files processed: ${totalFiles}`);
console.log(`   Files fixed: ${fixedFiles}`);
console.log(`   Import changed from: ../../generated/prisma`);
console.log(`   Import changed to: @prisma/client`);

if (fixedFiles > 0) {
  console.log('\n🚀 Controller imports have been fixed!');
  console.log('   You can now restart the server to resolve the 500 errors.');
} else {
  console.log('\n✅ All controller imports were already correct.');
}