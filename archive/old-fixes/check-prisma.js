const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).sort();
console.log('Available Prisma models:');
models.forEach(m => console.log(`  - ${m}`));
process.exit(0);
