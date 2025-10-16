# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-14-prioritized-triage-queue/spec.md

> Created: 2025-10-14
> Version: 1.0.0

---

## Technical Requirements

### Risk Scoring Algorithm

The core of the triage queue is a risk scoring algorithm that combines multiple clinical factors into a single 0-10 risk score:

**Formula**:
```javascript
riskScore = (vitalsDeviation * 0.5 + trendVelocity * 0.3 + adherencePenalty * 0.2) * alertSeverityMultiplier
```

**Component Calculations**:

1. **Vitals Deviation Score (0-10)**: How far are current vitals from normal ranges?
```javascript
const calculateVitalsDeviation = async (patientId, alertMetricId) => {
  // Get most recent observation for the metric that triggered the alert
  const observation = await prisma.observation.findFirst({
    where: {
      patientId,
      metricId: alertMetricId
    },
    orderBy: { recordedAt: 'desc' },
    include: { metric: { include: { normalRange: true } } }
  });

  if (!observation || !observation.metric.normalRange) return 5; // Default moderate risk

  const { value, metric } = observation;
  const numericValue = parseFloat(value);
  const { minValue, maxValue } = metric.normalRange;

  // Calculate deviation magnitude
  if (numericValue < minValue) {
    const deviation = (minValue - numericValue) / minValue;
    return Math.min(10, deviation * 10); // Scale to 0-10
  } else if (numericValue > maxValue) {
    const deviation = (numericValue - maxValue) / maxValue;
    return Math.min(10, deviation * 10);
  }

  return 0; // Within normal range
};
```

2. **Trend Velocity Score (0-10)**: Is the patient's condition worsening over time?
```javascript
const calculateTrendVelocity = async (patientId, alertMetricId, daysBack = 7) => {
  // Get recent observations for trend analysis
  const observations = await prisma.observation.findMany({
    where: {
      patientId,
      metricId: alertMetricId,
      recordedAt: {
        gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { recordedAt: 'asc' }
  });

  if (observations.length < 3) return 0; // Not enough data for trend

  const values = observations.map(o => parseFloat(o.value));

  // Check for increasing trend (higher readings = worse for BP, glucose, pain)
  let increasingCount = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i-1]) increasingCount++;
  }

  const trendPercent = increasingCount / (values.length - 1);

  if (trendPercent > 0.8) return 10; // 80%+ readings increasing
  if (trendPercent > 0.6) return 7;  // 60%+ readings increasing
  if (trendPercent > 0.4) return 5;  // 40%+ readings increasing
  return 2; // Stable or decreasing trend
};
```

3. **Adherence Penalty (-5 to 0)**: Is the patient missing assessments or readings?
```javascript
const calculateAdherencePenalty = async (patientId, daysBack = 7) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Count expected vs actual observations
  const enrollment = await prisma.enrollment.findFirst({
    where: { patientId, status: 'ACTIVE' },
    include: { program: true }
  });

  if (!enrollment) return 0;

  const expectedReadingsPerDay = enrollment.program.frequency || 1;
  const expectedTotal = expectedReadingsPerDay * daysBack;

  const actualReadings = await prisma.observation.count({
    where: {
      patientId,
      recordedAt: { gte: cutoff }
    }
  });

  const adherenceRate = actualReadings / expectedTotal;

  if (adherenceRate < 0.3) return -5; // <30% adherence - severe penalty
  if (adherenceRate < 0.5) return -3; // <50% adherence - moderate penalty
  if (adherenceRate < 0.7) return -1; // <70% adherence - mild penalty
  return 0; // Good adherence
};
```

4. **Alert Severity Multiplier (1.0 - 2.0)**:
```javascript
const getAlertSeverityMultiplier = (severity) => {
  const multipliers = {
    'CRITICAL': 2.0,
    'HIGH': 1.5,
    'MEDIUM': 1.2,
    'LOW': 1.0
  };
  return multipliers[severity] || 1.0;
};
```

**Final Risk Score Calculation**:
```javascript
const calculateAlertRiskScore = async (alert) => {
  const vitalsDeviation = await calculateVitalsDeviation(alert.patientId, alert.metricId);
  const trendVelocity = await calculateTrendVelocity(alert.patientId, alert.metricId);
  const adherencePenalty = await calculateAdherencePenalty(alert.patientId);
  const severityMultiplier = getAlertSeverityMultiplier(alert.severity);

  const rawScore = (
    vitalsDeviation * 0.5 +
    trendVelocity * 0.3 +
    adherencePenalty * 0.2
  ) * severityMultiplier;

  // Clamp to 0-10 range
  return Math.max(0, Math.min(10, rawScore));
};
```

---

### SLA Breach Time Calculation

```javascript
const calculateSLABreachTime = (alert) => {
  const slaMinutes = {
    'CRITICAL': 60,  // 1 hour
    'HIGH': 120,     // 2 hours
    'MEDIUM': 240,   // 4 hours
    'LOW': 480       // 8 hours
  };

  const slaWindow = slaMinutes[alert.severity] || 240;
  const breachTime = new Date(alert.triggeredAt.getTime() + slaWindow * 60 * 1000);

  return breachTime;
};
```

---

### Priority Ranking Algorithm

After calculating risk scores for all alerts, rank them globally:

```javascript
const calculatePriorityRanks = async (organizationId) => {
  // Get all pending/acknowledged alerts with risk scores
  const alerts = await prisma.alert.findMany({
    where: {
      organizationId,
      status: { in: ['PENDING', 'ACKNOWLEDGED'] }
    },
    orderBy: [
      { riskScore: 'desc' },
      { triggeredAt: 'asc' } // Tie-breaker: oldest first
    ]
  });

  // Assign priority ranks (1 = highest priority)
  for (let i = 0; i < alerts.length; i++) {
    await prisma.alert.update({
      where: { id: alerts[i].id },
      data: { priorityRank: i + 1 }
    });
  }
};
```

**Note**: Priority ranks should be recalculated:
- When a new alert is created (immediate)
- When an alert is resolved (remove from queue)
- On a scheduled basis (every 30 minutes) to update based on changing vitals/trends

---

## Approach Options

### Option A: Calculate Risk Scores On-Demand (Selected)

**Pros**:
- Always reflects latest patient data
- No stale risk scores
- Simpler implementation

**Cons**:
- Higher API latency (300-500ms for complex calculations)
- More database queries per request

**Mitigation**: Cache recent observations and trends in Redis (Phase 2 optimization)

---

### Option B: Pre-Calculate and Store Risk Scores

**Pros**:
- Faster API response (<100ms)
- Lower database load

**Cons**:
- Risk of stale data if not recalculated frequently
- Additional background job complexity
- Storage overhead

**Decision**: Start with Option A (on-demand) for MVP, optimize with Option B in Phase 2 if latency becomes an issue.

---

## External Dependencies

**None** - All calculations use existing Prisma models (Alert, Observation, Enrollment, MetricDefinition, Patient).

---

## Performance Considerations

**Target Performance**:
- Triage queue API response time: <500ms for 100 alerts
- Risk score calculation: <50ms per alert
- Priority rank recalculation: <2 seconds for 100 alerts

**Optimization Strategies** (Phase 2 if needed):
1. Cache recent observations in Redis (TTL: 5 minutes)
2. Pre-calculate trend velocity for active patients (background job)
3. Use database indexes on `patientId + metricId + recordedAt` for fast trend queries
4. Implement pagination (20 alerts per page) to reduce initial load

---

## Security Considerations

- Risk scores and triage queue are **organization-scoped** (filter by `organizationId`)
- Care managers can only see alerts for patients in their organization
- Alert claiming prevents duplicate work but doesn't restrict viewing (transparency)
- Audit log all claim/unclaim actions with userId and timestamp

---

## Testing Strategy

**Unit Tests**:
- `calculateVitalsDeviation()` with various normal range scenarios
- `calculateTrendVelocity()` with increasing, decreasing, stable trends
- `calculateAdherencePenalty()` with different adherence rates
- `getAlertSeverityMultiplier()` for all severity levels
- `calculateAlertRiskScore()` end-to-end with mock data

**Integration Tests**:
- Create test patients with known vitals → verify risk scores
- Trigger alerts with different severities → verify priority ranking
- Update patient data → verify risk scores recalculate correctly

**Performance Tests**:
- Load 100 alerts → measure API response time (<500ms target)
- Simulate 10 concurrent triage queue requests → verify no race conditions
