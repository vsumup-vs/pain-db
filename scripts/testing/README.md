# Testing Scripts for Alert Evaluation Engine

This directory contains utility scripts for testing and debugging the Alert Evaluation Engine.

## Available Scripts

### 1. Check Alerts in Database
```bash
node scripts/testing/check-alerts.js
```
**Purpose**: Shows the most recent alerts created in the database with full details (patient, rule, severity, message, etc.)

**Use when**: You want to verify that alerts were created correctly after creating an observation.

---

### 2. Check Alert Rules for a Patient
```bash
node scripts/testing/check-alert-rules.js
```
**Purpose**: Shows which alert rules are linked to a specific patient's enrollment via their condition preset.

**Use when**: Debugging why alerts aren't being triggered for a patient. Check if the patient's condition preset has alert rules.

**Note**: Currently hardcoded to patient ID `cmgqm8pfx006k7krvkb5ne0vc` (Linda LowRisk). Edit the script to change the patient.

---

### 3. Check All Alert Rules
```bash
node scripts/testing/check-all-alert-rules.js
```
**Purpose**: Lists ALL alert rules in the database and shows which condition presets they're linked to.

**Use when**: You want to see the complete alert rule configuration in the system.

---

### 4. Create Pain Alert Rules
```bash
node scripts/testing/create-pain-alert-rules.js
```
**Purpose**: Creates and links alert rules for the Pain Scale metric to the "Chronic Pain Management" condition preset.

**Creates**:
- "High Pain - Severe" (Pain Scale ≥8) - HIGH severity
- "Moderate Pain Alert" (Pain Scale ≥5) - MEDIUM severity

**Use when**: Setting up a new database or after running delete-and-recreate.js

---

### 5. Delete and Recreate Alert Rules
```bash
node scripts/testing/delete-and-recreate.js
```
**Purpose**: Deletes ALL alerts and alert rules from the database, then runs create-pain-alert-rules.js to set up fresh test data.

**⚠️ WARNING**: This will delete all existing alerts and alert rules! Use only for testing.

**Use when**: You want a clean slate to test alert creation.

---

## Testing Workflow

### Initial Setup (First Time)
1. Ensure you have patient enrollments with "Chronic Pain Management" condition preset
2. Run `node scripts/testing/create-pain-alert-rules.js` to create alert rules
3. Navigate to http://localhost:5173/test/alert-evaluation

### Testing Alert Creation
1. Go to http://localhost:5173/test/alert-evaluation
2. Select a patient with an active enrollment
3. Select "Pain Scale (0-10)" metric
4. Enter value 8 or 9 to trigger alerts
5. Click "Create Observation & Trigger Alert Check"
6. Check backend logs: `tail -f backend.log | grep -E "🚨|AlertEvaluation"`
7. Verify alerts appear in:
   - Triage Queue page (http://localhost:5173/triage-queue)
   - Alerts page (http://localhost:5173/alerts)
8. Run `node scripts/testing/check-alerts.js` to verify database entries

### Debugging Alert Issues

**Problem**: No alerts triggered after creating observation
```bash
# Step 1: Check if alert rules exist
node scripts/testing/check-all-alert-rules.js

# Step 2: Check if patient's enrollment has alert rules linked
node scripts/testing/check-alert-rules.js

# Step 3: Check backend logs for evaluation details
tail -100 backend.log | grep -E "AlertEvaluation|🚨"

# Step 4: If no rules found, create them
node scripts/testing/create-pain-alert-rules.js
```

**Problem**: Alerts created but not showing in frontend
```bash
# Check alerts exist in database
node scripts/testing/check-alerts.js

# Check organization filtering (alerts must match user's current organization)
# Check browser console for API errors
```

---

## Expected Log Output

When an observation triggers an alert, you should see:
```
🔍 Evaluating observation cmgsz... for alerts...
   Patient: cmgqm8..., Metric: cmgsx7..., Value: 9
[AlertEvaluation] START - Evaluating observation cmgsz...
[AlertEvaluation] Metric found: Pain Scale (0-10)
[AlertEvaluation] Found 1 active enrollment(s)
[AlertEvaluation] Found 2 global alert rule(s)
[AlertEvaluation] Total rules to evaluate: 4
[AlertEvaluation] Evaluating rule: High Pain - Severe (cmgszuqng...)
[AlertEvaluation] Rule "High Pain - Severe" shouldTrigger: true
[AlertEvaluation] Evaluating rule: Moderate Pain Alert (cmgszuqns...)
[AlertEvaluation] Rule "Moderate Pain Alert" shouldTrigger: true
✅ Alert triggered: High Pain - Severe for patient cmgqm8...
✅ Alert triggered: Moderate Pain Alert for patient cmgqm8...
🚨 2 alert(s) triggered for observation cmgsz...
```

---

## Test Page Features

**URL**: http://localhost:5173/test/alert-evaluation

**Features**:
- Create observations for any patient/enrollment/metric combination
- Auto-refreshing alerts panel (every 3 seconds)
- Backend logs instructions
- Visual feedback for alert creation

**Limitations**:
- Recent Alerts panel may not display alerts (known issue)
- Use Triage Queue or Alerts pages to verify alert creation
- Primarily for backend testing, not production UI

---

## Maintenance

### Adding New Alert Rules
1. Edit `create-pain-alert-rules.js`
2. Add new rule to the `rules` array:
```javascript
{
  name: 'Your Alert Name',
  description: 'Alert description',
  severity: 'HIGH', // CRITICAL, HIGH, MEDIUM, LOW
  priority: 1,
  conditions: {
    metric: 'pain_scale_0_10',
    operator: 'gte', // gt, gte, lt, lte, eq, neq
    value: 8
  },
  actions: {
    notify: ['clinician'],
    createTask: true // optional
  }
}
```
3. Run `node scripts/testing/create-pain-alert-rules.js`

### Customizing for Different Patients
Edit the patient ID in `check-alert-rules.js`:
```javascript
const patientId = 'your-patient-id-here';
```

---

Last Updated: 2025-10-16
