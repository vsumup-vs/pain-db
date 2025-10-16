# ClinMetrics Pro - Quick Start Developer Guide

> **Get productive in 5 minutes!**

---

## 🎯 Essential Resources

### 1. Complete Developer Reference (Start Here!)
📄 **File**: `docs/developer-reference.md`

**Contains**:
- ✅ All database tables with field definitions
- ✅ All API endpoints with examples
- ✅ Common code patterns (copy-paste ready!)
- ✅ Enum values reference
- ✅ Troubleshooting guide

**Open it now**:
```bash
cat docs/developer-reference.md
# or open in your IDE
```

### 2. Auto-Generated References
📄 **Schema**: `docs/schema-generated.md` - All models and fields
📄 **API**: `docs/api-endpoints-generated.md` - All endpoints

**Update them**:
```bash
npm run docs:generate
```

---

## 🔑 Key Concepts You Must Know

### 1. Multi-Tenant Architecture
**Every query MUST filter by organizationId!**

```javascript
// ✅ CORRECT
const patients = await prisma.patient.findMany({
  where: {
    organizationId: req.user.currentOrganization, // REQUIRED!
    isActive: true
  }
});

// ❌ WRONG - Security vulnerability!
const patients = await prisma.patient.findMany({
  where: { isActive: true } // Missing organizationId!
});
```

### 2. User ID vs Clinician ID
**Critical difference that causes most errors!**

```javascript
// USER - For authentication
const user = await prisma.user.findUnique({
  where: { id: req.user.userId }
});

// CLINICIAN - For clinical operations (TimeLog, Alert assignment)
const clinician = await prisma.clinician.findFirst({
  where: {
    email: req.user.email,
    organizationId: req.user.currentOrganization
  }
});

// ✅ CORRECT - Use clinician.id for TimeLog
const timeLog = await prisma.timeLog.create({
  data: {
    clinicianId: clinician.id, // Clinician ID!
    patientId: patient.id,
    activity: 'CALL_PATIENT',
    duration: 15
  }
});

// ❌ WRONG - User ID will fail!
const timeLog = await prisma.timeLog.create({
  data: {
    clinicianId: req.user.userId, // This is User ID, not Clinician ID!
    // ... rest
  }
});
```

### 3. Authentication Pattern
**All protected routes use requireAuth middleware**

```javascript
const { requireAuth, requirePermission } = require('../middleware/auth');

// Simple auth
router.get('/api/patients', requireAuth, patientController.getAllPatients);

// Auth + specific permission
router.post('/api/patients',
  requireAuth,
  requirePermission('PATIENT_CREATE'),
  patientController.createPatient
);
```

**Access user context in controllers**:
```javascript
function myController(req, res) {
  const userId = req.user.userId;
  const organizationId = req.user.currentOrganization;
  const permissions = req.user.permissions; // Array
  const role = req.user.role; // 'ORG_ADMIN', 'CLINICIAN', etc.
}
```

---

## 🚀 Common Tasks Cheat Sheet

### Create a Patient
```javascript
const patient = await prisma.patient.create({
  data: {
    organizationId: req.user.currentOrganization,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-01'),
    email: 'john@example.com'
  }
});
```

### Create an Alert
```javascript
const alert = await prisma.alert.create({
  data: {
    organizationId: req.user.currentOrganization,
    patientId: patient.id,
    ruleId: alertRule.id,
    severity: 'HIGH', // LOW, MEDIUM, HIGH, CRITICAL
    message: 'Blood pressure critically high',
    triggeredAt: new Date()
  }
});
```

### Resolve an Alert
```javascript
// Frontend API call
const response = await fetch(`/api/alerts/${alertId}/resolve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    resolutionNotes: 'Contacted patient, advised ER visit',
    actionTaken: 'REFER_SPECIALIST',
    timeSpentMinutes: 10,
    cptCode: '99453'
  })
});
```

### Find Clinician for TimeLog
```javascript
const clinician = await prisma.clinician.findFirst({
  where: {
    email: req.user.email,
    organizationId: req.user.currentOrganization
  }
});

if (!clinician) {
  // User is not a clinician - find any clinician
  const anyClinician = await prisma.clinician.findFirst({
    where: { organizationId: req.user.currentOrganization }
  });
}
```

### Create TimeLog Entry
```javascript
const timeLog = await prisma.timeLog.create({
  data: {
    patientId: patient.id,
    clinicianId: clinician.id, // Must be Clinician ID!
    activity: 'CALL_PATIENT',
    duration: 15,
    cptCode: '99453',
    billable: true,
    loggedAt: new Date()
  }
});
```

---

## 📊 Important Enum Values

### AlertStatus
```
PENDING → ACKNOWLEDGED → RESOLVED
DISMISSED (for false positives)
```

### AlertSeverity
```
LOW      - Review within 24 hours
MEDIUM   - Review within 4 hours
HIGH     - Review within 1 hour
CRITICAL - Immediate action
```

### TimeLogActivity
```
CALL_PATIENT
REVIEW_DATA
MEDICATION_ADJUSTMENT
DOCUMENTATION
CARE_PLAN_UPDATE
COORDINATION
EDUCATION
OTHER
```

### ObservationSource
```
MANUAL  - Entered by clinician/patient
DEVICE  - From connected device
API     - From external API
IMPORT  - Bulk imported
```

---

## 🔧 Development Commands

### Start Servers
```bash
npm run start:servers   # Start both backend + frontend
npm run dev             # Backend only (nodemon)
npm run dev:ui          # Frontend only
```

### Database
```bash
npx prisma migrate dev  # Create new migration
npx prisma studio       # Open database GUI
npm run seed:enhanced   # Seed with test data
```

### Testing
```bash
npm test                # Run backend tests
npm run test:e2e        # Run E2E tests
npm run test:all        # Run all tests
```

### Documentation
```bash
npm run docs:generate   # Regenerate all docs
npm run docs:schema     # Regenerate schema only
npm run docs:api        # Regenerate API only
```

---

## ⚠️ Common Errors & Fixes

### Foreign Key Constraint Violation (P2003)
```
Error: Foreign key constraint violated on 'time_logs_clinicianId_fkey'
```

**Cause**: Using User ID where Clinician ID required

**Fix**: Find clinician first, then use `clinician.id`
```javascript
const clinician = await prisma.clinician.findFirst({
  where: {
    email: req.user.email,
    organizationId: req.user.currentOrganization
  }
});
// Now use clinician.id (not req.user.userId!)
```

### Unique Constraint Violation (P2002)
```
Error: Unique constraint failed on 'patients_organizationId_medicalRecordNumber_key'
```

**Cause**: Trying to create duplicate record

**Fix**: Check for existing record first or use `upsert`
```javascript
const existing = await prisma.patient.findFirst({
  where: {
    organizationId,
    medicalRecordNumber: mrn
  }
});

if (existing) {
  return res.status(409).json({ error: 'Patient already exists' });
}
```

### Cross-Tenant Data Leak
```
User sees patients from other organizations
```

**Cause**: Missing `organizationId` filter in query

**Fix**: Always filter by organization
```javascript
where: {
  organizationId: req.user.currentOrganization, // Add this!
  // ... other conditions
}
```

---

## 📚 File Locations

### Backend
```
src/controllers/        - Business logic
src/routes/            - API route definitions
src/services/          - Shared services (JWT, notifications, etc.)
src/middleware/        - Auth, validation, error handling
prisma/schema.prisma   - Database schema
```

### Frontend
```
frontend/src/pages/    - Page components
frontend/src/components/ - Reusable components
frontend/src/contexts/ - React contexts (Auth, etc.)
frontend/src/services/ - API client
```

### Documentation
```
docs/developer-reference.md      - Complete reference (START HERE!)
docs/schema-generated.md         - Auto-generated schema
docs/api-endpoints-generated.md  - Auto-generated API docs
docs/README.md                   - Documentation guide
```

### Scripts
```
scripts/generate-schema-reference.js - Schema doc generator
scripts/generate-api-docs.js         - API doc generator
```

---

## 🎓 Learning Path

**Day 1**:
1. Read this file (you're here!)
2. Skim `docs/developer-reference.md`
3. Run `npm run start:servers` and explore frontend

**Day 2**:
1. Deep dive into "Common Code Patterns" in developer-reference.md
2. Review alertController.js to see patterns in action
3. Try creating a patient via API (curl or Postman)

**Day 3**:
1. Study Prisma schema (`prisma/schema.prisma`)
2. Explore relationships (Patient → Enrollment → CareProgram)
3. Write a simple controller function

**Week 1+**:
- Build features using documented patterns
- Refer to developer-reference.md whenever stuck
- Update docs when you discover new patterns!

---

## 💡 Pro Tips

1. **Keep docs open**: Pin `developer-reference.md` in your IDE
2. **Use Prisma Studio**: Visual database browser (`npx prisma studio`)
3. **Check logs**: `tail -f backend.log` for debugging
4. **Test queries**: Use Prisma Studio to test queries visually
5. **Regenerate docs**: Run `npm run docs:generate` after schema changes

---

## 🆘 When You're Stuck

1. **Check developer-reference.md** - Search for your issue
2. **Check generated docs** - Look up specific model or endpoint
3. **Check backend logs** - `tail -f backend.log`
4. **Check Prisma Studio** - Visual data exploration
5. **Ask team** - Share specific error message and code snippet

---

## ✅ Checklist for New Features

Before writing code:
- [ ] Check if similar pattern exists in developer-reference.md
- [ ] Verify model fields in schema-generated.md
- [ ] Check required permissions in api-endpoints-generated.md

While writing code:
- [ ] Always filter by `organizationId`
- [ ] Use Clinician ID (not User ID) for clinical operations
- [ ] Use `requireAuth` middleware for protected routes
- [ ] Handle errors with try-catch and appropriate HTTP status

After writing code:
- [ ] Test with multiple organizations (verify isolation)
- [ ] Update developer-reference.md if new pattern discovered
- [ ] Run `npm run docs:generate` if schema or routes changed
- [ ] Add code comments linking to docs

---

**🚀 You're ready to code! Keep docs handy and happy building!**
