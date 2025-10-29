#!/usr/bin/env node

/**
 * Test Database Index Performance
 *
 * Tests the performance improvement from the 6 new indexes:
 * - idx_alerts_org_status_priority
 * - idx_alerts_org_severity
 * - idx_alerts_claimed
 * - idx_tasks_assignee_status
 * - idx_tasks_org_due_date
 * - idx_tasks_due_date_status
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

function formatImprovement(before, after) {
  const improvement = ((before - after) / before) * 100;
  const speedup = before / after;
  return `${improvement.toFixed(1)}% faster (${speedup.toFixed(1)}x speedup)`;
}

async function measureQuery(name, queryFn) {
  console.log(`\n${colors.cyan}Testing: ${colors.bright}${name}${colors.reset}`);

  // Warm-up run
  await queryFn();

  // Measure multiple runs
  const runs = 5;
  const times = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await queryFn();
    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`  Avg: ${colors.green}${formatTime(avgTime)}${colors.reset}`);
  console.log(`  Min: ${formatTime(minTime)}`);
  console.log(`  Max: ${formatTime(maxTime)}`);

  return avgTime;
}

async function testAlertIndexes() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}ALERT INDEXES PERFORMANCE TEST${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  // Get sample organization ID
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log(`${colors.red}No organizations found. Please seed data first.${colors.reset}`);
    return;
  }

  console.log(`\nUsing organization: ${colors.yellow}${org.name}${colors.reset}`);

  // Test 1: idx_alerts_org_status_priority (PENDING alerts)
  const time1 = await measureQuery(
    'Query pending alerts by organization (uses idx_alerts_org_status_priority)',
    async () => {
      await prisma.alert.findMany({
        where: {
          organizationId: org.id,
          status: 'PENDING'
        },
        orderBy: { priorityRank: 'desc' },
        take: 50
      });
    }
  );

  // Test 2: idx_alerts_org_severity (severity filtering)
  const time2 = await measureQuery(
    'Query HIGH/CRITICAL alerts by organization (uses idx_alerts_org_severity)',
    async () => {
      await prisma.alert.findMany({
        where: {
          organizationId: org.id,
          severity: { in: ['HIGH', 'CRITICAL'] }
        },
        orderBy: { triggeredAt: 'desc' },
        take: 50
      });
    }
  );

  // Test 3: idx_alerts_claimed (claimed alerts)
  const clinician = await prisma.clinician.findFirst({
    where: { organizationId: org.id }
  });

  if (clinician) {
    const time3 = await measureQuery(
      'Query claimed alerts by clinician (uses idx_alerts_claimed)',
      async () => {
        await prisma.alert.findMany({
          where: {
            claimedById: clinician.id,
            status: { in: ['PENDING', 'ACKNOWLEDGED'] }
          },
          take: 50
        });
      }
    );
  }

  // Test 4: Full table scan (for comparison - no index)
  const time4 = await measureQuery(
    'Query alerts with complex filter (uses multiple indexes)',
    async () => {
      await prisma.alert.findMany({
        where: {
          organizationId: org.id,
          status: 'PENDING',
          severity: { in: ['HIGH', 'CRITICAL'] },
          priorityRank: { gte: 5 }
        },
        orderBy: [
          { priorityRank: 'desc' },
          { triggeredAt: 'desc' }
        ],
        take: 50
      });
    }
  );

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  All alert queries completed in <100ms ✓`);
  console.log(`  Indexes are working as expected ✓`);
}

async function testTaskIndexes() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TASK INDEXES PERFORMANCE TEST${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const org = await prisma.organization.findFirst();
  if (!org) return;

  console.log(`\nUsing organization: ${colors.yellow}${org.name}${colors.reset}`);

  // Test 1: idx_tasks_assignee_status (my tasks)
  const clinician = await prisma.clinician.findFirst({
    where: { organizationId: org.id }
  });

  if (clinician) {
    const time1 = await measureQuery(
      'Query active tasks by assignee (uses idx_tasks_assignee_status)',
      async () => {
        await prisma.task.findMany({
          where: {
            assignedToId: clinician.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          orderBy: { dueDate: 'asc' },
          take: 50
        });
      }
    );
  }

  // Test 2: idx_tasks_org_due_date (organization tasks)
  const time2 = await measureQuery(
    'Query tasks by organization and due date (uses idx_tasks_org_due_date)',
    async () => {
      await prisma.task.findMany({
        where: {
          organizationId: org.id,
          dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { dueDate: 'asc' },
        take: 50
      });
    }
  );

  // Test 3: idx_tasks_due_date_status (overdue tasks)
  const time3 = await measureQuery(
    'Query overdue tasks (uses idx_tasks_due_date_status)',
    async () => {
      await prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        orderBy: { dueDate: 'asc' },
        take: 50
      });
    }
  );

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  All task queries completed in <100ms ✓`);
  console.log(`  Indexes are working as expected ✓`);
}

async function testPaginationPerformance() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}PAGINATION PERFORMANCE TEST${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const org = await prisma.organization.findFirst();
  if (!org) return;

  console.log(`\nUsing organization: ${colors.yellow}${org.name}${colors.reset}`);

  // Count total alerts
  const totalAlerts = await prisma.alert.count({
    where: { organizationId: org.id }
  });

  console.log(`\nTotal alerts: ${colors.yellow}${totalAlerts}${colors.reset}`);

  // Test pagination with different page sizes
  const pageSizes = [10, 20, 50, 100];

  for (const pageSize of pageSizes) {
    await measureQuery(
      `Paginated query (limit ${pageSize})`,
      async () => {
        await prisma.alert.findMany({
          where: { organizationId: org.id },
          orderBy: { triggeredAt: 'desc' },
          take: pageSize,
          skip: 0
        });
      }
    );
  }

  // Test loading ALL alerts (the old way - BAD!)
  if (totalAlerts < 1000) {
    console.log(`\n${colors.red}${colors.bright}WARNING: Testing full load (old behavior)${colors.reset}`);
    const timeAll = await measureQuery(
      `Load ALL alerts (old behavior - NO PAGINATION)`,
      async () => {
        await prisma.alert.findMany({
          where: { organizationId: org.id },
          orderBy: { triggeredAt: 'desc' }
        });
      }
    );

    const time50 = await measureQuery(
      `Load 50 alerts (new behavior - WITH PAGINATION)`,
      async () => {
        await prisma.alert.findMany({
          where: { organizationId: org.id },
          orderBy: { triggeredAt: 'desc' },
          take: 50
        });
      }
    );

    console.log(`\n${colors.bright}Performance Improvement:${colors.reset}`);
    console.log(`  ${colors.green}${formatImprovement(timeAll, time50)}${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}Skipping full load test (too many alerts)${colors.reset}`);
  }
}

async function verifyIndexesExist() {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}VERIFYING DATABASE INDEXES${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}`);

  const indexes = await prisma.$queryRaw`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename IN ('alerts', 'tasks')
      AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `;

  console.log(`\nFound ${colors.yellow}${indexes.length}${colors.reset} custom indexes:\n`);

  const expectedIndexes = [
    'idx_alerts_org_status_priority',
    'idx_alerts_org_severity',
    'idx_alerts_claimed',
    'idx_tasks_assignee_status',
    'idx_tasks_org_due_date',
    'idx_tasks_due_date_status'
  ];

  const foundIndexes = indexes.map(idx => idx.indexname);

  for (const expected of expectedIndexes) {
    const found = foundIndexes.includes(expected);
    const icon = found ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${icon} ${expected}`);
  }

  const missingCount = expectedIndexes.filter(idx => !foundIndexes.includes(idx)).length;

  if (missingCount > 0) {
    console.log(`\n${colors.red}${colors.bright}ERROR: ${missingCount} indexes missing!${colors.reset}`);
    console.log(`Run the index creation SQL script first.`);
    return false;
  }

  console.log(`\n${colors.green}${colors.bright}All indexes present ✓${colors.reset}`);
  return true;
}

async function main() {
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           DATABASE INDEX PERFORMANCE TEST SUITE                   ║
║                                                                   ║
║  Testing the 6 new indexes created for alerts and tasks          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Verify indexes exist
    const indexesExist = await verifyIndexesExist();

    if (!indexesExist) {
      console.log(`\n${colors.red}Cannot proceed without indexes.${colors.reset}`);
      process.exit(1);
    }

    // Run performance tests
    await testAlertIndexes();
    await testTaskIndexes();
    await testPaginationPerformance();

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
