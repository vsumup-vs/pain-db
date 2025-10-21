# UI Testing Guide - Platform Organization Blocking

> **Status**: ✅ Ready to Test
> **Backend**: Running on http://localhost:3000
> **Frontend**: Running on http://localhost:5173

---

## 🧪 Test Accounts

### 1️⃣ PLATFORM Organization (Should Be BLOCKED)

**Login Credentials:**
- 📧 **Email**: `platform@test.com`
- 🔑 **Password**: `Test123!`
- 🏢 **Organization**: ClinMetrics Pro Platform (PLATFORM type)

**Expected Behavior:**
When logged in as this user, you should get **403 Forbidden** errors when trying to access:
- ❌ Patients page
- ❌ Clinicians page
- ❌ Alerts page
- ❌ Tasks page
- ❌ Billing page
- ❌ Analytics page
- ❌ Time Tracking
- ❌ Enrollments
- ❌ Observations
- ❌ Encounter Notes

**Error Message You Should See:**
```
"[Feature] is not available for platform organizations. This is a patient-care feature for healthcare providers only."
```

---

### 2️⃣ CLINIC Organization (Full Access)

**Login Credentials:**
- 📧 **Email**: `clinic@test.com`
- 🔑 **Password**: `Test123!`
- 🏢 **Organization**: Test Healthcare Clinic UI (CLINIC type)

**Expected Behavior:**
When logged in as this user, you should have **FULL ACCESS** to:
- ✅ Patients page
- ✅ Clinicians page
- ✅ Alerts page
- ✅ Tasks page
- ✅ Billing page
- ✅ Analytics page
- ✅ All patient-care features

---

## 📋 Testing Steps

### Test 1: Verify PLATFORM Blocking

1. **Open Browser**: Navigate to http://localhost:5173
2. **Login**: Use `platform@test.com` / `Test123!`
3. **Try Navigation**: Click on sidebar links:
   - Patients
   - Clinicians
   - Alerts
   - Tasks
   - Billing
4. **Observe Errors**: You should see 403 Forbidden errors with messages like:
   ```
   Patient creation is not available for platform organizations.
   This is a patient-care feature for healthcare providers only.
   ```
5. **Check Console**: Open browser DevTools (F12) and check Network tab for 403 responses

### Test 2: Verify CLINIC Access

1. **Logout**: From platform user account
2. **Login**: Use `clinic@test.com` / `Test123!`
3. **Navigate Freely**: Click on all sidebar links
4. **Verify Access**: All pages should load successfully without 403 errors
5. **Try Actions**: Try creating a patient, viewing alerts, etc.

---

## 🎯 What to Look For

### ✅ Success Indicators

**For PLATFORM User:**
- Login works successfully
- Dashboard loads (if it doesn't use patient data)
- Navigation to patient-care pages returns 403
- Error messages are clear and user-friendly
- No crashes or blank screens

**For CLINIC User:**
- Login works successfully
- All navigation works
- Can view and interact with patient-care features
- No 403 errors

### ❌ Issues to Report

**If you see:**
- PLATFORM user can access patient pages → Bug! (blocking not working)
- CLINIC user gets 403 errors → Bug! (over-blocking)
- Server crashes or 500 errors → Backend issue
- Blank screens or React errors → Frontend issue
- Wrong error messages → UX issue

---

## 🔍 Detailed Feature Test Matrix

| Feature | PLATFORM User | CLINIC User |
|---------|---------------|-------------|
| **Dashboard** | ✅ Allowed | ✅ Allowed |
| **Patients** | ❌ 403 Blocked | ✅ Allowed |
| **Create Patient** | ❌ 403 Blocked | ✅ Allowed |
| **Clinicians** | ❌ 403 Blocked | ✅ Allowed |
| **Alerts** | ❌ 403 Blocked | ✅ Allowed |
| **Alert Rules** | ❌ 403 Blocked | ✅ Allowed |
| **Tasks** | ❌ 403 Blocked | ✅ Allowed |
| **Enrollments** | ❌ 403 Blocked | ✅ Allowed |
| **Observations** | ❌ 403 Blocked | ✅ Allowed |
| **Assessments** | ❌ 403 Blocked | ✅ Allowed |
| **Billing** | ❌ 403 Blocked | ✅ Allowed |
| **Analytics** | ❌ 403 Blocked | ✅ Allowed |
| **Time Tracking** | ❌ 403 Blocked | ✅ Allowed |
| **Medications** | ❌ 403 Blocked | ✅ Allowed |
| **Encounter Notes** | ❌ 403 Blocked | ✅ Allowed |

---

## 🛠️ Troubleshooting

### Frontend Not Loading?
```bash
# Check frontend status
tail -f frontend.log

# Restart frontend if needed
cd frontend && npm run dev
```

### Backend Not Responding?
```bash
# Check backend status
tail -f backend.log

# Restart backend if needed
NODE_ENV=development node index.js
```

### Need to Reset Test Data?
```bash
# Re-run setup script
node scripts/setup-platform-user-for-ui-test.js
```

### Can't Login?
- **Check Console**: Look for API errors in browser DevTools
- **Verify Backend**: Make sure http://localhost:3000/api/ responds
- **Check Credentials**: Use exact credentials (case-sensitive!)

---

## 📊 Expected API Responses

### PLATFORM User - Patient Creation (403)
```json
{
  "success": false,
  "message": "Patient creation is not available for platform organizations. This is a patient-care feature for healthcare providers only."
}
```

### PLATFORM User - Billing Access (403)
```json
{
  "success": false,
  "message": "Billing and reimbursement tracking is not available for platform organizations. This is a patient-care feature for healthcare providers only."
}
```

### CLINIC User - Patient Creation (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "patient-id",
    "firstName": "John",
    "lastName": "Doe"
    // ... patient data
  }
}
```

---

## 🎬 Demo Flow

**5-Minute Demo Script:**

1. **Start**: Show both user credentials
2. **Login as PLATFORM**: platform@test.com
3. **Navigate**: Try to click "Patients" → See 403 error
4. **Navigate**: Try to click "Billing" → See 403 error
5. **Show Network**: Open DevTools, show 403 responses
6. **Logout**: From PLATFORM user
7. **Login as CLINIC**: clinic@test.com
8. **Navigate**: Click "Patients" → Success!
9. **Navigate**: Click "Billing" → Success!
10. **Summary**: "PLATFORM blocked, CLINIC allowed ✅"

---

## 📝 Test Results Template

**Date**: _______________
**Tester**: _______________

### PLATFORM User Tests
- [ ] Login successful
- [ ] Patients page blocked (403)
- [ ] Clinicians page blocked (403)
- [ ] Alerts page blocked (403)
- [ ] Tasks page blocked (403)
- [ ] Billing page blocked (403)
- [ ] Error messages clear

### CLINIC User Tests
- [ ] Login successful
- [ ] Patients page accessible
- [ ] Clinicians page accessible
- [ ] Alerts page accessible
- [ ] Tasks page accessible
- [ ] Billing page accessible
- [ ] No unexpected errors

### Issues Found
```
[List any bugs, unexpected behavior, or UX issues here]
```

---

## ✅ Sign Off

When all tests pass, the Platform SAAS refactorization is confirmed working!

**Test Completion Checklist:**
- [ ] PLATFORM user blocked from patient-care features
- [ ] CLINIC user has full access
- [ ] No server crashes
- [ ] Error messages user-friendly
- [ ] Documentation reviewed
- [ ] Ready to merge to main branch

---

**Happy Testing! 🚀**
