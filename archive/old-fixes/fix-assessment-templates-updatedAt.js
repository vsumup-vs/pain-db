const fs = require('fs');

// Read the current seed file
const seedFile = fs.readFileSync('seed-rtm-standard-final.js', 'utf8');

// Replace the assessment_templates.create call to include updatedAt
const fixedSeedFile = seedFile.replace(
  /version: template\.version \|\| 1\n        }/g,
  "version: template.version || 1,\n          updatedAt: new Date()\n        }"
);

// Write the fixed file
fs.writeFileSync('seed-rtm-standard-final.js', fixedSeedFile);

console.log('✅ Fixed missing updatedAt field in assessment_templates.create call');