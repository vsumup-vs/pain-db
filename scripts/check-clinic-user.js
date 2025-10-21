const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClinicUser() {
  console.log('Searching for users with firstName containing "Clinic"...\n');

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Clinic', mode: 'insensitive' } },
        { lastName: { contains: 'Clinic', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true
    }
  });

  if (users.length === 0) {
    console.log('No users found with "Clinic" in their name.\n');
  } else {
    console.log('Found ' + users.length + ' user(s) with "Clinic" in their name:\n');
    users.forEach(user => {
      console.log('User ID: ' + user.id);
      console.log('Email: ' + user.email);
      console.log('Name: ' + user.firstName + ' ' + user.lastName);
      console.log('Created: ' + user.createdAt);
      console.log('---');
    });
  }

  await prisma.$disconnect();
}

checkClinicUser().catch(console.error);
