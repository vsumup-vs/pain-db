# Spec Requirements Document

> Spec: Monthly Billing Readiness Dashboard
> Created: 2025-10-14
> Status: Planning
> Priority: P0 (Critical)
> Estimated Effort: 3-4 days

---

## Overview

Implement a compliance tracking dashboard that shows which patients meet CMS billing requirements for RPM/RTM/CCM programs, with exportable monthly billing packages for finance teams.

**Current Problem**: RPM coordinators manually calculate billing eligibility by:
- Exporting TimeLog entries to spreadsheet
- Counting observation days per patient
- Cross-referencing CMS requirements (CCM: 20+ min, RPM: 16+ days readings, RTM: 20+ min + 16+ days)
- Manually creating billing packages for finance

This takes 4-8 hours per month and is error-prone.

**Success Criteria**: >95% billing package readiness by month 3 (vs current manual process)

---

## User Stories

### RPM Coordinator Monthly Billing Preparation

As an RPM coordinator, I want a dashboard showing which patients meet billing requirements, so that I can prepare billing packages in 30 minutes instead of 4-8 hours.

**Current Workflow (Manual - 4-8 hours)**:
1. Export all TimeLog entries for the month to CSV
2. Export all Observation entries for the month to CSV
3. Create spreadsheet with formulas to:
   - Sum minutes per patient
   - Count unique observation days per patient
   - Compare to CMS thresholds
4. Manually flag eligible patients
5. Create billing package spreadsheet for finance
6. Email to billing team

**New Workflow (Automated - 30 minutes)**:
1. Open Billing Readiness Dashboard
2. Select month/year
3. See patient eligibility table:
   - 🟢 Eligible (45 patients)
   - 🟡 Close - need 2 more days of readings (8 patients)
   - 🔴 Not Eligible - need 10+ minutes (12 patients)
4. Click "Export Billing Package CSV"
5. Download includes: patient ID, name, program type, minutes logged, reading days, CPT codes, eligible amounts
6. Email CSV to finance team

---

### Care Manager Proactive Intervention

As a care manager, I want to see which of my patients are close to billing thresholds, so that I can prioritize interventions to ensure they remain eligible.

**Workflow**:
1. Mid-month: Open "My Patients' Billing Status" view
2. See 3 patients flagged 🟡 Close:
   - Patient A: Has 18 minutes logged (need 2 more for CCM)
   - Patient B: Has 14 reading days (need 2 more for RPM)
   - Patient C: Has 15 minutes + 14 days (need 5 min + 2 days for RTM)
3. Create tasks: "Schedule follow-up call with Patient A" to log additional time
4. Create tasks: "Remind Patient B to take daily readings"
5. End of month: All 3 patients now 🟢 Eligible

---

## Spec Scope

1. **Billing Calculation Service** - Backend service that calculates eligibility based on TimeLog and Observation data
2. **CMS Requirements Engine** - Configurable rules for each program type:
   - **CCM**: 20+ minutes of clinical time
   - **RPM**: 16+ unique days with device readings
   - **RTM**: 20+ minutes of clinical time AND 16+ unique days with readings
   - **TCM**: 30-day post-discharge window with 2 contacts (one within 2 days, one within 7-14 days)
3. **Billing Readiness Dashboard** - Frontend page showing month/year selector, patient eligibility table, summary stats
4. **Patient Eligibility Table** - Sortable/filterable table with columns: patient name, program type, minutes logged, reading days, eligibility status, reason if not eligible
5. **CSV Export** - Downloadable billing package with all required fields for finance team
6. **Alerts for Close Patients** - Optional: auto-create tasks for patients within 5 minutes or 2 days of threshold

---

## Out of Scope

- Automated billing submission to insurance (Phase 3)
- Revenue forecasting / financial analytics (Phase 5)
- Integration with billing software (QuickBooks, Epic Resolute) - Phase 3
- Patient-level billing history (view all past billing cycles) - Phase 2
- Multi-month trend analysis - Phase 2

---

## Expected Deliverable

1. **Billing Readiness Dashboard accessible from main navigation**
2. **Month/Year selector (default: current month)**
3. **Summary cards: X Eligible, Y Close, Z Not Eligible**
4. **Patient eligibility table with 8 columns:**
   - Patient Name
   - Program Type (CCM, RPM, RTM, TCM)
   - Minutes Logged
   - Reading Days
   - Status (🟢 Eligible, 🟡 Close, 🔴 Not Eligible)
   - Reason (if not eligible: "Need 5 more minutes" or "Need 3 more reading days")
   - Assigned Care Manager
   - Actions (Create Task button)
5. **Filters: Program type, eligibility status, care manager**
6. **"Export Billing Package CSV" button → downloads ready-to-send CSV**
7. **CSV includes: Patient ID, First Name, Last Name, MRN, Program Type, Minutes Logged, Reading Days, Eligible CPT Codes, Billing Amount**
8. **Performance: Dashboard loads in <1 second for 500 patients**

---

## CMS Billing Requirements Reference

### CCM (Chronic Care Management) - CPT 99490, 99491
- **Requirement**: 20+ minutes of clinical time per month
- **Eligible CPT Codes**:
  - 99490: 20-39 minutes
  - 99491: 40+ minutes

### RPM (Remote Patient Monitoring) - CPT 99457, 99458
- **Requirement**: 16+ unique days with device readings per month
- **Eligible CPT Codes**:
  - 99457: Initial 20 minutes of clinical time
  - 99458: Each additional 20 minutes

### RTM (Remote Therapeutic Monitoring) - CPT 98975, 98976, 98977
- **Requirement**: 16+ unique days with readings AND 20+ minutes of clinical time
- **Eligible CPT Codes**:
  - 98975: Device setup and patient education
  - 98976: Initial 20 minutes of treatment management
  - 98977: Each additional 20 minutes

### TCM (Transitional Care Management) - CPT 99495, 99496
- **Requirement**: Post-discharge care within 30 days
  - Moderate complexity: 1 contact within 2 days, 1 contact within 7-14 days (99495)
  - High complexity: 1 contact within 2 days, face-to-face visit within 7-14 days (99496)

---

## Spec Documentation

- Technical Specification: @.agent-os/specs/2025-10-14-billing-readiness-dashboard/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-10-14-billing-readiness-dashboard/sub-specs/api-spec.md
- Frontend Design: @.agent-os/specs/2025-10-14-billing-readiness-dashboard/sub-specs/frontend-design.md
- Tests Specification: @.agent-os/specs/2025-10-14-billing-readiness-dashboard/sub-specs/tests.md
