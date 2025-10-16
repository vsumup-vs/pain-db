# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/spec.md

> Created: 2025-10-16
> Version: 1.0.0

## Technical Requirements

### Risk Score Calculation

**Algorithm Formula:**
```
riskScore = ((vitalsDeviation * 0.5) + (trendVelocity * 0.3) + (adherencePenalty * 0.2)) * severityMultiplier

Where:
- vitalsDeviation: 0-10 scale based on how far observation is from metric normalRange
- trendVelocity: 0-10 scale based on rate of change over 7 days (positive = worsening)
- adherencePenalty: 0-10 scale based on medication adherence % (100% = 0, 0% = 10)
- severityMultiplier: CRITICAL: 2.0, HIGH: 1.5, MEDIUM: 1.0, LOW: 0.5
- Final riskScore capped at 0-10
```

**Vitals Deviation Calculation:**
```javascript
// For metrics with normalRange defined
const observationValue = alert.data.value;
const normalRange = metric.normalRange; // { min: 60, max: 100 }

if (observationValue < normalRange.min) {
  // Below normal - calculate deviation
  const deviation = (normalRange.min - observationValue) / normalRange.min;
  vitalsDeviation = Math.min(10, deviation * 10);
} else if (observationValue > normalRange.max) {
  // Above normal - calculate deviation
  const deviation = (observationValue - normalRange.max) / normalRange.max;
  vitalsDeviation = Math.min(10, deviation * 10);
} else {
  vitalsDeviation = 0; // Within normal range
}
```

**Trend Velocity Calculation:**
```javascript
// Get observations for same metric from last 7 days
const observations = await getObservationsForMetric(patientId, metricId, 7);

if (observations.length < 2) {
  trendVelocity = 0; // Not enough data
} else {
  // Calculate linear regression slope
  const values = observations.map(o => o.value);
  const timestamps = observations.map(o => o.recordedAt.getTime());

  const slope = calculateSlope(timestamps, values);

  // Normalize slope to 0-10 scale
  // Positive slope (worsening for pain, BP, glucose) = higher velocity
  // Negative slope (improving) = 0 velocity
  trendVelocity = Math.max(0, Math.min(10, slope * scalingFactor));
}
```

**Adherence Penalty Calculation:**
```javascript
// Get patient's medication adherence from last 30 days
const adherence = await getMedicationAdherence(patientId, 30);

// Convert adherence % to penalty (inverse relationship)
// 100% adherence = 0 penalty, 0% adherence = 10 penalty
adherencePenalty = 10 - (adherence.percentage / 10);
```

### Alert Claiming

**Claim Workflow:**
1. User clicks "Claim" button on unclaimed alert
2. Frontend sends POST `/api/alerts/:id/claim`
3. Backend checks alert is not already claimed
4. Updates alert with `claimedById: userId, claimedAt: new Date()`
5. Returns updated alert with claimer's name and timestamp
6. Frontend updates UI to show "Claimed by [Name] at [Time]"

**Unclaim Workflow:**
1. User clicks "Release" button on their claimed alert
2. Frontend sends POST `/api/alerts/:id/unclaim`
3. Backend verifies user owns the claim or is supervisor
4. Updates alert with `claimedById: null, claimedAt: null`
5. Returns updated alert
6. Frontend updates UI to show "Unclaimed"

**Claim Timeout (Optional Enhancement - Phase 1b):**
- After 2 hours of no activity, auto-release claimed alerts
- Implemented via scheduled cron job checking claimedAt timestamps

### SLA Breach Calculation

**SLA Times by Severity:**
```javascript
const SLA_MINUTES = {
  CRITICAL: 30,   // 30 minutes
  HIGH: 120,      // 2 hours
  MEDIUM: 480,    // 8 hours
  LOW: 1440       // 24 hours
};
```

**Breach Status Logic:**
```javascript
const slaBreachTime = alert.slaBreachTime; // Already calculated on alert creation
const now = new Date();
const timeRemaining = slaBreachTime - now; // milliseconds

let breachStatus;
if (timeRemaining < 0) {
  breachStatus = 'BREACHED';
  display = `OVERDUE ${formatDuration(Math.abs(timeRemaining))}`;
} else if (timeRemaining < 30 * 60 * 1000) { // <30 minutes
  breachStatus = 'CRITICAL';
  display = `${formatDuration(timeRemaining)} remaining`;
  color = 'red';
} else if (timeRemaining < 2 * 60 * 60 * 1000) { // <2 hours
  breachStatus = 'WARNING';
  display = `${formatDuration(timeRemaining)} remaining`;
  color = 'yellow';
} else {
  breachStatus = 'SAFE';
  display = `${formatDuration(timeRemaining)} remaining`;
  color = 'green';
}
```

### Queue Filtering and Sorting

**Default Sort:**
- Primary: `riskScore DESC` (highest risk first)
- Secondary: `slaBreachTime ASC` (soonest breach first)
- Tertiary: `triggeredAt ASC` (oldest alerts first)

**Filter Options:**
1. **Claim Status:**
   - All Alerts
   - Unclaimed
   - Claimed by Me
   - Claimed by Others (supervisor only)

2. **Severity:**
   - All Severities
   - CRITICAL
   - HIGH
   - MEDIUM
   - LOW

3. **SLA Status:**
   - All
   - Breached
   - Critical (<30min)
   - Warning (<2hr)
   - Safe (>2hr)

4. **Assigned Clinician:** (supervisor only)
   - All Team Members
   - [Individual clinicians dropdown]

**Query Optimization:**
- Use Prisma compound indexes on (organizationId, status, riskScore, slaBreachTime)
- Limit default query to 100 results with pagination
- Cache metric normalRange data to avoid repeated lookups

### UI/UX Specifications

**Color Coding:**
- CRITICAL: Red background (#DC2626), white text
- HIGH: Orange background (#EA580C), white text
- MEDIUM: Yellow background (#CA8A04), black text
- LOW: Blue background (#2563EB), white text

**Risk Score Display:**
- 0-3: Green badge, "Low Risk"
- 4-6: Yellow badge, "Moderate Risk"
- 7-8: Orange badge, "High Risk"
- 9-10: Red badge, "Critical Risk"

**SLA Countdown Display:**
- Format: "2h 15m remaining" or "15m remaining" or "OVERDUE 45m"
- Color: Green (>2hr), Yellow (<2hr), Red (<30min or breached)
- Update every 60 seconds via client-side timer

**Action Buttons:**
- **Claim** (unclaimed alerts): Primary button, blue
- **Release** (my claimed alerts): Secondary button, gray
- **View** (all alerts): Link button, opens patient details
- **Acknowledge** (pending alerts): Yellow button
- **Resolve** (acknowledged alerts): Green button

### Performance Requirements

- **Queue Load Time:** <2 seconds for 100 alerts
- **Risk Score Calculation:** <500ms per alert (can be async/background)
- **Claim/Unclaim Response:** <200ms
- **Filter Application:** <500ms
- **Auto-Refresh Interval:** Every 60 seconds (client-side timer for SLA countdown)

### Security Considerations

- **Authorization:** Users can only claim alerts for patients in their organization
- **Supervisor Access:** Can view and release alerts claimed by others
- **Audit Logging:** Log all claim/unclaim actions with userId and timestamp
- **Organization Isolation:** All queries filtered by organizationId

## Approach Options

### Option A: Real-Time Risk Score Updates (Background Service)

**Approach:** Run a scheduled cron job every 5 minutes to recalculate risk scores for all PENDING and ACKNOWLEDGED alerts.

**Pros:**
- Risk scores always up-to-date with latest observations and adherence data
- Queue reflects real-time patient status changes
- No delay when opening triage queue

**Cons:**
- Database overhead from frequent recalculation
- Complexity in maintaining background job
- Potential race conditions if alert updated during calculation

### Option B: On-Demand Risk Score Calculation (Query-Time)

**Approach:** Calculate risk scores when triage queue is loaded, using latest patient data.

**Pros:**
- Simpler implementation, no background jobs
- Always accurate to current moment
- No scheduled job maintenance

**Cons:**
- Slower queue load time (500ms per alert calculation)
- Repeated calculations if multiple users view queue
- Risk scores not stored in database for historical analysis

### Option C: Hybrid - Pre-Calculate on Alert Creation, Update on New Observations (Selected)

**Approach:**
1. Calculate initial risk score when alert is created
2. Store risk score in Alert model
3. Recalculate and update risk score when:
   - New observation created for patient
   - Medication adherence updated
   - Alert status changes (PENDING → ACKNOWLEDGED)
4. Triage queue reads pre-calculated scores from database

**Pros:**
- Fast queue load time (<2s)
- Risk scores update when clinically relevant events occur
- Historical risk score data preserved for analytics
- No scheduled background jobs

**Cons:**
- Risk scores may be slightly stale (seconds to minutes) between observations
- Requires risk score update logic in multiple places (observation controller, adherence controller)

**Rationale:** Hybrid approach balances performance, accuracy, and simplicity. Risk scores are calculated when clinically relevant events occur (new vital signs, adherence changes), which is sufficient for triage workflows. Pre-calculated scores enable fast queue loading and historical analysis.

## External Dependencies

**None** - All functionality uses existing dependencies:
- Prisma ORM for database queries
- Express.js for API endpoints
- React + TanStack Query for frontend
- Tailwind CSS for styling
