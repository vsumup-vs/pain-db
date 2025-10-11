const fs = require('fs');

console.log('🔧 Removing passwordHash from registration response...');

const filePath = './src/routes/authRoutes.js';
let content = fs.readFileSync(filePath, 'utf8');

// Remove passwordHash from the user object in the response
content = content.replace(
  /passwordHash,\s*\n/g,
  ''
);

fs.writeFileSync(filePath, content);
console.log('✅ passwordHash removed from registration response');