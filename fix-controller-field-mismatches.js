const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing controller field mismatches...\n');

// Fix 1: Patient Controller - Remove npi field from clinician select
console.log('1️⃣ Fixing Patient Controller...');
const patientControllerPath = path.join(__dirname, 'src', 'controllers', 'patientController.js');
let patientContent = fs.readFileSync(patientControllerPath, 'utf8');

// Remove npi field from clinician select
patientContent = patientContent.replace(/npi: true,?\s*/g, '');

fs.writeFileSync(patientControllerPath, patientContent);
console.log('   ✅ Removed npi field from patient controller');

// Fix 2: Assessment Template Controller - Remove items field and fix displayName
console.log('\n2️⃣ Fixing Assessment Template Controller...');
const assessmentControllerPath = path.join(__dirname, 'src', 'controllers', 'assessmentTemplateController.js');
let assessmentContent = fs.readFileSync(assessmentControllerPath, 'utf8');

// Remove items include block
assessmentContent = assessmentContent.replace(/items:\s*{[^}]*include:[^}]*}[^}]*},?\s*/g, '');

// Fix displayName to name
assessmentContent = assessmentContent.replace(/displayName: true/g, 'name: true');

// Remove invalid _count fields
assessmentContent = assessmentContent.replace(/_count:\s*{[^}]*select:[^}]*}[^}]*},?\s*/g, '');

fs.writeFileSync(assessmentControllerPath, assessmentContent);
console.log('   ✅ Fixed assessment template controller');

// Fix 3: Check if there are any other displayName references
console.log('\n3️⃣ Checking for other displayName references...');
const controllersDir = path.join(__dirname, 'src', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir);

controllerFiles.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('displayName')) {
      content = content.replace(/displayName: true/g, 'name: true');
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Fixed displayName in ${file}`);
    }
  }
});

console.log('\n🎉 Controller field mismatches fixed!');
