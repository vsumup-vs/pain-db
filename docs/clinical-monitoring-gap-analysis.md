# Clinical Monitoring System - Gap Analysis

> **Document Purpose**: Identify what's missing for a complete real-time clinical monitoring system
> **Last Updated**: 2025-10-14
> **Status**: ⚠️ INCOMPLETE - Critical monitoring features missing

---

## Executive Summary

**Verdict**: **❌ CLINICAL MONITORING NOT PRODUCTION READY**

While the **data model** for clinical monitoring is complete (AlertRule, Alert, Observation models), the **active monitoring engine** that actually evaluates observations and triggers alerts is **NOT implemented**. The system can store alert rules and display alerts, but it **cannot automatically detect clinical events** that require clinician attention.

**Risk Level**: **CRITICAL** - Without active monitoring, the system cannot fulfill its core value proposition for RTM/RPM programs.

---

## ✅ What's IMPLEMENTED (Database Schema)

### Data Models Complete
- ✅ **AlertRule model** - Rules with conditions, actions, severity
- ✅ **Alert model** - Alert instances with status tracking
- ✅ **Observation model** - Patient metric data capture
- ✅ **MetricDefinition model** - Metrics with normal ranges, validation
- ✅ **Patient, Enrollment models** - Patient context for monitoring

### Frontend UI Complete
- ✅ **AlertRules.jsx** - View/create/edit alert rules
- ✅ **Alerts.jsx** - View and manage triggered alerts (likely exists)
- ✅ **Observations.jsx** - View patient observations
- ✅ **Multi-tenant protection** - All entities protected from cross-org contamination

### Basic Infrastructure
- ✅ **node-cron scheduler** - `/src/services/schedulerService.js` (for daily reminders)
- ✅ **Notification service** - `/src/services/notificationService.js` (basic structure)

---

## ❌ What's MISSING (Active Monitoring Engine)

### 1. Real-Time Alert Evaluation Engine 🚨 **CRITICAL**

**Problem**: No system actively evaluates observations against alert rules.

**What's Missing**:
```javascript
// MISSING: Alert evaluation engine
// Location: /src/services/alertEvaluationService.js

class AlertEvaluationService {
  /**
   * Evaluate a new observation against all active alert rules
   * for the patient's condition presets and enrollments
   */
  async evaluateObservation(observation) {
    // 1. Get patient's active enrollments and condition presets
    // 2. Get all active alert rules for those presets
    // 3. Get patient's recent observation history for context
    // 4. Evaluate each rule's conditions against observation + history
    // 5. Trigger alert if conditions met
    // 6. Check cooldown period to prevent alert spam
    // 7. Execute alert actions (notify clinician, escalate, etc.)
  }

  /**
   * Evaluate conditions logic (JSON-based rules)
   */
  async evaluateConditions(conditions, observation, patientHistory) {
    // Parse conditions JSON (threshold, trend, missing data, etc.)
    // Compare against observation value
    // Check time-based conditions (e.g., 3 consecutive high readings)
    // Return true/false
  }

  /**
   * Execute alert actions (from AlertRule.actions JSON)
   */
  async executeActions(actions, alert) {
    // Parse actions JSON
    // Send notifications (email, SMS, in-app)
    // Assign to clinician
    // Escalate if needed
    // Create task in external system (if integrated)
  }
}
```

**Impact**:
- ❌ Patients with high pain scores won't trigger alerts
- ❌ Medication non-adherence won't be detected
- ❌ Clinicians won't be notified of critical events
- ❌ RTM/RPM billing requirements not met (CMS requires active monitoring)

---

### 2. Observation Ingestion Hook 🔄 **CRITICAL**

**Problem**: When observations are created via API, no alert evaluation is triggered.

**What's Missing**:
```javascript
// MISSING: Hook in /src/controllers/observationController.js

const createObservation = async (req, res) => {
  try {
    // ... existing code to validate and create observation ...

    const observation = await prisma.observation.create({
      data: observationData
    });

    // ⚠️ MISSING: Trigger alert evaluation
    await alertEvaluationService.evaluateObservation(observation);

    res.status(201).json({
      success: true,
      data: observation
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

**Current Behavior**: Observations are stored but **never evaluated** for clinical significance.

**Required Behavior**: Every new observation should immediately trigger alert evaluation.

---

### 3. Scheduled Alert Checks ⏰ **HIGH PRIORITY**

**Problem**: No scheduled jobs check for time-based alert conditions.

**What's Missing**:
```javascript
// MISSING: Scheduled alert checks in /src/services/schedulerService.js

// Check for missed assessments (every hour)
cron.schedule('0 * * * *', async () => {
  console.log('Checking for missed assessments...');

  // Find patients with enrollments requiring daily assessments
  // Check last assessment completion time
  // If > 24 hours since last assessment, trigger "Missing Data" alert

  await alertEvaluationService.checkMissedAssessments();
});

// Check for medication non-adherence (every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  console.log('Checking for medication non-adherence...');

  // Find patients with active medications
  // Check adherence logs
  // If missed doses detected, trigger adherence alert

  await alertEvaluationService.checkMedicationAdherence();
});

// Evaluate trend-based alerts (daily at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('Evaluating trend-based alerts...');

  // Check for trends: 3 consecutive increasing pain scores, declining mood, etc.
  // Requires historical analysis, not just single observation

  await alertEvaluationService.evaluateTrendAlerts();
});
```

**Current Behavior**: Only daily assessment reminders are scheduled (9 AM).

**Required Behavior**: Multiple scheduled jobs for different alert types.

---

### 4. Notification Delivery System 📧 **HIGH PRIORITY**

**Problem**: Notification service exists but alert-specific notifications not implemented.

**What's Implemented**:
```javascript
// /src/services/notificationService.js
// - sendDailyReminder() - exists
// - Basic email sending via Nodemailer - exists
```

**What's Missing**:
```javascript
// MISSING: Alert-specific notifications

class NotificationService {
  /**
   * Send real-time alert notification to assigned clinician
   */
  async sendAlertNotification(alert) {
    // 1. Get clinician contact info (email, SMS, in-app)
    // 2. Format alert message with patient context
    // 3. Include severity and priority
    // 4. Send via appropriate channel(s) based on severity:
    //    - LOW: In-app notification only
    //    - MEDIUM: In-app + email
    //    - HIGH: In-app + email + SMS
    //    - CRITICAL: In-app + email + SMS + phone call (future)
    // 5. Log notification in audit trail
  }

  /**
   * Send escalation notification if alert not acknowledged
   */
  async sendEscalationNotification(alert) {
    // If alert not acknowledged within timeframe:
    // - Notify supervising clinician
    // - Escalate severity
    // - Log escalation
  }

  /**
   * Send alert resolution confirmation
   */
  async sendAlertResolutionNotification(alert) {
    // Confirm to patient that their concern was addressed
    // Log resolution in patient communication history
  }
}
```

**Impact**:
- ❌ Clinicians won't be notified when alerts trigger
- ❌ High-severity alerts won't escalate if ignored
- ❌ No audit trail of alert communications

---

### 5. Alert Cooldown & Deduplication 🛡️ **MEDIUM PRIORITY**

**Problem**: No prevention of alert spam for recurring issues.

**What's Missing**:
```javascript
// MISSING: Cooldown logic in alert evaluation

async evaluateObservation(observation) {
  // ... get applicable alert rules ...

  for (const rule of alertRules) {
    // Check if alert already triggered recently
    const recentAlert = await prisma.alert.findFirst({
      where: {
        ruleId: rule.id,
        patientId: observation.patientId,
        triggeredAt: {
          gte: new Date(Date.now() - rule.cooldownPeriod * 60 * 1000) // cooldownPeriod in minutes
        },
        status: { in: ['PENDING', 'ACKNOWLEDGED'] } // Don't cooldown resolved alerts
      }
    });

    if (recentAlert) {
      console.log(`Alert cooldown active for rule ${rule.name}, skipping...`);
      continue; // Skip this rule due to cooldown
    }

    // ... evaluate conditions and trigger alert ...
  }
}
```

**Current Behavior**: Could trigger duplicate alerts every time an observation is created.

**Required Behavior**: Respect cooldown periods defined in alert rules.

---

### 6. Historical Context for Trend Detection 📈 **MEDIUM PRIORITY**

**Problem**: No mechanism to evaluate trends across multiple observations.

**What's Missing**:
```javascript
// MISSING: Trend analysis functions

class AlertEvaluationService {
  /**
   * Check for trending conditions (e.g., 3 consecutive high readings)
   */
  async evaluateTrendConditions(rule, observation) {
    // Get last N observations for the metric
    const recentObservations = await prisma.observation.findMany({
      where: {
        patientId: observation.patientId,
        metricId: observation.metricId,
        recordedAt: { gte: rule.conditions.timeWindow } // e.g., last 7 days
      },
      orderBy: { recordedAt: 'desc' },
      take: rule.conditions.occurrences || 3 // e.g., check last 3 readings
    });

    // Check if trend condition met
    if (rule.conditions.operator === 'trend_increasing') {
      // Verify each value > previous value
      return this.isIncreasingTrend(recentObservations);
    }

    if (rule.conditions.operator === 'consecutive_high') {
      // Verify N consecutive readings > threshold
      return this.isConsecutivelyHigh(recentObservations, rule.conditions.threshold);
    }
  }

  isIncreasingTrend(observations) {
    // Implement trend detection logic
    // Return true if values are consistently increasing
  }

  isConsecutivelyHigh(observations, threshold) {
    // Implement consecutive threshold logic
    // Return true if all observations > threshold
  }
}
```

**Example Alert Rules Requiring Trends**:
- "Pain score increasing for 3 consecutive days"
- "Blood glucose consistently above 250 for 7 days"
- "Medication adherence <80% for 2 weeks"
- "No assessments completed for 48 hours"

**Impact**: Can't detect gradual deterioration or patterns requiring intervention.

---

### 7. Alert Dashboard Real-Time Updates 🔴 **MEDIUM PRIORITY**

**Problem**: Clinicians must refresh page to see new alerts.

**What's Missing**:
```javascript
// MISSING: WebSocket or Server-Sent Events (SSE) for real-time alerts

// Backend: /src/services/websocketService.js
const WebSocket = require('ws');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map<clinicianId, WebSocket[]>

    this.wss.on('connection', (ws, req) => {
      const clinicianId = this.authenticateWebSocket(req);
      this.registerClient(clinicianId, ws);

      ws.on('close', () => {
        this.unregisterClient(clinicianId, ws);
      });
    });
  }

  /**
   * Send alert to clinician's connected devices in real-time
   */
  async sendAlertToclinician(alert) {
    const clinicianId = alert.clinicianId;
    const clientSockets = this.clients.get(clinicianId);

    if (clientSockets) {
      const message = JSON.stringify({
        type: 'NEW_ALERT',
        data: alert
      });

      clientSockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }
}

// Frontend: /frontend/src/hooks/useAlertWebSocket.js
import { useEffect, useState } from 'react';

export function useAlertWebSocket() {
  const [newAlert, setNewAlert] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000/ws/alerts');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'NEW_ALERT') {
        setNewAlert(message.data);
        // Show toast notification
        // Play sound alert
        // Invalidate React Query cache
      }
    };

    return () => ws.close();
  }, []);

  return newAlert;
}
```

**Current Behavior**: Alerts only visible after manual page refresh or React Query refetch interval.

**Required Behavior**: Alerts appear instantly on clinician dashboard when triggered.

---

### 8. Alert Rule Testing Interface 🧪 **LOW PRIORITY**

**Problem**: No way to test alert rules before activating them.

**What's Missing**:
```javascript
// MISSING: Test alert rule endpoint

// POST /api/alert-rules/:id/test
// Body: { patientId, simulatedObservation }
// Response: { wouldTrigger: true/false, reason: "..." }

const testAlertRule = async (req, res) => {
  const { id } = req.params;
  const { patientId, simulatedObservation } = req.body;

  // Get the rule
  const rule = await prisma.alertRule.findUnique({ where: { id } });

  // Simulate evaluation without creating an alert
  const result = await alertEvaluationService.evaluateConditions(
    rule.conditions,
    simulatedObservation,
    await getPatientHistory(patientId)
  );

  res.json({
    success: true,
    wouldTrigger: result.triggered,
    reason: result.explanation,
    details: result.matchedConditions
  });
};
```

**Impact**: Clinical directors can't validate alert rules work correctly before deploying to production.

---

## 📋 Implementation Priority

### Phase 1: Core Monitoring Engine (CRITICAL - 1-2 weeks)

**Must-Have**:
1. ✅ **Alert Evaluation Service** (`/src/services/alertEvaluationService.js`)
   - Basic threshold-based evaluation (e.g., pain > 8)
   - Simple trend detection (3 consecutive high readings)
   - Cooldown/deduplication logic
   - **Effort**: 3-4 days

2. ✅ **Observation Ingestion Hook** (update `/src/controllers/observationController.js`)
   - Trigger alert evaluation on new observation
   - Handle errors gracefully (don't block observation creation)
   - **Effort**: 4 hours

3. ✅ **Alert Notification Delivery** (update `/src/services/notificationService.js`)
   - Send email to assigned clinician
   - Include patient context and severity
   - **Effort**: 1-2 days

4. ✅ **Scheduled Missed Assessment Checks** (update `/src/services/schedulerService.js`)
   - Hourly job to check for missed assessments (>24 hours)
   - **Effort**: 1 day

**Testing**: Manual testing with real observations and alert rules (2-3 days)

**Total Effort**: **8-12 days** (1.5-2.5 weeks)

---

### Phase 2: Advanced Monitoring Features (HIGH - 1 week)

**Should-Have**:
1. ✅ **Trend-Based Alert Evaluation**
   - Increasing/decreasing trends over time
   - Consecutive threshold breaches
   - **Effort**: 2-3 days

2. ✅ **Medication Adherence Monitoring**
   - Scheduled checks for missed doses
   - Adherence percentage calculation
   - **Effort**: 2 days

3. ✅ **Alert Escalation Logic**
   - Auto-escalate if not acknowledged within timeframe
   - Notify supervising clinician
   - **Effort**: 1-2 days

**Total Effort**: **5-7 days** (1 week)

---

### Phase 3: Real-Time Experience (MEDIUM - 1 week)

**Nice-to-Have**:
1. ✅ **WebSocket/SSE for Real-Time Alerts**
   - Instant alert delivery to clinician dashboard
   - Browser push notifications
   - **Effort**: 3-4 days

2. ✅ **Alert Rule Testing Interface**
   - Test rule with simulated data
   - Validation before activation
   - **Effort**: 2 days

**Total Effort**: **5-6 days** (1 week)

---

## 🎯 Minimum Viable Monitoring System (MVP)

To be **production-ready for pilot clinics**, you need **Phase 1 only**:

1. ✅ Alert evaluation on new observations (threshold-based)
2. ✅ Email notifications to clinicians
3. ✅ Missed assessment detection
4. ✅ Basic cooldown to prevent spam

**Estimated Time**: **8-12 days** (1.5-2.5 weeks)

**Can defer to post-pilot**:
- Real-time WebSocket updates (use React Query polling instead)
- Advanced trend detection (start with simple thresholds)
- Alert rule testing interface (test manually during pilot)

---

## 🔍 Current System Capabilities

### What Works NOW (Without Active Monitoring)
- ✅ Clinicians can **manually create** observations
- ✅ Clinicians can **manually create** alerts
- ✅ Clinicians can **view** existing alerts
- ✅ Clinicians can **acknowledge/resolve** alerts
- ✅ Alert rules can be **defined** and **customized**
- ✅ Daily assessment reminders sent at 9 AM

### What DOES NOT Work NOW
- ❌ **Automatic alert triggering** based on observations
- ❌ **Real-time clinician notification** when alerts trigger
- ❌ **Trend detection** (e.g., worsening pain over 3 days)
- ❌ **Missed assessment detection** (no assessment for >24 hours)
- ❌ **Medication adherence monitoring**
- ❌ **Alert escalation** if ignored
- ❌ **Alert cooldown** (prevent duplicate alerts)

---

## 💡 Recommended Next Steps

### Immediate Actions (This Week)
1. ✅ **Create AlertEvaluationService skeleton** (`/src/services/alertEvaluationService.js`)
2. ✅ **Add observation ingestion hook** (trigger evaluation on new observation)
3. ✅ **Implement basic threshold evaluation** (e.g., pain > 8 triggers high pain alert)
4. ✅ **Add email notification** for triggered alerts

### This Sprint (Next 2 Weeks)
1. ✅ **Complete Phase 1** (Core Monitoring Engine)
2. ✅ **Test with pilot clinic** - manually create observations, verify alerts trigger
3. ✅ **Document monitoring flow** for clinical staff

### Post-Pilot (After Initial Deployment)
1. ✅ **Implement Phase 2** (Trend detection, escalation)
2. ✅ **Add real-time WebSocket alerts** (Phase 3)
3. ✅ **Collect clinical feedback** on alert thresholds and rules

---

## 📊 Production Readiness Score: Clinical Monitoring

| Component | Status | Implemented | Priority |
|-----------|--------|-------------|----------|
| **Data Model** | ✅ Complete | 100% | Critical |
| **Alert Rule Management** | ✅ Complete | 100% | Critical |
| **Alert Evaluation Engine** | ❌ Missing | 0% | **CRITICAL** |
| **Observation Hook** | ❌ Missing | 0% | **CRITICAL** |
| **Alert Notifications** | 🟡 Partial | 30% | **CRITICAL** |
| **Scheduled Checks** | 🟡 Partial | 20% | High |
| **Trend Detection** | ❌ Missing | 0% | High |
| **Real-Time Delivery** | ❌ Missing | 0% | Medium |
| **Alert Cooldown** | ❌ Missing | 0% | Medium |

**Overall Clinical Monitoring Score**: **25% Complete**

**Verdict**: **NOT production-ready for RTM/RPM programs** without Phase 1 implementation.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
**Next Review**: After Phase 1 implementation
