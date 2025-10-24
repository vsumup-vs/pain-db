# Assessment Workflow End-to-End Testing Guide

> Created: 2025-10-23
> Status: Testing Guide
> Priority: P0 - Critical for Production Readiness

## Overview

This guide provides step-by-step instructions for testing the complete Smart Assessment Continuity System workflow from scheduled assessment creation to completion.

## Prerequisites

Before testing, ensure:
- ✅ Backend server is running on `http://localhost:3000`
- ✅ Frontend development server is running on `http://localhost:5173`
- ✅ Database migrations are applied (`npx prisma migrate dev`)
- ✅ Test data is seeded (organizations, patients, clinicians, care programs)
- ✅ Assessment scheduler service is running (started automatically with backend)

## Testing Checklist

### 1. Scheduled Assessment Creation

**Test Case**: Create a scheduled assessment via API

**Steps**:
1. Open a tool like Postman or use curl
2. Get authentication token by logging in
3. Create a scheduled assessment:

```bash
curl -X POST http://localhost:3000/api/scheduled-assessments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID",
    "enrollmentId": "ENROLLMENT_ID",
    "templateId": "TEMPLATE_ID",
    "frequency": "DAILY",
    "dueDate": "2025-10-24T10:00:00.000Z",
    "priority": "HIGH",
    "isRequired": true,
    "notes": "Test assessment for pain management"
  }'
```

**Expected Result**:
- ✅ 201 Created response
- ✅ Scheduled assessment object returned with status "PENDING"
- ✅ Assessment appears in database

---

### 2. Pending Assessments in Patient Context Panel

**Test Case**: View pending assessments in PatientContextPanel

**Steps**:
1. Navigate to `/triage-queue` in the browser
2. Click on any alert to open the triage queue
3. Click the "View Context" button (chart icon) next to a patient name
4. The PatientContextPanel drawer opens on the right side

**Expected Result**:
- ✅ "Pending Assessments" section is visible (orange background)
- ✅ Shows count of pending assessments (e.g., "Pending Assessments (2)")
- ✅ Each assessment shows:
  - Assessment template name
  - Due date
  - "Overdue" badge if past due date
  - Priority badge if HIGH or LOW
  - "Start" button

**Visual Check**:
```
┌─────────────────────────────────────┐
│ Pending Assessments (2)             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ PROMIS Pain Intensity          │ │
│ │ Due: Oct 24, 2025 10:00 AM     │ │
│ │ [HIGH]                  [Start]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Daily Symptom Tracker          │ │
│ │ Due: Oct 23, 2025 9:00 AM      │ │
│ │ [OVERDUE]               [Start]│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

### 3. Starting Assessment from Patient Context Panel

**Test Case**: Click "Start" button in PatientContextPanel

**Steps**:
1. From the PatientContextPanel (previous test)
2. Click the "Start" button on a pending assessment

**Expected Result**:
- ✅ AssessmentModal opens (full-screen modal)
- ✅ Modal shows:
  - Assessment template name in header
  - Patient name
  - Due date
  - All metric questions from the template
  - "Submit Assessment" button at bottom
  - "Cancel" button

**Visual Check**:
```
┌──────────────────────────────────────────────┐
│ PROMIS Pain Intensity                    [X] │
├──────────────────────────────────────────────┤
│ Patient: John Doe                            │
│ Due: October 24, 2025 10:00 AM               │
├──────────────────────────────────────────────┤
│                                              │
│ Pain Level (0-10 scale)                      │
│ ┌─────────────────────────────────────────┐  │
│ │ [Input: 7]                              │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│ Pain Location                                │
│ ┌─────────────────────────────────────────┐  │
│ │ [Dropdown: Lower Back]                  │  │
│ └─────────────────────────────────────────┘  │
│                                              │
│                                              │
│ [Cancel]              [Submit Assessment]    │
└──────────────────────────────────────────────┘
```

---

### 4. Completing Assessment

**Test Case**: Fill out and submit assessment

**Steps**:
1. In the AssessmentModal (previous test)
2. Fill out all required fields
3. Click "Submit Assessment"

**Expected Result**:
- ✅ Loading state shown during submission
- ✅ Success toast notification appears: "Assessment completed successfully"
- ✅ Modal closes automatically
- ✅ PatientContextPanel refreshes and pending assessment is removed
- ✅ In database, scheduled assessment status changed to "COMPLETED"
- ✅ New Assessment record created with responses

**Backend Verification**:
```sql
-- Check scheduled assessment status
SELECT id, status, completed_at
FROM scheduled_assessments
WHERE id = 'ASSESSMENT_ID';
-- Should show: status = 'COMPLETED', completed_at = current timestamp

-- Check assessment responses
SELECT *
FROM assessments
WHERE scheduled_assessment_id = 'ASSESSMENT_ID';
-- Should show: responses JSON with all answered questions
```

---

### 5. Pending Assessment Indicator in Triage Queue

**Test Case**: View pending assessment badges on alert cards

**Steps**:
1. Navigate to `/triage-queue`
2. Ensure at least one patient in the queue has a pending assessment
3. Look at the alert cards

**Expected Result**:
- ✅ Alert cards for patients with pending assessments show orange badge
- ✅ Badge shows count: "1 pending assessment" or "2 pending assessments"
- ✅ Badge has bell icon
- ✅ Badge is clickable

**Visual Check**:
```
┌────────────────────────────────────────────────────┐
│ #1   🔥 High Blood Pressure                        │
│                                                    │
│ Risk: 7.5   [APPROACHING SLA]   [Time logged: 15min] │
│             [🔔 2 pending assessments]             │
│                                                    │
│ Patient: John Doe                                  │
│ Triggered: Oct 23, 2025 9:15 AM                    │
└────────────────────────────────────────────────────┘
```

---

### 6. Starting Assessment from Triage Queue

**Test Case**: Click pending assessment badge in triage queue

**Steps**:
1. In the triage queue (previous test)
2. Click the orange "pending assessments" badge

**Expected Result**:
- ✅ AssessmentModal opens immediately
- ✅ Shows the first pending assessment for that patient
- ✅ User can complete assessment without leaving triage queue

---

### 7. Dedicated Assessments Page

**Test Case**: View all assessments in dedicated page

**Steps**:
1. Navigate to `/assessments` using the navigation menu
2. Click "Assessments" in the sidebar

**Expected Result**:
- ✅ Page loads with title "Scheduled Assessments"
- ✅ Shows 5 summary cards at top:
  - Overdue (red)
  - Pending (yellow)
  - In Progress (blue)
  - Completed (green)
  - Cancelled (gray)
- ✅ Shows filters:
  - Search box (by patient name or assessment name)
  - Status dropdown (All, Pending, Overdue, etc.)
  - Priority dropdown (All, Low, Medium, High)
- ✅ Shows list of all assessments with details

**Visual Check**:
```
┌─────────────────────────────────────────────────────┐
│ Scheduled Assessments                               │
│ Manage and track patient assessments across all programs │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Search: ____________]  [Status: All ▼]  [Priority: All ▼] │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Overdue  Pending  In Progress  Completed  Cancelled │
│   3        5          2            15         1     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ PROMIS Pain Intensity           [PENDING]  [HIGH]││
│ │ 👤 John Doe    📅 Due: Oct 24, 10:00 AM         ││
│ │ 🔁 Frequency: DAILY                             ││
│ │                             [Start Assessment]  ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ Daily Symptom Tracker      [OVERDUE]      [HIGH]││
│ │ 👤 Jane Smith  📅 Due: Oct 23, 9:00 AM          ││
│ │ 🔁 Frequency: DAILY                             ││
│ │                             [Start Assessment]  ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

### 8. Filtering and Search

**Test Case**: Filter assessments by status and search

**Steps**:
1. On `/assessments` page
2. Change status filter to "Overdue"
3. Type patient name in search box

**Expected Result**:
- ✅ Assessment list updates to show only overdue assessments
- ✅ Search further filters by patient name
- ✅ Summary cards update to reflect filtered results
- ✅ "0 Assessments" message shown if no matches

---

### 9. Cancelling Assessment

**Test Case**: Cancel a scheduled assessment

**Steps**:
1. On `/assessments` page
2. Find a pending assessment
3. Click "Cancel" button
4. Confirm cancellation in alert dialog
5. Enter cancellation reason in prompt

**Expected Result**:
- ✅ Confirmation dialog appears
- ✅ Reason prompt appears
- ✅ Success toast: "Assessment cancelled successfully"
- ✅ Assessment status changes to "CANCELLED"
- ✅ Assessment moves to "Cancelled" section
- ✅ Cancellation reason displayed on assessment card

---

### 10. Assessment Scheduler Background Job

**Test Case**: Verify automatic overdue status updates

**Steps**:
1. Create a scheduled assessment with due date in the past
2. Status is "PENDING"
3. Wait 30 minutes (scheduler runs every 30 minutes)

**Expected Result**:
- ✅ After 30 minutes, assessment status automatically changes to "OVERDUE"
- ✅ Check backend logs for: `[AssessmentScheduler] Marked X assessments as OVERDUE`

**Manual Trigger (for faster testing)**:
```javascript
// In backend console or script
const { manualOverdueCheck } = require('./src/services/assessmentScheduler');
await manualOverdueCheck();
```

---

### 11. Recurring Assessments

**Test Case**: Verify next assessment is scheduled after completion

**Steps**:
1. Create a scheduled assessment with frequency "DAILY"
2. Complete the assessment via AssessmentModal
3. Check database for new scheduled assessment

**Expected Result**:
- ✅ Original assessment status: "COMPLETED"
- ✅ New scheduled assessment created automatically
- ✅ New assessment due date is 1 day after original due date
- ✅ New assessment has same template, patient, enrollment, frequency
- ✅ Check backend logs for: `[AssessmentScheduler] Created next recurring assessment`

**Database Verification**:
```sql
SELECT id, status, due_date, frequency
FROM scheduled_assessments
WHERE patient_id = 'PATIENT_ID'
  AND template_id = 'TEMPLATE_ID'
ORDER BY due_date DESC;
-- Should show: 2 assessments - one COMPLETED, one PENDING with later due date
```

---

### 12. Real-Time Data Updates

**Test Case**: Verify cache invalidation and UI updates

**Steps**:
1. Open `/assessments` page in browser
2. Open `/triage-queue` in another browser tab (same session)
3. Complete an assessment from triage queue
4. Switch back to `/assessments` page

**Expected Result**:
- ✅ Within 1-2 minutes, assessments page shows updated counts
- ✅ Completed assessment no longer in "Pending" section
- ✅ Completed assessment appears in "Completed" section

---

### 13. Multiple Entry Points Consistency

**Test Case**: Complete assessment from different entry points

**Scenarios to test**:
- ✅ Start from PatientContextPanel → Complete → Verify modal closes, context panel updates
- ✅ Start from TriageQueue badge → Complete → Verify badge updates, queue refreshes
- ✅ Start from Assessments page → Complete → Verify page updates, summary cards update

**Expected Result**:
- ✅ All entry points lead to same AssessmentModal
- ✅ All entry points show updated data after completion
- ✅ Cache invalidation works correctly in all contexts

---

### 14. Error Handling

**Test Case**: Handle validation errors and network failures

**Steps**:
1. Start assessment in AssessmentModal
2. Leave required fields empty
3. Click "Submit Assessment"

**Expected Result**:
- ✅ Validation errors shown next to empty fields
- ✅ Modal does not close
- ✅ User can fix errors and resubmit

**Network Failure Test**:
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Try to submit assessment

**Expected Result**:
- ✅ Error toast: "Failed to complete assessment"
- ✅ Modal remains open
- ✅ User can retry after network restored

---

### 15. Performance Testing

**Test Case**: Load assessments page with 100+ assessments

**Steps**:
1. Seed database with 100+ scheduled assessments
2. Navigate to `/assessments`
3. Observe page load time

**Expected Result**:
- ✅ Page loads in < 2 seconds
- ✅ All filters work smoothly
- ✅ Search is responsive (< 500ms)
- ✅ No console errors

---

## Common Issues and Troubleshooting

### Issue: Pending assessment not showing in PatientContextPanel

**Possible Causes**:
- Assessment not linked to patient
- Assessment status is not "PENDING" or "OVERDUE"
- Query filter excluding the assessment

**Debug Steps**:
1. Check database: `SELECT * FROM scheduled_assessments WHERE patient_id = 'ID'`
2. Check API response in browser DevTools Network tab
3. Verify query filter in `PatientContextPanel.jsx` line 37-44

---

### Issue: AssessmentModal not opening

**Possible Causes**:
- State not updating correctly
- Modal component not imported
- scheduledAssessment prop is null

**Debug Steps**:
1. Check browser console for errors
2. Add console.log in click handler: `console.log('Assessment:', assessment)`
3. Verify AssessmentModal import at top of file

---

### Issue: Assessment not marking as completed

**Possible Causes**:
- Backend API error (check backend logs)
- Validation failing (check responses format)
- Database constraint violation

**Debug Steps**:
1. Check backend logs: `grep "Complete scheduled assessment" backend.log`
2. Check browser Network tab for 400/500 errors
3. Verify responses JSON format matches schema

---

## Test Data Setup Script

Use this script to create test data for assessment testing:

```javascript
// scripts/create-assessment-test-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  // Find test patient and enrollment
  const patient = await prisma.patient.findFirst();
  const enrollment = await prisma.enrollment.findFirst();
  const template = await prisma.assessmentTemplate.findFirst();

  if (!patient || !enrollment || !template) {
    console.error('Missing required data. Seed patients, enrollments, and templates first.');
    return;
  }

  // Create 5 test assessments with different statuses
  const assessments = [];

  // 1. Overdue assessment (due yesterday)
  assessments.push(
    await prisma.scheduledAssessment.create({
      data: {
        organizationId: patient.organizationId,
        patientId: patient.id,
        enrollmentId: enrollment.id,
        templateId: template.id,
        frequency: 'DAILY',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        priority: 'HIGH',
        isRequired: true,
        status: 'OVERDUE',
        scheduledBy: 'System'
      }
    })
  );

  // 2. Pending assessment (due in 2 hours)
  assessments.push(
    await prisma.scheduledAssessment.create({
      data: {
        organizationId: patient.organizationId,
        patientId: patient.id,
        enrollmentId: enrollment.id,
        templateId: template.id,
        frequency: 'DAILY',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
        priority: 'MEDIUM',
        isRequired: true,
        status: 'PENDING',
        scheduledBy: 'System'
      }
    })
  );

  // 3. Pending assessment (due tomorrow)
  assessments.push(
    await prisma.scheduledAssessment.create({
      data: {
        organizationId: patient.organizationId,
        patientId: patient.id,
        enrollmentId: enrollment.id,
        templateId: template.id,
        frequency: 'WEEKLY',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        priority: 'LOW',
        isRequired: false,
        status: 'PENDING',
        scheduledBy: 'System'
      }
    })
  );

  console.log('✅ Created 3 test scheduled assessments');
  console.log('Assessments:', assessments.map(a => ({ id: a.id, status: a.status, dueDate: a.dueDate })));
}

createTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run: `node scripts/create-assessment-test-data.js`

---

## Success Criteria

All tests pass when:
- ✅ Scheduled assessments created successfully via API
- ✅ Pending assessments visible in PatientContextPanel
- ✅ Pending assessment indicators visible in TriageQueue
- ✅ AssessmentModal opens from all entry points
- ✅ Assessments can be completed and submitted
- ✅ Completed assessments update status in database
- ✅ Recurring assessments schedule next instance automatically
- ✅ Overdue status updates automatically (background job)
- ✅ Assessments page displays all assessments with filters
- ✅ Search and filters work correctly
- ✅ Assessments can be cancelled with reason
- ✅ Real-time updates work across all pages
- ✅ Error handling works for validation and network issues
- ✅ Performance is acceptable with 100+ assessments

---

## Next Steps

After completing testing:
1. Document any bugs found in GitHub issues
2. Create automated integration tests (Playwright/Cypress)
3. Update user documentation with screenshots
4. Train clinical staff on assessment workflows
5. Deploy to staging environment for pilot testing

---

**Testing Owner**: QA Team / Development Team
**Last Updated**: 2025-10-23
**Status**: Ready for Testing
