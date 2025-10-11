const fs = require('fs');

// Read the current seed file
const seedFile = fs.readFileSync('seed-rtm-standard-final.js', 'utf8');

// Replace the condition_presets.create call to include updatedAt
const fixedSeedFile = seedFile.replace(
  /category: 'chronic_care'/g,
  "category: 'chronic_care',\n          updatedAt: new Date()"
);

// Write the fixed file
fs.writeFileSync('seed-rtm-standard-final.js', fixedSeedFile);

console.log('✅ Fixed missing updatedAt field in seed-rtm-standard-final.js');