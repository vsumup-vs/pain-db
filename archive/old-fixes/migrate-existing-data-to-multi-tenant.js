#!/usr/bin/env node

/**
 * Data Migration Script: Add organizationId to existing records
 *
 * This script backfills organizationId for all existing Observation and Alert records
 * based on the organizationId of their related entities (Patient, Enrollment, etc.)
 *
 * CRITICAL: This must be run after schema changes are applied
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  console.log('🔄 Starting Data Migration for Multi-Tenant Security...\n');

  try {
    // 1. Get the first organization (default for existing data)
    const defaultOrg = await prisma.organization.findFirst();

    if (!defaultOrg) {
      console.error('❌ No organization found in database!');
      console.log('Please create an organization first.');
      process.exit(1);
    }

    console.log(`📍 Using default organization: ${defaultOrg.name} (${defaultOrg.id})\n`);

    // 2. Update Observations - get organizationId from Patient
    console.log('📝 Migrating Observations...');
    const observations = await prisma.observation.findMany({
      where: {
        organizationId: null
      },
      include: {
        patient: {
          select: {
            organizationId: true
          }
        }
      }
    });

    let obsUpdated = 0;
    for (const obs of observations) {
      const orgId = obs.patient?.organizationId || defaultOrg.id;
      await prisma.observation.update({
        where: { id: obs.id },
        data: { organizationId: orgId }
      });
      obsUpdated++;
    }
    console.log(`✅ Updated ${obsUpdated} observations\n`);

    // 3. Update Alerts - get organizationId from Patient
    console.log('📝 Migrating Alerts...');
    const alerts = await prisma.alert.findMany({
      where: {
        organizationId: null
      },
      include: {
        patient: {
          select: {
            organizationId: true
          }
        }
      }
    });

    let alertsUpdated = 0;
    for (const alert of alerts) {
      const orgId = alert.patient?.organizationId || defaultOrg.id;
      await prisma.alert.update({
        where: { id: alert.id },
        data: { organizationId: orgId }
      });
      alertsUpdated++;
    }
    console.log(`✅ Updated ${alertsUpdated} alerts\n`);

    // 4. Verify data integrity
    console.log('🔍 Verifying data integrity...');

    const [totalObs, obsWithOrg] = await Promise.all([
      prisma.observation.count(),
      prisma.observation.count({ where: { organizationId: { not: null } } })
    ]);

    const [totalAlerts, alertsWithOrg] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { organizationId: { not: null } } })
    ]);

    console.log(`\n📊 Verification Results:`);
    console.log(`- Observations: ${obsWithOrg}/${totalObs} have organizationId`);
    console.log(`- Alerts: ${alertsWithOrg}/${totalAlerts} have organizationId`);

    if (totalObs === obsWithOrg && totalAlerts === alertsWithOrg) {
      console.log('\n✅ ✅ ✅ Data migration completed successfully! ✅ ✅ ✅\n');
      console.log('🔒 Multi-tenant data isolation is now active.\n');
    } else {
      console.log('\n⚠️  Warning: Some records still missing organizationId\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
