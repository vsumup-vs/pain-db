#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureOrganization() {
  try {
    // Check if organization exists
    const orgs = await prisma.organization.findMany();

    if (orgs.length === 0) {
      console.log('No organizations found. Creating default organization...');

      const org = await prisma.organization.create({
        data: {
          name: 'Default Healthcare Organization',
          type: 'HOSPITAL',
          email: 'admin@defaultorg.com',
          isActive: true
        }
      });

      console.log(`✅ Created organization: ${org.name} (${org.id})`);
      return org;
    } else {
      console.log(`✅ Found ${orgs.length} organization(s):`);
      orgs.forEach(org => console.log(`  - ${org.name} (${org.id})`));
      return orgs[0];
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ensureOrganization();
