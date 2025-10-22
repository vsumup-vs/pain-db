# Timer Flow Re-Test Plan with enrollmentId Linkage

> Date: 2025-10-22
> Status: Ready for Testing
> John Doe Enrollment ID: `cmh1eci6m00017k8em28cfrh1`

## Summary

John Doe now has a proper billing enrollment. When the NEW test alerts are resolved, TimeLogs should automatically link to this enrollment via the `findBillingEnrollment()` helper function.

## John Doe's Billing Enrollment

- **Patient ID**: `cmgzh0nhk00017ky494q8ifl5`
- **Enrollment ID**: `cmh1eci6m00017k8em28cfrh1`
- **Care Program**: Remote Pain Management Program
- **Billing Program**: CMS Remote Patient Monitoring 2025 (Code: CMS_RPM_2025)
- **Status**: ACTIVE
- **Organization ID**: `cmgz1ve7v00027kyyrqp5w0zk`

## Test Alerts Ready for Testing

### Alert 1: cmh1ee1f100017khj04x7hsyf
- **Message**: 🧪 TEST ALERT 1: Resolve WITHOUT timer (manual time entry)
- **Status**: PENDING (unclaimed)
- **Triggered**: 2025-10-22 08:22:25
- **Test Scenario**: Manual resolution without starting a timer

**Test Steps**:
1. Claim the alert
2. Click "Resolve Alert" button (WITHOUT starting timer)
3. Enter time spent manually (e.g., 15 minutes)
4. Select intervention type and add notes
5. Submit resolution

**Expected Results**:
- ✅ Alert status changes to RESOLVED
- ✅ TimeLog created with:
  - `enrollmentId`: `cmh1eci6m00017k8em28cfrh1` (John Doe's enrollment)
  - `source`: MANUAL
  - `autoStarted`: false
  - `cptCode`: null (or selected CPT code if chosen)
  - `duration`: 15 minutes (as entered)
- ✅ No timer should be running

---

### Alert 2: cmh1ee1fc00037khjmmv5wsd8
- **Message**: 🧪 TEST ALERT 2: Timer Stop & Document (independent flow)
- **Status**: PENDING (unclaimed)
- **Triggered**: 2025-10-22 08:22:25
- **Test Scenario**: Independent timer stop WITHOUT resolving alert

**Test Steps**:
1. Claim the alert (timer should auto-start)
2. Wait for 5+ minutes (or manually adjust timer)
3. Click "Stop & Document" in TimerWidget (NOT Resolve Alert button)
4. Select CPT code (e.g., 99457)
5. Add notes about the time spent
6. Submit

**Expected Results**:
- ✅ Timer stops
- ✅ TimeLog created with:
  - `enrollmentId`: `cmh1eci6m00017k8em28cfrh1`
  - `source`: AUTO
  - `autoStarted`: true
  - `cptCode`: 99457 (or selected code)
  - `duration`: ~5 minutes (actual time elapsed)
- ✅ Alert remains PENDING (NOT resolved)
- ✅ Alert card should show "Time logged: X minutes" badge

---

### Alert 3: cmh1ee1fg00057khj537k7xl6
- **Message**: 🧪 TEST ALERT 3: Resolve with active timer (auto-stop)
- **Status**: PENDING (unclaimed)
- **Triggered**: 2025-10-22 08:22:25
- **Test Scenario**: Resolve alert while timer is running (timer should auto-stop)

**Test Steps**:
1. Claim the alert (timer should auto-start)
2. Wait for 10+ minutes (or manually adjust timer)
3. Click "Resolve Alert" button (while timer is STILL running)
4. Resolution modal should show:
   - Timer duration pre-filled (e.g., 10 minutes)
   - Warning: "Timer is running - it will be stopped when you submit"
5. Select intervention type, add notes
6. Submit resolution

**Expected Results**:
- ✅ Timer stops automatically
- ✅ Alert status changes to RESOLVED
- ✅ TimeLog created with:
  - `enrollmentId`: `cmh1eci6m00017k8em28cfrh1`
  - `source`: MANUAL (because resolution is manual, even though timer was running)
  - `autoStarted`: false
  - `cptCode`: null (or selected CPT code if chosen in resolution modal)
  - `duration`: ~10 minutes (from timer, pre-filled in modal)
- ✅ No duplicate TimeLogs created (only ONE TimeLog for this resolution)

---

## Verification After Testing

After completing all 3 tests, run the verification script:

```bash
node scripts/verify-alert-resolution-timelog.js
```

**Expected Output**:
- ✅ 3 new TimeLogs for John Doe
- ✅ All 3 TimeLogs have `Enrollment ID: cmh1eci6m00017k8em28cfrh1`
- ✅ All 3 TimeLogs show `Billing Program: CMS Remote Patient Monitoring 2025`
- ✅ No duplicate TimeLogs detected
- ✅ TimeLog sources match expectations (MANUAL vs AUTO)

### Specific Verification Queries

**Check enrollmentId linkage**:
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const timeLogs = await prisma.timeLog.findMany({
    where: {
      patient: { firstName: 'John', lastName: 'Doe' },
      enrollmentId: { not: null }
    },
    include: {
      enrollment: {
        include: {
          billingProgram: { select: { name: true, code: true } }
        }
      }
    },
    orderBy: { loggedAt: 'desc' },
    take: 5
  });

  console.log('TimeLogs with enrollmentId:');
  timeLogs.forEach(log => {
    console.log(\`- \${log.duration}min, \${log.source}, enrollmentId: \${log.enrollmentId}\`);
    console.log(\`  Billing Program: \${log.enrollment.billingProgram.name}\`);
  });

  await prisma.\$disconnect();
}

verify().catch(console.error);
"
```

**Expected Output**:
```
TimeLogs with enrollmentId:
- 10min, MANUAL, enrollmentId: cmh1eci6m00017k8em28cfrh1
  Billing Program: CMS Remote Patient Monitoring 2025
- 5min, AUTO, enrollmentId: cmh1eci6m00017k8em28cfrh1
  Billing Program: CMS Remote Patient Monitoring 2025
- 15min, MANUAL, enrollmentId: cmh1eci6m00017k8em28cfrh1
  Billing Program: CMS Remote Patient Monitoring 2025
```

---

## Billing Readiness Verification

After testing, verify that billing readiness calculations now work correctly:

```bash
node -e "
const billingService = require('./src/services/billingReadinessService');

async function testBilling() {
  const result = await billingService.calculateBillingReadiness(
    'cmh1eci6m00017k8em28cfrh1',  // John Doe's enrollment
    '2025-10'  // Current month
  );

  console.log('Billing Readiness for John Doe:');
  console.log(JSON.stringify(result, null, 2));
}

testBilling().catch(console.error);
"
```

**Expected Output**:
- ✅ `enrollmentId`: cmh1eci6m00017k8em28cfrh1
- ✅ `eligible`: true or false (depending on whether requirements met)
- ✅ CPT codes with eligibility status:
  - 99453 (Setup): eligible if not previously billed
  - 99454 (16+ days data): eligible if observations exist
  - 99457 (20+ min clinical time): eligible if TimeLogs >= 20 minutes
- ✅ `totalReimbursement`: calculated based on eligible codes
- ✅ `summary.clinicalTimeMet`: true if 30+ minutes logged (from 3 tests: 15+5+10)

---

## Troubleshooting

### Issue: TimeLogs still have enrollmentId: null

**Possible Causes**:
1. `findBillingEnrollment()` helper not finding the enrollment
2. Organization ID mismatch
3. Enrollment status is not ACTIVE

**Verification**:
```bash
node -e "
const { findBillingEnrollment } = require('./src/utils/billingHelpers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const enrollmentId = await findBillingEnrollment(
    'cmgzh0nhk00017ky494q8ifl5',  // John Doe patient ID
    'cmgz1ve7v00027kyyrqp5w0zk'   // Organization ID
  );
  console.log('findBillingEnrollment returned:', enrollmentId);

  if (enrollmentId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { billingProgram: true }
    });
    console.log('Enrollment details:', JSON.stringify(enrollment, null, 2));
  }

  await prisma.\$disconnect();
}

debug().catch(console.error);
"
```

**Expected Output**:
```
findBillingEnrollment returned: cmh1eci6m00017k8em28cfrh1
Enrollment details: {
  "id": "cmh1eci6m00017k8em28cfrh1",
  "patientId": "cmgzh0nhk00017ky494q8ifl5",
  "billingProgramId": "cmguqf8ih00007k665e4csbh1",
  "status": "ACTIVE",
  ...
}
```

---

## Success Criteria

All tests pass when:
- ✅ All 3 alerts can be claimed and resolved successfully
- ✅ All 3 TimeLogs have `enrollmentId: cmh1eci6m00017k8em28cfrh1`
- ✅ No duplicate TimeLogs created
- ✅ Timer flows work independently (Stop & Document vs Resolve Alert)
- ✅ Billing readiness calculations include the new TimeLogs
- ✅ CPT code dropdown shows only contextual codes based on timer source

---

## Next Steps After Successful Testing

1. Mark todos as completed:
   - "Re-test timer flows with properly enrolled patient" → completed
   - "Verify TimeLogs from new alerts have enrollmentId populated" → completed
   - "Verify no duplicate TimeLogs created" → completed
   - "Verify billing readiness calculations with correct enrollmentId linkage" → completed

2. Document findings in final report

3. Archive test scripts and test data

4. Consider adding automated integration tests for timer flows

5. Deploy to staging environment for clinical user acceptance testing
