const fs = require('fs');

console.log('🔧 Applying passwordHash Fix');
console.log('============================');

const authRoutesPath = './src/routes/authRoutes.js';

try {
  // Read the file
  let content = fs.readFileSync(authRoutesPath, 'utf8');
  
  // Split into lines
  const lines = content.split('\n');
  
  // Find the line with "email," and insert passwordHash after it
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'email,' && 
        i + 1 < lines.length && 
        lines[i + 1].includes('firstName')) {
      
      // Insert passwordHash line after email
      lines.splice(i + 1, 0, '          passwordHash, // FIXED: Added missing passwordHash');
      console.log('✅ Added passwordHash after email line');
      break;
    }
  }
  
  // Write the fixed content back
  const fixedContent = lines.join('\n');
  fs.writeFileSync(authRoutesPath, fixedContent);
  
  console.log('✅ File updated successfully');
  
} catch (error) {
  console.error('❌ Error applying fix:', error.message);
}