# Testing SSE Real-Time Alert Notifications

> Created: 2025-10-18
> Purpose: Test that toast notifications appear in browser when alerts are created via SSE

## What Was Fixed

The SSE service now enriches alerts with computed fields before broadcasting, fixing the React error:
```
Cannot read properties of undefined (reading 'slaStatus')
```

**Changes made:**
- Added `enrichAlertWithComputedFields()` function to `src/services/sseService.js`
- Modified `sendAlertToUser()` to enrich alerts before sending via SSE
- Backend server restarted to apply changes

## Prerequisites

1. ✅ Browser open to Triage Queue page: http://localhost:5173/triage-queue
2. ✅ Logged in as `sse-test@example.com`
3. ✅ SSE connection active (check browser console for "[SSE] Connected to real-time alerts")
4. ✅ Backend server running on port 3000 (ID: 4528c9)

## Test Instructions

### Step 1: Verify SSE Connection

Open browser DevTools Console (F12) and look for:
```
[SSE] Connected to real-time alerts
[SSE] Connection opened
```

If you see these messages, SSE is working ✅

### Step 2: Create Alert via Browser Console

Paste this code into your browser console and press Enter:

```javascript
fetch('http://localhost:3000/api/alerts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify({
    ruleId: 'cmgvxx3wt00017kglh8mqo5yw',
    enrollmentId: 'cmgw8suaw00017ktyr8teciko',
    facts: {
      message: `🧪 SSE TEST - ${new Date().toLocaleTimeString()}`,
      testTimestamp: new Date().toISOString()
    }
  })
}).then(res => res.json()).then(data => {
  console.log('✅ Alert created:', data);
}).catch(err => {
  console.error('❌ Error creating alert:', err);
});
```

### Step 3: Expected Results

**You should see:**

1. **Browser Console Logs:**
   ```
   [SSE] New alert received: {id: "...", severity: "HIGH", ...}
   ✅ Alert created: {success: true, alert: {...}}
   ```

2. **Toast Notification** (top-right corner):
   - Blue notification icon
   - Text: "New Alert!"
   - Patient name: "Alice EnrollmentTest"
   - Rule name shown
   - Automatically disappears after 5 seconds

3. **Alert appears in Triage Queue:**
   - New alert card at top of list
   - No React errors in console ✅
   - Alert displays correctly with:
     - Risk badge (Low/Medium/High/Critical)
     - SLA status border (green/yellow/red)
     - Patient name
     - Alert message

### Step 4: Verify No Errors

Check browser console for errors. You should **NOT** see:
- ❌ `Cannot read properties of undefined (reading 'slaStatus')`
- ❌ `Cannot read properties of undefined (reading 'riskLevel')`
- ❌ Any other computed field errors

## Backend Verification

Check backend server logs (ID: 4528c9) for:

```
📡 Broadcast new alert [alert-id] to clinician [clinician-id] (user [user-id])
📨 Sending alert to 1 connection(s) for user [user-id]
```

## Key IDs (For Reference)

- **User:** cmgvrbv6j00027kd94vd66b5j (sse-test@example.com)
- **Clinician:** cmgvzkncn00017knxxb48s3wa
- **Organization:** cmgv3qs7m00007knezlq1suon
- **Alert Rule:** cmgvxx3wt00017kglh8mqo5yw
- **Enrollment:** cmgw8suaw00017ktyr8teciko
- **Patient:** Alice EnrollmentTest (cmgv40hth00017khnhdu0lksn)
- **Backend Server:** 4528c9 (port 3000)

## Success Criteria

✅ Toast notification appears within 1 second of creating alert
✅ Alert appears in Triage Queue without page refresh
✅ No React errors in browser console
✅ Backend logs show SSE broadcast messages
✅ Alert displays correctly with all computed fields
