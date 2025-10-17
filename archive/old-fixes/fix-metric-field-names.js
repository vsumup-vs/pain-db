const fs = require('fs');
const path = require('path');

// Fix observation controller
const observationControllerPath = path.join(__dirname, 'src', 'controllers', 'observationController.js');
let content = fs.readFileSync(observationControllerPath, 'utf8');

// Replace displayName with name in metricDefinition selects
content = content.replace(/displayName: true/g, 'name: true');

fs.writeFileSync(observationControllerPath, content);
console.log('✅ Fixed field names in observationController.js');
