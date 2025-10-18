# Utility Scripts Reference

> **Module**: Development and maintenance scripts documentation
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

---

## Utility Scripts

The `/home/vsumup/pain-db/scripts/` directory contains utility scripts for data management, testing, and maintenance.

### Data Cleanup Scripts

#### cleanup-duplicate-test-patients.js
**Purpose**: Remove duplicate test patients created during multiple seeding operations

**Usage**:
```bash
node scripts/cleanup-duplicate-test-patients.js
```

**What it does**:
1. Finds all patients with test lastNames: 'Eligible', 'NearReadings', 'NearTime', 'NotEligible'
2. For each lastName, keeps the newest patient (by `createdAt` timestamp)
3. Deletes all older duplicates along with related data:
   - Observations
   - Time logs
   - Assessments
   - Patient medications
   - Enrollments
   - Alerts
4. Confirms deletion with console output

**Important**: This script uses `orderBy: { createdAt: 'desc' }` to identify the newest patient to keep.

---

### Test Data Scripts

#### seed-billing-test-data.js
**Purpose**: Seed test patients with varying billing eligibility statuses for Billing Readiness Dashboard testing

**Usage**:
```bash
node scripts/seed-billing-test-data.js
```

**What it creates**:
- **Alice Eligible**: 18 days of observations, 25 minutes of clinical time → Fully eligible
- **Bob NearReadings**: 14 days of observations, 22 minutes of clinical time → Near-eligible (needs 2 more days)
- **Carol NearTime**: 17 days of observations, 18 minutes of clinical time → Near-eligible (needs 2 more minutes)
- **David NotEligible**: 8 days of observations, 10 minutes of clinical time → Not eligible (far from requirements)

**Dependencies**:
- Requires existing organization, clinician, metric definitions, and billing programs
- Uses `CMS_RPM_2025` and `CMS_RTM_2025` billing programs

---

#### delete-test-patients.js
**Purpose**: Delete all test patients by lastName

**Usage**:
```bash
node scripts/delete-test-patients.js
```

**What it does**:
- Finds and deletes patients with lastNames: 'Eligible', 'NearReadings', 'NearTime', 'NotEligible'
- Cascades deletion to related observations, time logs, assessments, medications, enrollments, alerts

---

### Diagnostic Scripts

#### check-carol-data.js
**Purpose**: Inspect Carol NearTime's enrollment data for billing readiness troubleshooting

**Usage**:
```bash
node scripts/check-carol-data.js
```

**What it displays**:
- Enrollment details (ID, billing program, eligibility)
- Observations count and unique dates for billing month
- Time logs count and total minutes
- CPT codes in billing program

**Use case**: Debugging why a test patient shows incorrect billing eligibility status

---

#### test-carol-billing.js
**Purpose**: Test billing readiness calculation for Carol NearTime enrollment

**Usage**:
```bash
node scripts/test-carol-billing.js
```

**What it does**:
- Finds Carol's enrollment
- Calls `billingReadinessService.calculateBillingReadiness(enrollmentId, '2025-10')`
- Displays full billing result JSON including:
  - Eligibility status
  - Eligibility rules pass/fail
  - CPT codes eligibility
  - Data collection and clinical time summary

**Use case**: Testing billing service logic without frontend or API layer

---

### Script Development Guidelines

When creating new utility scripts:

1. **Prisma Client Pattern**:
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Your logic here

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

main();
```

2. **Multi-Tenant Awareness**:
- Always filter by `organizationId` when querying patients, enrollments, etc.
- Document which organization the script expects to work with

3. **Relationship Deletion Order**:
When deleting entities, follow this order to avoid foreign key violations:
```javascript
// 1. Delete child records first
await prisma.observation.deleteMany({ where: { patientId } });
await prisma.timeLog.deleteMany({ where: { patientId } });
await prisma.assessment.deleteMany({ where: { patientId } });
await prisma.patientMedication.deleteMany({ where: { patientId } });
await prisma.enrollment.deleteMany({ where: { patientId } });
await prisma.alert.deleteMany({ where: { patientId } });

// 2. Delete parent record last
await prisma.patient.delete({ where: { id: patientId } });
```

4. **Error Handling**:
- Always wrap Prisma operations in try/catch
- Log errors with context
- Disconnect Prisma client in finally block or catch block

5. **Console Output**:
- Use emoji for visual clarity (✅ ❌ 📊 🌱 ⚠️)
- Provide clear progress indicators
- Summarize actions taken at the end

6. **Documentation**:
- Add purpose comment at top of file
- Document expected preconditions
- Explain what data will be created/modified/deleted

---

### Additional Utility Scripts

#### seed-triage-queue-test-data.js
**Purpose**: Seed test data specifically for triage queue functionality testing

**Usage**:
```bash
node scripts/seed-triage-queue-test-data.js
```

**What it creates**:
- Test patients with various alert severities and priorities
- Pre-configured alerts in different states (PENDING, ACKNOWLEDGED, RESOLVED)
- Risk scores and SLA breach times for queue testing

**Use case**: Testing prioritized triage queue, alert claiming, and risk stratification features

---

#### setup-test-data.js
**Purpose**: General-purpose test data seeding for development and testing environments

**Usage**:
```bash
node scripts/setup-test-data.js
```

**What it creates**:
- Sample patients, clinicians, and enrollments
- Observations and assessments
- Alert rules and triggered alerts
- Complete dataset for comprehensive testing

**Use case**: Initial setup of development environment with realistic test data

---

#### generate-api-docs.js
**Purpose**: Generate API documentation from route definitions

**Usage**:
```bash
node scripts/generate-api-docs.js
```

**What it does**:
- Scans route files in `src/routes/`
- Extracts endpoint definitions, methods, and parameters
- Generates structured API documentation

**Output**: API documentation in markdown or JSON format

**Use case**: Keeping API documentation in sync with route definitions

---

#### generate-schema-reference.js
**Purpose**: Generate database schema reference documentation from Prisma schema

**Usage**:
```bash
node scripts/generate-schema-reference.js
```

**What it does**:
- Parses `prisma/schema.prisma`
- Extracts model definitions, fields, relationships
- Generates comprehensive schema documentation

**Output**: Database schema reference documentation

**Use case**: Auto-generating developer documentation for database structure

---

### Archived Scripts

The following scripts have been moved to `archive/old-scripts/` as they were one-time setup or debugging tools:

**Setup Scripts** (completed their purpose):
- `add-billing-prerequisites-simple.js` - Added initial billing program data
- `add-billing-prerequisites.js` - Seeded comprehensive billing configuration
- `add-missing-assessment-templates.js` - Populated missing templates
- `link-alert-rules-to-presets.js` - Linked existing alert rules to condition presets
- `seed-enrollments-with-billing.js` - Created test enrollments with billing programs
- `create-test-billing-user.js` - Created test user for billing features

**Debugging Scripts** (issue-specific tools):
- `check-carol-data.js` - Inspected Carol test patient data
- `test-carol-billing.js` - Tested billing calculations for Carol
- `check-standardized-data.js` - Verified standardized condition presets
- `inspect-billing-api.js` - Debugging tool for billing API
- `inspect-billing-data.js` - Database inspection for billing data
- `create-alerts-via-api.js` - Alert creation testing tool
- `create-test-alerts.js` - Generated test alerts

**Removed**: `scripts/testing/` folder (5 outdated alert testing scripts superseded by main scripts)

---

**Last Updated**: 2025-10-17
**Maintainer**: Development Team
**Review Frequency**: Update after each schema change or new feature addition
