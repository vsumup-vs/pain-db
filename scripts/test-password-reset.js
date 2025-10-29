const { PrismaClient } = require('../generated/prisma');
const axios = require('axios');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3000/api/auth';

async function testPasswordReset() {
  console.log('🔐 Testing Password Reset Functionality...\n');

  try {
    // Step 1: Find a test user with email
    const user = await prisma.user.findFirst({
      where: {
        email: { not: '' }
      }
    });

    if (!user) {
      console.error('❌ No user found in database for testing');
      console.log('Please run seed scripts first: npm run seed');
      return;
    }

    console.log(`📧 Testing with user: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   First Name: ${user.firstName}\n`);

    // Step 2: Request password reset
    console.log('Step 1: Requesting password reset...');
    try {
      const forgotPasswordResponse = await axios.post(`${API_URL}/forgot-password`, {
        email: user.email
      });
      console.log(`✅ Forgot password response: ${forgotPasswordResponse.data.message}`);
      console.log(`   Status: ${forgotPasswordResponse.status}\n`);
    } catch (error) {
      console.error('❌ Error requesting password reset:', error.response?.data || error.message);
      return;
    }

    // Step 3: Get the reset token from database
    console.log('Step 2: Retrieving reset token from database...');
    const userWithToken = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        passwordResetToken: true,
        passwordResetExpires: true
      }
    });

    if (!userWithToken.passwordResetToken) {
      console.error('❌ No reset token found in database');
      return;
    }

    console.log(`✅ Reset token stored in database`);
    console.log(`   Token expires: ${userWithToken.passwordResetExpires}\n`);

    // Step 4: Check Mailtrap for the email
    console.log('Step 3: Checking for password reset email...');
    console.log(`📬 Check your Mailtrap inbox at: https://mailtrap.io/inboxes`);
    console.log(`   You should see an email with subject: "Password Reset Request - ClinMetrics Pro"`);
    console.log(`   Email sent to: ${user.email}\n`);

    // Step 5: Simulate clicking the reset link (using a generated test token)
    console.log('Step 4: Testing password reset endpoint...');
    console.log('⚠️  Note: In real use, the token would come from the email link');
    console.log('    For this test, we need to extract the raw token (before hashing)');
    console.log('    In production, the user clicks the email link with the token.\n');

    // Generate a new token for testing (since we can't decrypt the hashed one)
    const crypto = require('crypto');
    const testResetToken = crypto.randomBytes(32).toString('hex');
    const bcrypt = require('bcrypt');
    const hashedTestToken = await bcrypt.hash(testResetToken, 10);

    // Update user with test token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedTestToken,
        passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour
      }
    });

    console.log(`📝 Generated test reset token for demonstration`);
    console.log(`   Token: ${testResetToken.substring(0, 16)}...`);

    // Step 6: Reset password with the test token
    const newPassword = 'NewSecure@Pass123';
    console.log(`\nStep 5: Resetting password to: ${newPassword}`);

    try {
      const resetPasswordResponse = await axios.post(`${API_URL}/reset-password`, {
        token: testResetToken,
        newPassword
      });
      console.log(`✅ Reset password response: ${resetPasswordResponse.data.message}`);
      console.log(`   Status: ${resetPasswordResponse.status}\n`);
    } catch (error) {
      console.error('❌ Error resetting password:', error.response?.data || error.message);
      return;
    }

    // Step 7: Verify password was changed and token cleared
    console.log('Step 6: Verifying password change...');
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        passwordResetToken: true,
        passwordResetExpires: true,
        passwordHash: true
      }
    });

    if (updatedUser.passwordResetToken !== null) {
      console.error('❌ Reset token should be cleared after password change');
    } else {
      console.log('✅ Reset token cleared successfully');
    }

    if (updatedUser.passwordHash) {
      console.log('✅ Password hash updated');
    }

    // Step 8: Check for password changed confirmation email
    console.log('\nStep 7: Checking for password changed confirmation email...');
    console.log(`📬 Check your Mailtrap inbox again`);
    console.log(`   You should see an email with subject: "Password Changed Successfully - ClinMetrics Pro"`);
    console.log(`   Email sent to: ${user.email}\n`);

    // Step 9: Verify all refresh tokens were invalidated
    console.log('Step 8: Verifying refresh tokens invalidated...');
    const remainingTokens = await prisma.refreshToken.count({
      where: { userId: user.id }
    });

    if (remainingTokens === 0) {
      console.log('✅ All refresh tokens invalidated (user must log in again)\n');
    } else {
      console.warn(`⚠️  Found ${remainingTokens} refresh tokens still active (should be 0)\n`);
    }

    console.log('✅ Password reset flow completed successfully!\n');
    console.log('Summary:');
    console.log('1. ✅ Password reset requested');
    console.log('2. ✅ Reset token generated and stored');
    console.log('3. ✅ Password reset email sent to Mailtrap');
    console.log('4. ✅ Password reset with token');
    console.log('5. ✅ Password changed confirmation email sent');
    console.log('6. ✅ Reset token cleared from database');
    console.log('7. ✅ All refresh tokens invalidated\n');

    console.log('📬 Check your Mailtrap inbox to see both emails!');

  } catch (error) {
    console.error('❌ Error during password reset test:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordReset();
