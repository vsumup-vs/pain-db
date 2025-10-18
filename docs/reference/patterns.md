# Code Patterns & Best Practices

> **Module**: Common patterns, validation, authentication, and code examples
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

---

## Common Code Patterns

### 1. Multi-Tenant Query Pattern

**Always** filter by organizationId to ensure data isolation:

```javascript
// ✅ CORRECT - Organization-scoped query
const patients = await prisma.patient.findMany({
  where: {
    organizationId: req.user.currentOrganization, // Critical!
    isActive: true
  }
});

// ❌ INCORRECT - Missing organization filter (security vulnerability!)
const patients = await prisma.patient.findMany({
  where: {
    isActive: true
  }
});
```

### 2. User vs Clinician ID Pattern

**Critical**: TimeLog, Alert assignment, and clinical activities require **Clinician ID**, not User ID!

```javascript
// ✅ CORRECT - Use Clinician ID
const timeLog = await prisma.timeLog.create({
  data: {
    patientId,
    clinicianId: clinician.id, // Clinician table primary key
    activity: 'CALL_PATIENT',
    duration: 15
  }
});

// ❌ INCORRECT - User ID will fail foreign key constraint
const timeLog = await prisma.timeLog.create({
  data: {
    patientId,
    clinicianId: req.user.userId, // This is User ID, not Clinician ID!
    activity: 'CALL_PATIENT',
    duration: 15
  }
});

// ✅ CORRECT - Find Clinician from User
const clinician = await prisma.clinician.findFirst({
  where: {
    email: req.user.email, // Match by email or other identifier
    organizationId: req.user.currentOrganization
  }
});
```

### 3. Prisma Transaction Pattern

Use transactions for multi-step operations to ensure atomicity:

```javascript
// ✅ CORRECT - Transaction ensures all-or-nothing
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Update alert
  const alert = await tx.alert.update({
    where: { id: alertId },
    data: { status: 'RESOLVED', resolvedAt: new Date() }
  });

  // Step 2: Create TimeLog
  const timeLog = await tx.timeLog.create({
    data: { /* ... */ }
  });

  // Step 3: Create audit log
  await tx.auditLog.create({
    data: { /* ... */ }
  });

  return { alert, timeLog };
});
```

### 4. Error Response Pattern

Consistent error handling across all controllers:

```javascript
try {
  // Business logic
} catch (error) {
  console.error('Error in functionName:', error);

  // Prisma known errors
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Unique constraint violation'
    });
  }

  if (error.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Foreign key constraint violation'
    });
  }

  // Generic error
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}
```

### 5. Authentication Middleware Pattern

All protected routes use `requireAuth` middleware:

```javascript
const { requireAuth } = require('../middleware/auth');

// Protect individual route
router.post('/api/alerts/:id/resolve', requireAuth, alertController.resolveAlert);

// Protect all routes in router
router.use(requireAuth);
router.get('/api/patients', patientController.getAllPatients);
```

**Access to user context**:
```javascript
function myController(req, res) {
  const userId = req.user.userId;
  const organizationId = req.user.currentOrganization;
  const userPermissions = req.user.permissions; // Array of permission strings
  const userRole = req.user.role; // ORG_ADMIN, CLINICIAN, etc.
}
```

---

## Enum Values Reference

### AlertStatus
```javascript
PENDING      // Alert triggered, not yet acknowledged
ACKNOWLEDGED // Clinician acknowledged, working on it
RESOLVED     // Alert resolved with documentation
DISMISSED    // Alert dismissed (false positive, etc.)
```

### AlertSeverity
```javascript
LOW       // Informational, review within 24 hours
MEDIUM    // Moderate concern, review within 4 hours
HIGH      // Urgent, review within 1 hour
CRITICAL  // Emergency, immediate action required
```

### TimeLogActivity
```javascript
CALL_PATIENT          // Phone call with patient
REVIEW_DATA           // Reviewing patient data
MEDICATION_ADJUSTMENT // Adjusting medication
CARE_PLAN_UPDATE      // Updating care plan
DOCUMENTATION         // Clinical documentation
COORDINATION          // Care coordination
EDUCATION             // Patient education
OTHER                 // Other clinical activity
```

### ObservationSource
```javascript
MANUAL  // Manually entered by clinician/patient
DEVICE  // From connected medical device
API     // From external API integration
IMPORT  // Bulk imported from file
```

### ObservationContext
```javascript
WELLNESS            // General wellness check
PROGRAM_ENROLLMENT  // Part of care program
CLINICAL_MONITORING // Active clinical monitoring
ROUTINE_FOLLOWUP    // Routine follow-up
ALERT_RESPONSE      // In response to alert
```

### OrganizationType
```javascript
HOSPITAL    // Hospital system
CLINIC      // Outpatient clinic
PRACTICE    // Private practice
RESEARCH    // Research institution
INSURANCE   // Insurance company
PHARMACY    // Pharmacy
```

### Gender
```javascript
MALE
FEMALE
OTHER
UNKNOWN
```

### UserRole (in UserOrganization)
```javascript
SUPER_ADMIN      // Platform-wide access
ORG_ADMIN        // Organization administrator
CLINICIAN        // Doctor, NP, PA
NURSE            // Registered nurse
CARE_COORDINATOR // Care coordination staff
BILLING_ADMIN    // Billing administrator
PATIENT          // Patient user
CAREGIVER        // Family member/caregiver
RESEARCHER       // Clinical researcher
```

---

## Field Validation Rules

### Email Fields
- Pattern: RFC 5322 compliant email
- Example: `user@example.com`
- Validation: `express-validator` with `isEmail()`

### Phone Fields
- Pattern: Various formats accepted (US/International)
- Example: `(555) 123-4567`, `+1-555-123-4567`
- Validation: `express-validator` with `isMobilePhone()`

### Date Fields
- Format: ISO 8601 date strings
- Example: `2025-10-16T12:30:00.000Z`
- Validation: `new Date()` constructor or `isISO8601()`

### CPT Codes
- Pattern: 5-digit numeric codes
- Examples: `99453` (RPM setup), `99457` (RPM clinical time)
- Validation: Regex `/^\d{5}$/`

### Medical Record Numbers (MRN)
- Pattern: Organization-specific
- Unique per organization
- Validation: Unique constraint `[organizationId, medicalRecordNumber]`

---

## Relationship Mappings

### User → Organization (Many-to-Many)
```javascript
User ←→ UserOrganization ←→ Organization
```
A user can belong to multiple organizations with different roles.

**Query Pattern**:
```javascript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userOrganizations: {
      where: { isActive: true },
      include: {
        organization: true
      }
    }
  }
});

// Access: user.userOrganizations[0].organization.name
// Role: user.userOrganizations[0].role
// Permissions: user.userOrganizations[0].permissions
```

### Patient → Enrollment → CareProgram
```javascript
Patient ←→ Enrollment ←→ CareProgram
```
A patient can be enrolled in multiple care programs.

**Query Pattern**:
```javascript
const patient = await prisma.patient.findUnique({
  where: { id: patientId },
  include: {
    enrollments: {
      where: { status: 'ACTIVE' },
      include: {
        careProgram: true,
        clinician: true
      }
    }
  }
});
```

### Alert → Patient, AlertRule, Clinician
```javascript
Alert → Patient (many-to-one)
Alert → AlertRule (many-to-one)
Alert → Clinician (many-to-one, nullable)
```

**Query Pattern**:
```javascript
const alert = await prisma.alert.findUnique({
  where: { id: alertId },
  include: {
    patient: true,
    rule: true,
    clinician: true // Can be null
  }
});
```

---

## Authentication & Authorization

### JWT Token Structure

**Access Token** (15 min expiration):
```json
{
  "userId": "cm...",
  "email": "user@example.com",
  "isPlatformAdmin": false,
  "organizations": [
    {
      "organizationId": "cm...",
      "name": "Test Clinic",
      "role": "CLINICIAN",
      "permissions": ["PATIENT_READ", "ALERT_UPDATE"]
    }
  ],
  "currentOrganization": "cm...",
  "role": "CLINICIAN",
  "permissions": ["PATIENT_READ", "ALERT_UPDATE"],
  "type": "access"
}
```

**Refresh Token** (7 days expiration):
```json
{
  "userId": "cm...",
  "type": "refresh",
  "jti": "unique-token-id"
}
```

### Permission Checks

**Backend** (middleware):
```javascript
const { requirePermission } = require('../middleware/auth');

router.post('/api/patients',
  requireAuth,
  requirePermission('PATIENT_CREATE'),
  patientController.createPatient
);
```

**Frontend** (React):
```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { hasPermission } = useAuth();

  return (
    <>
      {hasPermission('PATIENT_CREATE') && (
        <button>Create Patient</button>
      )}
    </>
  );
}
```

### Available Permissions

```javascript
// User Management
USER_READ, USER_CREATE, USER_UPDATE, USER_DELETE

// Patient Management
PATIENT_READ, PATIENT_CREATE, PATIENT_UPDATE, PATIENT_DELETE

// Clinician Management
CLINICIAN_READ, CLINICIAN_CREATE, CLINICIAN_UPDATE, CLINICIAN_DELETE

// Alert Management
ALERT_READ, ALERT_CREATE, ALERT_UPDATE, ALERT_DELETE, ALERT_ASSIGN

// Organization Management
ORG_SETTINGS_MANAGE, ORG_USERS_MANAGE, ORG_BILLING_MANAGE

// Billing & Reporting
BILLING_VIEW, BILLING_MANAGE, REPORTS_VIEW, REPORTS_EXPORT
```

---

## Quick Reference Cheatsheet

### Creating a Patient
```javascript
const patient = await prisma.patient.create({
  data: {
    organizationId: req.user.currentOrganization, // REQUIRED
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-01'),
    email: 'john.doe@example.com',
    phone: '555-123-4567'
  }
});
```

### Creating an Alert
```javascript
const alert = await prisma.alert.create({
  data: {
    organizationId: req.user.currentOrganization, // REQUIRED
    patientId: patient.id,
    ruleId: alertRule.id,
    severity: 'HIGH',
    priority: 8,
    message: 'Blood pressure critically high: 180/120',
    details: { systolic: 180, diastolic: 120 },
    triggeredAt: new Date()
  }
});
```

### Resolving an Alert
```javascript
// Frontend request
const response = await fetch(`/api/alerts/${alertId}/resolve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    resolutionNotes: 'Contacted patient, advised to go to ER',
    actionTaken: 'REFER_SPECIALIST',
    timeSpentMinutes: 10,
    cptCode: '99453'
  })
});
```

### Finding a Clinician for TimeLog
```javascript
// Find clinician by email
const clinician = await prisma.clinician.findFirst({
  where: {
    email: req.user.email,
    organizationId: req.user.currentOrganization
  }
});

// Or find any clinician in organization
const clinician = await prisma.clinician.findFirst({
  where: {
    organizationId: req.user.currentOrganization,
    isActive: true
  }
});

// Use clinician.id for TimeLog creation
```

### Creating a TimeLog
```javascript
const timeLog = await prisma.timeLog.create({
  data: {
    patientId: patient.id,
    clinicianId: clinician.id, // MUST be Clinician ID, not User ID!
    activity: 'CALL_PATIENT',
    duration: 15, // minutes
    cptCode: '99453',
    notes: 'Discussed medication adherence',
    billable: true,
    loggedAt: new Date()
  }
});
```

---

## File Locations Reference

### Controllers
- `/home/vsumup/pain-db/src/controllers/authController.js` - Authentication
- `/home/vsumup/pain-db/src/controllers/userController.js` - User management
- `/home/vsumup/pain-db/src/controllers/patientController.js` - Patient CRUD
- `/home/vsumup/pain-db/src/controllers/clinicianController.js` - Clinician CRUD
- `/home/vsumup/pain-db/src/controllers/alertController.js` - Alert management
- `/home/vsumup/pain-db/src/controllers/observationController.js` - Observations
- `/home/vsumup/pain-db/src/controllers/assessmentController.js` - Assessments
- `/home/vsumup/pain-db/src/controllers/enrollmentController.js` - Enrollments

### Services
- `/home/vsumup/pain-db/src/services/jwtService.js` - JWT token generation/validation
- `/home/vsumup/pain-db/src/services/notificationService.js` - Email/SMS notifications
- `/home/vsumup/pain-db/src/services/sseService.js` - Server-Sent Events for real-time updates
- `/home/vsumup/pain-db/src/services/alertEvaluationService.js` - Alert rule evaluation
- `/home/vsumup/pain-db/src/services/slaMonitorService.js` - SLA breach monitoring
- `/home/vsumup/pain-db/src/services/billingReadinessService.js` - CMS billing eligibility calculation

### Middleware
- `/home/vsumup/pain-db/src/middleware/auth.js` - requireAuth, requirePermission
- `/home/vsumup/pain-db/src/middleware/validate.js` - Input validation
- `/home/vsumup/pain-db/src/middleware/errorHandler.js` - Global error handler

### Database
- `/home/vsumup/pain-db/prisma/schema.prisma` - Database schema
- `/home/vsumup/pain-db/prisma/migrations/` - Migration history
- `/home/vsumup/pain-db/src/services/db.js` - Prisma client instance

---

