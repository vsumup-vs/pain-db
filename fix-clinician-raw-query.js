const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing clinician controller raw query...\n');

const clinicianControllerPath = path.join(__dirname, 'src', 'controllers', 'clinicianController.js');
let content = fs.readFileSync(clinicianControllerPath, 'utf8');

// Fix the raw query column name
content = content.replace(/e\."clinician_id"/g, 'e."clinicianId"');

fs.writeFileSync(clinicianControllerPath, content);
console.log('✅ Fixed clinician raw query column name');
