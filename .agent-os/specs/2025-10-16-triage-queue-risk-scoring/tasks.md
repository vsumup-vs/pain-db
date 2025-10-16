# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/spec.md

> Created: 2025-10-16
> Status: Ready for Implementation

## Tasks

- [ ] 1. Risk Scoring Service - Backend Logic
  - [ ] 1.1 Write unit tests for risk score calculation components (vitals deviation, trend velocity, adherence penalty, severity multiplier)
  - [ ] 1.2 Implement `riskScoringService.js` with `calculateRiskScore()` function
  - [ ] 1.3 Implement `calculateVitalsDeviation()` helper function with normalRange logic
  - [ ] 1.4 Implement `calculateTrendVelocity()` helper function with linear regression for 7-day trend
  - [ ] 1.5 Implement `calculateAdherencePenalty()` helper function converting adherence % to penalty
  - [ ] 1.6 Implement `updateAlertRiskScores()` function for recalculating scores after new observations
  - [ ] 1.7 Verify all unit tests pass with >90% coverage

- [ ] 2. Alert Evaluation Enhancement - Risk Score on Creation
  - [ ] 2.1 Write integration tests for risk score calculation during alert creation
  - [ ] 2.2 Update `alertEvaluationService.js` to call `calculateRiskScore()` when creating alerts
  - [ ] 2.3 Update alert creation to include `riskScore` and `slaBreachTime` fields (already calculated)
  - [ ] 2.4 Test alert creation includes risk score in database
  - [ ] 2.5 Verify all integration tests pass

- [ ] 3. Observation Controller Enhancement - Risk Score Updates
  - [ ] 3.1 Write integration tests for risk score recalculation after observation creation
  - [ ] 3.2 Update `observationController.js` to call `updateAlertRiskScores()` after alert evaluation
  - [ ] 3.3 Ensure recalculation runs asynchronously (non-blocking) using `setImmediate()`
  - [ ] 3.4 Add minimal logging for risk score updates
  - [ ] 3.5 Verify all integration tests pass

- [ ] 4. Triage Queue API Endpoint
  - [ ] 4.1 Write integration tests for GET `/api/alerts/triage-queue` endpoint (filtering, sorting, pagination)
  - [ ] 4.2 Implement `getTriageQueue()` controller function in `alertController.js`
  - [ ] 4.3 Implement organization isolation filtering
  - [ ] 4.4 Implement claim status filtering (all, unclaimed, claimed_by_me, claimed_by_others)
  - [ ] 4.5 Implement severity filtering
  - [ ] 4.6 Implement SLA status filtering (breached, critical, warning, safe)
  - [ ] 4.7 Implement sorting by riskScore DESC, slaBreachTime ASC, triggeredAt ASC
  - [ ] 4.8 Implement pagination with limit/offset
  - [ ] 4.9 Include patient, rule, claimedBy relationships in response
  - [ ] 4.10 Calculate `slaStatus` and `timeUntilBreach` fields in response
  - [ ] 4.11 Add authorization check (ALERT_READ permission)
  - [ ] 4.12 Add route to `src/routes/alertRoutes.js`
  - [ ] 4.13 Verify all integration tests pass

- [ ] 5. Alert Claim/Unclaim API Endpoints
  - [ ] 5.1 Write integration tests for POST `/api/alerts/:id/claim` endpoint
  - [ ] 5.2 Write integration tests for POST `/api/alerts/:id/unclaim` endpoint
  - [ ] 5.3 Implement `claimAlert()` controller function
  - [ ] 5.4 Implement claim validation (alert exists, unclaimed, same organization)
  - [ ] 5.5 Implement claim logic (update claimedById, claimedAt)
  - [ ] 5.6 Implement claim audit logging (ALERT_CLAIMED action)
  - [ ] 5.7 Implement `unclaimAlert()` controller function
  - [ ] 5.8 Implement unclaim authorization (own alert or supervisor)
  - [ ] 5.9 Implement unclaim logic (set claimedById, claimedAt to null)
  - [ ] 5.10 Implement unclaim audit logging (ALERT_UNCLAIMED action)
  - [ ] 5.11 Add routes to `src/routes/alertRoutes.js`
  - [ ] 5.12 Verify all integration tests pass

- [ ] 6. Triage Queue Frontend Component
  - [ ] 6.1 Create `frontend/src/pages/TriageQueue.jsx` component skeleton
  - [ ] 6.2 Implement TanStack Query hook for fetching triage queue data
  - [ ] 6.3 Implement alert table layout with columns (risk score, severity, patient, message, SLA, actions)
  - [ ] 6.4 Implement risk score badge component with color coding (0-3: green, 4-6: yellow, 7-8: orange, 9-10: red)
  - [ ] 6.5 Implement severity badge component with color coding (CRITICAL: red, HIGH: orange, MEDIUM: yellow, LOW: blue)
  - [ ] 6.6 Implement SLA countdown component with live timer (updates every 60s)
  - [ ] 6.7 Implement SLA status color coding (safe: green, warning: yellow, critical/breached: red)
  - [ ] 6.8 Implement claim/unclaim button logic with loading states
  - [ ] 6.9 Implement TanStack Query mutations for claim/unclaim API calls
  - [ ] 6.10 Implement optimistic updates for claim/unclaim actions
  - [ ] 6.11 Implement error handling and toast notifications
  - [ ] 6.12 Add route to `frontend/src/App.jsx` at `/triage-queue`
  - [ ] 6.13 Test component renders correctly with mock data

- [ ] 7. Triage Queue Filters and Sorting
  - [ ] 7.1 Implement claim status filter dropdown (All, Unclaimed, My Claimed)
  - [ ] 7.2 Implement severity filter dropdown (All, CRITICAL, HIGH, MEDIUM, LOW)
  - [ ] 7.3 Implement SLA status filter dropdown (All, Breached, Critical, Warning, Safe)
  - [ ] 7.4 Implement supervisor-only assigned clinician filter (visible for ORG_ADMIN only)
  - [ ] 7.5 Wire filters to TanStack Query params and refetch on change
  - [ ] 7.6 Implement client-side sort toggle for risk score column (optional enhancement)
  - [ ] 7.7 Test filters update queue correctly

- [ ] 8. Triage Queue Navigation and Layout
  - [ ] 8.1 Add "Triage Queue" link to main navigation menu in `frontend/src/components/Layout.jsx`
  - [ ] 8.2 Position triage queue prominently (after Dashboard, before Patients)
  - [ ] 8.3 Add badge showing count of unclaimed alerts (red badge if >0)
  - [ ] 8.4 Style triage queue page with responsive design (mobile-first)
  - [ ] 8.5 Test navigation works from all pages

- [ ] 9. E2E Testing
  - [ ] 9.1 Write E2E test for triage queue page load and sorting
  - [ ] 9.2 Write E2E test for claim button functionality
  - [ ] 9.3 Write E2E test for unclaim button functionality
  - [ ] 9.4 Write E2E test for filters (claim status, severity, SLA status)
  - [ ] 9.5 Write E2E test for SLA countdown display
  - [ ] 9.6 Run all E2E tests and verify 100% pass rate

- [ ] 10. Documentation and Final Verification
  - [ ] 10.1 Update API documentation with triage queue endpoints
  - [ ] 10.2 Create user guide for triage queue workflow (markdown in docs/)
  - [ ] 10.3 Test entire workflow end-to-end manually (create observation → alert → triage → claim → resolve)
  - [ ] 10.4 Verify risk score updates when new observations created
  - [ ] 10.5 Verify SLA countdown updates every 60 seconds
  - [ ] 10.6 Verify organization isolation works (users can't see other org alerts)
  - [ ] 10.7 Verify supervisor can unclaim alerts claimed by others
  - [ ] 10.8 Verify performance (queue loads <2s with 100 alerts)
  - [ ] 10.9 Run full test suite and verify all tests pass
  - [ ] 10.10 Create pull request with comprehensive description

## Implementation Notes

### Task Execution Order

Follow the tasks in sequential order. Each task builds on the previous one:

1. **Backend Foundation (Tasks 1-5):** Build risk scoring logic and API endpoints first
2. **Frontend UI (Tasks 6-8):** Build triage queue interface and filters
3. **Testing & Verification (Tasks 9-10):** E2E tests and final validation

### Test-Driven Development (TDD)

Each major task follows TDD workflow:
1. Write tests first (subtask X.1)
2. Implement functionality (subtasks X.2-X.N)
3. Verify tests pass (subtask X.last)

### Dependencies

- **Task 2 depends on Task 1:** Risk scoring service must exist before alert evaluation can use it
- **Task 3 depends on Tasks 1-2:** Observation controller needs risk scoring service and enhanced alert evaluation
- **Task 5 depends on Task 4:** Claim/unclaim endpoints build on triage queue API patterns
- **Tasks 6-8 depend on Tasks 4-5:** Frontend needs backend APIs functional
- **Task 9 depends on Tasks 6-8:** E2E tests require frontend components

### Estimated Timeline

- **Week 1:** Tasks 1-3 (Risk scoring backend logic)
- **Week 2:** Tasks 4-5 (Triage queue API endpoints)
- **Week 3:** Tasks 6-8 (Frontend triage queue UI)
- **Week 4:** Tasks 9-10 (E2E testing and documentation)

**Total:** 8-10 days (as estimated in roadmap)

### Success Criteria

- ✅ All unit tests pass with >90% coverage for risk scoring service
- ✅ All integration tests pass with >85% coverage for API endpoints
- ✅ All E2E tests pass with 100% success rate
- ✅ Triage queue loads in <2 seconds with 100+ alerts
- ✅ Risk scores update automatically when new observations created
- ✅ Care managers can claim/unclaim alerts without conflicts
- ✅ Organization isolation verified (cross-org alerts not visible)
- ✅ SLA countdown updates every 60 seconds
- ✅ Filters work correctly (claim status, severity, SLA status)

## Spec Documentation

- Spec Requirements: @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/spec.md
- Technical Specification: @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/api-spec.md
- Database Schema: @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/database-schema.md
- Tests Specification: @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/sub-specs/tests.md
