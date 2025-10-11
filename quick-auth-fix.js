const fs = require('fs');

console.log('🔧 Fixing authentication registration issue...');

// Read the auth routes file
const authRoutesPath = '/home/vsumup/pain-db/src/routes/authRoutes.js';
let content = fs.readFileSync(authRoutesPath, 'utf8');

// Find and fix the user creation section
const oldUserCreate = `      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          emailVerified: false, // In production, send verification email
          isActive: true
        }
      });`;

const newUserCreate = `      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash, // Fixed: Add the missing passwordHash field
          firstName,
          lastName,
          emailVerified: false, // In production, send verification email
          isActive: true
        }
      });`;

if (content.includes(oldUserCreate)) {
  content = content.replace(oldUserCreate, newUserCreate);
  fs.writeFileSync(authRoutesPath, content);
  console.log('✅ Fixed missing passwordHash in user registration');
} else {
  console.log('⚠️ Could not find the exact user creation code to fix');
}

console.log('🎉 Authentication fix completed!');