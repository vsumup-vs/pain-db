# Alert Evaluation Engine - Implementation Complete

> **Status**: ✅ Production Ready
> **Completed**: 2025-10-16
> **Phase**: 1a - Workflow Optimizer

## Overview

The Alert Evaluation Engine automatically evaluates patient observations against configured alert rules and triggers alerts when conditions are met. This is a core component of the Workflow Optimizer (Phase 1a) that enables proactive clinical monitoring.

## How It Works

### 1. Observation Creation
When a new observation is created via `POST /api/observations`:
```javascript
{
  patientId: "patient-id",
  enrollmentId: "enrollment-id",
  metricDefinitionId: "metric-id",
  value: 9,
  context: "CLINICAL_MONITORING",
  recordedAt: "2025-10-16T05:37:49.302Z"
}
```

### 2. Automatic Evaluation
The system automatically (using `setImmediate`):
1. Retrieves the patient's active enrollments
2. Gets alert rules from:
   - Condition preset linked to the enrollment
   - Global/organization-level rules
3. Evaluates each rule's conditions against the observation
4. Creates alerts for rules that trigger
5. Calculates risk scores for each alert
6. Sets SLA breach times based on severity

### 3. Alert Creation
When conditions are met, alerts are created with:
- **Severity**: CRITICAL, HIGH, MEDIUM, LOW
- **Status**: PENDING (initial), ACKNOWLEDGED, RESOLVED, DISMISSED
- **Message**: Auto-generated from rule description and observation value
- **Risk Score**: 0-10 calculated based on severity and deviation from normal range
- **SLA Breach Time**: Calculated based on severity (CRITICAL: 30min, HIGH: 2hr, MEDIUM: 8hr, LOW: 24hr)

## Scheduled Background Jobs

In addition to real-time evaluation, the Alert Evaluation Engine includes scheduled background jobs that run periodically to check for conditions that aren't directly tied to observation creation.

### Job 1: Missed Assessment Checks
- **Schedule**: Hourly (`'0 * * * *'`)
- **Purpose**: Identify patients who have not completed required assessments
- **Logic**:
  - Finds all ACTIVE enrollments with required assessment templates
  - Checks time since last assessment completion
  - Compares against expected frequency (daily, weekly, monthly)
  - Creates alerts if overdue
- **Severity**:
  - HIGH: 3+ days overdue
  - MEDIUM: 1-3 days overdue
  - LOW: <1 day overdue
- **Cooldown**: 24 hours (prevents duplicate alerts)

### Job 2: Medication Adherence Checks
- **Schedule**: Every 6 hours (`'0 */6 * * *'`)
- **Purpose**: Monitor medication adherence over 30-day windows
- **Logic**:
  - Finds all active patient medications
  - Calculates adherence percentage using `calculateMedicationAdherence()` service
  - Creates alerts if adherence < 80%
- **Severity**:
  - HIGH: <50% adherence
  - MEDIUM: 50-70% adherence
  - LOW: 70-80% adherence
- **Cooldown**: 48 hours

### Job 3: Daily Trend Evaluation
- **Schedule**: Daily at 2 AM (`'0 2 * * *'`)
- **Purpose**: Analyze 7-day observation trends to detect concerning patterns
- **Logic**:
  - Retrieves observations from last 7 days for all active enrollments
  - Groups observations by metric
  - Calculates trend direction and percentage change
  - Creates alerts if change > 15%
- **Thresholds**:
  - HIGH severity: >30% change
  - MEDIUM severity: 15-30% change
- **Cooldown**: 48 hours per metric

### Job 4: Stale Alert Cleanup
- **Schedule**: Daily at 3 AM (`'0 3 * * *'`)
- **Purpose**: Auto-dismiss old alerts to prevent alert fatigue
- **Logic**:
  - Finds PENDING alerts older than 72 hours
  - Updates status to DISMISSED
  - Adds resolution note: "Auto-resolved: Alert expired after 72 hours without action"

### Scheduler Configuration
The scheduler is automatically started when the server starts (`index.js`):
```javascript
const alertScheduler = require('./src/services/alertScheduler');

app.listen(PORT, () => {
  console.log('🔄 Starting alert evaluation engine...');
  alertScheduler.startScheduledJobs();
  console.log('✅ Alert evaluation engine started successfully');
});
```

Jobs are gracefully stopped on server shutdown:
```javascript
process.on('SIGINT', async () => {
  alertScheduler.stopScheduledJobs();
  await prisma.$disconnect();
  process.exit(0);
});
```

## Configuration

### Alert Rules

Alert rules define the conditions that trigger alerts:

```javascript
{
  name: "High Pain - Severe",
  description: "Patient reports severe pain (8-10)",
  severity: "HIGH",
  priority: 1,
  isActive: true,
  conditions: {
    metric: "pain_scale_0_10",
    operator: "gte",  // gt, gte, lt, lte, eq, neq, in, increase, decrease
    value: 8
  },
  actions: {
    notify: ["clinician"],
    createTask: true  // Optional: auto-create follow-up task
  }
}
```

### Supported Operators

- **gt**: Greater than
- **gte**: Greater than or equal to
- **lt**: Less than
- **lte**: Less than or equal to
- **eq/equals**: Equal to
- **neq/not_equals**: Not equal to
- **in**: Value is in array
- **increase**: Trend increasing over time window
- **decrease**: Trend decreasing over time window

### Cooldown Period

Alerts have a 1-hour cooldown period to prevent duplicate alerts for the same patient/rule combination. This prevents alert fatigue while ensuring clinicians are notified of ongoing issues.

## Alert Rule Linkage

Alert rules can be linked in two ways:

### 1. Condition Preset Rules
Rules linked to specific condition presets (e.g., "Chronic Pain Management"):
- Evaluated only for patients enrolled in programs using that preset
- Managed via `ConditionPresetAlertRule` junction table
- Can be enabled/disabled per preset

### 2. Global Rules
Platform-wide or organization-specific rules:
- `organizationId: null` = Platform-level (all organizations)
- `organizationId: "org-id"` = Organization-specific
- Evaluated for all patients in the organization

## Testing

### Test Page
**URL**: http://localhost:5173/test/alert-evaluation

Features:
- Create observations for any patient/enrollment/metric
- Auto-refreshing alerts display
- Backend logs instructions
- Visual feedback

### Testing Scripts
Located in `scripts/testing/`:
- `check-alerts.js` - View recent alerts in database
- `check-alert-rules.js` - View rules for a patient's enrollment
- `check-all-alert-rules.js` - List all alert rules
- `create-pain-alert-rules.js` - Set up Pain Scale alert rules
- `delete-and-recreate.js` - Reset all alerts and rules

See `scripts/testing/README.md` for detailed usage.

### Manual Testing
1. Navigate to test page
2. Select patient with active enrollment
3. Select "Pain Scale (0-10)" metric
4. Enter value ≥8 to trigger HIGH severity alert
5. Enter value ≥5 to trigger MEDIUM severity alert
6. Check alerts in Triage Queue or Alerts page

## Logging

### Production Logging
Minimal logging for performance:
```
🚨 2 alert(s) triggered for observation cmgsz...
```

### Debug Logging
For troubleshooting, temporarily enable debug logs in:
- `src/controllers/observationController.js`
- `src/services/alertEvaluationService.js`

Or check logs:
```bash
tail -f backend.log | grep -E "🚨|alert"
```

## Performance Considerations

### Asynchronous Evaluation
Alert evaluation runs asynchronously using `setImmediate()`:
- Does not block observation creation response
- Ensures fast API response times
- Errors in evaluation don't fail observation creation

### Query Optimization
- Uses Prisma `include` to minimize database queries
- Batches enrollment and rule lookups
- Indexes on alert fields for fast querying

### Cooldown System
- Prevents duplicate alerts within 1-hour window
- Single query to check recent alerts
- Reduces database writes and notification spam

## API Endpoints

### Get Alerts
```
GET /api/alerts
Query params:
  - limit: number (default: 20)
  - sortBy: string (default: 'triggeredAt')
  - sortOrder: 'asc' | 'desc' (default: 'desc')
  - status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
  - severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  - patientId: string
```

### Triage Queue
```
GET /api/alerts/triage-queue
Returns alerts sorted by risk score and severity for care manager workflow
```

### Alert Actions
```
POST /api/alerts/:id/claim - Claim alert for assignment
POST /api/alerts/:id/unclaim - Release claimed alert
POST /api/alerts/:id/acknowledge - Mark as acknowledged
POST /api/alerts/:id/resolve - Resolve with resolution notes
```

## Database Schema

### Alert Model
```prisma
model Alert {
  id              String        @id @default(cuid())
  organizationId  String
  ruleId          String
  patientId       String
  clinicianId     String?
  severity        AlertSeverity
  status          AlertStatus   @default(PENDING)
  message         String
  data            Json?
  riskScore       Float?
  slaBreachTime   DateTime?
  claimedById     String?
  claimedAt       DateTime?
  acknowledgedAt  DateTime?
  resolvedAt      DateTime?
  resolutionNotes String?
  triggeredAt     DateTime      @default(now())
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relationships
  organization Organization @relation(...)
  rule         AlertRule    @relation(...)
  patient      Patient      @relation(...)
  clinician    Clinician?   @relation(...)
  claimedBy    Clinician?   @relation(...)
}
```

## Future Enhancements

### Phase 1b (Planned)
- [ ] Email/SMS notifications based on severity
- [ ] Escalation if SLA breached
- [ ] Auto-create tasks from alerts
- [ ] Snooze functionality with reason codes

### Phase 2 (Planned)
- [ ] Advanced trend detection (3 consecutive high readings)
- [ ] Multi-parameter alert logic (BP + Heart Rate combined)
- [ ] Time-based thresholds (different limits for day/night)
- [ ] Machine learning-based risk scoring

### Phase 3 (Planned)
- [ ] Webhook notifications to external systems
- [ ] Alert aggregation (combine related alerts)
- [ ] Patient-specific alert customization
- [ ] Alert effectiveness analytics

## Troubleshooting

### No Alerts Created

**Symptom**: Observation created but no alerts triggered

**Check**:
1. Are alert rules configured? `node scripts/testing/check-all-alert-rules.js`
2. Are rules linked to patient's condition preset? `node scripts/testing/check-alert-rules.js`
3. Is the patient's enrollment ACTIVE?
4. Do rule conditions match observation value?
5. Is there a cooldown active (check last alert time)?

**Solution**:
```bash
# Create alert rules if missing
node scripts/testing/create-pain-alert-rules.js

# Check backend logs
tail -100 backend.log | grep AlertEvaluation
```

### Alerts Not Showing in Frontend

**Symptom**: Alerts in database but not visible in UI

**Check**:
1. Organization filtering (user must be in same org as alerts)
2. Browser console for API errors
3. Alert status filter (PENDING vs RESOLVED)

**Solution**:
```bash
# Verify alerts exist
node scripts/testing/check-alerts.js

# Check API response
curl http://localhost:3000/api/alerts -H "Authorization: Bearer <token>"
```

### Alert Evaluation Errors

**Symptom**: Errors in backend logs during evaluation

**Check**:
- Observation has valid metricId
- Patient has active enrollment
- Rule conditions are well-formed JSON

**Solution**:
- Check error stack trace in logs
- Verify data integrity in database
- Test with known-good observation data

## Related Documentation

- Alert Evaluation Service: `src/services/alertEvaluationService.js`
- Alert Controller: `src/controllers/alertController.js`
- Observation Controller: `src/controllers/observationController.js`
- Testing Scripts: `scripts/testing/README.md`
- Product Roadmap: `.agent-os/product/roadmap.md`

---

**Implementation Notes:**
- ✅ Automatic evaluation on observation creation
- ✅ Support for condition preset rules
- ✅ Support for global/organization rules
- ✅ Risk score calculation
- ✅ SLA breach time calculation
- ✅ Cooldown to prevent duplicates
- ✅ Alert message generation
- ✅ Multi-rule evaluation
- ✅ Trend detection framework (increase/decrease operators)
- ✅ Production logging
- ✅ Error handling
- ✅ Testing tools and documentation
