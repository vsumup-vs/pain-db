const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing JWT generation in registration route...');

const authRoutesPath = path.join(__dirname, 'src/routes/authRoutes.js');
const backupPath = path.join(__dirname, 'src/routes/authRoutes.js.backup');

try {
  // Read the current file
  const content = fs.readFileSync(authRoutesPath, 'utf8');
  
  // Create backup if it doesn't exist
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, content);
    console.log('✅ Backup created');
  }
  
  // Fix the JWT generation line
  const fixedContent = content.replace(
    'const token = await jwtService.generateUserToken(user);',
    'const token = await jwtService.generateUserToken({ id: user.id });'
  );
  
  if (fixedContent === content) {
    console.log('⚠️  No changes needed - JWT generation already correct');
  } else {
    // Write the fixed content
    fs.writeFileSync(authRoutesPath, fixedContent);
    console.log('✅ Fixed JWT generation in registration route');
    console.log('   Changed: generateUserToken(user)');
    console.log('   To:      generateUserToken({ id: user.id })');
  }
  
  console.log('\n🧪 Now testing the registration endpoint...');
  
} catch (error) {
  console.error('❌ Error fixing registration route:', error.message);
  process.exit(1);
}