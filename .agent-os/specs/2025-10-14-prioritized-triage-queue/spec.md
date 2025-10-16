# Spec Requirements Document

> Spec: Prioritized Triage Queue with Risk Scoring
> Created: 2025-10-14
> Status: Planning
> Priority: P0 (Critical)
> Estimated Effort: 8-10 days

---

## Overview

Implement a unified, risk-scored triage queue that prioritizes alerts based on clinical urgency, enabling care managers to focus on the highest-risk patients first. This feature transforms the current alert list (no prioritization) into an intelligent workflow optimizer that reduces median alert resolution time by 40%.

**Success Criteria**: Median alert resolution time <20 minutes (vs current ~30 min baseline)

---

## User Stories

### Care Manager Daily Workflow

As a care manager, I want a unified, risk-prioritized alert queue, so that I can immediately identify and address the most critical patients without manually reviewing dozens of alerts.

**Current Workflow (Inefficient)**:
1. Log in → See 20 alerts in chronological order
2. Manually scan each alert to assess urgency
3. Context switch to patient details for each alert
4. Guess which patient needs attention first
5. Spend 30+ minutes per alert due to inefficient prioritization

**New Workflow (Optimized)**:
1. Log in → See triage queue with top 3 CRITICAL alerts clearly highlighted
2. Click "Claim" on highest-risk alert (prevents colleague collisions)
3. Patient context panel opens automatically with vitals trends
4. Address issue and document in <20 minutes
5. Move to next prioritized alert

---

### Physician Review

As a physician, I want to see escalated alerts sorted by risk score, so that I can quickly review and approve care manager actions for the highest-risk patients.

**Workflow**:
1. Open "Escalated to Me" filter in triage queue
2. See only HIGH and CRITICAL risk alerts requiring physician review
3. Review patient context, approve or modify care plan
4. Mark as resolved with attestation

---

### RPM Coordinator Monitoring

As an RPM coordinator, I want visibility into queue backlog and SLA breaches, so that I can proactively reassign workload and prevent missed interventions.

**Workflow**:
1. View triage queue with "SLA Breach Risk" column
2. Identify alerts approaching 2-hour SLA (yellow warning)
3. Reassign overloaded care managers to balance workload
4. Generate daily report of SLA compliance %

---

## Spec Scope

1. **Risk Scoring Algorithm** - Calculate 0-10 risk score for each alert based on vital deviation, trend velocity, adherence, and alert severity
2. **Alert Model Updates** - Add `riskScore`, `priorityRank`, `slaBreachTime`, `claimedById`, `claimedAt` fields
3. **Backend API** - New `/api/alerts/triage-queue` endpoint with risk-sorted results and filters
4. **Frontend Triage Queue Component** - New `TriageQueue.jsx` page replacing current Alerts.jsx as default view
5. **Alert Claiming Workflow** - "Claim" button to assign alert to current user (prevent collisions)
6. **SLA Breach Indicators** - Visual warnings (🟡 yellow, 🔴 red) for alerts approaching or exceeding SLA
7. **Color-Coded Risk Levels** - 🔴 Critical (8-10), 🟠 High (6-8), 🟡 Medium (4-6), 🟢 Low (0-4)

---

## Out of Scope

- Advanced machine learning risk prediction (Phase 5)
- Patient-level risk scores (separate from alert risk)
- Predictive modeling for future alerts
- Real-time WebSocket updates (deferred to Phase 1b)
- Saved filter presets (deferred to Phase 2)

---

## Expected Deliverable

1. **Care managers can open triage queue and immediately see highest-risk alerts at top**
2. **Risk scores (0-10) displayed for all alerts with color-coded badges**
3. **"Claim Alert" button prevents multiple care managers from working on same alert**
4. **SLA breach warnings visible for alerts approaching or exceeding time limits**
5. **Filters working: risk level, program type, assigned clinician, SLA status**
6. **Performance: Queue loads in <500ms for 100+ alerts**

---

## Spec Documentation

- Technical Specification: @.agent-os/specs/2025-10-14-prioritized-triage-queue/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-10-14-prioritized-triage-queue/sub-specs/database-schema.md
- API Specification: @.agent-os/specs/2025-10-14-prioritized-triage-queue/sub-specs/api-spec.md
- Frontend Design: @.agent-os/specs/2025-10-14-prioritized-triage-queue/sub-specs/frontend-design.md
- Tests Specification: @.agent-os/specs/2025-10-14-prioritized-triage-queue/sub-specs/tests.md
