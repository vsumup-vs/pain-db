# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/spec.md

> Created: 2025-10-16
> Version: 1.0.0

## New API Endpoints

### GET /api/alerts/triage-queue

**Purpose:** Retrieve prioritized list of alerts for triage queue workflow.

**Authorization:** Requires authentication. Users can only see alerts for their organization.

**Query Parameters:**
- `limit` (number, optional, default: 100): Maximum number of alerts to return
- `offset` (number, optional, default: 0): Pagination offset
- `claimStatus` (string, optional): Filter by claim status
  - `all`: All alerts (default)
  - `unclaimed`: Only unclaimed alerts
  - `claimed_by_me`: Only alerts claimed by current user
  - `claimed_by_others`: Only alerts claimed by other users (supervisor only)
- `severity` (string, optional): Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)
- `slaStatus` (string, optional): Filter by SLA breach status
  - `all`: All alerts (default)
  - `breached`: SLA already breached
  - `critical`: <30 minutes until breach
  - `warning`: <2 hours until breach
  - `safe`: >2 hours until breach
- `assignedToId` (string, optional): Filter by claimedBy user ID (supervisor only)

**Request Example:**
```http
GET /api/alerts/triage-queue?claimStatus=unclaimed&severity=HIGH&limit=50
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "clr1...",
        "organizationId": "org1...",
        "ruleId": "rule1...",
        "patientId": "pat1...",
        "severity": "HIGH",
        "status": "PENDING",
        "message": "High Pain - Severe: Pain Scale (0-10) is 9",
        "riskScore": 8.5,
        "slaBreachTime": "2025-10-16T14:30:00.000Z",
        "slaStatus": "WARNING",
        "timeUntilBreach": 5400000,  // milliseconds
        "claimedById": null,
        "claimedAt": null,
        "triggeredAt": "2025-10-16T12:15:00.000Z",
        "patient": {
          "id": "pat1...",
          "firstName": "John",
          "lastName": "Doe",
          "dateOfBirth": "1965-03-15T00:00:00.000Z"
        },
        "rule": {
          "id": "rule1...",
          "name": "High Pain - Severe",
          "severity": "HIGH"
        },
        "claimedBy": null
      }
    ],
    "total": 42,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: User lacks ALERT_READ permission
- `500 Internal Server Error`: Database or server error

---

### POST /api/alerts/:id/claim

**Purpose:** Claim an unclaimed alert for resolution.

**Authorization:** Requires authentication and ALERT_UPDATE permission.

**Path Parameters:**
- `id` (string, required): Alert ID to claim

**Request Body:** None

**Request Example:**
```http
POST /api/alerts/clr1abc123/claim
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Alert claimed successfully",
  "data": {
    "id": "clr1abc123",
    "claimedById": "user1...",
    "claimedAt": "2025-10-16T12:30:00.000Z",
    "claimedBy": {
      "id": "user1...",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Alert already claimed
  ```json
  {
    "success": false,
    "message": "Alert is already claimed by another user",
    "data": {
      "claimedBy": {
        "id": "user2...",
        "firstName": "Bob",
        "lastName": "Johnson"
      },
      "claimedAt": "2025-10-16T12:00:00.000Z"
    }
  }
  ```
- `404 Not Found`: Alert does not exist
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: User lacks ALERT_UPDATE permission or alert belongs to different organization
- `500 Internal Server Error`: Database or server error

---

### POST /api/alerts/:id/unclaim

**Purpose:** Release a claimed alert back to unclaimed status.

**Authorization:** Requires authentication. Users can unclaim their own alerts. Supervisors (ORG_ADMIN) can unclaim any alert.

**Path Parameters:**
- `id` (string, required): Alert ID to unclaim

**Request Body:** None

**Request Example:**
```http
POST /api/alerts/clr1abc123/unclaim
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Alert unclaimed successfully",
  "data": {
    "id": "clr1abc123",
    "claimedById": null,
    "claimedAt": null
  }
}
```

**Error Responses:**
- `400 Bad Request`: Alert is not claimed
  ```json
  {
    "success": false,
    "message": "Alert is not currently claimed"
  }
  ```
- `403 Forbidden`: User does not own the claim and is not a supervisor
  ```json
  {
    "success": false,
    "message": "You can only unclaim alerts you have claimed or supervisor access required"
  }
  ```
- `404 Not Found`: Alert does not exist
- `401 Unauthorized`: Invalid or missing JWT token
- `500 Internal Server Error`: Database or server error

---

## Modified API Endpoints

### POST /api/observations (Existing - Enhanced)

**Enhancement:** Trigger risk score recalculation for related alerts after observation creation.

**Existing Behavior:**
1. Create observation
2. Trigger alert evaluation (already implemented)

**New Behavior:**
3. Recalculate risk scores for any PENDING or ACKNOWLEDGED alerts for the same patient/metric
4. Update alerts with new riskScore values

**Implementation:** Add to existing `observationController.js` after alert evaluation.

**No API contract changes** - risk score updates happen automatically in background.

---

## Backend Controllers

### alertController.js Additions

**New Functions:**
- `getTriageQueue()` - GET /api/alerts/triage-queue handler
- `claimAlert()` - POST /api/alerts/:id/claim handler
- `unclaimAlert()` - POST /api/alerts/:id/unclaim handler

**Enhanced Functions:**
- Existing alert endpoints remain unchanged

---

## Backend Services

### New: riskScoringService.js

**Purpose:** Centralized risk score calculation logic.

**Functions:**

#### `calculateRiskScore(alert, patient, metric, observations, adherence)`
**Returns:** `{ riskScore: number (0-10), components: { vitalsDeviation, trendVelocity, adherencePenalty, severityMultiplier } }`

**Parameters:**
- `alert` (Alert): Alert object with data field containing observation value
- `patient` (Patient): Patient object
- `metric` (MetricDefinition): Metric definition with normalRange
- `observations` (Observation[]): Recent observations for trend calculation (7 days)
- `adherence` (Object): Medication adherence data `{ percentage: 0-100 }`

**Algorithm:**
```javascript
vitalsDeviation = calculateVitalsDeviation(alert.data.value, metric.normalRange);
trendVelocity = calculateTrendVelocity(observations);
adherencePenalty = calculateAdherencePenalty(adherence.percentage);
severityMultiplier = { CRITICAL: 2.0, HIGH: 1.5, MEDIUM: 1.0, LOW: 0.5 }[alert.severity];

riskScore = Math.min(10, Math.max(0,
  ((vitalsDeviation * 0.5) + (trendVelocity * 0.3) + (adherencePenalty * 0.2)) * severityMultiplier
));
```

---

#### `updateAlertRiskScores(patientId, metricId)`
**Returns:** `{ updated: number, alerts: Alert[] }`

**Purpose:** Recalculate and update risk scores for all PENDING/ACKNOWLEDGED alerts for a specific patient/metric combination.

**Usage:** Called after new observation is created.

**Implementation:**
1. Find all alerts matching `patientId`, `metricId`, and `status IN [PENDING, ACKNOWLEDGED]`
2. For each alert:
   - Fetch recent observations (7 days)
   - Fetch medication adherence (30 days)
   - Calculate new risk score
   - Update alert in database
3. Return updated alerts

---

## Authorization Logic

### Claim/Unclaim Authorization

**User Can Claim:**
- Any unclaimed alert in their organization
- Permission: ALERT_UPDATE

**User Can Unclaim:**
- Their own claimed alerts (claimedById === userId)
- Any claimed alert if they are ORG_ADMIN (supervisor override)
- Permission: ALERT_UPDATE

**Triage Queue Visibility:**
- Users see alerts for their organization only
- Permission: ALERT_READ

**Supervisor Filter:**
- `assignedToId` parameter requires ORG_ADMIN role
- Allows supervisors to filter queue by specific care managers

---

## Audit Logging

All claim/unclaim actions should be logged to AuditLog:

**Claim Alert:**
```javascript
await prisma.auditLog.create({
  data: {
    userId: currentUser.id,
    organizationId: alert.organizationId,
    action: 'ALERT_CLAIMED',
    resource: 'Alert',
    resourceId: alert.id,
    newValues: {
      claimedById: currentUser.id,
      claimedAt: new Date()
    },
    hipaaRelevant: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }
});
```

**Unclaim Alert:**
```javascript
await prisma.auditLog.create({
  data: {
    userId: currentUser.id,
    organizationId: alert.organizationId,
    action: 'ALERT_UNCLAIMED',
    resource: 'Alert',
    resourceId: alert.id,
    oldValues: {
      claimedById: alert.claimedById,
      claimedAt: alert.claimedAt
    },
    newValues: {
      claimedById: null,
      claimedAt: null
    },
    hipaaRelevant: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }
});
```

---

## Performance Considerations

### Query Optimization

**Indexes Used:**
- `[organizationId, status, riskScore]` - for triage queue filtering and sorting
- `[claimedById]` - for "My Claimed Alerts" filter
- `[slaBreachTime]` - for SLA breach detection

**Pagination:**
- Default limit: 100 alerts
- Use offset-based pagination for simplicity (Phase 1a)
- Consider cursor-based pagination if organization has >10,000 alerts (Phase 2)

### Risk Score Calculation Timing

**Initial Calculation:** On alert creation (in alertEvaluationService.js)
- Blocks alert creation by ~200-500ms
- Acceptable for initial implementation

**Recalculation:** On new observation creation
- Runs asynchronously via `setImmediate()` after observation saved
- Does not block API response
- Risk scores may be 1-2 seconds stale

**Future Optimization (Phase 1b):**
- Move risk score calculation to background queue (Bull/Redis)
- Update risk scores every 5 minutes via scheduled job
- Trade-off: Slightly stale scores for faster API responses

---

## Error Handling Standards

All endpoints follow standard error response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": {
    // Optional additional context
  }
}
```

**Error Codes:**
- `ALERT_NOT_FOUND`
- `ALERT_ALREADY_CLAIMED`
- `ALERT_NOT_CLAIMED`
- `UNAUTHORIZED_UNCLAIM`
- `INSUFFICIENT_PERMISSIONS`
- `ORGANIZATION_MISMATCH`
