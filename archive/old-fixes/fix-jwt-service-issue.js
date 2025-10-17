const fs = require('fs');
const path = require('path');

async function fixJWTServiceIssue() {
  console.log('🔧 Fixing JWT Service Issue\n');

  const authRoutesPath = path.join(__dirname, 'src/routes/authRoutes.js');
  
  try {
    // Read the current authRoutes.js file
    let content = fs.readFileSync(authRoutesPath, 'utf8');
    
    // Find the user creation section and ensure it returns the id
    const userCreatePattern = /const user = await prisma\.user\.create\(\{[\s\S]*?\}\);/;
    
    if (userCreatePattern.test(content)) {
      console.log('✅ Found user creation pattern');
      
      // Replace the user creation to explicitly select the id
      const newUserCreate = `const user = await prisma.user.create({
        data: {
          email,
          passwordHash, // FIXED: Added missing passwordHash
          firstName,
          lastName,
          emailVerified: null, // FIXED: Changed from false to null
          isActive: true
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });`;
      
      content = content.replace(userCreatePattern, newUserCreate);
      
      // Write the updated content back
      fs.writeFileSync(authRoutesPath, content);
      console.log('✅ Updated user creation to explicitly select id field');
    } else {
      console.log('❌ Could not find user creation pattern');
    }
    
    // Also check the JWT service to make sure it handles the user object correctly
    const jwtServicePath = path.join(__dirname, 'src/services/jwtService.js');
    let jwtContent = fs.readFileSync(jwtServicePath, 'utf8');
    
    // Add validation to the generateUserToken method
    const generateUserTokenPattern = /async generateUserToken\(user\) \{[\s\S]*?try \{/;
    
    if (generateUserTokenPattern.test(jwtContent)) {
      console.log('✅ Found generateUserToken method');
      
      const newGenerateUserToken = `async generateUserToken(user) {
    try {
      // Validate user object has required id field
      if (!user || !user.id) {
        throw new Error('User object must have an id field');
      }`;
      
      jwtContent = jwtContent.replace(generateUserTokenPattern, newGenerateUserToken);
      
      // Write the updated content back
      fs.writeFileSync(jwtServicePath, jwtContent);
      console.log('✅ Added validation to generateUserToken method');
    } else {
      console.log('❌ Could not find generateUserToken pattern');
    }
    
    console.log('\n🎉 JWT Service issue fix completed!');
    console.log('\nNext steps:');
    console.log('1. Test the registration again');
    console.log('2. The user creation now explicitly selects the id field');
    console.log('3. The JWT service now validates the user object has an id');
    
  } catch (error) {
    console.error('❌ Error fixing JWT service issue:', error.message);
    process.exit(1);
  }
}

fixJWTServiceIssue();