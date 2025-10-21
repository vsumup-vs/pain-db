# Next Steps - ClinMetrics Pro

## Current State ✅
- Database schema complete with conditionPresetId required
- 2 active enrollments configured (William Taylor, Jennifer Lee)
- 9 assessment templates with 27 metrics defined
- Alert rules configured for both enrollments
- Billing readiness service implemented
- Frontend UI pages available

## Critical Gap 🔴
**NO PATIENT ACTIVITY YET**
- 0 assessments completed
- 0 observations recorded
- 0 alerts triggered
- 0 time logs created

## Recommended Next Steps (Priority Order)

### 1. Test Patient Assessment Workflow (Immediate)
**Goal**: Verify patients can submit assessments and trigger alerts

**Tasks**:
- [ ] Test DailyAssessment.jsx page for William Taylor
  - Submit Heart Failure Symptom Monitoring
  - Record weight, dyspnea, edema, fatigue
- [ ] Test DailyAssessment.jsx page for Jennifer Lee
  - Submit Daily Symptom Tracker
  - Record pain, fatigue, sleep, mood, activity
- [ ] Verify observations are created in database
- [ ] Check if alerts trigger based on thresholds

**Test Scenarios**:
```javascript
// William Taylor - Should trigger "Rapid Weight Gain" alert
Submit weight: 185 lbs (today)
Submit weight: 189 lbs (tomorrow) // +4 lbs in 24h triggers HIGH alert

// Jennifer Lee - Should trigger "Critical High Blood Pressure"
Submit systolic BP: 185 // Triggers CRITICAL alert
```

**How to Test**:
1. Navigate to http://localhost:5173/daily-assessment
2. Login as patient (need to create patient login or use clinician)
3. Submit assessments with values that trigger alerts

---

### 2. Test Clinician Alert Monitoring (After Step 1)
**Goal**: Verify clinicians can see and respond to triggered alerts

**Tasks**:
- [ ] Open TriageQueue.jsx page
- [ ] Verify triggered alerts appear with correct risk scores
- [ ] Test claiming an alert
- [ ] Test resolving an alert with time logging
- [ ] Verify TimeLog records created with enrollmentId

**How to Test**:
1. Navigate to http://localhost:5173/triage-queue
2. View alerts triggered from patient assessments
3. Claim and resolve alerts
4. Check time logs in database

---

### 3. Test Billing Readiness (After Steps 1-2)
**Goal**: Verify billing calculations work with real patient data

**Tasks**:
- [ ] Navigate to BillingReadiness.jsx page
- [ ] Select current month
- [ ] Verify observations count toward "16 days" requirement
- [ ] Verify time logs count toward "20 minutes" requirement
- [ ] Test CSV export

**Expected Results**:
```
William Taylor (CMS_RPM_2025):
- ❌ 99454 (Device Supply): 1 day / 16 needed
- ❌ 99457 (Clinical Time): 15 min / 20 needed

Jennifer Lee (CMS_CCM_2025):
- ❌ 99490 (Care Coordination): 0 min / 20 needed
```

**How to Test**:
1. Navigate to http://localhost:5173/billing-readiness
2. Review patient eligibility
3. Export CSV

---

### 4. Create Test Data Script (Parallel to 1-3)
**Goal**: Automated test data generation for faster testing

**Tasks**:
- [ ] Create script: scripts/create-test-patient-activity.js
- [ ] Generate 16 days of observations for William Taylor
- [ ] Generate 20+ minutes of time logs
- [ ] Trigger multiple alerts with different severities
- [ ] Verify billing readiness shows "ELIGIBLE"

**Script Outline**:
```javascript
// scripts/create-test-patient-activity.js
async function generateTestActivity() {
  // For William Taylor (Heart Failure)
  for (let i = 0; i < 18; i++) {
    // Create observations for past 18 days
    await prisma.observation.create({
      data: {
        patientId: williamTaylorId,
        enrollmentId: williamEnrollmentId,
        metricId: weightMetricId,
        value: { numeric: 185 + (i * 0.5) },
        recordedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      }
    });
  }
  
  // Create time logs totaling 25 minutes
  await prisma.timeLog.create({
    data: {
      patientId: williamTaylorId,
      enrollmentId: williamEnrollmentId,
      clinicianId: clinicianId,
      activity: 'CALL_PATIENT',
      duration: 25,
      cptCode: '99457',
      billable: true
    }
  });
}
```

---

### 5. Frontend Enhancements (After 1-4 working)
**Goal**: Improve user experience for assessment submission

**Tasks**:
- [ ] Review DailyAssessment.jsx UX
- [ ] Add assessment scheduling/reminders
- [ ] Add assessment history view
- [ ] Add mobile-responsive improvements
- [ ] Add offline capability (future)

---

### 6. Alert Evaluation Engine Testing
**Goal**: Verify alert rules trigger correctly

**Tasks**:
- [ ] Test all 11 alert rule types:
  - Rapid Weight Gain (>3 lbs/24h)
  - Hypertensive Crisis (BP >180/120)
  - Hypotension (SBP <90)
  - Tachycardia (HR >120)
  - Bradycardia (HR <50)
  - Hypoxia (O2 sat <90%)
  - Severe Pain (>8 for 3+ days)
  - Sudden Pain Increase
  - Hypoglycemia (<70 mg/dL)
  - Hyperglycemia (>250 mg/dL)
  - Missed Assessments
- [ ] Verify alert severity levels
- [ ] Test alert cooldown periods
- [ ] Test alert acknowledgment workflow

---

## Decision Points

### Do we need to build/fix anything before testing?

**Check 1**: Can patients submit assessments via UI?
- Yes → Proceed to Step 1
- No → Need to build patient assessment submission form

**Check 2**: Does alert evaluation engine auto-trigger?
- Yes → Alerts will trigger automatically
- No → Need to implement background job

**Check 3**: Does billing readiness page work?
- Yes → Proceed to Step 3
- No → Need to debug BillingReadiness.jsx

Let me check these critical pieces...
