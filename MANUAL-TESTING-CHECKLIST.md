# Manual UI Testing Checklist - October 26, 2025

> **Date**: 2025-10-26
> **Tester**: [Your Name]
> **Environment**: Development (localhost)
> **Backend**: http://localhost:3000
> **Frontend**: http://localhost:5173

---

## Test Environment Setup

**Before Starting**:
- [ ] Backend server running (port 3000)
- [ ] Frontend server running (port 5173)
- [ ] Database has test data
- [ ] Logged in as clinician with appropriate permissions
- [ ] Browser console open (F12) to monitor errors

**Test Data Requirements**:
- [ ] Organization with 50+ patients
- [ ] 50+ alerts in system
- [ ] 50+ tasks assigned
- [ ] 50+ observations to review

---

## Priority 0 - Critical Tests

### 1. Alerts Page - Pagination Performance ⭐ CRITICAL

**Why**: This was loading ALL alerts before (major performance issue)

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Navigate to `/alerts` | Page loads in <1 second | ⬜ Pass / ❌ Fail | Loading time: _____ |
| Check page header | Shows "Page 1 of X" | ⬜ Pass / ❌ Fail | Total pages: _____ |
| Check alert count | Displays 50 alerts max | ⬜ Pass / ❌ Fail | Actual count: _____ |
| Click "Next Page" | Loads next 50 alerts quickly | ⬜ Pass / ❌ Fail | Loading time: _____ |
| Click "Previous Page" | Returns to previous page | ⬜ Pass / ❌ Fail | |
| Jump to last page | Loads correctly | ⬜ Pass / ❌ Fail | |
| Apply severity filter | Pagination resets, filter works | ⬜ Pass / ❌ Fail | |
| Console errors? | No errors related to pagination | ⬜ Pass / ❌ Fail | Errors: _____ |

**Performance Notes**:
- Before: ~2000ms page load (loading all alerts)
- Expected: ~200ms page load (50 alerts only)
- Actual: _____ ms

**Console Errors**:
```
[Paste any errors here]
```

---

### 2. ObservationReview Page - New Workflow ⭐ CRITICAL

**Why**: New feature for RPM compliance - must work correctly

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Navigate to `/observation-review` | Page loads with observations | ⬜ Pass / ❌ Fail | Loading time: _____ |
| Check pagination | Shows "Page 1 of X" | ⬜ Pass / ❌ Fail | |
| Observation count | Displays up to 50 observations | ⬜ Pass / ❌ Fail | Actual: _____ |
| Columns visible | Patient, Metric, Value, Recorded At, Status | ⬜ Pass / ❌ Fail | |

#### Bulk Review Test

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Select 5 observations | Checkboxes work, count shows "5 selected" | ⬜ Pass / ❌ Fail | |
| Click "Bulk Review" button | Modal opens | ⬜ Pass / ❌ Fail | |
| Select reason "ROUTINE" | Dropdown works | ⬜ Pass / ❌ Fail | |
| Add notes "Test bulk review" | Text input works | ⬜ Pass / ❌ Fail | |
| Click "Submit" | Modal closes, success message | ⬜ Pass / ❌ Fail | Message: _____ |
| Check reviewed observations | Show "Reviewed" badge | ⬜ Pass / ❌ Fail | |
| Check reviewed timestamp | Displays current date/time | ⬜ Pass / ❌ Fail | Time: _____ |
| Reload page | Reviewed observations persist | ⬜ Pass / ❌ Fail | |

#### Individual Review Test

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Click "Review" on single observation | Review modal opens | ⬜ Pass / ❌ Fail | |
| Add notes "Individual review test" | Text area works | ⬜ Pass / ❌ Fail | |
| Click "Submit" | Modal closes, observation marked reviewed | ⬜ Pass / ❌ Fail | |
| Check reviewed badge | Shows "Reviewed" with checkmark | ⬜ Pass / ❌ Fail | |

#### Flag for Clinical Attention Test

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Click "Flag" on observation | Flag modal opens | ⬜ Pass / ❌ Fail | |
| Add flag reason "Abnormal value" | Text input works | ⬜ Pass / ❌ Fail | |
| Click "Submit" | Modal closes, observation flagged | ⬜ Pass / ❌ Fail | |
| Check flag badge | Shows red "Flagged" badge | ⬜ Pass / ❌ Fail | |
| Reload page | Flag persists | ⬜ Pass / ❌ Fail | |

**Console Errors**:
```
[Paste any errors here]
```

---

## Priority 1 - Important Tests

### 3. TriageQueue - Increased Limit (20 → 50)

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Navigate to `/triage-queue` | Page loads | ⬜ Pass / ❌ Fail | Loading time: _____ |
| Check alert count | Displays up to 50 alerts | ⬜ Pass / ❌ Fail | Actual: _____ |
| Scroll through list | No lag or stuttering | ⬜ Pass / ❌ Fail | Smooth? Y/N |
| Click "Claim Alert" | Alert claimed successfully | ⬜ Pass / ❌ Fail | |
| Apply filter "HIGH priority" | Filter works, shows correct alerts | ⬜ Pass / ❌ Fail | |
| Sort by "Risk Score" | Sorting works correctly | ⬜ Pass / ❌ Fail | |
| Console errors? | No errors | ⬜ Pass / ❌ Fail | |

**Performance Notes**:
- Expected: Smooth scrolling with 50 items
- Actual: _____

---

### 4. Tasks Page - Increased Limit (20 → 50)

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Navigate to `/tasks` | Page loads | ⬜ Pass / ❌ Fail | Loading time: _____ |
| Check task count | Displays up to 50 tasks | ⬜ Pass / ❌ Fail | Actual: _____ |
| Filter "My Tasks" | Shows only assigned tasks | ⬜ Pass / ❌ Fail | |
| Filter "Due Today" | Shows tasks due today | ⬜ Pass / ❌ Fail | |
| Filter "Overdue" | Shows overdue tasks | ⬜ Pass / ❌ Fail | |
| Click "Assign Task" | Assignment modal works | ⬜ Pass / ❌ Fail | |
| Select 5 tasks for bulk action | Checkboxes work | ⬜ Pass / ❌ Fail | |
| Bulk mark complete | All 5 tasks marked complete | ⬜ Pass / ❌ Fail | |
| Console errors? | No errors | ⬜ Pass / ❌ Fail | |

---

### 5. Patients Page - Increased Limit (10 → 50)

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Navigate to `/patients` | Page loads | ⬜ Pass / ❌ Fail | Loading time: _____ |
| Check patient count | Displays up to 50 patients | ⬜ Pass / ❌ Fail | Actual: _____ |
| Use search box | Search works, filters patients | ⬜ Pass / ❌ Fail | |
| Click patient name | Patient context panel opens | ⬜ Pass / ❌ Fail | |
| Check context panel data | Shows vitals, meds, conditions | ⬜ Pass / ❌ Fail | |
| Console errors? | No errors | ⬜ Pass / ❌ Fail | |

---

## Priority 2 - New Features

### 6. FilterBuilder Component

**Location**: Check if integrated into any pages (Patients, TriageQueue, etc.)

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Open page with FilterBuilder | Component renders | ⬜ Pass / ❌ Fail | Page: _____ |
| Click "Add Condition" | New filter row appears | ⬜ Pass / ❌ Fail | |
| Select field (e.g., "Age") | Dropdown works | ⬜ Pass / ❌ Fail | |
| Select operator "greater than" | Dropdown works | ⬜ Pass / ❌ Fail | |
| Enter value "65" | Input works | ⬜ Pass / ❌ Fail | |
| Click "Remove Condition" | Row removed | ⬜ Pass / ❌ Fail | |
| Console errors? | No Temporal Dead Zone errors | ⬜ Pass / ❌ Fail | |

**Known Fixed Issue**: Temporal Dead Zone error in FilterBuilder - should be resolved

---

### 7. SavedViewsManager Component

**Location**: Check if integrated into any pages

| Test Step | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Open page with SavedViewsManager | Component renders | ⬜ Pass / ❌ Fail | Page: _____ |
| Click "Save Current View" | Save modal opens | ⬜ Pass / ❌ Fail | |
| Enter view name "Test View" | Input works | ⬜ Pass / ❌ Fail | |
| Click "Save" | View saved successfully | ⬜ Pass / ❌ Fail | |
| Reload page | Saved view appears in list | ⬜ Pass / ❌ Fail | |
| Click saved view name | View loads | ⬜ Pass / ❌ Fail | |

---

## Cross-Browser Testing

**Test in each browser**:

### Chrome (Primary)

| Feature | Status | Notes |
|---------|--------|-------|
| Alerts pagination | ⬜ Pass / ❌ Fail | |
| ObservationReview | ⬜ Pass / ❌ Fail | |
| TriageQueue | ⬜ Pass / ❌ Fail | |
| Tasks | ⬜ Pass / ❌ Fail | |
| Patients | ⬜ Pass / ❌ Fail | |

### Firefox

| Feature | Status | Notes |
|---------|--------|-------|
| Alerts pagination | ⬜ Pass / ❌ Fail | |
| ObservationReview | ⬜ Pass / ❌ Fail | |
| TriageQueue | ⬜ Pass / ❌ Fail | |
| Tasks | ⬜ Pass / ❌ Fail | |
| Patients | ⬜ Pass / ❌ Fail | |

### Safari (if available)

| Feature | Status | Notes |
|---------|--------|-------|
| Alerts pagination | ⬜ Pass / ❌ Fail | |
| ObservationReview | ⬜ Pass / ❌ Fail | |
| TriageQueue | ⬜ Pass / ❌ Fail | |
| Tasks | ⬜ Pass / ❌ Fail | |
| Patients | ⬜ Pass / ❌ Fail | |

### Edge

| Feature | Status | Notes |
|---------|--------|-------|
| Alerts pagination | ⬜ Pass / ❌ Fail | |
| ObservationReview | ⬜ Pass / ❌ Fail | |
| TriageQueue | ⬜ Pass / ❌ Fail | |
| Tasks | ⬜ Pass / ❌ Fail | |
| Patients | ⬜ Pass / ❌ Fail | |

---

## Performance Benchmarks

**Expected Performance** (from automated tests):

| Query Type | Before | After | Target |
|------------|--------|-------|--------|
| Alerts page load | ~2000ms | ~200ms | <1s |
| Alert queries | ~500ms | ~2.5ms | <100ms |
| Task queries | ~300ms | ~2.5ms | <100ms |
| Pagination overhead | N/A | ~0.1ms | Negligible |

**Actual Performance** (manual observation):

| Page | Loading Time | Feels Fast? | Notes |
|------|--------------|-------------|-------|
| Alerts | _____ ms | Y/N | |
| ObservationReview | _____ ms | Y/N | |
| TriageQueue | _____ ms | Y/N | |
| Tasks | _____ ms | Y/N | |
| Patients | _____ ms | Y/N | |

---

## Issues Found

### Issue #1

**Page/Component**: _____
**Browser**: _____
**Severity**: Critical / High / Medium / Low

**Description**:
```
[Describe the issue]
```

**Steps to Reproduce**:
1.
2.
3.

**Console Errors**:
```
[Paste errors here]
```

**Screenshots**: [Attach if needed]

---

### Issue #2

**Page/Component**: _____
**Browser**: _____
**Severity**: Critical / High / Medium / Low

**Description**:
```
[Describe the issue]
```

**Steps to Reproduce**:
1.
2.
3.

**Console Errors**:
```
[Paste errors here]
```

---

## Overall Assessment

**Total Tests Run**: _____
**Tests Passed**: _____
**Tests Failed**: _____
**Pass Rate**: _____%

**Critical Issues Found**: _____
**High Priority Issues**: _____
**Medium Priority Issues**: _____
**Low Priority Issues**: _____

**Performance Improvement Noticeable?**: Yes / No

**Notes**:
```
[Overall impressions, recommendations, next steps]
```

---

## Sign-Off

**Tester**: _____________________
**Date**: _____________________
**Status**: ✅ Ready for Production / ⚠️ Needs Fixes / ❌ Blocked

**Recommendations**:
```
[What should happen next?]
```

---

**Automated Test Results Reference**:
- See: `/scripts/TEST-SCRIPTS-SUMMARY.md`
- All 6 database indexes verified present
- Query performance: 2-3ms (200x faster)
- Pagination: 11.9% faster than full load
