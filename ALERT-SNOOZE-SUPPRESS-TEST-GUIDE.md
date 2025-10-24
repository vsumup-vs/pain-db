# Alert Snooze/Suppress - Browser Testing Guide

> Created: 2025-10-22
> Feature: Phase 1b - Alert Snooze & Suppress with Reason Codes
> Status: Implementation Complete - Ready for Testing

## Quick Start: 3-Step Verification

### Step 1: Navigate to Triage Queue

1. Open browser to `http://localhost:5174/triage-queue`
2. Log in with test credentials (if not already logged in)
3. You should see the Triage Queue dashboard with active alerts

### Step 2: Test Snooze Functionality

**Goal**: Temporarily hide an alert for a specified duration (1 minute to 1 week)

1. **Find an active alert** in PENDING, ACKNOWLEDGED, or IN_PROGRESS status
2. **Click the "Snooze" button** (should be visible in alert action buttons)
3. **Snooze Modal should appear** with:
   - Patient name and alert details
   - Duration selector (dropdown with preset options OR custom input)
   - Optional reason/notes field
4. **Select snooze duration**:
   - Quick test: Select "5 minutes" or "15 minutes"
   - Options should include: 15 min, 30 min, 1 hour, 2 hours, 4 hours, 8 hours, 24 hours
5. **Click "Confirm" or "Snooze Alert"**
6. **Verify success**:
   - Toast notification: "Alert snoozed successfully"
   - Alert status changes to SNOOZED
   - Alert disappears from main active queue
   - Alert may appear in a "Snoozed Alerts" section (if UI has this filter)

### Step 3: Test Suppress Functionality

**Goal**: Permanently dismiss an alert with documented reason for audit compliance

1. **Find an active alert** (or use a different alert than the snoozed one)
2. **Click the "Suppress" button**
3. **Suppress Modal should appear** with:
   - Patient name and alert details
   - **Required** suppress reason dropdown
   - **Required** suppress notes textarea (minimum 10 characters for "OTHER" reason)
4. **Select suppress reason** from dropdown:
   - FALSE_POSITIVE
   - PATIENT_CONTACTED
   - DUPLICATE_ALERT
   - PLANNED_INTERVENTION
   - PATIENT_HOSPITALIZED
   - DEVICE_MALFUNCTION
   - DATA_ENTRY_ERROR
   - CLINICAL_JUDGMENT
   - OTHER (requires detailed notes)
5. **Enter suppress notes**:
   - If reason = "OTHER": **REQUIRED**, minimum 10 characters
   - Otherwise: Optional but recommended for audit trail
6. **Click "Confirm" or "Suppress Alert"**
7. **Verify success**:
   - Toast notification: "Alert suppressed successfully"
   - Alert status changes to DISMISSED
   - `isSuppressed` flag set to `true`
   - Alert disappears from active queue
   - Alert may appear in "Dismissed/Suppressed Alerts" section

---

## Detailed Testing Scenarios

### Scenario 1: Snooze Duration Validation

**Test Case**: Verify snooze duration constraints

1. Open Snooze Modal
2. Attempt to enter invalid durations:
   - **Less than 1 minute**: Should show error "Snooze duration must be at least 1 minute"
   - **More than 10080 minutes (1 week)**: Should show error "Snooze duration cannot exceed 10080 minutes (1 week)"
3. Enter valid duration (e.g., 60 minutes)
4. Submit - should succeed

**Expected Behavior**:
- Frontend validates duration before submission
- Backend validates again and returns 400 error if invalid
- User sees clear error message

---

### Scenario 2: Suppress Reason Validation

**Test Case**: Verify suppress reason is required and "OTHER" requires notes

1. **Without selecting reason**:
   - Click Suppress button
   - Leave reason dropdown blank
   - Click submit
   - **Expected**: Error "Suppress reason is required"

2. **With reason = "OTHER" but no notes**:
   - Select "OTHER" from dropdown
   - Leave notes blank
   - Click submit
   - **Expected**: Error "Suppress notes are required (minimum 10 characters) when reason is OTHER"

3. **With reason = "OTHER" and short notes**:
   - Select "OTHER"
   - Enter "too short" (9 characters)
   - **Expected**: Error "Suppress notes must be at least 10 characters"

4. **Valid suppression**:
   - Select "FALSE_POSITIVE"
   - Notes optional
   - **Expected**: Success

---

### Scenario 3: Background Job - Automatic Unsnooze

**Test Case**: Verify alerts automatically reactivate after snooze expires

1. **Create a short snooze**:
   - Snooze an alert for **5 minutes**
   - Note the current time
   - Verify alert disappears from queue

2. **Wait for snooze to expire**:
   - Wait 5-6 minutes
   - Background job runs every 5 minutes, so alert should reactivate within 5-10 minutes of snooze expiry

3. **Verify reactivation**:
   - Refresh Triage Queue page (or wait for real-time update if SSE is working)
   - Alert should reappear in PENDING status
   - `snoozedUntil` should be cleared (null)
   - `snoozedById` and `snoozedAt` should be cleared

4. **Check backend logs**:
   ```bash
   tail -f backend.log | grep "Reactivated snoozed alert"
   ```
   - Should see: "🔔 Reactivated snoozed alert [alert-id]"

**Expected Backend Log Output**:
```
⏰ Checking for expired snoozed alerts...
🔔 Reactivated snoozed alert clvjq5v4a0001...
✅ Reactivated 1 snoozed alerts
```

---

### Scenario 4: Audit Trail Verification

**Test Case**: Verify all snooze/suppress actions are logged for HIPAA compliance

1. **Perform snooze action** on an alert
2. **Check database audit logs**:
   ```bash
   npx prisma studio
   ```
   - Open `AuditLog` table
   - Find most recent entries with `action = 'ALERT_SNOOZED'`
   - Verify fields populated:
     - `userId` = current user
     - `organizationId` = alert's organization
     - `resource = 'Alert'`
     - `resourceId` = alert ID
     - `hipaaRelevant = true`
     - `oldValues` = previous alert status
     - `newValues` = new status with snooze details

3. **Perform suppress action**
4. **Check audit logs** for `action = 'ALERT_SUPPRESSED'`
   - Verify similar fields populated
   - Check `newValues` includes suppress reason and notes

**SQL Query (if needed)**:
```sql
SELECT * FROM audit_logs
WHERE action IN ('ALERT_SNOOZED', 'ALERT_SUPPRESSED', 'ALERT_UNSNOOZED', 'ALERT_UNSUPPRESSED')
ORDER BY created_at DESC
LIMIT 10;
```

---

### Scenario 5: Unsnooze and Unsuppress Actions

**Test Case**: Verify manual unsnooze and unsuppress functionality

1. **Snooze an alert** (e.g., 1 hour)
2. **View snoozed alerts** (filter or dedicated section)
3. **Click "Unsnooze" button** on the snoozed alert
4. **Verify**:
   - Alert returns to PENDING status immediately
   - Snooze fields cleared
   - Toast: "Alert unsnoozed successfully"

5. **Suppress an alert**
6. **View suppressed/dismissed alerts**
7. **Click "Unsuppress" button**
8. **Verify**:
   - Alert returns to PENDING status
   - `isSuppressed` set to `false`
   - Suppress reason/notes retained for audit (not cleared)
   - Toast: "Alert unsuppressed successfully"

---

## Testing Checklist

### Snooze Functionality
- [ ] Snooze modal opens when "Snooze" button clicked
- [ ] Modal displays correct patient name and alert details
- [ ] Duration selector has preset options (15 min, 30 min, 1h, 2h, 4h, 8h, 24h)
- [ ] Custom duration input validates minimum (1 minute)
- [ ] Custom duration input validates maximum (10080 minutes / 1 week)
- [ ] Snooze submission succeeds with valid duration
- [ ] Alert status changes to SNOOZED
- [ ] Alert disappears from active queue
- [ ] Toast notification shows success message
- [ ] Background job reactivates alert after snooze expires (within 5-10 minutes)
- [ ] Audit log created with `action = 'ALERT_SNOOZED'` and `hipaaRelevant = true`

### Suppress Functionality
- [ ] Suppress modal opens when "Suppress" button clicked
- [ ] Modal displays correct patient name and alert details
- [ ] Suppress reason dropdown shows all 9 reason options
- [ ] Suppress reason is required (error if not selected)
- [ ] "OTHER" reason requires suppress notes (minimum 10 characters)
- [ ] Other reasons make notes optional
- [ ] Suppress submission succeeds with valid reason
- [ ] Alert status changes to DISMISSED
- [ ] `isSuppressed` flag set to `true`
- [ ] Alert disappears from active queue
- [ ] Toast notification shows success message
- [ ] Audit log created with `action = 'ALERT_SUPPRESSED'` and `hipaaRelevant = true`

### Unsnooze/Unsuppress Functionality
- [ ] Unsnooze button available on snoozed alerts
- [ ] Unsnooze action returns alert to PENDING immediately
- [ ] Snooze fields cleared on unsnooze
- [ ] Unsuppress button available on suppressed alerts
- [ ] Unsuppress action returns alert to PENDING
- [ ] `isSuppressed` flag set to `false` on unsuppress
- [ ] Suppress reason/notes retained for audit

### Background Job
- [ ] Background job runs every 5 minutes (check backend logs)
- [ ] Expired snoozed alerts are detected and reactivated
- [ ] Reactivated alerts return to PENDING status
- [ ] Snooze fields cleared on reactivation
- [ ] Backend logs show "🔔 Reactivated snoozed alert [id]" message

### Error Handling
- [ ] Invalid snooze duration shows user-friendly error
- [ ] Missing suppress reason shows error
- [ ] "OTHER" reason without notes shows error
- [ ] Short suppress notes (<10 chars) show error
- [ ] Network errors show toast notification
- [ ] Modal closes on cancel without changes

### Audit Compliance
- [ ] All snooze actions logged to `audit_logs` table
- [ ] All suppress actions logged to `audit_logs` table
- [ ] Audit logs include user ID, organization ID, and timestamp
- [ ] Audit logs marked `hipaaRelevant = true`
- [ ] Old and new values captured in audit logs

---

## Expected Database State After Testing

### Alert Table Changes

**Snoozed Alert**:
```json
{
  "id": "alert-abc123",
  "status": "SNOOZED",
  "snoozedUntil": "2025-10-22T15:30:00Z",
  "snoozedById": "user-xyz",
  "snoozedAt": "2025-10-22T15:00:00Z",
  "isSuppressed": false
}
```

**Suppressed Alert**:
```json
{
  "id": "alert-def456",
  "status": "DISMISSED",
  "isSuppressed": true,
  "suppressReason": "FALSE_POSITIVE",
  "suppressedById": "user-xyz",
  "suppressedAt": "2025-10-22T15:00:00Z",
  "suppressNotes": "Device reading was incorrect due to loose cuff"
}
```

**Reactivated Alert** (after snooze expires):
```json
{
  "id": "alert-abc123",
  "status": "PENDING",
  "snoozedUntil": null,
  "snoozedById": null,
  "snoozedAt": null,
  "isSuppressed": false
}
```

---

## Troubleshooting

### Issue 1: Snooze/Suppress buttons not visible

**Possible Causes**:
- User doesn't have required permissions
- Alert status doesn't allow snooze/suppress (e.g., already RESOLVED)
- Frontend component not rendering buttons

**Check**:
1. Inspect browser DevTools → Elements → Find alert card
2. Look for button elements with onClick handlers
3. Check user permissions in database
4. Verify alert status is PENDING, ACKNOWLEDGED, or IN_PROGRESS

---

### Issue 2: Modal doesn't open

**Possible Causes**:
- Modal state not updating
- Modal component not imported
- JavaScript error preventing render

**Check**:
1. Browser console for errors (F12 → Console)
2. Check `TriageQueue.jsx` imports:
   ```javascript
   import SnoozeModal from '../components/SnoozeModal'
   import SuppressModal from '../components/SuppressModal'
   ```
3. Check state variables:
   ```javascript
   const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false)
   const [isSuppressModalOpen, setIsSuppressModalOpen] = useState(false)
   ```

---

### Issue 3: API errors (400/500 responses)

**Possible Causes**:
- Invalid payload
- Missing required fields
- Backend validation errors

**Check**:
1. Browser DevTools → Network tab → Find failed POST request
2. Click on request → Preview/Response tab
3. Read error message
4. Common errors:
   - "Snooze duration is required and must be at least 1 minute"
   - "Suppress reason is required"
   - "Suppress notes are required (minimum 10 characters) when reason is OTHER"

---

### Issue 4: Background job not reactivating alerts

**Possible Causes**:
- Background job not running
- Cron schedule misconfigured
- Database timezone issues

**Check**:
1. Backend logs: `tail -f backend.log | grep "expired snoozed"`
2. Should see "⏰ Checking for expired snoozed alerts..." every 5 minutes
3. Check alert `snoozedUntil` timestamp is in past
4. Manually trigger reactivation:
   ```javascript
   // In alertScheduler.js (for dev testing only)
   const { reactivateSnoozedAlerts } = require('./src/services/alertScheduler');
   reactivateSnoozedAlerts();
   ```

---

## API Endpoint Reference

### POST /api/alerts/:id/snooze

**Request**:
```json
{
  "snoozeMinutes": 60
}
```

**Response (200 OK)**:
```json
{
  "alert": {
    "id": "alert-abc123",
    "status": "SNOOZED",
    "snoozedUntil": "2025-10-22T16:00:00Z",
    "snoozedById": "user-xyz",
    "snoozedAt": "2025-10-22T15:00:00Z"
  },
  "message": "Alert snoozed for 60 minutes"
}
```

**Errors**:
- `400`: Invalid snooze duration (<1 or >10080 minutes)
- `404`: Alert not found
- `403`: Insufficient permissions

---

### POST /api/alerts/:id/suppress

**Request**:
```json
{
  "suppressReason": "FALSE_POSITIVE",
  "suppressNotes": "Device reading was incorrect due to loose BP cuff placement"
}
```

**Response (200 OK)**:
```json
{
  "alert": {
    "id": "alert-def456",
    "status": "DISMISSED",
    "isSuppressed": true,
    "suppressReason": "FALSE_POSITIVE",
    "suppressedById": "user-xyz",
    "suppressedAt": "2025-10-22T15:00:00Z",
    "suppressNotes": "Device reading was incorrect due to loose BP cuff placement"
  },
  "message": "Alert suppressed successfully"
}
```

**Errors**:
- `400`: Missing suppress reason
- `400`: Invalid suppress reason (not in enum)
- `400`: "OTHER" reason requires notes (minimum 10 characters)
- `404`: Alert not found
- `403`: Insufficient permissions

---

## Success Criteria

✅ **Feature is working correctly if**:

1. **Snooze Functionality**:
   - Alert can be snoozed with valid duration (1 minute - 1 week)
   - Snoozed alert disappears from active queue
   - Alert automatically reactivates after snooze expires
   - Background job logs confirm reactivation

2. **Suppress Functionality**:
   - Alert can be suppressed with documented reason
   - "OTHER" reason requires detailed notes (10+ characters)
   - Suppressed alert marked as DISMISSED with `isSuppressed = true`
   - Suppressed alert removed from active queue

3. **Audit Compliance**:
   - All snooze actions logged to `audit_logs` table
   - All suppress actions logged with `hipaaRelevant = true`
   - Audit logs include user ID, timestamp, and state changes

4. **User Experience**:
   - Modals open/close smoothly
   - Form validation provides clear error messages
   - Success toast notifications appear
   - No console errors

---

## Next Steps After Testing

Once testing is complete and all checklist items pass:

1. ✅ Mark todo task as completed: "Test snooze/suppress functionality end-to-end"
2. ⏳ Update Phase 1b roadmap status
3. ⏳ Move to next Phase 1b feature:
   - **Bulk Alert Actions** (Medium priority, 1-2 days)
   - **SLA Timers & Escalation Logic** (Medium priority, 3-4 days)
   - **Clinician Workflow Analytics** (Medium priority, 3-4 days)

---

**Testing Owner**: Development Team / QA
**Completion Criteria**: All checklist items checked, no critical bugs found
**Estimated Testing Time**: 30-45 minutes for comprehensive testing
**Status**: ✅ Implementation Complete - Ready for Browser Testing
