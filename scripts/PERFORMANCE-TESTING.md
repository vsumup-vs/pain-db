# Performance Testing Guide

> Created: 2025-10-26
> Purpose: Validate performance improvements from pagination and database indexes

## Overview

This directory contains comprehensive performance test scripts to validate the improvements made on 2025-10-26:

- ✅ Added pagination to Alerts page
- ✅ Increased pagination limits to 50 across TriageQueue, Tasks, Patients
- ✅ Created 6 database indexes for alerts and tasks tables
- ✅ Fixed observation review API bugs
- ✅ Added ObservationReview page for RPM compliance

## Test Scripts

### 1. `test-database-index-performance.js`

**Purpose**: Validate that the 6 new database indexes are improving query performance.

**Tests**:
- ✅ Verifies all 6 indexes exist in database
- ✅ Tests alert queries with organization + status + priority filtering
- ✅ Tests alert queries with severity filtering
- ✅ Tests claimed alert queries
- ✅ Tests task queries with assignee + status filtering
- ✅ Tests task queries with organization + due date filtering
- ✅ Tests overdue task queries
- ✅ Compares paginated vs full-load performance

**Expected Results**:
- All queries complete in <100ms
- Paginated queries 10x faster than full-load queries
- Index usage confirmed via EXPLAIN plans

**Usage**:
```bash
node scripts/test-database-index-performance.js
```

**Indexes Tested**:
- `idx_alerts_org_status_priority` (alerts: organizationId + status + priorityRank)
- `idx_alerts_org_severity` (alerts: organizationId + severity + triggeredAt)
- `idx_alerts_claimed` (alerts: claimedById + status, partial index)
- `idx_tasks_assignee_status` (tasks: assignedToId + status + dueDate, partial index)
- `idx_tasks_org_due_date` (tasks: organizationId + dueDate + status)
- `idx_tasks_due_date_status` (tasks: dueDate + status)

---

### 2. `test-observation-review-api.js`

**Purpose**: Validate the new observation review workflow endpoints and performance.

**Tests**:
- ✅ Verifies review columns exist in observations table
- ✅ Tests GET /api/observations/review (pagination)
- ✅ Tests fetching unreviewed observations
- ✅ Tests fetching flagged observations
- ✅ Tests pagination with different page sizes (10, 20, 50, 100)
- ✅ Tests bulk review operations (5, 10, 20 observations)
- ✅ Tests individual observation review
- ✅ Tests flagging observations for clinical attention
- ✅ Generates observation review statistics report

**Expected Results**:
- Paginated queries: <50ms
- Bulk review (20 obs): <100ms
- Individual review: <10ms
- Flag observation: <10ms
- Schema columns all present

**Usage**:
```bash
node scripts/test-observation-review-api.js
```

**Database Schema Requirements**:
- `reviewedById` (clinician who reviewed)
- `reviewedAt` (timestamp)
- `reviewNotes` (clinical notes)
- `flaggedForReview` (requires attention)
- `flagReason` (why flagged)

---

### 3. `run-performance-tests.sh`

**Purpose**: Run all performance tests and generate a comprehensive summary report.

**Features**:
- ✅ Runs all test scripts sequentially
- ✅ Captures output to log files with timestamps
- ✅ Generates color-coded summary report
- ✅ Creates `test-results/` directory for logs
- ✅ Exits with proper status codes for CI/CD

**Usage**:
```bash
./scripts/run-performance-tests.sh
```

**Output**:
```
test-results/
├── index-performance-20251026_143022.log
├── observation-review-20251026_143025.log
└── summary-20251026_143028.txt
```

---

## Prerequisites

Before running tests, ensure:

1. **Database is seeded** with test data:
   ```bash
   npm run seed:production
   # or
   npm run seed:robust
   ```

2. **Database indexes are created**:
   ```bash
   psql $DATABASE_URL -f /tmp/add-alert-task-indexes.sql
   ```

3. **Database migrations are up to date**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Backend is running** (for API tests):
   ```bash
   npm run dev
   ```

---

## Running Tests

### Quick Start

Run all tests at once:
```bash
./scripts/run-performance-tests.sh
```

### Individual Tests

Run specific test scripts:

```bash
# Test database index performance
node scripts/test-database-index-performance.js

# Test observation review API
node scripts/test-observation-review-api.js
```

---

## Understanding Test Output

### Color Codes

- 🟢 **Green**: Success, good performance
- 🟡 **Yellow**: Warning, acceptable but could be optimized
- 🔴 **Red**: Error or failure
- 🔵 **Cyan**: Informational messages

### Performance Benchmarks

| Query Type | Target | Excellent | Good | Needs Work |
|------------|--------|-----------|------|------------|
| Paginated queries (50 items) | <50ms | <20ms | 20-50ms | >50ms |
| Index-optimized queries | <100ms | <30ms | 30-100ms | >100ms |
| Bulk operations (20 items) | <100ms | <50ms | 50-100ms | >100ms |
| Single record operations | <10ms | <5ms | 5-10ms | >10ms |

### Sample Output

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           DATABASE INDEX PERFORMANCE TEST SUITE                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

VERIFYING DATABASE INDEXES

Found 6 custom indexes:

  ✓ idx_alerts_org_status_priority
  ✓ idx_alerts_org_severity
  ✓ idx_alerts_claimed
  ✓ idx_tasks_assignee_status
  ✓ idx_tasks_org_due_date
  ✓ idx_tasks_due_date_status

All indexes present ✓

ALERT INDEXES PERFORMANCE TEST

Testing: Query pending alerts by organization
  Avg: 23.45ms
  Min: 21.32ms
  Max: 26.78ms

Performance Improvement:
  85.3% faster (6.8x speedup)

ALL TESTS COMPLETED SUCCESSFULLY ✓
```

---

## Troubleshooting

### Issue: "No organizations found"

**Solution**: Seed the database first:
```bash
npm run seed:production
```

### Issue: "Indexes missing"

**Solution**: Run the index creation SQL:
```bash
PGPASSWORD=password psql -U painuser -d painmanagement -h localhost -f /tmp/add-alert-task-indexes.sql
```

### Issue: "Schema columns missing"

**Solution**: Run Prisma migrations:
```bash
npx prisma migrate deploy
```

### Issue: Tests hang or timeout

**Possible causes**:
1. Database connection issues
2. Backend not running (for API tests)
3. Too much data in database (slow queries)

**Solutions**:
```bash
# Check database connection
npx prisma db pull

# Check backend status
curl http://localhost:3000/api/health

# Check database query performance
psql $DATABASE_URL -c "SELECT * FROM alerts LIMIT 10;"
```

---

## Interpreting Results

### Good Performance Indicators

✅ All queries complete in <100ms
✅ Paginated queries 5-10x faster than full-load
✅ Index usage confirmed (visible in query plans)
✅ Bulk operations scale linearly (2x data = 2x time, not exponential)
✅ No timeout errors

### Warning Signs

⚠️ Queries taking >100ms consistently
⚠️ Pagination not showing significant speedup
⚠️ Bulk operations taking exponentially longer with more data
⚠️ Frequent database connection errors

### Red Flags

🚨 Queries timing out (>5 seconds)
🚨 Database connection pool exhausted
🚨 Out of memory errors
🚨 Indexes not being used (visible in EXPLAIN plans)

---

## Next Steps After Testing

### If All Tests Pass

1. ✅ Update roadmap to mark performance testing complete
2. ✅ Create performance baseline metrics for monitoring
3. ✅ Deploy to staging environment
4. ✅ Run tests on staging with production-scale data
5. ✅ Monitor production performance after deployment

### If Tests Fail

1. 🔍 Review test output logs in `test-results/`
2. 🔍 Check database query plans with EXPLAIN
3. 🔍 Verify indexes are being used
4. 🔍 Check for data volume issues
5. 🔍 Consider adding more indexes or optimizing queries

---

## CI/CD Integration

Add to `.github/workflows/performance-tests.yml`:

```yaml
name: Performance Tests

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run database migrations
        run: npx prisma migrate deploy

      - name: Seed test data
        run: npm run seed:production

      - name: Run performance tests
        run: ./scripts/run-performance-tests.sh

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: performance-test-results
          path: test-results/
```

---

## Maintenance

### Updating Tests

When adding new features or optimizations:

1. Add new test cases to existing scripts
2. Update expected performance benchmarks
3. Document new indexes or schema changes
4. Update this README with new requirements

### Performance Regression Testing

Run these tests:
- Before each major release
- After database schema changes
- After adding new indexes
- When experiencing production performance issues

---

## Contact

For questions or issues:
- See `docs/developer-reference.md` for database schema
- See `TODAY.md` for recent changes
- See `.agent-os/product/roadmap.md` for feature status

---

**Last Updated**: 2025-10-26
**Version**: 1.0.0
**Status**: Ready for use
