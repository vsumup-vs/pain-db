# Multi-Tenant Security Testing & Validation Guide

## ✅ Implementation Verification Checklist

This guide helps you verify that multi-tenant security is properly implemented and working correctly.

---

## 🧪 Manual Testing Procedures

### Test 1: Authentication Required

**Objective:** Verify that all API endpoints require authentication

**Steps:**
```bash
# 1. Try to access patients without authentication
curl -X GET http://localhost:3000/api/patients
# Expected: 401 Unauthorized with AUTH_TOKEN_MISSING

# 2. Try with invalid token
curl -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized with AUTH_TOKEN_INVALID
```

**Success Criteria:**
- ✅ Returns 401 status code
- ✅ Returns appropriate error code
- ✅ Does not return any data

---

### Test 2: Organization Context Validation

**Objective:** Verify that all requests have organization context

**Steps:**
1. Login as a user
2. Get JWT token
3. Make API request with valid token
4. Verify organizationId is injected into request

**Test Code:**
```javascript
// Login first
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@hospital-a.com',
    password: 'password123'
  })
});

const { token } = await loginResponse.json();

// Try to access patients
const patientsResponse = await fetch('http://localhost:3000/api/patients', {
  headers: { 'Authorization': `Bearer ${token}` }
});

console.log(await patientsResponse.json());
```

**Success Criteria:**
- ✅ Request succeeds with valid token
- ✅ Only returns patients from user's organization
- ✅ Response does not include patients from other organizations

---

### Test 3: Cross-Organization Access Prevention

**Objective:** Verify users cannot access data from other organizations

**Setup:**
1. Create two organizations (Org A and Org B)
2. Create Patient 1 in Org A
3. Create Patient 2 in Org B
4. Create User 1 in Org A
5. Create User 2 in Org B

**Test Scenarios:**

#### Scenario A: List Patients
```bash
# User 1 (Org A) gets all patients
curl -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer $USER1_TOKEN"
# Expected: Returns only Patient 1 (Org A)

# User 2 (Org B) gets all patients
curl -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer $USER2_TOKEN"
# Expected: Returns only Patient 2 (Org B)
```

#### Scenario B: Get Specific Patient
```bash
# User 1 (Org A) tries to access Patient 2 (Org B)
curl -X GET http://localhost:3000/api/patients/$PATIENT2_ID \
  -H "Authorization: Bearer $USER1_TOKEN"
# Expected: 404 Not Found - "Patient not found or access denied"

# User 2 (Org B) tries to access Patient 1 (Org A)
curl -X GET http://localhost:3000/api/patients/$PATIENT1_ID \
  -H "Authorization: Bearer $USER2_TOKEN"
# Expected: 404 Not Found - "Patient not found or access denied"
```

#### Scenario C: Update Patient
```bash
# User 1 (Org A) tries to update Patient 2 (Org B)
curl -X PUT http://localhost:3000/api/patients/$PATIENT2_ID \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Hacked"}'
# Expected: 404 Not Found - Cannot update

# User 2 (Org B) tries to update Patient 1 (Org A)
curl -X PUT http://localhost:3000/api/patients/$PATIENT1_ID \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Hacked"}'
# Expected: 404 Not Found - Cannot update
```

#### Scenario D: Delete Patient
```bash
# User 1 (Org A) tries to delete Patient 2 (Org B)
curl -X DELETE http://localhost:3000/api/patients/$PATIENT2_ID \
  -H "Authorization: Bearer $USER1_TOKEN"
# Expected: 404 Not Found - Cannot delete
```

**Success Criteria:**
- ✅ Users can only see their own organization's data
- ✅ Cross-org access returns 404 (not 403, to avoid info disclosure)
- ✅ No data leakage in error messages
- ✅ Audit log records access attempts

---

### Test 4: Statistics Isolation

**Objective:** Verify that statistics only include organization's data

**Test:**
```bash
# User 1 (Org A) gets patient statistics
curl -X GET http://localhost:3000/api/patients/stats \
  -H "Authorization: Bearer $USER1_TOKEN"
# Expected: Returns count for Org A only

# User 2 (Org B) gets patient statistics
curl -X GET http://localhost:3000/api/patients/stats \
  -H "Authorization: Bearer $USER2_TOKEN"
# Expected: Returns count for Org B only
```

**Verification:**
1. Manually count patients in each organization
2. Verify stats match the manual count
3. Verify total ≠ sum of all organizations (each user sees only their org)

**Success Criteria:**
- ✅ Each user sees only their organization's statistics
- ✅ Numbers do not include other organizations' data
- ✅ No information leakage through aggregates

---

### Test 5: Audit Logging

**Objective:** Verify security events are properly logged

**Test Procedure:**
1. Attempt cross-org access as User 1
2. Check audit logs for the event

```sql
-- Query audit logs
SELECT
  action,
  userId,
  organizationId,
  metadata,
  hipaaRelevant,
  createdAt
FROM audit_logs
WHERE
  action = 'CROSS_ORG_ACCESS_ATTEMPT'
ORDER BY createdAt DESC
LIMIT 10;
```

**Success Criteria:**
- ✅ Event is logged in `audit_logs` table
- ✅ `action` = 'CROSS_ORG_ACCESS_ATTEMPT'
- ✅ `hipaaRelevant` = true
- ✅ Includes userId, organizationId, IP address
- ✅ Metadata contains attempted resource

---

### Test 6: Create Operations with organizationId

**Objective:** Verify new records are created with correct organizationId

**Test:**
```bash
# User 1 (Org A) creates a new patient
curl -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "New",
    "lastName": "Patient",
    "email": "new.patient@example.com",
    "dateOfBirth": "1990-01-01"
  }'
# Expected: Patient created with organizationId = Org A
```

**Verification:**
```sql
-- Check the created patient
SELECT
  id,
  organizationId,
  firstName,
  lastName,
  email
FROM patients
WHERE email = 'new.patient@example.com';
```

**Success Criteria:**
- ✅ Patient is created successfully
- ✅ `organizationId` matches user's organization
- ✅ Other users cannot see this patient

---

### Test 7: Related Data Isolation

**Objective:** Verify related data (observations, enrollments) is also isolated

**Setup:**
1. Create Observation 1 for Patient 1 (Org A)
2. Create Observation 2 for Patient 2 (Org B)

**Test:**
```bash
# User 1 (Org A) gets all observations
curl -X GET http://localhost:3000/api/observations \
  -H "Authorization: Bearer $USER1_TOKEN"
# Expected: Returns only observations for Org A patients

# User 2 (Org B) gets all observations
curl -X GET http://localhost:3000/api/observations \
  -H "Authorization: Bearer $USER2_TOKEN"
# Expected: Returns only observations for Org B patients
```

**Success Criteria:**
- ✅ Observations are filtered by organizationId
- ✅ Cannot access observations from other organizations
- ✅ Related data maintains isolation

---

## 🤖 Automated Test Suite

### Running the Test Suite

```bash
# Run all multi-tenant security tests
npm test tests/integration/multi-tenant-isolation.test.js

# Run with coverage
npm test -- --coverage tests/integration/multi-tenant-isolation.test.js

# Run in watch mode during development
npm test -- --watch tests/integration/multi-tenant-isolation.test.js
```

### Expected Test Results

```
Multi-Tenant Data Isolation
  Patient Data Isolation
    ✓ User 1 can access patients from their organization (150ms)
    ✓ User 2 can access patients from their organization (120ms)
    ✓ User 1 cannot access patient from User 2 organization (80ms)
    ✓ User 2 cannot access patient from User 1 organization (75ms)
    ✓ User 1 cannot update patient from User 2 organization (90ms)
    ✓ User 1 cannot delete patient from User 2 organization (85ms)

  Statistics Isolation
    ✓ User 1 statistics only include their organization data (100ms)
    ✓ User 2 statistics only include their organization data (95ms)

  Authentication & Authorization
    ✓ Unauthenticated requests are rejected (50ms)
    ✓ Invalid token is rejected (60ms)

  Audit Logging
    ✓ Access denied events are logged (110ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        2.345 s
```

---

## 🔍 Database Verification Queries

### Verify Data Isolation

```sql
-- Check that all patients have organizationId
SELECT
  COUNT(*) as total_patients,
  COUNT(organizationId) as patients_with_org,
  COUNT(*) FILTER (WHERE organizationId IS NULL) as patients_without_org
FROM patients;
-- Expected: patients_without_org = 0

-- Check that all observations have organizationId
SELECT
  COUNT(*) as total_observations,
  COUNT(organizationId) as observations_with_org,
  COUNT(*) FILTER (WHERE organizationId IS NULL) as observations_without_org
FROM observations;
-- Expected: observations_without_org = 0

-- Check that all alerts have organizationId
SELECT
  COUNT(*) as total_alerts,
  COUNT(organizationId) as alerts_with_org,
  COUNT(*) FILTER (WHERE organizationId IS NULL) as alerts_without_org
FROM alerts;
-- Expected: alerts_without_org = 0
```

### Verify Organization Assignments

```sql
-- Count records per organization
SELECT
  o.name as organization_name,
  COUNT(DISTINCT p.id) as patients,
  COUNT(DISTINCT obs.id) as observations,
  COUNT(DISTINCT e.id) as enrollments
FROM organizations o
LEFT JOIN patients p ON p.organizationId = o.id
LEFT JOIN observations obs ON obs.organizationId = o.id
LEFT JOIN enrollments e ON e.organizationId = o.id
GROUP BY o.id, o.name
ORDER BY o.name;
```

### Check for Data Integrity Issues

```sql
-- Find patients without organization
SELECT * FROM patients WHERE organizationId IS NULL;
-- Expected: 0 rows

-- Find observations with mismatched organizationId
SELECT
  obs.id,
  obs.organizationId as obs_org,
  p.organizationId as patient_org
FROM observations obs
JOIN patients p ON obs.patientId = p.id
WHERE obs.organizationId != p.organizationId;
-- Expected: 0 rows

-- Find enrollments with mismatched organizationId
SELECT
  e.id,
  e.organizationId as enrollment_org,
  p.organizationId as patient_org
FROM enrollments e
JOIN patients p ON e.patientId = p.id
WHERE e.organizationId != p.organizationId;
-- Expected: 0 rows
```

---

## 📊 Performance Testing

### Load Test: Multi-Tenant Queries

```bash
# Install artillery for load testing
npm install --save-dev artillery

# Run load test
artillery run tests/load/multi-tenant-load.yml
```

**Load Test Configuration:**
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Ramp up load
    - duration: 60
      arrivalRate: 100
      name: Sustained high load

scenarios:
  - name: Multi-tenant patient access
    flow:
      - post:
          url: '/api/auth/login'
          json:
            email: '{{ $randomString() }}@hospital-a.com'
            password: 'password123'
          capture:
            - json: '$.token'
              as: 'token'
      - get:
          url: '/api/patients'
          headers:
            Authorization: 'Bearer {{ token }}'
```

**Success Criteria:**
- ✅ Response time < 200ms (p95)
- ✅ No errors under load
- ✅ No cross-org data leakage
- ✅ Database connections stable

---

## ✅ Final Validation Checklist

Before deploying to production, verify:

### Security
- [ ] All API endpoints require authentication
- [ ] All queries filter by organizationId
- [ ] Cross-org access returns 404
- [ ] Audit logging is working
- [ ] HIPAA events are flagged

### Data Integrity
- [ ] All existing records have organizationId
- [ ] New records auto-assign organizationId
- [ ] No orphaned records
- [ ] Related data maintains consistency

### Performance
- [ ] Response times acceptable (<200ms)
- [ ] Database indexes in place
- [ ] No N+1 query issues
- [ ] Connection pooling configured

### Monitoring
- [ ] Audit logs are being written
- [ ] Security alerts configured
- [ ] Dashboard showing key metrics
- [ ] Daily/weekly reports scheduled

### Compliance
- [ ] HIPAA audit requirements met
- [ ] 6-year log retention configured
- [ ] Incident response plan documented
- [ ] Staff training completed

---

## 🚨 Common Issues & Solutions

### Issue 1: "Organization context required" errors

**Symptom:** Users getting ORG_CONTEXT_MISSING errors

**Cause:** JWT token missing currentOrganization claim

**Solution:**
```javascript
// Ensure tokens include organization context
const token = await generateUserToken(user);
// This should include currentOrganization in the token payload
```

### Issue 2: Users seeing no data

**Symptom:** Users successfully authenticate but see empty result sets

**Cause:** User not assigned to an organization, or organizationId mismatch

**Solution:**
```sql
-- Check user's organization membership
SELECT * FROM user_organizations
WHERE userId = 'user-id-here';

-- Verify data exists in that organization
SELECT COUNT(*) FROM patients
WHERE organizationId = 'org-id-here';
```

### Issue 3: Audit logs not being created

**Symptom:** No entries in audit_logs table

**Cause:** Audit service not initialized or errors being swallowed

**Solution:**
1. Check audit service is properly imported
2. Verify database connection
3. Check for errors in logs
4. Test with manual audit log creation

---

## 📞 Support & Escalation

**If tests fail:**
1. Document the failure
2. Check recent code changes
3. Review audit logs
4. Escalate to security team

**Security Incident:**
1. Immediately lock affected accounts
2. Preserve all logs
3. Notify CISO/Legal/Compliance
4. Follow incident response playbook

---

## 🎓 Training Resources

**For Developers:**
- Multi-tenant architecture patterns
- HIPAA technical safeguards
- Secure coding practices
- Audit logging best practices

**For Operations:**
- Monitoring dashboard setup
- Alert response procedures
- Incident handling
- Compliance reporting

**For Security Team:**
- Penetration testing scenarios
- Vulnerability assessment
- Risk analysis
- Compliance auditing

---

This testing guide ensures your multi-tenant security implementation is working correctly and maintains HIPAA compliance.
