const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserRegistration() {
    console.log('🔍 Checking user registration for: sowmitraa@gmail.com');
    console.log('================================================');

    try {
        // Look for the user in the database
        const user = await prisma.user.findUnique({
            where: { email: 'sowmitraa@gmail.com' },
            include: {
                userOrganizations: {
                    include: {
                        organization: true
                    }
                }
            }
        });

        if (user) {
            console.log('✅ User found in database!');
            console.log('📋 User Details:');
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   👤 Name: ${user.firstName} ${user.lastName}`);
            console.log(`   🆔 User ID: ${user.id}`);
            console.log(`   📅 Created: ${user.createdAt}`);
            console.log(`   ✅ Active: ${user.isActive}`);
            console.log(`   📧 Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
            
            if (user.userOrganizations && user.userOrganizations.length > 0) {
                console.log('\n🏢 Organization Details:');
                user.userOrganizations.forEach((userOrg, index) => {
                    console.log(`   Organization ${index + 1}:`);
                    console.log(`     🏥 Name: ${userOrg.organization.name}`);
                    console.log(`     👔 Role: ${userOrg.role}`);
                    console.log(`     📅 Joined: ${userOrg.joinedAt}`);
                    console.log(`     ✅ Active: ${userOrg.isActive}`);
                    if (userOrg.permissions) {
                        console.log(`     🔐 Permissions: ${userOrg.permissions.join(', ')}`);
                    }
                });
            } else {
                console.log('\n⚠️  No organization associations found');
            }
            
            return true;
        } else {
            console.log('❌ User not found in database');
            console.log('   The email sowmitraa@gmail.com is not registered');
            
            // Let's also check if there are any users with similar emails
            console.log('\n🔍 Checking for similar email patterns...');
            const similarUsers = await prisma.user.findMany({
                where: {
                    email: {
                        contains: 'sowmitraa'
                    }
                },
                select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true
                }
            });
            
            if (similarUsers.length > 0) {
                console.log('📧 Found users with similar emails:');
                similarUsers.forEach(user => {
                    console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
                });
            } else {
                console.log('   No users found with similar email patterns');
            }
            
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error checking user registration:');
        console.error('   Error:', error.message);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

checkUserRegistration()
    .then(found => {
        if (found) {
            console.log('\n🎉 Registration check completed - User found!');
        } else {
            console.log('\n💡 Registration check completed - User not found');
            console.log('   You may need to register with this email address');
        }
    })
    .catch(error => {
        console.error('💥 Script error:', error.message);
        process.exit(1);
    });