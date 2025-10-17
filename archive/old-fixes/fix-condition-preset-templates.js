const fs = require('fs');

// Read the current file
const filePath = 'seed-rtm-standard-final.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace isDefault with isRequired in the condition_preset_templates.create call
content = content.replace(
  'isDefault: true,',
  'isRequired: true,'
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('✅ Fixed condition_preset_templates field: isDefault → isRequired');
