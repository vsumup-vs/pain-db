# enrollmentId Linkage Implementation Plan

> Date: 2025-10-17
> Status: 🚧 In Progress
> Priority: P0 - Critical for accurate billing

## Purpose

Link **TimeLog** and **Observation** records to specific **Enrollment** records to ensure accurate billing calculations. Without this linkage, the billing readiness service cannot determine which observations and time logs count toward specific billing programs.

## Problem Statement

**Current Issue**: TimeLog and Observation records are created without `enrollmentId`, making it impossible to accurately calculate:
- Which device readings count toward "16 days of data" for RPM billing
- Which clinical time logs count toward "20 minutes" for RTM billing
- Which activities should bill to which program when a patient is enrolled in multiple programs (e.g., both RPM and RTM)

**Example Scenario**:
- Patient enrolled in **BOTH** RPM (blood pressure monitoring) and RTM (pain therapy) programs
- Clinician spends 25 minutes on pain therapy session (should bill to RTM enrollment)
- Blood pressure observations recorded (should bill to RPM enrollment)
- Without `enrollmentId`, system cannot distinguish which logs/observations belong to which program

## Database Schema Status

✅ **Schema fields already exist**:
- `TimeLog.enrollmentId` (line 708 in schema.prisma)
- `Observation.enrollmentId` (line 584 in schema.prisma)
- Both are optional (`String?`) to allow gradual migration

## Implementation Strategy

### **Strategy**: Find Active Billing-Enabled Enrollment

For each TimeLog and Observation creation, automatically link to the patient's active enrollment that has a `billingProgramId`.

**Enrollment Selection Logic**:
```javascript
async function findBillingEnrollment(patientId, organizationId, tx = prisma) {
  // Find active enrollment with billing program
  const enrollment = await tx.enrollment.findFirst({
    where: {
      patientId,
      organizationId,
      billingProgramId: { not: null }, // Must have billing program
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    },
    orderBy: {
      startDate: 'desc' // Prefer most recent enrollment
    }
  });

  return enrollment?.id || null;
}
```

**Fallback Behavior**:
- If **multiple** active enrollments with billing programs exist: Use most recent
- If **no** billing enrollments exist: Leave `enrollmentId` as `null` (backward compatible)

## Files to Modify

### 1. **src/controllers/alertController.js**

**Function**: `resolveAlert` (lines 395-789)

**Current Code** (lines 596-607):
```javascript
timeLog = await tx.timeLog.create({
  data: {
    patientId: alert.patientId,
    clinicianId: clinicianIdForTimeLog,
    activity,
    duration: parseInt(timeSpentMinutes),
    cptCode,
    notes: resolutionNotes.trim(),
    billable: cptCode !== null,
    loggedAt: new Date()
  }
});
```

**Needed Change**:
- Add `enrollmentId` to TimeLog.create data
- Use `findBillingEnrollment(alert.patientId, organizationId, tx)`

---

### 2. **src/services/timeTrackingService.js**

**Function**: `stopTimer` (lines 78-132)

**Current Code** (lines 99-112):
```javascript
const timeLog = await prisma.timeLog.create({
  data: {
    patientId,
    clinicianId,
    activity: timer.activity,
    duration: finalDuration,
    cptCode,
    notes,
    billable,
    loggedAt: timer.startedAt,
    autoStarted: true,
    source: 'AUTO',
    startedAt: timer.startedAt
  }
});
```

**Needed Change**:
- Add `enrollmentId` parameter to `stopTimer()` function signature
- Include `enrollmentId` in TimeLog.create data
- Update all callers to pass `enrollmentId`

**Caller Locations**:
- Triage Queue frontend when stopping timer (frontend/src/pages/TriageQueue.jsx)
- Any backend API endpoints that call `stopTimer`

---

### 3. **src/controllers/observationController.js**

**Function**: `createObservation` (lines 100-111)

**Current Code**:
```javascript
const observation = await prisma.observation.create({
  data: {
    organizationId,
    patientId: patientId,
    metricId: metricDefinitionId,
    value: validationResult.processedValue,
    unit: metricDefinition.unit,
    source: recordedBy === 'DEVICE' ? 'DEVICE' : recordedBy === 'API' ? 'API' : 'MANUAL',
    context: context || 'CLINICAL_MONITORING',
    notes: notes,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date()
  },
  // ...
});
```

**Needed Change**:
- Add `enrollmentId` to Observation.create data
- Use `findBillingEnrollment(patientId, organizationId)`

---

## Implementation Steps

### ✅ Step 1: Create Helper Function

Create `src/utils/billingHelpers.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Find active billing-enabled enrollment for a patient
 *
 * @param {string} patientId - Patient ID
 * @param {string} organizationId - Organization ID
 * @param {object} tx - Prisma transaction client (optional)
 * @returns {Promise<string|null>} enrollmentId or null
 */
async function findBillingEnrollment(patientId, organizationId, tx = prisma) {
  const enrollment = await tx.enrollment.findFirst({
    where: {
      patientId,
      organizationId,
      billingProgramId: { not: null },
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    },
    orderBy: {
      startDate: 'desc'
    },
    select: {
      id: true
    }
  });

  return enrollment?.id || null;
}

module.exports = {
  findBillingEnrollment
};
```

---

### ✅ Step 2: Update Alert Resolution (alertController.js)

**Location**: src/controllers/alertController.js, `resolveAlert` function

**Change** (around line 596):

```javascript
// BEFORE creating TimeLog, find billing enrollment
const enrollmentId = await findBillingEnrollment(alert.patientId, organizationId, tx);

timeLog = await tx.timeLog.create({
  data: {
    patientId: alert.patientId,
    clinicianId: clinicianIdForTimeLog,
    enrollmentId, // NEW: Link to billing enrollment
    activity,
    duration: parseInt(timeSpentMinutes),
    cptCode,
    notes: resolutionNotes.trim(),
    billable: cptCode !== null,
    loggedAt: new Date()
  }
});
```

**Import**: Add at top of file:
```javascript
const { findBillingEnrollment } = require('../utils/billingHelpers');
```

---

### ✅ Step 3: Update Time Tracking Service (timeTrackingService.js)

**Option A - Pass enrollmentId to stopTimer (Recommended)**:

```javascript
async function stopTimer({ userId, patientId, clinicianId, enrollmentId, cptCode = null, notes = '', billable = true }) {
  // ... existing code ...

  const timeLog = await prisma.timeLog.create({
    data: {
      patientId,
      clinicianId,
      enrollmentId, // NEW: Provided by caller
      activity: timer.activity,
      duration: finalDuration,
      cptCode,
      notes,
      billable,
      loggedAt: timer.startedAt,
      autoStarted: true,
      source: 'AUTO',
      startedAt: timer.startedAt
    }
  });

  // ...
}
```

**Option B - Auto-detect enrollment in stopTimer**:

```javascript
const { findBillingEnrollment } = require('../utils/billingHelpers');

async function stopTimer({ userId, patientId, clinicianId, cptCode = null, notes = '', billable = true, organizationId }) {
  // ... existing code ...

  // Auto-detect billing enrollment if not provided
  let finalEnrollmentId = enrollmentId;
  if (!finalEnrollmentId && organizationId) {
    finalEnrollmentId = await findBillingEnrollment(patientId, organizationId);
  }

  const timeLog = await prisma.timeLog.create({
    data: {
      patientId,
      clinicianId,
      enrollmentId: finalEnrollmentId, // NEW: Auto-detected or provided
      activity: timer.activity,
      duration: finalDuration,
      cptCode,
      notes,
      billable,
      loggedAt: timer.startedAt,
      autoStarted: true,
      source: 'AUTO',
      startedAt: timer.startedAt
    }
  });
}
```

---

### ✅ Step 4: Update Observation Creation (observationController.js)

**Location**: src/controllers/observationController.js, `createObservation` function

**Change** (around line 100):

```javascript
const { findBillingEnrollment } = require('../utils/billingHelpers');

// Find billing enrollment for this patient
const enrollmentId = await findBillingEnrollment(patientId, organizationId);

const observation = await prisma.observation.create({
  data: {
    organizationId,
    patientId: patientId,
    enrollmentId, // NEW: Link to billing enrollment
    metricId: metricDefinitionId,
    value: validationResult.processedValue,
    unit: metricDefinition.unit,
    source: recordedBy === 'DEVICE' ? 'DEVICE' : recordedBy === 'API' ? 'API' : 'MANUAL',
    context: context || 'CLINICAL_MONITORING',
    notes: notes,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date()
  },
  // ...
});
```

---

## Testing Plan

### Unit Tests

1. **Test findBillingEnrollment helper**:
   - Patient with 1 active enrollment with billing → Returns enrollmentId
   - Patient with 2 active enrollments with billing → Returns most recent
   - Patient with NO billing enrollments → Returns null
   - Patient with ended enrollment → Returns null

2. **Test Alert Resolution with enrollmentId**:
   - Resolve alert → TimeLog should have enrollmentId populated
   - Resolve alert for patient with no billing enrollment → TimeLog has enrollmentId = null

3. **Test Observation Creation with enrollmentId**:
   - Create observation → Should have enrollmentId populated
   - Create observation for patient with no billing enrollment → enrollmentId = null

4. **Test Time Tracking with enrollmentId**:
   - Start and stop timer → TimeLog should have enrollmentId populated

### Integration Tests

1. **End-to-End Billing Calculation**:
   - Create patient with RPM enrollment (billingProgramId set)
   - Record 18 observations
   - Log 25 minutes of clinical time
   - Run billing readiness calculation
   - **Expected**: Should show eligible for CPT 99454 (16+ days) and 99457 (20+ minutes)

2. **Multi-Program Scenario**:
   - Patient enrolled in RPM and RTM
   - Log time to RTM program (pain therapy)
   - Record vitals to RPM program (blood pressure)
   - **Expected**: Time logs link to RTM, observations link to RPM

---

## Success Criteria

✅ **Criteria 1**: All new TimeLogs created from alert resolution have `enrollmentId` populated (when billing enrollment exists)

✅ **Criteria 2**: All new Observations have `enrollmentId` populated (when billing enrollment exists)

✅ **Criteria 3**: Billing readiness calculations accurately count observations and time logs per enrollment

✅ **Criteria 4**: No breaking changes - existing records with `enrollmentId = null` still function correctly

✅ **Criteria 5**: Tests pass for all scenarios (single enrollment, multiple enrollments, no billing enrollment)

---

## Migration Strategy

### Backward Compatibility

- ✅ `enrollmentId` is **optional** (`String?`) - no schema migration needed
- ✅ Existing records with `enrollmentId = null` will continue to work
- ✅ Billing service already handles `enrollmentId = null` gracefully

### Data Migration (Optional)

**NOT REQUIRED** but could be beneficial:

```sql
-- Backfill enrollmentId for existing TimeLogs
UPDATE time_logs tl
SET enrollment_id = (
  SELECT e.id
  FROM enrollments e
  WHERE e.patient_id = tl.patient_id
    AND e.billing_program_id IS NOT NULL
    AND e.status = 'ACTIVE'
    AND (e.end_date IS NULL OR e.end_date >= NOW())
  ORDER BY e.start_date DESC
  LIMIT 1
)
WHERE tl.enrollment_id IS NULL
  AND EXISTS (
    SELECT 1 FROM enrollments e2
    WHERE e2.patient_id = tl.patient_id
      AND e2.billing_program_id IS NOT NULL
  );
```

---

## Rollback Plan

If issues arise:

1. **Code Rollback**: Revert changes to alertController.js, observationController.js, timeTrackingService.js
2. **Data Integrity**: No data loss - `enrollmentId` remains `null` for new records
3. **Billing Calculations**: Will continue to work (though less accurate) by querying all patient observations/time logs

---

## Next Steps After Implementation

1. ✅ Test billing calculations with real data
2. ✅ Verify accuracy of "16 days of readings" and "20 minutes clinical time" calculations
3. ✅ Update Production Implementation Strategy documentation
4. ✅ Deploy to staging for clinic testing
5. ⏳ Monitor billing readiness calculations for accuracy improvements

---

**Implementation Owner**: AI Assistant
**Reviewer**: Development Team
**Target Completion**: 2025-10-17
**Status**: 🚧 **IN PROGRESS**
