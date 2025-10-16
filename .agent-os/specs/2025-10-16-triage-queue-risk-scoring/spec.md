# Spec Requirements Document

> Spec: Prioritized Triage Queue with Risk Scoring
> Created: 2025-10-16
> Status: Planning

## Overview

Implement a unified, risk-prioritized alert triage queue that enables care managers to efficiently identify and resolve the most critical patient alerts first. The system will calculate a 0-10 risk score for each alert using vitals deviation, trend velocity, and medication adherence patterns, combined with alert severity multipliers. This replaces the current unordered alert list with an intelligent workflow optimizer that reduces alert resolution time by 40-50%.

## User Stories

### Care Manager Prioritizing Daily Workload

As a care manager, I want to see a single, prioritized list of all pending alerts sorted by risk score, so that I can immediately focus on the most critical patients first and avoid missing high-risk situations buried in long lists.

**Workflow:**
1. Care manager arrives at work and opens the Triage Queue page
2. Queue automatically displays all PENDING and ACKNOWLEDGED alerts, sorted by risk score (highest first)
3. Each alert shows color-coded severity badge (red=CRITICAL, orange=HIGH, yellow=MEDIUM, blue=LOW)
4. Risk score (0-10) displays prominently with visual indicator (progress bar or colored badge)
5. SLA breach indicator shows time remaining or "OVERDUE" for breached alerts
6. Care manager clicks "Claim" to assign alert to themselves, preventing collisions with other care managers
7. Claimed alerts show care manager's name and claim timestamp

**Problem Solved:** Eliminates wasted time scanning through unordered alert lists and reduces risk of missing critical patient deterioration.

### Care Manager Resolving High-Risk Alert

As a care manager, I want to claim an alert so other team members know I'm handling it, review patient context quickly, and document my intervention efficiently.

**Workflow:**
1. Care manager identifies top-priority alert (high risk score, nearing SLA breach)
2. Clicks "Claim" button - alert status changes to claimed, shows care manager's name
3. Opens patient context panel (right sidebar) showing recent vitals trends, medication adherence, contact info
4. Calls patient to assess situation
5. Documents intervention in encounter note (future feature - Phase 1a)
6. Resolves alert with resolution notes
7. Queue automatically refreshes, next highest-risk alert moves to top

**Problem Solved:** Prevents duplicate work by multiple care managers, provides immediate patient context, enables efficient resolution workflow.

### Supervisor Monitoring Team Performance

As a clinical supervisor, I want to see which alerts are claimed vs unclaimed, which are approaching SLA breach, and overall team workload distribution.

**Workflow:**
1. Supervisor opens Triage Queue with filter showing "All Team Members"
2. Views claimed alerts with assigned care manager names
3. Identifies unclaimed high-risk alerts and assigns them manually or notifies available staff
4. Monitors SLA breach indicators to ensure timely response
5. Uses queue filters to view alerts by severity, SLA status, or assigned care manager

**Problem Solved:** Provides real-time visibility into team workload and alert resolution status, enabling proactive intervention before SLA breaches.

## Spec Scope

1. **Risk Score Calculation Engine** - Backend service that calculates 0-10 risk scores using: vitals deviation from normal ranges (50% weight), trend velocity over 7 days (30% weight), medication adherence penalty (20% weight), multiplied by severity factor (CRITICAL: 2.0x, HIGH: 1.5x, MEDIUM: 1.0x, LOW: 0.5x).

2. **Alert Claiming System** - API endpoints and database fields to support care managers claiming/unclaiming alerts, with claim timestamps and user identification to prevent workflow collisions.

3. **SLA Breach Tracking** - Visual indicators showing time remaining until SLA breach (color-coded: green >2hr, yellow 30min-2hr, red <30min), with "OVERDUE" flag for breached alerts.

4. **Triage Queue Page (Frontend)** - New React component with filterable, sortable alert table showing risk score, severity badge, patient name, alert message, claimed status, SLA countdown, and action buttons (Claim, View, Resolve).

5. **Queue Filters and Sorting** - Client-side and server-side filtering by: severity (CRITICAL/HIGH/MEDIUM/LOW), claim status (unclaimed, claimed by me, claimed by others), SLA status (breached, <30min, <2hr, safe), and assigned care manager.

## Out of Scope

- **Patient Context Panel** - Right sidebar with comprehensive patient details (separate feature in Phase 1a)
- **Encounter Notes/Documentation** - Auto-populated clinical documentation templates (separate feature in Phase 1a)
- **Task Creation from Alerts** - Automatic follow-up task generation (separate feature in Phase 1a)
- **Real-Time WebSocket Updates** - Live queue updates without page refresh (Phase 1b feature)
- **Bulk Alert Actions** - Multi-select and bulk resolve/acknowledge (Phase 1b feature)
- **Saved Views/Custom Filters** - User-defined filter presets (Phase 1b nice-to-have)

## Expected Deliverable

1. **Risk-Prioritized Triage Queue** - Care managers can open `/triage-queue` page and see a sorted list of alerts with the highest-risk patient at the top, color-coded by severity, with risk scores prominently displayed.

2. **Alert Claiming Functionality** - Care managers can click "Claim" on any unclaimed alert, which locks it to them and displays their name, preventing other care managers from working on the same alert simultaneously.

3. **SLA Breach Indicators** - Each alert shows visual countdown to SLA breach time (e.g., "1h 23m remaining" in yellow for alerts approaching breach, "OVERDUE 15m" in red for breached alerts).

4. **Functional Filters** - Care managers can filter queue by: "My Claimed Alerts", "Unclaimed Alerts", "All Alerts", severity levels, and SLA status (breached, critical, safe).

5. **Performance Target** - Queue loads in <2 seconds with 100+ alerts, risk scores update automatically when new observations are created, and alert resolution workflow is 40% faster than current unordered alert list.

## Spec Documentation

- **Tasks:** @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/tasks.md
- **Technical Specification:** @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/technical-spec.md
- **API Specification:** @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/api-spec.md
- **Database Schema:** @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/database-schema.md
- **Tests Specification:** @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/tests.md

---

## Implementation Summary

**Database Changes:** ✅ None required - all Alert model fields already exist

**New Files to Create:**
- `src/services/riskScoringService.js` - Risk calculation logic
- `frontend/src/pages/TriageQueue.jsx` - Main triage queue UI
- `frontend/src/components/RiskScoreBadge.jsx` - Risk score display component
- `frontend/src/components/SLACountdown.jsx` - SLA timer component

**Files to Modify:**
- `src/services/alertEvaluationService.js` - Add risk score calculation on alert creation
- `src/controllers/observationController.js` - Add risk score updates after new observations
- `src/controllers/alertController.js` - Add triage queue, claim, unclaim endpoints
- `src/routes/alertRoutes.js` - Add new routes
- `frontend/src/App.jsx` - Add triage queue route
- `frontend/src/components/Layout.jsx` - Add navigation link

**Estimated Timeline:** 8-10 days (4 weeks of work)

**Success Metrics:**
- Median alert resolution time: <20 minutes (vs current ~30 min baseline)
- Queue load time: <2 seconds with 100+ alerts
- Care manager workflow collisions: 0% (via claim system)
- Risk score accuracy: 95%+ correlation with clinical outcomes
