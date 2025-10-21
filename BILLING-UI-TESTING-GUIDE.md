# Billing & enrollmentId UI Testing Guide

> **Servers Running**:
> - Frontend: http://localhost:5173
> - Backend: http://localhost:3000
> - API Docs: http://localhost:3000/api

---

## 🎯 What We're Testing

1. **Billing Readiness Dashboard** - New configurable billing system
2. **Alert Resolution with enrollmentId** - Automatic linking to billing enrollments
3. **Time Tracking with enrollmentId** - Timer functionality
4. **Observation Creation with enrollmentId** - Creating observations
5. **Real-Time SSE Alerts** - Live alert updates

---

## ✅ Test 1: Billing Readiness Dashboard

**URL**: http://localhost:5173/billing-readiness

### What to Look For:

1. **Summary Statistics Cards** (top row):
   - Total Enrollments count
   - Eligible for Billing count and percentage
   - Not Eligible count
   - Total Reimbursement (USD)

2. **By Program Breakdown** (middle section):
   - Dynamic cards for each billing program
   - Should show programs like: CMS_RPM_2025, CMS_RTM_2025, CMS_CCM_2025
   - Each card shows enrollment count and revenue

3. **Eligible Patients Table**:
   - Patient name and ID
   - Billing program name
   - CPT code badges (99453, 99454, 99457, etc.)
   - Total reimbursement per patient

4. **Not Eligible Patients Table**:
   - Patient name
   - Reason for ineligibility (clear explanation)

5. **CSV Export Button**:
   - Click "Export CSV"
   - File downloads as: `billing-summary-YYYY-MM.csv`

### How to Test Database-Driven Logic:

**Prove billing criteria come from database (NOT hardcoded)**:

```bash
# 1. Note current threshold in UI (should be 16 days for CPT 99454)

# 2. Update threshold in database
node << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.billingCPTCode.updateMany({
  where: { code: '99454' },
  data: {
    criteria: {
      type: 'DATA_DAYS',
      threshold: 18,  // Changed from 16
      operator: '>=',
      calculationMethod: 'unique_days_device_observations'
    }
  }
})
.then(() => console.log('✅ Updated 99454 threshold to 18 days'))
.finally(() => prisma.$disconnect());
EOF

# 3. Refresh billing dashboard
# 4. Should now show "18 days required" instead of "16 days"
# 5. This proves criteria are read from database!
```

---

## ✅ Test 2: Alert Resolution with enrollmentId

**URL**: http://localhost:5173/triage-queue

### Setup Test Data (if needed):

```bash
# Create test patient with billing enrollment
node scripts/create-enrollmentid-test-data.js

# Create test alert for that patient
node create-test-alert-sse.js
```

### Steps:

1. **View Triage Queue**:
   - Should see list of alerts
   - Click on an alert to view details

2. **Patient Context Panel Opens** (right side):
   - Vitals trends (7/30/90 days graphs)
   - Active medications with adherence %
   - Conditions list
   - Recent assessments
   - Contact information

3. **Resolve the Alert**:
   - Click "Resolve" button
   - Fill in the form:
     - **Resolution notes**: "Reviewed vitals, advised medication adjustment"
     - **Time spent**: 15 (minutes)
     - **CPT code**: Select "99457 - RPM clinical time"
   - Click "Submit"

4. **Verify enrollmentId Was Linked**:

```bash
# Run verification script
node verify-timelog-enrollmentid.js
```

**Expected Output**:
```
📋 Most Recent TimeLog:
Patient: John Smith
Clinician: Dr. Jane Doe
Duration: 15 minutes
CPT Code: 99457
Logged At: 2025-10-21T...

✅ enrollmentId LINKED: clztk9s8...
   Billing Program: CMS Remote Patient Monitoring 2025
   Program Code: CMS_RPM_2025
```

**What This Proves**:
- ✅ TimeLog automatically linked to patient's billing enrollment
- ✅ No manual enrollmentId selection needed
- ✅ Billing calculations will now be accurate per enrollment

---

## ✅ Test 3: Real-Time SSE Alert Updates

**URL**: http://localhost:5173/triage-queue

### Steps:

1. **Open Triage Queue** in your browser

2. **Open Browser DevTools** (Press F12):
   - Go to **Network** tab
   - Look for `/api/alerts/stream` request
   - Status should be "pending" (connection stays open)

3. **Create Test Alert** (in another terminal):
```bash
node create-test-alert-sse.js
```

4. **Watch UI for Real-Time Update**:
   - Alert should appear in triage queue **WITHOUT page refresh**
   - Toast notification should pop up based on severity:
     - 🔴 CRITICAL: Red toast
     - 🟠 HIGH: Orange toast  
     - 🟡 MEDIUM: Yellow toast
     - 🔵 LOW: Blue toast

5. **Verify SSE Connection in Console**:
```javascript
// In browser console (F12), you should see:
// "SSE Connected to /api/alerts/stream"
// And heartbeat messages every 30 seconds
```

**Expected Behavior**:
- ✅ Alert appears in UI within 1-2 seconds
- ✅ Toast notification displays with correct severity color
- ✅ SSE connection stays alive (heartbeat every 30 seconds)
- ✅ Connection auto-reconnects if dropped

---

## ✅ Test 4: Time Tracking with enrollmentId

**URL**: http://localhost:5173/triage-queue (or any patient detail page)

### Steps:

1. **Start Timer**:
   - When viewing a patient, click "Start Timer"
   - Select activity type (e.g., "Review Data", "Call Patient")
   - Timer should start counting

2. **Do Some Work** (or just wait 1 minute)

3. **Stop Timer**:
   - Click "Stop Timer"
   - Fill in:
     - **CPT code**: 99457 (RPM clinical time)
     - **Notes**: "Reviewed blood pressure readings, patient counseling"
   - Click "Submit"

4. **Verify enrollmentId Auto-Detection**:
```bash
node verify-timelog-enrollmentid.js
```

**Expected Behavior**:
- ✅ Timer creates TimeLog with `enrollmentId` populated
- ✅ Backend automatically detects billing enrollment
- ✅ No frontend changes required

---

## ✅ Test 5: Observation Creation with enrollmentId

**URL**: http://localhost:5173/observations/new

### Steps:

1. **Create New Observation**:
   - Select patient
   - Select metric: "Systolic Blood Pressure"
   - Enter value: 130
   - Select source: DEVICE or MANUAL
   - Add notes (optional): "Morning reading"
   - Click "Submit"

2. **Verify enrollmentId Was Linked**:
```bash
cat > verify-observation-enrollmentid.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRecentObservation() {
  const recentObs = await prisma.observation.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      metric: { select: { name: true } },
      enrollment: {
        include: {
          billingProgram: { select: { name: true, code: true } }
        }
      }
    }
  });

  if (!recentObs) {
    console.log('❌ No Observations found');
    return;
  }

  console.log('\n📊 Most Recent Observation:');
  console.log('Patient:', \`\${recentObs.patient.firstName} \${recentObs.patient.lastName}\`);
  console.log('Metric:', recentObs.metric.name);
  console.log('Value:', recentObs.value);
  console.log('Source:', recentObs.source);

  if (recentObs.enrollmentId) {
    console.log('\n✅ enrollmentId LINKED:', recentObs.enrollmentId);
    if (recentObs.enrollment?.billingProgram) {
      console.log('   Billing Program:', recentObs.enrollment.billingProgram.name);
    }
  } else {
    console.log('\n⚠️  enrollmentId NOT LINKED');
  }
}

verifyRecentObservation()
  .catch(console.error)
  .finally(() => prisma.\$disconnect());
EOF

node verify-observation-enrollmentid.js
```

---

## 🛠️ Setting Up Test Data

If you need test patients/enrollments/alerts:

### Quick Setup (Recommended):
```bash
# Creates: organization, clinician, patient, enrollment with billing program
node scripts/create-enrollmentid-test-data.js
```

### Create Test Alert:
```bash
# Creates an alert that triggers real-time SSE notification
node create-test-alert-sse.js
```

### Comprehensive Setup:
```bash
# Creates multiple patients, enrollments, billing programs
node scripts/setup-persistent-test-data.js
```

---

## 🐛 Troubleshooting

### Billing Dashboard Shows "No Data"

**Check if enrollments have billing programs**:
```bash
node scripts/check-existing-billing-enrollments.js
```

**Assign billing programs if needed**:
```bash
node scripts/assign-billing-to-enrollments.js
```

### TimeLogs Have No enrollmentId

**Cause**: Patient has no active enrollment with `billingProgramId`

**Solution**: Assign billing program to enrollment:
```javascript
// Via Prisma Studio or script
await prisma.enrollment.update({
  where: { id: 'enrollment-xyz' },
  data: { billingProgramId: 'billing-program-id' }
});
```

### SSE Connection Not Working

1. Check browser console for errors
2. Verify backend running: `curl http://localhost:3000/health`
3. Test SSE endpoint: 
```bash
curl http://localhost:3000/api/alerts/stream \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Success Checklist

After testing, confirm:

**Billing Readiness Dashboard**:
- [ ] Summary statistics accurate
- [ ] Program breakdown displays correctly
- [ ] CPT code criteria come from database (NOT hardcoded)
- [ ] CSV export works
- [ ] Month/year selector updates data

**enrollmentId Linkage**:
- [ ] Alert resolution creates TimeLog with enrollmentId
- [ ] Timer creates TimeLog with enrollmentId
- [ ] Observations have enrollmentId
- [ ] Verify script shows linkage

**Real-Time Updates**:
- [ ] SSE connection established (see in Network tab)
- [ ] Alerts appear without page refresh
- [ ] Toast notifications display with correct colors
- [ ] Heartbeat keeps connection alive

**Billing Accuracy**:
- [ ] "16 days of readings" counts only observations for specific enrollment
- [ ] "20 minutes clinical time" counts only time logs for specific enrollment
- [ ] Multi-program enrollments bill separately (RPM + RTM)

---

## 📊 Verification Script: Check All Linkages

```bash
cat > verify-all-enrollmentid.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAll() {
  const [timeLogs, observations] = await Promise.all([
    prisma.timeLog.findMany({
      select: { id: true, enrollmentId: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.observation.findMany({
      select: { id: true, enrollmentId: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  const timeLogsWithEnrollment = timeLogs.filter(t => t.enrollmentId).length;
  const obsWithEnrollment = observations.filter(o => o.enrollmentId).length;

  console.log('\n📋 Last 10 TimeLogs:');
  console.log(\`   ✅ \${timeLogsWithEnrollment} of \${timeLogs.length} have enrollmentId\`);

  console.log('\n📊 Last 10 Observations:');
  console.log(\`   ✅ \${obsWithEnrollment} of \${observations.length} have enrollmentId\`);

  if (timeLogsWithEnrollment === timeLogs.length && obsWithEnrollment === observations.length) {
    console.log('\n🎉 ALL records have enrollmentId linked!');
  }
}

verifyAll()
  .catch(console.error)
  .finally(() => prisma.\$disconnect());
EOF

node verify-all-enrollmentid.js
```

---

**Happy Testing! 🚀**

Questions? Check the documentation:
- `docs/PHASE-2-BILLING-API-UI-COMPLETE.md`
- `docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md`
