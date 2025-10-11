const fs = require('fs');
const path = require('path');

function fixRegistrationPermissions() {
  const authRoutesPath = path.join(__dirname, 'src', 'routes', 'authRoutes.js');
  
  try {
    console.log('🔧 Fixing registration permissions issue...');
    
    // Read the current file
    let content = fs.readFileSync(authRoutesPath, 'utf8');
    
    // Find and replace the UserOrganization creation
    const oldPattern = `        userOrganization = await prisma.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: organizationId,
            role: role,
            joinedAt: new Date()
          },`;
    
    const newPattern = `        userOrganization = await prisma.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: organizationId,
            role: role,
            permissions: ['USER_READ'], // Add default permissions
            joinedAt: new Date()
          },`;
    
    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      
      // Write the fixed content back
      fs.writeFileSync(authRoutesPath, content, 'utf8');
      console.log('✅ Fixed registration permissions in authRoutes.js');
      console.log('📋 Added default permissions: [\'USER_READ\']');
    } else {
      console.log('⚠️  Pattern not found - the file might already be fixed or have a different structure');
    }
    
  } catch (error) {
    console.error('❌ Error fixing registration permissions:', error.message);
  }
}

fixRegistrationPermissions();