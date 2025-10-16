# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/spec.md

> Created: 2025-10-16
> Version: 1.0.0

## Test Coverage Overview

### Unit Tests (Backend)

**Test Files:**
- `src/services/__tests__/riskScoringService.test.js`
- `src/controllers/__tests__/alertController.test.js`

**Coverage Target:** 90%+ for risk scoring logic, 80%+ for controllers

---

### Integration Tests (Backend)

**Test Files:**
- `src/controllers/__tests__/alertController.integration.test.js`
- `src/services/__tests__/riskScoringService.integration.test.js`

**Coverage Target:** 85%+ for API endpoints and database operations

---

### E2E Tests (Frontend)

**Test Files:**
- `tests/e2e/triage-queue.spec.js`

**Coverage Target:** Core user workflows (claim, unclaim, filter, sort)

---

## Unit Tests: riskScoringService.js

### Test Suite: calculateRiskScore()

**File:** `src/services/__tests__/riskScoringService.test.js`

#### Test: "calculates vitals deviation correctly for value above normal range"
```javascript
const alert = {
  severity: 'MEDIUM',
  data: { value: 150 }  // BP systolic
};
const metric = {
  normalRange: { min: 90, max: 120 }
};

const result = calculateRiskScore(alert, patient, metric, [], { percentage: 100 });

// (150 - 120) / 120 = 0.25 → 2.5 vitals deviation
// (2.5 * 0.5 + 0 * 0.3 + 0 * 0.2) * 1.0 = 1.25
expect(result.riskScore).toBeCloseTo(1.25, 2);
expect(result.components.vitalsDeviation).toBeCloseTo(2.5, 2);
```

#### Test: "calculates vitals deviation correctly for value below normal range"
```javascript
const alert = {
  severity: 'HIGH',
  data: { value: 50 }  // BP systolic dangerously low
};
const metric = {
  normalRange: { min: 90, max: 120 }
};

const result = calculateRiskScore(alert, patient, metric, [], { percentage: 100 });

// (90 - 50) / 90 = 0.444 → 4.44 vitals deviation
// (4.44 * 0.5 + 0 * 0.3 + 0 * 0.2) * 1.5 = 3.33
expect(result.riskScore).toBeCloseTo(3.33, 2);
```

#### Test: "calculates trend velocity for worsening trend"
```javascript
const observations = [
  { value: 5, recordedAt: new Date('2025-10-09') },
  { value: 6, recordedAt: new Date('2025-10-11') },
  { value: 7, recordedAt: new Date('2025-10-13') },
  { value: 8, recordedAt: new Date('2025-10-15') }
];

const alert = {
  severity: 'HIGH',
  data: { value: 9 }  // Pain scale increasing
};

const result = calculateRiskScore(alert, patient, metric, observations, { percentage: 100 });

// Positive slope (worsening) should increase velocity
expect(result.components.trendVelocity).toBeGreaterThan(0);
expect(result.riskScore).toBeGreaterThan(5);  // Should be elevated due to trend
```

#### Test: "calculates adherence penalty for poor adherence"
```javascript
const adherence = { percentage: 40 };  // 40% adherence

const result = calculateRiskScore(alert, patient, metric, [], adherence);

// adherencePenalty = 10 - (40 / 10) = 6.0
expect(result.components.adherencePenalty).toBeCloseTo(6.0, 1);
```

#### Test: "applies severity multiplier correctly"
```javascript
const baseAlert = {
  severity: 'MEDIUM',
  data: { value: 8 }
};

const mediumResult = calculateRiskScore(baseAlert, patient, metric, [], { percentage: 100 });

const criticalAlert = { ...baseAlert, severity: 'CRITICAL' };
const criticalResult = calculateRiskScore(criticalAlert, patient, metric, [], { percentage: 100 });

// CRITICAL should have 2x the risk score of MEDIUM
expect(criticalResult.riskScore).toBeCloseTo(mediumResult.riskScore * 2, 1);
```

#### Test: "caps risk score at 10"
```javascript
const alert = {
  severity: 'CRITICAL',
  data: { value: 200 }  // Extreme value
};
const metric = {
  normalRange: { min: 90, max: 120 }
};
const adherence = { percentage: 0 };  // No adherence

const result = calculateRiskScore(alert, patient, metric, [], adherence);

expect(result.riskScore).toBeLessThanOrEqual(10);
expect(result.riskScore).toBeGreaterThan(9);  // Should be very high
```

#### Test: "returns 0 risk score for value in normal range with good adherence"
```javascript
const alert = {
  severity: 'LOW',
  data: { value: 105 }  // Within normal range
};
const metric = {
  normalRange: { min: 90, max: 120 }
};

const result = calculateRiskScore(alert, patient, metric, [], { percentage: 100 });

expect(result.components.vitalsDeviation).toBe(0);
expect(result.riskScore).toBeLessThan(1);  // Very low risk
```

---

### Test Suite: updateAlertRiskScores()

#### Test: "updates risk scores for multiple alerts for same patient/metric"
```javascript
// Create 3 alerts for same patient and metric
const alerts = [
  { id: 'alert1', status: 'PENDING', riskScore: 5.0 },
  { id: 'alert2', status: 'ACKNOWLEDGED', riskScore: 6.0 },
  { id: 'alert3', status: 'RESOLVED', riskScore: 4.0 }  // Should NOT be updated
];

const result = await updateAlertRiskScores(patientId, metricId);

expect(result.updated).toBe(2);  // Only PENDING and ACKNOWLEDGED
expect(result.alerts).toHaveLength(2);
expect(result.alerts[0].riskScore).not.toBe(5.0);  // Score changed
expect(result.alerts[1].riskScore).not.toBe(6.0);  // Score changed
```

#### Test: "skips alerts without sufficient data for recalculation"
```javascript
// Alert for metric without normalRange
const result = await updateAlertRiskScores(patientId, metricIdWithoutRange);

expect(result.updated).toBe(0);
expect(result.alerts).toHaveLength(0);
```

---

## Integration Tests: alertController.js

### Test Suite: GET /api/alerts/triage-queue

**File:** `src/controllers/__tests__/alertController.integration.test.js`

#### Test: "returns alerts sorted by risk score descending"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue')
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
expect(response.body.data.alerts).toHaveLength(3);

const riskScores = response.body.data.alerts.map(a => a.riskScore);
expect(riskScores).toEqual([8.5, 6.2, 3.1]);  // Descending order
```

#### Test: "filters by claimStatus=unclaimed"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue?claimStatus=unclaimed')
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
response.body.data.alerts.forEach(alert => {
  expect(alert.claimedById).toBeNull();
});
```

#### Test: "filters by claimStatus=claimed_by_me"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue?claimStatus=claimed_by_me')
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
response.body.data.alerts.forEach(alert => {
  expect(alert.claimedById).toBe(userId);
});
```

#### Test: "filters by severity=CRITICAL"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue?severity=CRITICAL')
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
response.body.data.alerts.forEach(alert => {
  expect(alert.severity).toBe('CRITICAL');
});
```

#### Test: "filters by slaStatus=breached"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue?slaStatus=breached')
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
response.body.data.alerts.forEach(alert => {
  expect(new Date(alert.slaBreachTime)).toBeLessThan(new Date());
});
```

#### Test: "includes patient, rule, and claimedBy relationships"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue')
  .set('Authorization', `Bearer ${token}`);

const alert = response.body.data.alerts[0];
expect(alert.patient).toBeDefined();
expect(alert.patient.firstName).toBeDefined();
expect(alert.rule).toBeDefined();
expect(alert.rule.name).toBeDefined();
```

#### Test: "respects organization isolation"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue')
  .set('Authorization', `Bearer ${org2Token}`);

expect(response.status).toBe(200);
response.body.data.alerts.forEach(alert => {
  expect(alert.organizationId).toBe(org2Id);
});
```

#### Test: "returns 401 without authentication"
```javascript
const response = await request(app)
  .get('/api/alerts/triage-queue');

expect(response.status).toBe(401);
```

#### Test: "pagination works correctly"
```javascript
const response1 = await request(app)
  .get('/api/alerts/triage-queue?limit=2&offset=0')
  .set('Authorization', `Bearer ${token}`);

const response2 = await request(app)
  .get('/api/alerts/triage-queue?limit=2&offset=2')
  .set('Authorization', `Bearer ${token}`);

expect(response1.body.data.alerts).toHaveLength(2);
expect(response2.body.data.alerts).toHaveLength(2);
expect(response1.body.data.alerts[0].id).not.toBe(response2.body.data.alerts[0].id);
```

---

### Test Suite: POST /api/alerts/:id/claim

#### Test: "successfully claims unclaimed alert"
```javascript
const response = await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
expect(response.body.data.claimedById).toBe(userId);
expect(response.body.data.claimedAt).toBeDefined();
```

#### Test: "returns 400 when alert already claimed"
```javascript
// First claim
await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${token1}`);

// Second claim attempt
const response = await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${token2}`);

expect(response.status).toBe(400);
expect(response.body.message).toContain('already claimed');
```

#### Test: "returns 404 for non-existent alert"
```javascript
const response = await request(app)
  .post(`/api/alerts/nonexistent/claim`)
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(404);
```

#### Test: "returns 403 for alert in different organization"
```javascript
const response = await request(app)
  .post(`/api/alerts/${org2AlertId}/claim`)
  .set('Authorization', `Bearer ${org1Token}`);

expect(response.status).toBe(403);
```

#### Test: "creates audit log entry"
```javascript
await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${token}`);

const auditLog = await prisma.auditLog.findFirst({
  where: {
    action: 'ALERT_CLAIMED',
    resourceId: unclaimedAlertId
  }
});

expect(auditLog).toBeDefined();
expect(auditLog.userId).toBe(userId);
expect(auditLog.hipaaRelevant).toBe(true);
```

---

### Test Suite: POST /api/alerts/:id/unclaim

#### Test: "successfully unclaims own claimed alert"
```javascript
// First claim
await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${token}`);

// Then unclaim
const response = await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/unclaim`)
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
expect(response.body.data.claimedById).toBeNull();
expect(response.body.data.claimedAt).toBeNull();
```

#### Test: "supervisor can unclaim alert claimed by another user"
```javascript
// User claims
await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${userToken}`);

// Supervisor unclaims
const response = await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/unclaim`)
  .set('Authorization', `Bearer ${supervisorToken}`);

expect(response.status).toBe(200);
```

#### Test: "non-supervisor cannot unclaim alert claimed by another user"
```javascript
// User1 claims
await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/claim`)
  .set('Authorization', `Bearer ${user1Token}`);

// User2 tries to unclaim
const response = await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/unclaim`)
  .set('Authorization', `Bearer ${user2Token}`);

expect(response.status).toBe(403);
expect(response.body.message).toContain('you have claimed');
```

#### Test: "returns 400 when alert is not claimed"
```javascript
const response = await request(app)
  .post(`/api/alerts/${unclaimedAlertId}/unclaim`)
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(400);
expect(response.body.message).toContain('not currently claimed');
```

---

## E2E Tests: Frontend Triage Queue

### Test Suite: Triage Queue Page

**File:** `tests/e2e/triage-queue.spec.js`

#### Test: "displays triage queue with sorted alerts"
```javascript
await page.goto('/triage-queue');
await page.waitForSelector('[data-testid="triage-queue-alert"]');

const alerts = await page.$$('[data-testid="triage-queue-alert"]');
expect(alerts.length).toBeGreaterThan(0);

// Verify descending risk score order
const riskScores = await page.$$eval(
  '[data-testid="alert-risk-score"]',
  elements => elements.map(el => parseFloat(el.textContent))
);
for (let i = 1; i < riskScores.length; i++) {
  expect(riskScores[i]).toBeLessThanOrEqual(riskScores[i-1]);
}
```

#### Test: "claim button works and updates UI"
```javascript
await page.goto('/triage-queue');

// Find first unclaimed alert
await page.click('[data-testid="claim-button"]:first-of-type');

// Wait for success notification
await page.waitForSelector('[data-testid="success-toast"]');

// Verify button changed to "Release"
const buttonText = await page.textContent('[data-testid="claim-button"]:first-of-type');
expect(buttonText).toContain('Release');
```

#### Test: "filter by unclaimed alerts works"
```javascript
await page.goto('/triage-queue');

// Apply filter
await page.selectOption('[data-testid="claim-status-filter"]', 'unclaimed');

// Wait for refresh
await page.waitForTimeout(500);

// Verify all alerts are unclaimed
const claimButtons = await page.$$('[data-testid="claim-button"]');
for (const button of claimButtons) {
  const text = await button.textContent();
  expect(text).toContain('Claim');
}
```

#### Test: "filter by severity works"
```javascript
await page.goto('/triage-queue');

await page.selectOption('[data-testid="severity-filter"]', 'CRITICAL');
await page.waitForTimeout(500);

const severityBadges = await page.$$eval(
  '[data-testid="severity-badge"]',
  elements => elements.map(el => el.textContent)
);
severityBadges.forEach(badge => {
  expect(badge).toContain('CRITICAL');
});
```

#### Test: "SLA countdown displays correctly"
```javascript
await page.goto('/triage-queue');

const slaElements = await page.$$('[data-testid="sla-countdown"]');
expect(slaElements.length).toBeGreaterThan(0);

const firstSLA = await slaElements[0].textContent();
expect(firstSLA).toMatch(/(\d+h \d+m remaining|OVERDUE)/);
```

#### Test: "clicking alert opens patient details"
```javascript
await page.goto('/triage-queue');

await page.click('[data-testid="triage-queue-alert"]:first-of-type');

// Verify patient context panel or modal opens
await page.waitForSelector('[data-testid="patient-context-panel"]');
expect(await page.isVisible('[data-testid="patient-name"]')).toBe(true);
```

---

## Mocking Requirements

### Backend Unit Tests

**Prisma Client Mock:**
```javascript
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    alert: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    observation: {
      findMany: jest.fn()
    },
    medicationAdherence: {
      findMany: jest.fn()
    }
  }))
}));
```

### Frontend E2E Tests

**API Mock (for Playwright):**
```javascript
await page.route('/api/alerts/triage-queue*', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({
      success: true,
      data: {
        alerts: mockAlerts,
        total: mockAlerts.length
      }
    })
  });
});
```

---

## Test Data Requirements

### Fixture Data

**Mock Patients:**
- Patient with high-risk alert (BP 180/110)
- Patient with moderate-risk alert (Pain scale 6)
- Patient with low-risk alert (glucose slightly elevated)

**Mock Alerts:**
- 3+ alerts with varying risk scores (9.5, 6.2, 3.1)
- Mix of claimed/unclaimed alerts
- Mix of PENDING/ACKNOWLEDGED statuses
- Alerts with different severities (CRITICAL, HIGH, MEDIUM, LOW)
- Alerts with SLA breached, critical (<30min), warning (<2hr), safe (>2hr)

**Mock Users:**
- Regular clinician (can claim/unclaim own alerts)
- Supervisor (ORG_ADMIN, can unclaim any alert)
- User from different organization (for isolation testing)

---

## CI/CD Integration

**Test Execution Order:**
1. Backend unit tests (fastest)
2. Backend integration tests
3. Frontend E2E tests (slowest)

**Failure Threshold:**
- Unit tests: 0 failures
- Integration tests: 0 failures
- E2E tests: 0 failures

**Coverage Reports:**
- Generate coverage reports for backend unit/integration tests
- Fail build if coverage < 80% for new code
