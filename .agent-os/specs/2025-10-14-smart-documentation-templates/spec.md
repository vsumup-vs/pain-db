# Spec Requirements Document

> Spec: Smart Documentation Templates & Encounter Notes
> Created: 2025-10-14
> Status: Planning
> Priority: P0 (Critical)
> Estimated Effort: 4-5 days

---

## Overview

Implement auto-populated encounter note templates that pre-fill vitals snapshots, assessment summaries, and alert context, reducing documentation time by 50% (from ~10 minutes to ~5 minutes per encounter). Includes physician attestation workflow for billing compliance.

**Current Problem**: Care managers manually type encounter notes after every patient interaction, spending 10+ minutes documenting:
- Chief concern
- Recent vitals
- Patient-reported symptoms
- Clinical assessment
- Care plan and next steps

This is time-consuming, error-prone, and leads to documentation delays.

**Success Criteria**: Documentation time reduced by 50% (from ~10 min to ~5 min per encounter)

---

## User Stories

### Care Manager Post-Alert Documentation

As a care manager who just resolved an alert, I want an encounter note template that pre-fills the clinical context, so that I can document the interaction in 5 minutes instead of 10.

**Current Workflow (Manual)**:
1. Resolve alert
2. Open blank note editor
3. Manually type patient name, date, alert description
4. Manually type recent vitals from memory or copy-paste
5. Type subjective, objective, assessment, plan
6. Save note
7. **Total Time**: 10-15 minutes

**New Workflow (Auto-Populated)**:
1. Resolve alert → Click "Document Encounter"
2. Smart template pre-fills:
   - Chief concern: "High blood pressure alert: 180/110 on Oct 14"
   - Vitals snapshot: Last 7 days BP readings in table
   - Assessment summary: "Patient enrolled in Hypertension Management program"
3. Care manager edits only 4 fields:
   - Subjective: Patient-reported symptoms
   - Objective: Clinical observations from call
   - Assessment: Clinical judgment
   - Plan: Next steps
4. Save note
5. **Total Time**: 5 minutes (50% reduction)

---

### Physician Attestation for Billing

As a physician, I want to review and attest encounter notes with 1 click, so that care managers can bill for RPM/RTM/CCM services.

**Workflow**:
1. Care manager completes encounter note
2. Physician receives notification: "3 encounters pending attestation"
3. Physician opens batch review panel
4. Reviews each note summary (pre-filled assessment and plan)
5. Click "Approve & Attest" or "Edit & Attest"
6. Attestation locks note (immutable for billing audit)
7. CPT code automatically determined based on encounter type and duration

---

## Spec Scope

1. **EncounterNote Model** - New Prisma model with encounterType (RPM, RTM, CCM, TCM, GENERAL), auto-populated fields, clinician-editable fields, attestation fields
2. **Template Generation Logic** - Service that auto-fills chief concern, vitals snapshot, assessment summary based on alert, task, or program context
3. **Encounter Note CRUD APIs** - Create, read, update, attest, lock
4. **Note Editor Component** - React component with pre-filled fields (read-only) and editable fields (rich text)
5. **Attestation Workflow** - Physician review panel, batch approval, digital signature, note locking
6. **Encounter Type Selection** - Care manager selects RPM, RTM, CCM, or GENERAL → template adjusts fields accordingly
7. **CPT Code Auto-Determination** - Based on encounter type, duration, and linked TimeLog entry

---

## Out of Scope

- Voice-to-text dictation (Phase 3)
- SOAP note templates (focus on RPM/RTM/CCM formats first)
- Integration with external EHR documentation systems (Phase 3)
- AI-powered clinical suggestions (Phase 5)
- Co-signature workflows (defer to Phase 2)

---

## Expected Deliverable

1. **Care managers can create encounter note from alert resolution with pre-filled context**
2. **Template selection: RPM, RTM, CCM, TCM, GENERAL → adjusts required fields**
3. **Auto-populated fields (read-only): Chief concern, vitals snapshot, assessment summary**
4. **Editable fields: Subjective, Objective, Assessment, Plan, duration, CPT codes**
5. **Autosave drafts every 30 seconds (prevent data loss)**
6. **"Finalize & Request Attestation" button → notifies physician**
7. **Physician attestation panel: batch review, approve with 1 click, note locks after attestation**
8. **Locked notes: immutable, display attestation info (physician name, timestamp, digital signature)**

---

## Spec Documentation

- Technical Specification: @.agent-os/specs/2025-10-14-smart-documentation-templates/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-10-14-smart-documentation-templates/sub-specs/database-schema.md
- API Specification: @.agent-os/specs/2025-10-14-smart-documentation-templates/sub-specs/api-spec.md
- Frontend Design: @.agent-os/specs/2025-10-14-smart-documentation-templates/sub-specs/frontend-design.md
- Tests Specification: @.agent-os/specs/2025-10-14-smart-documentation-templates/sub-specs/tests.md
