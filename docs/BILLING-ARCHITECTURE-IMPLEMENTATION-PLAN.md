# Billing Architecture Implementation Plan

> Created: 2025-10-16
> Status: Proposed
> Priority: Critical

## Executive Summary

This document outlines the implementation plan to fix the critical billing architecture flaw identified in the production implementation strategy review. The current system collects data first and then tries to determine billing eligibility, which is backwards. This plan restructures the architecture to follow the correct flow: **Verify Eligibility → Enroll → Track → Calculate Billing Readiness**.

## Problem Statement

### Current (Incorrect) Flow
```
Patient → Create Enrollment → Collect Observations (no program link)
                            → Log Time (no program link)
                            → Try to determine billing eligibility afterward
```

**Issues:**
- No way to track which observations count toward billing requirements
- No way to track which time logs count toward specific programs
- Cannot determine if patient was eligible at time of enrollment
- Cannot calculate "16 days of readings" or "20 minutes of clinical time" per program
- Billing compliance risk (billing for ineligible patients)

### Correct Flow
```
Patient → Verify Eligibility → Enroll in Program → Link All Data to Enrollment → Calculate Billing Readiness
```

**Benefits:**
- Clear billing eligibility trail (who verified, when, based on what criteria)
- All observations linked to specific enrollment/program
- All time logs linked to specific enrollment/program
- Automated billing readiness calculations
- CMS compliance (only bill for eligible patients)
- Clear audit trail for regulatory review

## Implementation Phases

### Phase 1: Schema Changes (1-2 days)

#### 1.1 Add Billing Eligibility to Enrollment Model

**File**: `prisma/schema.prisma`

```prisma
model Enrollment {
  // ... existing fields

  // NEW: Billing eligibility tracking
  billingEligibility Json? // {
                           //   eligible: true,
                           //   eligibilityDate: "2025-10-01",
                           //   chronicConditions: ["E11.9", "I10"],
                           //   eligibilityCriteria: {
                           //     hasMedicare: true,
                           //     hasChronicConditions: true,
                           //     conditionCount: 2,
                           //     expectedToLast90Days: true,
                           //     consentObtained: true
                           //   },
                           //   verifiedBy: "clinician-id",
                           //   verifiedAt: "2025-10-01T10:30:00Z",
                           //   notes: "Patient meets CCM criteria..."
                           // }

  // ... rest of model
}
```

**Rationale**: This JSON field captures the complete eligibility verification at enrollment time, creating an audit trail for CMS compliance.

#### 1.2 Make Observation.enrollmentId Required (with Migration Strategy)

**Current**:
```prisma
model Observation {
  // ... fields
  enrollmentId String? // OPTIONAL
  // ...
}
```

**Target**:
```prisma
model Observation {
  // ... fields
  enrollmentId String  // REQUIRED for billing-eligible observations
  // ...
}
```

**Migration Strategy**:
1. First add `enrollmentId` as optional (already exists)
2. Write data migration script to populate existing observations
3. After all observations have enrollmentId, make field required
4. Update API validation to enforce enrollmentId

#### 1.3 Add TimeLog.enrollmentId

**File**: `prisma/schema.prisma`

```prisma
model TimeLog {
  id           String   @id @default(cuid())
  userId       String
  patientId    String
  enrollmentId String?  // NEW: Link time to specific program
  duration     Int      // Duration in minutes
  activityType String   // e.g., "Care Coordination", "Assessment Review"
  cptCode      String?  // CPT code for billing (99490, 99457, etc.)
  billable     Boolean  @default(true)
  notes        String?
  loggedAt     DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relationships
  user       User       @relation(fields: [userId], references: [id])
  patient    Patient    @relation(fields: [patientId], references: [id], onDelete: Cascade)
  enrollment Enrollment? @relation(fields: [enrollmentId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([patientId])
  @@index([enrollmentId])
  @@index([loggedAt])
  @@index([cptCode])
  @@map("time_logs")
}
```

**Rationale**: Links clinical time to specific enrollments, enabling per-program billing calculations.

#### 1.4 Migration File

**File**: `prisma/migrations/[timestamp]_add_billing_eligibility_tracking/migration.sql`

```sql
-- Step 1: Add billingEligibility to enrollments
ALTER TABLE "enrollments"
ADD COLUMN "billingEligibility" JSONB;

-- Step 2: Add enrollmentId to time_logs
ALTER TABLE "time_logs"
ADD COLUMN "enrollmentId" TEXT;

-- Step 3: Create index for enrollmentId in time_logs
CREATE INDEX "time_logs_enrollmentId_idx" ON "time_logs"("enrollmentId");

-- Step 4: Add foreign key constraint
ALTER TABLE "time_logs"
ADD CONSTRAINT "time_logs_enrollmentId_fkey"
FOREIGN KEY ("enrollmentId")
REFERENCES "enrollments"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 5: Comment on observations.enrollmentId requirement
COMMENT ON COLUMN "observations"."enrollmentId" IS 'Will be required after data migration. Links observation to specific program enrollment for billing tracking.';
```

### Phase 2: Data Migration Scripts (2-3 days)

#### 2.1 Migrate Existing Observations

**File**: `scripts/migrate-observations-to-enrollments.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateObservations() {
  console.log('Starting observation migration...');

  // Get all observations without enrollmentId
  const observations = await prisma.observation.findMany({
    where: { enrollmentId: null },
    include: { patient: true }
  });

  console.log(`Found ${observations.length} observations without enrollmentId`);

  let migrated = 0;
  let skipped = 0;

  for (const obs of observations) {
    // Find active enrollment for this patient at observation time
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: obs.patientId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        enrolledAt: { lte: obs.recordedAt }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    if (enrollment) {
      await prisma.observation.update({
        where: { id: obs.id },
        data: { enrollmentId: enrollment.id }
      });
      migrated++;
    } else {
      console.warn(`No enrollment found for observation ${obs.id} (patient ${obs.patientId})`);
      skipped++;
    }

    if (migrated % 100 === 0) {
      console.log(`Progress: ${migrated} migrated, ${skipped} skipped`);
    }
  }

  console.log(`Migration complete: ${migrated} observations migrated, ${skipped} skipped`);

  // Verify
  const remaining = await prisma.observation.count({
    where: { enrollmentId: null }
  });

  console.log(`Remaining observations without enrollmentId: ${remaining}`);
}

migrateObservations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

#### 2.2 Migrate Existing Time Logs

**File**: `scripts/migrate-timelogs-to-enrollments.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateTimeLogs() {
  console.log('Starting time log migration...');

  // Get all time logs without enrollmentId
  const timeLogs = await prisma.timeLog.findMany({
    where: { enrollmentId: null },
    include: { patient: true }
  });

  console.log(`Found ${timeLogs.length} time logs without enrollmentId`);

  let migrated = 0;
  let skipped = 0;

  for (const log of timeLogs) {
    // Find active enrollment for this patient at log time
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: log.patientId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        enrolledAt: { lte: log.loggedAt }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    if (enrollment) {
      await prisma.timeLog.update({
        where: { id: log.id },
        data: { enrollmentId: enrollment.id }
      });
      migrated++;
    } else {
      console.warn(`No enrollment found for time log ${log.id} (patient ${log.patientId})`);
      skipped++;
    }

    if (migrated % 100 === 0) {
      console.log(`Progress: ${migrated} migrated, ${skipped} skipped`);
    }
  }

  console.log(`Migration complete: ${migrated} time logs migrated, ${skipped} skipped`);

  // Verify
  const remaining = await prisma.timeLog.count({
    where: { enrollmentId: null }
  });

  console.log(`Remaining time logs without enrollmentId: ${remaining}`);
}

migrateTimeLogs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Phase 3: Billing Readiness Service (3-4 days)

#### 3.1 Create Billing Readiness Service

**File**: `src/services/billingReadinessService.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate RPM (Remote Patient Monitoring) billing readiness
 * Requirements:
 * - CPT 99453: Initial setup and patient education (one-time)
 * - CPT 99454: Device supply with daily recording/transmission (16+ days)
 * - CPT 99457: First 20 minutes of clinical time
 * - CPT 99458: Each additional 20 minutes
 */
async function calculateRPMReadiness(enrollmentId, month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { patient: true, program: true }
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`);
  }

  // Check if patient is eligible for billing
  if (!enrollment.billingEligibility?.eligible) {
    return {
      enrollmentId,
      program: 'RPM',
      month,
      year,
      eligible: false,
      reason: 'Patient not verified as billing-eligible',
      billableCodes: []
    };
  }

  // Count unique days with device readings
  const observations = await prisma.observation.findMany({
    where: {
      enrollmentId,
      source: 'DEVICE',
      recordedAt: { gte: startOfMonth, lte: endOfMonth }
    },
    select: { recordedAt: true }
  });

  const uniqueDays = new Set(
    observations.map(o => o.recordedAt.toISOString().split('T')[0])
  ).size;

  // Calculate clinical time
  const timeAgg = await prisma.timeLog.aggregate({
    where: {
      enrollmentId,
      loggedAt: { gte: startOfMonth, lte: endOfMonth },
      billable: true,
      cptCode: { in: ['99457', '99458'] }
    },
    _sum: { duration: true }
  });

  const totalMinutes = timeAgg._sum.duration || 0;

  // Check for initial setup (99453)
  const hasInitialSetup = await prisma.timeLog.findFirst({
    where: {
      enrollmentId,
      cptCode: '99453',
      loggedAt: { lte: endOfMonth }
    }
  });

  // Determine billable CPT codes
  const billableCodes = [];

  if (hasInitialSetup) {
    billableCodes.push({
      code: '99453',
      description: 'Initial setup and patient education',
      eligible: true,
      status: 'completed'
    });
  }

  if (uniqueDays >= 16) {
    billableCodes.push({
      code: '99454',
      description: 'Device supply with daily recording (16+ days)',
      eligible: true,
      daysRecorded: uniqueDays
    });
  } else {
    billableCodes.push({
      code: '99454',
      description: 'Device supply with daily recording (16+ days)',
      eligible: false,
      daysRecorded: uniqueDays,
      daysNeeded: 16 - uniqueDays
    });
  }

  if (totalMinutes >= 20) {
    billableCodes.push({
      code: '99457',
      description: 'First 20 minutes of clinical time',
      eligible: true,
      minutesLogged: Math.min(totalMinutes, 20)
    });

    // Additional 20-minute blocks
    const additionalBlocks = Math.floor((totalMinutes - 20) / 20);
    if (additionalBlocks > 0) {
      billableCodes.push({
        code: '99458',
        description: `Additional 20-minute blocks (${additionalBlocks})`,
        eligible: true,
        blocks: additionalBlocks,
        minutesLogged: additionalBlocks * 20
      });
    }
  } else {
    billableCodes.push({
      code: '99457',
      description: 'First 20 minutes of clinical time',
      eligible: false,
      minutesLogged: totalMinutes,
      minutesNeeded: 20 - totalMinutes
    });
  }

  const allEligible = billableCodes.every(c => c.eligible);

  return {
    enrollmentId,
    patientId: enrollment.patientId,
    patientName: `${enrollment.patient.firstName} ${enrollment.patient.lastName}`,
    program: 'RPM',
    programName: enrollment.program.name,
    month,
    year,
    eligible: allEligible,
    readingDays: uniqueDays,
    clinicalTimeMinutes: totalMinutes,
    billableCodes,
    billingEligibility: enrollment.billingEligibility
  };
}

/**
 * Calculate RTM (Remote Therapeutic Monitoring) billing readiness
 * Requirements:
 * - CPT 98975: Initial setup (one-time)
 * - CPT 98976: Device supply with data transmission (16+ days)
 * - CPT 98977: First 20 minutes of treatment management
 * - CPT 98980: Each additional 20 minutes (respiratory only)
 * - CPT 98981: Each additional 20 minutes (musculoskeletal)
 */
async function calculateRTMReadiness(enrollmentId, month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { patient: true, program: true }
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`);
  }

  if (!enrollment.billingEligibility?.eligible) {
    return {
      enrollmentId,
      program: 'RTM',
      month,
      year,
      eligible: false,
      reason: 'Patient not verified as billing-eligible',
      billableCodes: []
    };
  }

  // Count unique days with therapeutic data
  const observations = await prisma.observation.findMany({
    where: {
      enrollmentId,
      recordedAt: { gte: startOfMonth, lte: endOfMonth },
      context: { in: ['CLINICAL_MONITORING', 'PROGRAM_ENROLLMENT'] }
    },
    select: { recordedAt: true }
  });

  const uniqueDays = new Set(
    observations.map(o => o.recordedAt.toISOString().split('T')[0])
  ).size;

  // Calculate treatment management time
  const timeAgg = await prisma.timeLog.aggregate({
    where: {
      enrollmentId,
      loggedAt: { gte: startOfMonth, lte: endOfMonth },
      billable: true,
      cptCode: { in: ['98977', '98980', '98981'] }
    },
    _sum: { duration: true }
  });

  const totalMinutes = timeAgg._sum.duration || 0;

  // Check for initial setup
  const hasInitialSetup = await prisma.timeLog.findFirst({
    where: {
      enrollmentId,
      cptCode: '98975',
      loggedAt: { lte: endOfMonth }
    }
  });

  const billableCodes = [];

  if (hasInitialSetup) {
    billableCodes.push({
      code: '98975',
      description: 'Initial setup and patient education',
      eligible: true,
      status: 'completed'
    });
  }

  if (uniqueDays >= 16) {
    billableCodes.push({
      code: '98976',
      description: 'Device supply with data transmission (16+ days)',
      eligible: true,
      daysRecorded: uniqueDays
    });
  } else {
    billableCodes.push({
      code: '98976',
      description: 'Device supply with data transmission (16+ days)',
      eligible: false,
      daysRecorded: uniqueDays,
      daysNeeded: 16 - uniqueDays
    });
  }

  if (totalMinutes >= 20) {
    billableCodes.push({
      code: '98977',
      description: 'First 20 minutes of treatment management',
      eligible: true,
      minutesLogged: Math.min(totalMinutes, 20)
    });

    const additionalBlocks = Math.floor((totalMinutes - 20) / 20);
    if (additionalBlocks > 0) {
      // Determine if respiratory or musculoskeletal based on program
      const cptCode = enrollment.program.name.includes('Respiratory') ? '98980' : '98981';
      billableCodes.push({
        code: cptCode,
        description: `Additional 20-minute blocks (${additionalBlocks})`,
        eligible: true,
        blocks: additionalBlocks,
        minutesLogged: additionalBlocks * 20
      });
    }
  } else {
    billableCodes.push({
      code: '98977',
      description: 'First 20 minutes of treatment management',
      eligible: false,
      minutesLogged: totalMinutes,
      minutesNeeded: 20 - totalMinutes
    });
  }

  const allEligible = billableCodes.every(c => c.eligible);

  return {
    enrollmentId,
    patientId: enrollment.patientId,
    patientName: `${enrollment.patient.firstName} ${enrollment.patient.lastName}`,
    program: 'RTM',
    programName: enrollment.program.name,
    month,
    year,
    eligible: allEligible,
    dataDays: uniqueDays,
    treatmentTimeMinutes: totalMinutes,
    billableCodes,
    billingEligibility: enrollment.billingEligibility
  };
}

/**
 * Calculate CCM (Chronic Care Management) billing readiness
 * Requirements:
 * - CPT 99490: First 20 minutes of CCM services
 * - CPT 99439: Each additional 20 minutes
 * - CPT 99491: First 30 minutes of complex CCM
 * - Requires 2+ chronic conditions expected to last 12+ months
 */
async function calculateCCMReadiness(enrollmentId, month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { patient: true, program: true }
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`);
  }

  if (!enrollment.billingEligibility?.eligible) {
    return {
      enrollmentId,
      program: 'CCM',
      month,
      year,
      eligible: false,
      reason: 'Patient not verified as billing-eligible',
      billableCodes: []
    };
  }

  // Verify chronic conditions requirement
  const conditionCount = enrollment.billingEligibility?.eligibilityCriteria?.conditionCount || 0;
  if (conditionCount < 2) {
    return {
      enrollmentId,
      program: 'CCM',
      month,
      year,
      eligible: false,
      reason: 'Requires 2+ chronic conditions',
      billableCodes: []
    };
  }

  // Calculate care coordination time
  const timeAgg = await prisma.timeLog.aggregate({
    where: {
      enrollmentId,
      loggedAt: { gte: startOfMonth, lte: endOfMonth },
      billable: true,
      cptCode: { in: ['99490', '99439', '99491'] }
    },
    _sum: { duration: true }
  });

  const totalMinutes = timeAgg._sum.duration || 0;

  const billableCodes = [];

  // Determine if complex CCM (30-minute threshold)
  const isComplex = totalMinutes >= 30;

  if (isComplex) {
    billableCodes.push({
      code: '99491',
      description: 'Complex CCM - First 30 minutes',
      eligible: true,
      minutesLogged: Math.min(totalMinutes, 30)
    });

    const additionalBlocks = Math.floor((totalMinutes - 30) / 20);
    if (additionalBlocks > 0) {
      billableCodes.push({
        code: '99439',
        description: `Additional 20-minute blocks (${additionalBlocks})`,
        eligible: true,
        blocks: additionalBlocks,
        minutesLogged: additionalBlocks * 20
      });
    }
  } else if (totalMinutes >= 20) {
    billableCodes.push({
      code: '99490',
      description: 'Standard CCM - First 20 minutes',
      eligible: true,
      minutesLogged: Math.min(totalMinutes, 20)
    });

    const additionalBlocks = Math.floor((totalMinutes - 20) / 20);
    if (additionalBlocks > 0) {
      billableCodes.push({
        code: '99439',
        description: `Additional 20-minute blocks (${additionalBlocks})`,
        eligible: true,
        blocks: additionalBlocks,
        minutesLogged: additionalBlocks * 20
      });
    }
  } else {
    billableCodes.push({
      code: '99490',
      description: 'Standard CCM - First 20 minutes',
      eligible: false,
      minutesLogged: totalMinutes,
      minutesNeeded: 20 - totalMinutes
    });
  }

  const allEligible = billableCodes.every(c => c.eligible);

  return {
    enrollmentId,
    patientId: enrollment.patientId,
    patientName: `${enrollment.patient.firstName} ${enrollment.patient.lastName}`,
    program: 'CCM',
    programName: enrollment.program.name,
    month,
    year,
    eligible: allEligible,
    chronicConditions: conditionCount,
    careCoordinationMinutes: totalMinutes,
    billableCodes,
    billingEligibility: enrollment.billingEligibility
  };
}

/**
 * Calculate billing readiness for all enrollments in an organization
 */
async function calculateOrganizationBillingReadiness(organizationId, month, year) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      patient: { organizationId },
      status: 'ACTIVE'
    },
    include: {
      patient: true,
      program: true
    }
  });

  const results = [];

  for (const enrollment of enrollments) {
    const programType = enrollment.program.programType;

    let readiness;
    if (programType === 'RPM' || programType.includes('Remote Patient')) {
      readiness = await calculateRPMReadiness(enrollment.id, month, year);
    } else if (programType === 'RTM' || programType.includes('Remote Therapeutic')) {
      readiness = await calculateRTMReadiness(enrollment.id, month, year);
    } else if (programType === 'CCM' || programType.includes('Chronic Care')) {
      readiness = await calculateCCMReadiness(enrollment.id, month, year);
    } else {
      continue; // Skip non-billing programs
    }

    results.push(readiness);
  }

  // Calculate summary statistics
  const summary = {
    organizationId,
    month,
    year,
    totalEnrollments: results.length,
    eligibleForBilling: results.filter(r => r.eligible).length,
    notEligible: results.filter(r => !r.eligible).length,
    byProgram: {
      RPM: results.filter(r => r.program === 'RPM'),
      RTM: results.filter(r => r.program === 'RTM'),
      CCM: results.filter(r => r.program === 'CCM')
    },
    enrollments: results
  };

  return summary;
}

module.exports = {
  calculateRPMReadiness,
  calculateRTMReadiness,
  calculateCCMReadiness,
  calculateOrganizationBillingReadiness
};
```

### Phase 4: API Endpoints (2 days)

#### 4.1 Billing Readiness Routes

**File**: `src/routes/billingRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// Get billing readiness for specific enrollment
router.get(
  '/readiness/enrollment/:enrollmentId',
  authenticate,
  checkPermission('BILLING_READ'),
  billingController.getEnrollmentBillingReadiness
);

// Get billing readiness for organization
router.get(
  '/readiness/organization/:organizationId',
  authenticate,
  checkPermission('ORG_BILLING_MANAGE'),
  billingController.getOrganizationBillingReadiness
);

// Get billing report for organization (exportable)
router.get(
  '/report/:organizationId',
  authenticate,
  checkPermission('ORG_BILLING_MANAGE'),
  billingController.getBillingReport
);

module.exports = router;
```

#### 4.2 Billing Controller

**File**: `src/controllers/billingController.js`

```javascript
const billingService = require('../services/billingReadinessService');

/**
 * GET /api/billing/readiness/enrollment/:enrollmentId
 * Query params: month, year
 */
exports.getEnrollmentBillingReadiness = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Determine program type
    const enrollment = await req.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: true }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const programType = enrollment.program.programType;

    let readiness;
    if (programType === 'RPM' || programType.includes('Remote Patient')) {
      readiness = await billingService.calculateRPMReadiness(enrollmentId, month, year);
    } else if (programType === 'RTM' || programType.includes('Remote Therapeutic')) {
      readiness = await billingService.calculateRTMReadiness(enrollmentId, month, year);
    } else if (programType === 'CCM' || programType.includes('Chronic Care')) {
      readiness = await billingService.calculateCCMReadiness(enrollmentId, month, year);
    } else {
      return res.status(400).json({ error: 'Program type not billable' });
    }

    res.json(readiness);
  } catch (error) {
    console.error('Error calculating enrollment billing readiness:', error);
    res.status(500).json({ error: 'Failed to calculate billing readiness' });
  }
};

/**
 * GET /api/billing/readiness/organization/:organizationId
 * Query params: month, year
 */
exports.getOrganizationBillingReadiness = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const summary = await billingService.calculateOrganizationBillingReadiness(
      organizationId,
      month,
      year
    );

    res.json(summary);
  } catch (error) {
    console.error('Error calculating organization billing readiness:', error);
    res.status(500).json({ error: 'Failed to calculate billing readiness' });
  }
};

/**
 * GET /api/billing/report/:organizationId
 * Generate exportable billing report (CSV)
 */
exports.getBillingReport = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const format = req.query.format || 'json'; // json or csv

    const summary = await billingService.calculateOrganizationBillingReadiness(
      organizationId,
      month,
      year
    );

    if (format === 'csv') {
      // Generate CSV
      const csv = generateBillingCSV(summary);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=billing-report-${year}-${month}.csv`);
      return res.send(csv);
    }

    res.json(summary);
  } catch (error) {
    console.error('Error generating billing report:', error);
    res.status(500).json({ error: 'Failed to generate billing report' });
  }
};

function generateBillingCSV(summary) {
  const headers = [
    'Patient ID',
    'Patient Name',
    'Program',
    'Eligible',
    'Days/Minutes',
    'Billable Codes',
    'Status'
  ];

  const rows = summary.enrollments.map(e => [
    e.patientId,
    e.patientName,
    e.program,
    e.eligible ? 'Yes' : 'No',
    e.readingDays || e.dataDays || e.chronicConditions || '',
    e.billableCodes.filter(c => c.eligible).map(c => c.code).join(', '),
    e.eligible ? 'Ready to Bill' : 'Not Ready'
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

module.exports = exports;
```

### Phase 5: Enrollment Workflow Updates (2-3 days)

#### 5.1 Update Enrollment Controller

**File**: `src/controllers/enrollmentController.js`

Add eligibility verification step before enrollment:

```javascript
exports.createEnrollment = async (req, res) => {
  try {
    const {
      patientId,
      programId,
      assignedClinicianId,
      billingEligibility // NEW: Required for billing programs
    } = req.body;

    const program = await req.prisma.careProgram.findUnique({
      where: { id: programId }
    });

    // If billing program, require eligibility verification
    const billingPrograms = ['RPM', 'RTM', 'CCM'];
    const isBillingProgram = billingPrograms.some(p =>
      program.programType.includes(p)
    );

    if (isBillingProgram && !billingEligibility) {
      return res.status(400).json({
        error: 'Billing eligibility verification required for this program',
        required: {
          eligible: 'boolean',
          eligibilityDate: 'ISO date',
          chronicConditions: 'array of ICD-10 codes',
          eligibilityCriteria: 'object',
          verifiedBy: 'clinician ID',
          verifiedAt: 'ISO timestamp',
          notes: 'string (optional)'
        }
      });
    }

    // Validate eligibility data if provided
    if (billingEligibility) {
      if (!billingEligibility.eligible) {
        return res.status(400).json({
          error: 'Cannot enroll patient marked as not billing-eligible',
          hint: 'Verify patient meets program requirements first'
        });
      }

      if (!billingEligibility.verifiedBy || !billingEligibility.verifiedAt) {
        return res.status(400).json({
          error: 'Eligibility verification requires verifiedBy and verifiedAt'
        });
      }
    }

    const enrollment = await req.prisma.enrollment.create({
      data: {
        patientId,
        programId,
        assignedClinicianId,
        billingEligibility, // Store eligibility verification
        status: 'ACTIVE',
        enrolledAt: new Date()
      },
      include: {
        patient: true,
        program: true,
        assignedClinician: true
      }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
};
```

#### 5.2 Update Observation Controller

**File**: `src/controllers/observationController.js`

Enforce enrollmentId requirement:

```javascript
exports.createObservation = async (req, res) => {
  try {
    const {
      patientId,
      metricDefinitionId,
      enrollmentId, // NOW REQUIRED for billing-eligible observations
      value,
      source,
      context
    } = req.body;

    // Require enrollmentId for device-based and clinical monitoring
    if (!enrollmentId && (source === 'DEVICE' || context === 'CLINICAL_MONITORING')) {
      return res.status(400).json({
        error: 'enrollmentId required for device readings and clinical monitoring',
        hint: 'Link observation to specific program enrollment for billing tracking'
      });
    }

    // Verify enrollment exists and is active
    if (enrollmentId) {
      const enrollment = await req.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { program: true }
      });

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      if (enrollment.status !== 'ACTIVE') {
        return res.status(400).json({
          error: 'Cannot add observations to inactive enrollment',
          enrollmentStatus: enrollment.status
        });
      }

      // Verify patient matches enrollment
      if (enrollment.patientId !== patientId) {
        return res.status(400).json({
          error: 'Patient ID does not match enrollment'
        });
      }
    }

    const observation = await req.prisma.observation.create({
      data: {
        patientId,
        metricDefinitionId,
        enrollmentId,
        value,
        source,
        context,
        recordedAt: new Date()
      },
      include: {
        patient: true,
        metricDefinition: true,
        enrollment: {
          include: { program: true }
        }
      }
    });

    res.status(201).json(observation);
  } catch (error) {
    console.error('Error creating observation:', error);
    res.status(500).json({ error: 'Failed to create observation' });
  }
};
```

#### 5.3 Update Time Log Controller

**File**: `src/controllers/timeLogController.js`

Add enrollmentId support:

```javascript
exports.createTimeLog = async (req, res) => {
  try {
    const {
      patientId,
      enrollmentId, // NEW: Link time to specific enrollment
      duration,
      activityType,
      cptCode,
      billable,
      notes
    } = req.body;

    // If CPT code is billing-related, require enrollmentId
    const billingCPTCodes = [
      '99453', '99454', '99457', '99458', // RPM
      '98975', '98976', '98977', '98980', '98981', // RTM
      '99490', '99439', '99491' // CCM
    ];

    if (cptCode && billingCPTCodes.includes(cptCode) && !enrollmentId) {
      return res.status(400).json({
        error: 'enrollmentId required for billing-related CPT codes',
        hint: 'Link time log to specific program enrollment for billing tracking'
      });
    }

    // Verify enrollment if provided
    if (enrollmentId) {
      const enrollment = await req.prisma.enrollment.findUnique({
        where: { id: enrollmentId }
      });

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      if (enrollment.patientId !== patientId) {
        return res.status(400).json({
          error: 'Patient ID does not match enrollment'
        });
      }
    }

    const timeLog = await req.prisma.timeLog.create({
      data: {
        userId: req.user.id,
        patientId,
        enrollmentId,
        duration,
        activityType,
        cptCode,
        billable,
        notes,
        loggedAt: new Date()
      },
      include: {
        user: true,
        patient: true,
        enrollment: {
          include: { program: true }
        }
      }
    });

    res.status(201).json(timeLog);
  } catch (error) {
    console.error('Error creating time log:', error);
    res.status(500).json({ error: 'Failed to create time log' });
  }
};
```

### Phase 6: Frontend Updates (3-4 days)

#### 6.1 Billing Readiness Dashboard Component

**File**: `frontend/src/pages/BillingReadiness.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../services/api';

export default function BillingReadiness() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedOrg, setSelectedOrg] = useState(null);

  const { data: billingData, isLoading } = useQuery({
    queryKey: ['billing-readiness', selectedOrg, month, year],
    queryFn: () => fetchWithAuth(`/api/billing/readiness/organization/${selectedOrg}?month=${month}&year=${year}`),
    enabled: !!selectedOrg
  });

  const downloadReport = () => {
    window.open(
      `/api/billing/report/${selectedOrg}?month=${month}&year=${year}&format=csv`,
      '_blank'
    );
  };

  if (isLoading) return <div>Loading billing readiness...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Billing Readiness Dashboard</h1>
        <div className="flex gap-4">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>
                {new Date(2025, m-1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={downloadReport}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {billingData && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Enrollments</h3>
              <p className="text-3xl font-bold">{billingData.totalEnrollments}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Ready to Bill</h3>
              <p className="text-3xl font-bold text-green-600">
                {billingData.eligibleForBilling}
              </p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Not Ready</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {billingData.notEligible}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Billable Codes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingData.enrollments.map(enrollment => (
                  <tr key={enrollment.enrollmentId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {enrollment.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {enrollment.program}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {enrollment.eligible ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Ready
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          Not Ready
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {enrollment.billableCodes
                          .filter(c => c.eligible)
                          .map(code => (
                            <span
                              key={code.code}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              {code.code}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {enrollment.program === 'RPM' && (
                        <span>{enrollment.readingDays}/16 days, {enrollment.clinicalTimeMinutes} min</span>
                      )}
                      {enrollment.program === 'RTM' && (
                        <span>{enrollment.dataDays}/16 days, {enrollment.treatmentTimeMinutes} min</span>
                      )}
                      {enrollment.program === 'CCM' && (
                        <span>{enrollment.careCoordinationMinutes}/20 min, {enrollment.chronicConditions} conditions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

#### 6.2 Enrollment Form with Eligibility Verification

**File**: `frontend/src/components/EnrollmentFormWithEligibility.jsx`

```javascript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function EnrollmentFormWithEligibility({ patient, programs, onSubmit }) {
  const { register, handleSubmit, watch, setValue } = useForm();
  const [showEligibility, setShowEligibility] = useState(false);

  const selectedProgramId = watch('programId');
  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  const isBillingProgram = selectedProgram?.programType &&
    ['RPM', 'RTM', 'CCM'].some(type => selectedProgram.programType.includes(type));

  React.useEffect(() => {
    setShowEligibility(isBillingProgram);
  }, [isBillingProgram]);

  const onFormSubmit = (data) => {
    const enrollmentData = {
      ...data,
      billingEligibility: showEligibility ? {
        eligible: data.eligible,
        eligibilityDate: new Date().toISOString(),
        chronicConditions: data.chronicConditions?.split(',').map(s => s.trim()),
        eligibilityCriteria: {
          hasMedicare: data.hasMedicare,
          hasChronicConditions: data.hasChronicConditions,
          conditionCount: parseInt(data.conditionCount || 0),
          expectedToLast90Days: data.expectedToLast90Days,
          consentObtained: data.consentObtained
        },
        verifiedBy: data.verifiedBy,
        verifiedAt: new Date().toISOString(),
        notes: data.eligibilityNotes
      } : null
    };

    onSubmit(enrollmentData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Program</label>
        <select
          {...register('programId', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300"
        >
          <option value="">Select a program...</option>
          {programs.map(program => (
            <option key={program.id} value={program.id}>
              {program.name} ({program.programType})
            </option>
          ))}
        </select>
      </div>

      {showEligibility && (
        <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Billing Eligibility Verification</h3>
          <p className="text-sm text-gray-600 mb-4">
            This is a billing program. Please verify patient eligibility before enrollment.
          </p>

          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('eligible', { required: true })}
                  className="mr-2"
                />
                <span className="text-sm">Patient is eligible for billing</span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('hasMedicare')}
                  className="mr-2"
                />
                <span className="text-sm">Has Medicare/qualifying insurance</span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('hasChronicConditions')}
                  className="mr-2"
                />
                <span className="text-sm">Has 2+ chronic conditions (CCM requirement)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Chronic Conditions (ICD-10 codes, comma-separated)
              </label>
              <input
                type="text"
                {...register('chronicConditions')}
                placeholder="E11.9, I10"
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Number of Chronic Conditions
              </label>
              <input
                type="number"
                {...register('conditionCount')}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('expectedToLast90Days')}
                  className="mr-2"
                />
                <span className="text-sm">Conditions expected to last 90+ days</span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('consentObtained')}
                  className="mr-2"
                />
                <span className="text-sm">Patient consent obtained</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Verified By (Clinician ID)
              </label>
              <input
                type="text"
                {...register('verifiedBy', { required: showEligibility })}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Eligibility Notes (Optional)
              </label>
              <textarea
                {...register('eligibilityNotes')}
                rows="3"
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Assigned Clinician</label>
        <select
          {...register('assignedClinicianId', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300"
        >
          <option value="">Select clinician...</option>
          {/* Populate with clinicians */}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
      >
        Create Enrollment
      </button>
    </form>
  );
}
```

## Implementation Timeline

### Week 1: Schema Changes & Migrations
- **Day 1-2**: Schema changes, create migration, test in development
- **Day 3**: Data migration scripts (observations, time logs)
- **Day 4**: Run migrations in development, verify data integrity
- **Day 5**: Documentation updates, review

### Week 2: Billing Service & API
- **Day 1-2**: Billing readiness service (RPM, RTM, CCM functions)
- **Day 3**: API routes and controllers
- **Day 4**: Unit tests for billing calculations
- **Day 5**: Integration testing

### Week 3: Frontend & Workflow Updates
- **Day 1-2**: Billing readiness dashboard component
- **Day 3**: Enrollment form with eligibility verification
- **Day 4**: Update observation and time log forms
- **Day 5**: Integration testing, bug fixes

### Week 4: Testing & Deployment
- **Day 1-2**: End-to-end testing, edge cases
- **Day 3**: Documentation, training materials
- **Day 4**: Staging deployment, user acceptance testing
- **Day 5**: Production deployment, monitoring

## Testing Strategy

### Unit Tests
- Billing calculation functions (RPM, RTM, CCM)
- Eligibility verification logic
- Data migration scripts (dry run)

### Integration Tests
- Enrollment workflow with eligibility verification
- Observation creation with enrollmentId validation
- Time log creation with enrollmentId validation
- Billing readiness API endpoints

### End-to-End Tests
- Complete patient enrollment flow
- Device observation ingestion linked to enrollment
- Time logging linked to enrollment
- Billing readiness dashboard display
- CSV export functionality

### Edge Cases to Test
- Patient with multiple active enrollments
- Enrollment status changes (active → completed → inactive)
- Observations recorded before enrollment date
- Time logs without enrollmentId (grandfathered data)
- Invalid eligibility data

## Rollback Plan

If critical issues arise:

1. **Schema Rollback**: Keep migration files for rollback
   ```bash
   npx prisma migrate resolve --rolled-back [migration-name]
   ```

2. **API Versioning**: Keep v1 endpoints active during transition
   - `/api/v1/enrollments` (old)
   - `/api/v2/enrollments` (new with eligibility)

3. **Feature Flag**: Add `ENABLE_BILLING_ELIGIBILITY` env variable
   ```javascript
   if (process.env.ENABLE_BILLING_ELIGIBILITY === 'true') {
     // New billing logic
   } else {
     // Old logic
   }
   ```

4. **Database Backup**: Full backup before production migration

## Success Criteria

### Technical
- ✅ All enrollments in billing programs have `billingEligibility` data
- ✅ All device observations have `enrollmentId`
- ✅ All billing-related time logs have `enrollmentId`
- ✅ Billing readiness calculations match manual calculations (spot check 10 patients)
- ✅ API response times < 500ms for billing readiness queries
- ✅ No cross-enrollment data leakage

### Compliance
- ✅ Clear audit trail showing who verified eligibility and when
- ✅ Cannot enroll patient in billing program without eligibility verification
- ✅ Cannot create device observation without enrollmentId
- ✅ Billing reports include only verified-eligible patients

### User Experience
- ✅ Enrollment form clearly indicates billing eligibility requirements
- ✅ Billing dashboard loads in < 2 seconds
- ✅ CSV export includes all required billing data
- ✅ Clinicians can quickly identify which patients are ready to bill

## Documentation Updates

### Files to Update
1. `docs/developer-reference.md` - Add billingEligibility field documentation
2. `docs/api-endpoints-generated.md` - Document new billing API endpoints
3. `CLAUDE.md` - Update with billing workflow guidelines
4. `README.md` - Add billing readiness feature documentation

### Training Materials Needed
1. "Billing Eligibility Verification" guide for clinicians
2. "Billing Readiness Dashboard" user manual
3. "Enrollment Workflow" video tutorial
4. API integration guide for device vendors

## Next Steps

1. **Review this plan** with stakeholders (Product Owner, Clinical Director, Tech Lead)
2. **Approve schema changes** and migration strategy
3. **Schedule implementation** (4-week timeline)
4. **Assign tasks** to development team
5. **Set up staging environment** for testing
6. **Create backup plan** for production database
7. **Begin Week 1 tasks** once approved

---

**Status**: Awaiting approval to proceed with implementation
**Owner**: Development Team
**Estimated Effort**: 4 weeks (1 developer full-time)
**Risk Level**: Medium (requires data migration and workflow changes)
**Priority**: Critical (compliance and billing accuracy)
