# Spec Requirements Document

> Spec: Patient Context Panel
> Created: 2025-10-14
> Status: Planning
> Priority: P0 (Critical)
> Estimated Effort: 5-6 days

---

## Overview

Implement a unified patient context panel that displays comprehensive patient information in a single view when care managers are triaging alerts or working on tasks. This eliminates context switching between multiple pages and reduces clicks-to-context from ~5 to 1.

**Current Problem**: When a care manager opens an alert, they must manually navigate to:
- Patient detail page (view demographics)
- Observations page (view recent vitals)
- Assessments page (check latest scores)
- Medications page (review active prescriptions)
- Enrollments page (check program status)

This results in 5+ clicks and 30-60 seconds of context switching per alert.

**Success Criteria**: Reduce clicks-to-context from ~5 (current) to 1 click

---

## User Stories

### Care Manager Alert Triage

As a care manager triaging an alert, I want to see all relevant patient information in one panel, so that I can make informed clinical decisions without leaving the triage queue.

**New Workflow**:
1. Click alert in triage queue
2. Patient context panel opens on right side (or as modal)
3. See at-a-glance:
   - Patient demographics and contact info
   - Vitals trends (7/30/90 days) with inline charts
   - Active medications with adherence %
   - Recent assessment scores
   - Condition presets and diagnoses
   - Device status (last reading timestamp)
   - Open tasks for this patient
4. Click-to-call phone number
5. Document encounter without switching pages

**Time Saved**: 30-60 seconds per alert × 20 alerts/day = 10-20 minutes/day per care manager

---

### Physician Quick Review

As a physician reviewing escalated alerts, I want a compact patient summary, so that I can quickly assess clinical context and approve/modify care plans.

**Workflow**:
1. Open alert escalated for physician review
2. Context panel shows patient summary
3. Review vitals trend (last 30 days)
4. Check active medications
5. Approve care manager's proposed intervention
6. Close panel and move to next alert

---

### Task Execution with Context

As a care manager executing a task (follow-up call), I want the patient context panel to show why the task was created, so that I can have an informed conversation with the patient.

**Workflow**:
1. Open task: "Follow-up call - verify medication adherence"
2. Context panel shows:
   - Patient demographics and phone number
   - Linked alert: "Blood pressure spike: 180/110 on Oct 10"
   - Recent vitals: BP has been elevated for 3 days
   - Active medications: Lisinopril 10mg daily
   - Medication adherence: 70% (4 missed doses last week)
3. Call patient with full context
4. Document call outcome in encounter note

---

## Spec Scope

1. **Patient Context Panel Component** - Right-side drawer or modal displaying unified patient information
2. **Consolidated Data Endpoint** - New `/api/patients/:id/context` endpoint that returns all patient data in single request
3. **Vitals Trend Charts** - Lightweight inline charts showing 7/30/90-day trends for key metrics
4. **Medication Adherence Summary** - % adherence for active medications with visual indicators
5. **Device Status Indicators** - Last reading timestamp, device type, sync status
6. **Quick Actions** - Click-to-call, click-to-email, create task, document encounter
7. **Responsive Layout** - Works on desktop (>1440px), tablet (768-1440px), mobile (collapsible)

---

## Out of Scope

- Inline editing of patient demographics (use existing patient edit page)
- Creating new observations from context panel (use existing observation entry)
- Medication ordering/prescribing (Phase 3 - EHR integration)
- Real-time vitals streaming from devices (Phase 3 - device integration)
- Patient messaging/chat (Phase 4 - secure messaging)

---

## Expected Deliverable

1. **Context panel opens with 1 click from alert row, task row, or patient list**
2. **Panel loads in <500ms with all patient data pre-fetched**
3. **Vitals trend charts render with 7/30/90-day toggle**
4. **Medication list shows adherence % with color-coded indicators (🟢 >80%, 🟡 60-80%, 🔴 <60%)**
5. **Device status shows last reading time with "⚠️ No reading in 48+ hours" warning**
6. **Quick actions: Click phone number → initiate call (tel: link), Click "Create Task" → open task form pre-filled with patient**
7. **Panel is dismissible with X button or clicking outside**
8. **Keyboard accessible: Esc to close, Tab navigation**

---

## Spec Documentation

- Technical Specification: @.agent-os/specs/2025-10-14-patient-context-panel/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-10-14-patient-context-panel/sub-specs/api-spec.md
- Frontend Design: @.agent-os/specs/2025-10-14-patient-context-panel/sub-specs/frontend-design.md
- Tests Specification: @.agent-os/specs/2025-10-14-patient-context-panel/sub-specs/tests.md
