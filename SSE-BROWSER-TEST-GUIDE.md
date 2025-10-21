# SSE Browser Test Guide

## Purpose
Test real-time alert notifications using the browser UI (avoids API validation issues).

## Prerequisites
✅ Backend server running (port 3000)
✅ Frontend dev server running (port 5173)

## Test Steps

### 1. Open Triage Queue Page
```
http://localhost:5173/triage-queue
```

- Login as: `sse-test@example.com` / `TestPassword123!`
- The page will automatically establish SSE connection
- Check browser console for: `✅ SSE connection established`

### 2. Monitor SSE Connection
Open browser DevTools (F12) → Network tab:
- Filter by "sse" or "alerts"
- You should see a persistent connection to `/api/sse/alerts`
- Status: "pending" (this is normal - connection stays open)

### 3. Trigger a Test Alert

**Method A - Create Observation that Breaches Threshold:**
1. Navigate to Observations page
2. Create a new observation with a value that exceeds an alert rule threshold
3. Watch the Triage Queue - an alert should appear instantly

**Method B - Use Backend Script:**
```bash
cd /home/vsumup/pain-db
node create-test-alert.js
```

### 4. Verify SSE Notification
When an alert is created, you should see:
- 🔔 Toast notification appears (top-right corner)
- 📊 Alert appears in triage queue table
- ✅ Summary cards update (no page refresh!)

### 5. Check Browser Console
Look for SSE event logs:
```
📡 SSE event received: alert
{
  id: "alert-id-here",
  severity: "HIGH",
  message: "Test alert message",
  ...
}
```

## Troubleshooting

### No SSE Connection
- Check backend logs: `tail -f backend.log`
- Look for: `✅ SSE connection established for user...`

### No Toast Notification
- Check if `notificationService` is configured
- Verify alert has `severity` and `message` fields

### Connection Drops
- SSE sends heartbeat every 30 seconds
- If connection drops, page should auto-reconnect

## Success Criteria
✅ SSE connection establishes when page loads
✅ Toast notification appears when alert created
✅ Alert appears in triage queue instantly (no refresh)
✅ Summary statistics update in real-time
