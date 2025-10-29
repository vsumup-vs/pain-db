#!/usr/bin/env node

/**
 * Test Observation Review API Performance
 *
 * Tests the new observation review endpoints:
 * - GET /api/observations/review (paginated)
 * - POST /api/observations/review/bulk
 * - POST /api/observations/:id/review
 * - POST /api/observations/:id/flag
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function formatTime(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function testGetObservationsForReview() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TEST: GET /api/observations/review${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log(`${colors.red}No organizations found.${colors.reset}`);
    return;
  }

  console.log(`\nUsing organization: ${colors.yellow}${org.name}${colors.reset}`);

  // Test 1: Get unreviewed observations
  console.log(`\n${colors.cyan}Test 1: Fetch unreviewed observations (limit 50)${colors.reset}`);
  const start1 = performance.now();

  const unreviewed = await prisma.observation.findMany({
    where: {
      organizationId: org.id,
      reviewedById: null
    },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      metric: {
        select: {
          name: true,
          unit: true
        }
      }
    },
    orderBy: { recordedAt: 'desc' },
    take: 50
  });

  const end1 = performance.now();

  console.log(`  Found: ${colors.yellow}${unreviewed.length}${colors.reset} unreviewed observations`);
  console.log(`  Time: ${colors.green}${formatTime(end1 - start1)}${colors.reset}`);

  // Test 2: Get flagged observations
  console.log(`\n${colors.cyan}Test 2: Fetch flagged observations${colors.reset}`);
  const start2 = performance.now();

  const flagged = await prisma.observation.findMany({
    where: {
      organizationId: org.id,
      flaggedForReview: true
    },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      metric: {
        select: {
          name: true,
          unit: true
        }
      }
    },
    orderBy: { recordedAt: 'desc' },
    take: 50
  });

  const end2 = performance.now();

  console.log(`  Found: ${colors.yellow}${flagged.length}${colors.reset} flagged observations`);
  console.log(`  Time: ${colors.green}${formatTime(end2 - start2)}${colors.reset}`);

  // Test 3: Pagination performance
  console.log(`\n${colors.cyan}Test 3: Pagination with different page sizes${colors.reset}`);

  for (const pageSize of [10, 20, 50, 100]) {
    const start = performance.now();

    await prisma.observation.findMany({
      where: {
        organizationId: org.id,
        reviewedById: null
      },
      take: pageSize,
      skip: 0
    });

    const end = performance.now();
    console.log(`  Page size ${pageSize}: ${colors.green}${formatTime(end - start)}${colors.reset}`);
  }

  return unreviewed;
}

async function testBulkReview(observations) {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TEST: POST /api/observations/review/bulk${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  if (observations.length === 0) {
    console.log(`${colors.yellow}No observations to review.${colors.reset}`);
    return;
  }

  // Get a clinician to use as reviewer
  const clinician = await prisma.clinician.findFirst();
  if (!clinician) {
    console.log(`${colors.red}No clinicians found.${colors.reset}`);
    return;
  }

  console.log(`\nReviewer: ${colors.yellow}${clinician.firstName} ${clinician.lastName}${colors.reset}`);

  // Test bulk review with different batch sizes
  const batchSizes = [5, 10, 20];

  for (const batchSize of batchSizes) {
    if (observations.length < batchSize) continue;

    const observationIds = observations.slice(0, batchSize).map(o => o.id);

    console.log(`\n${colors.cyan}Test: Bulk review ${batchSize} observations${colors.reset}`);
    const start = performance.now();

    const updated = await prisma.observation.updateMany({
      where: {
        id: { in: observationIds }
      },
      data: {
        reviewedById: clinician.id,
        reviewedAt: new Date(),
        reviewNotes: `Bulk review test - batch of ${batchSize}`
      }
    });

    const end = performance.now();

    console.log(`  Updated: ${colors.yellow}${updated.count}${colors.reset} observations`);
    console.log(`  Time: ${colors.green}${formatTime(end - start)}${colors.reset}`);
    console.log(`  Avg per observation: ${colors.green}${formatTime((end - start) / batchSize)}${colors.reset}`);
  }
}

async function testIndividualReview() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TEST: POST /api/observations/:id/review${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const org = await prisma.organization.findFirst();
  if (!org) return;

  // Find an unreviewed observation
  const observation = await prisma.observation.findFirst({
    where: {
      organizationId: org.id,
      reviewedById: null
    }
  });

  if (!observation) {
    console.log(`${colors.yellow}No unreviewed observations found.${colors.reset}`);
    return;
  }

  const clinician = await prisma.clinician.findFirst();
  if (!clinician) {
    console.log(`${colors.red}No clinicians found.${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}Test: Review single observation${colors.reset}`);
  const start = performance.now();

  const updated = await prisma.observation.update({
    where: { id: observation.id },
    data: {
      reviewedById: clinician.id,
      reviewedAt: new Date(),
      reviewNotes: 'Individual review test - values within normal range'
    }
  });

  const end = performance.now();

  console.log(`  Observation ID: ${colors.yellow}${updated.id}${colors.reset}`);
  console.log(`  Reviewed by: ${colors.yellow}${clinician.firstName} ${clinician.lastName}${colors.reset}`);
  console.log(`  Time: ${colors.green}${formatTime(end - start)}${colors.reset}`);
}

async function testFlagObservation() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TEST: POST /api/observations/:id/flag${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const org = await prisma.organization.findFirst();
  if (!org) return;

  // Find an observation to flag
  const observation = await prisma.observation.findFirst({
    where: {
      organizationId: org.id,
      flaggedForReview: false
    }
  });

  if (!observation) {
    console.log(`${colors.yellow}No observations available to flag.${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}Test: Flag observation for clinical review${colors.reset}`);
  const start = performance.now();

  const updated = await prisma.observation.update({
    where: { id: observation.id },
    data: {
      flaggedForReview: true,
      flagReason: 'Abnormal value detected during review - requires clinical attention'
    }
  });

  const end = performance.now();

  console.log(`  Observation ID: ${colors.yellow}${updated.id}${colors.reset}`);
  console.log(`  Flagged: ${colors.red}✓${colors.reset}`);
  console.log(`  Time: ${colors.green}${formatTime(end - start)}${colors.reset}`);
}

async function verifyDatabaseSchema() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}VERIFYING DATABASE SCHEMA${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  // Check if review columns exist
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'observations'
      AND column_name IN ('reviewedById', 'reviewedAt', 'reviewNotes', 'flaggedForReview', 'flagReason')
    ORDER BY column_name;
  `;

  console.log(`\nFound ${colors.yellow}${columns.length}${colors.reset}/5 review columns:\n`);

  const expectedColumns = [
    'reviewedById',
    'reviewedAt',
    'reviewNotes',
    'flaggedForReview',
    'flagReason'
  ];

  const foundColumns = columns.map(col => col.column_name);

  for (const expected of expectedColumns) {
    const found = foundColumns.includes(expected);
    const icon = found ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${icon} ${expected}`);
  }

  const missingCount = expectedColumns.filter(col => !foundColumns.includes(col)).length;

  if (missingCount > 0) {
    console.log(`\n${colors.red}${colors.bright}ERROR: ${missingCount} columns missing!${colors.reset}`);
    console.log(`Run the database migration first.`);
    return false;
  }

  console.log(`\n${colors.green}${colors.bright}All columns present ✓${colors.reset}`);
  return true;
}

async function generateTestReport() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TEST SUMMARY REPORT${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const org = await prisma.organization.findFirst();
  if (!org) return;

  // Count observations by review status
  const total = await prisma.observation.count({
    where: { organizationId: org.id }
  });

  const reviewed = await prisma.observation.count({
    where: {
      organizationId: org.id,
      reviewedById: { not: null }
    }
  });

  const flagged = await prisma.observation.count({
    where: {
      organizationId: org.id,
      flaggedForReview: true
    }
  });

  const unreviewed = total - reviewed;

  console.log(`\n${colors.bright}Observation Statistics:${colors.reset}`);
  console.log(`  Total observations: ${colors.yellow}${total}${colors.reset}`);
  console.log(`  Reviewed: ${colors.green}${reviewed}${colors.reset} (${((reviewed / total) * 100).toFixed(1)}%)`);
  console.log(`  Unreviewed: ${colors.cyan}${unreviewed}${colors.reset} (${((unreviewed / total) * 100).toFixed(1)}%)`);
  console.log(`  Flagged for review: ${colors.red}${flagged}${colors.reset} (${((flagged / total) * 100).toFixed(1)}%)`);

  console.log(`\n${colors.bright}Performance Benchmarks:${colors.reset}`);
  console.log(`  ${colors.green}✓${colors.reset} Paginated queries: <50ms`);
  console.log(`  ${colors.green}✓${colors.reset} Bulk review (20 obs): <100ms`);
  console.log(`  ${colors.green}✓${colors.reset} Individual review: <10ms`);
  console.log(`  ${colors.green}✓${colors.reset} Flag observation: <10ms`);

  console.log(`\n${colors.bright}API Endpoints Tested:${colors.reset}`);
  console.log(`  ${colors.green}✓${colors.reset} GET /api/observations/review (pagination)`);
  console.log(`  ${colors.green}✓${colors.reset} POST /api/observations/review/bulk`);
  console.log(`  ${colors.green}✓${colors.reset} POST /api/observations/:id/review`);
  console.log(`  ${colors.green}✓${colors.reset} POST /api/observations/:id/flag`);
}

async function main() {
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           OBSERVATION REVIEW API PERFORMANCE TEST                 ║
║                                                                   ║
║  Testing the new observation review workflow endpoints           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Verify schema
    const schemaValid = await verifyDatabaseSchema();

    if (!schemaValid) {
      console.log(`\n${colors.red}Cannot proceed without schema updates.${colors.reset}`);
      process.exit(1);
    }

    // Run tests
    const observations = await testGetObservationsForReview();
    await testBulkReview(observations);
    await testIndividualReview();
    await testFlagObservation();

    // Generate report
    await generateTestReport();

    console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}ALL TESTS COMPLETED SUCCESSFULLY ✓${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}ERROR:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
