# ClinMetrics Pro - Developer Reference Guide

> **Purpose**: Complete reference for database schema, API endpoints, controllers, and common patterns
> **Last Updated**: 2025-10-16
> **Version**: 1.0.0

---

## Table of Contents

1. [Database Schema Reference](#database-schema-reference)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [Controller Functions Reference](#controller-functions-reference)
4. [Common Code Patterns](#common-code-patterns)
5. [Enum Values Reference](#enum-values-reference)
6. [Field Validation Rules](#field-validation-rules)
7. [Relationship Mappings](#relationship-mappings)
8. [Authentication & Authorization](#authentication--authorization)

---

## Database Schema Reference

### Core Models

#### User
**Table**: `users`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| email | String | Yes | - | Unique, used for login |
| passwordHash | String | No | - | bcrypt hashed password |
| firstName | String | No | - | User's first name |
| lastName | String | No | - | User's last name |
| avatar | String | No | - | URL to profile picture |
| phone | String | No | - | Contact phone number |
| isPlatformAdmin | Boolean | Yes | false | Super admin flag |
| isActive | Boolean | Yes | true | Account status |
| emailVerified | Boolean | Yes | false | Email verification status |
| mfaEnabled | Boolean | Yes | false | Multi-factor auth enabled |
| mfaSecret | String | No | - | TOTP secret for MFA |
| backupCodes | String[] | No | [] | MFA backup codes |
| lastLoginAt | DateTime | No | - | Last successful login |
| passwordResetToken | String | No | - | Password reset token |
| passwordResetExpires | DateTime | No | - | Token expiration time |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `userOrganizations` → UserOrganization[] (one-to-many)
- `socialAccounts` → SocialAccount[] (one-to-many)
- `auditLogs` → AuditLog[] (one-to-many)

---

#### Organization
**Table**: `organizations`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| name | String | Yes | - | Organization name |
| type | OrganizationType | Yes | - | HOSPITAL, CLINIC, PRACTICE, etc. |
| domain | String | No | - | Unique domain identifier |
| email | String | No | - | Contact email |
| phone | String | No | - | Contact phone |
| address | String | No | - | Physical address |
| website | String | No | - | Website URL |
| isActive | Boolean | Yes | true | Organization status |
| settings | Json | No | {} | Organization-specific settings |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `userOrganizations` → UserOrganization[] (one-to-many)
- `patients` → Patient[] (one-to-many)
- `clinicians` → Clinician[] (one-to-many)
- `carePrograms` → CareProgram[] (one-to-many)
- `alerts` → Alert[] (one-to-many)

**Important**: All queries must filter by `organizationId` for multi-tenant isolation!

---

#### Patient
**Table**: `patients`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| organizationId | String | Yes | - | FK to Organization |
| medicalRecordNumber | String | No | - | MRN (unique per org) |
| firstName | String | Yes | - | Patient first name |
| lastName | String | Yes | - | Patient last name |
| dateOfBirth | DateTime | Yes | - | Date of birth |
| gender | Gender | No | - | MALE, FEMALE, OTHER, UNKNOWN |
| email | String | No | - | Contact email |
| phone | String | No | - | Contact phone |
| address | String | No | - | Home address |
| emergencyContact | Json | No | - | Emergency contact info |
| insuranceInfo | Json | No | - | Insurance details |
| isActive | Boolean | Yes | true | Patient status |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `organization` → Organization (many-to-one)
- `enrollments` → Enrollment[] (one-to-many)
- `observations` → Observation[] (one-to-many)
- `assessments` → Assessment[] (one-to-many)
- `medications` → PatientMedication[] (one-to-many)
- `alerts` → Alert[] (one-to-many)

**Unique Constraint**: `[organizationId, medicalRecordNumber]`

---

#### Clinician
**Table**: `clinicians`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| organizationId | String | Yes | - | FK to Organization |
| firstName | String | Yes | - | Clinician first name |
| lastName | String | Yes | - | Clinician last name |
| email | String | Yes | - | Work email |
| phone | String | No | - | Work phone |
| specialization | String | No | - | Medical specialization |
| licenseNumber | String | No | - | Professional license # |
| npiNumber | String | No | - | National Provider Identifier |
| credentials | String | No | - | MD, DO, NP, PA, RN, etc. |
| department | String | No | - | Hospital department |
| isActive | Boolean | Yes | true | Employment status |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `organization` → Organization (many-to-one)
- `enrollments` → Enrollment[] (one-to-many)
- `alerts` → Alert[] (one-to-many)
- `timeLogs` → TimeLog[] (one-to-many)

**Important**: Used for TimeLog billing - must be valid Clinician ID!

---

#### Alert
**Table**: `alerts`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| organizationId | String | Yes | - | FK to Organization |
| patientId | String | Yes | - | FK to Patient |
| ruleId | String | Yes | - | FK to AlertRule |
| clinicianId | String | No | - | FK to Clinician (assigned) |
| status | AlertStatus | Yes | PENDING | PENDING, ACKNOWLEDGED, RESOLVED, DISMISSED |
| severity | AlertSeverity | Yes | - | LOW, MEDIUM, HIGH, CRITICAL |
| priority | Int | Yes | 0 | Numeric priority (0-10) |
| message | String | Yes | - | Alert message text |
| details | Json | No | - | Additional alert context |
| riskScore | Float | No | - | Calculated risk score (0-10) |
| priorityRank | Int | No | - | Queue position |
| slaBreachTime | DateTime | No | - | When SLA will be breached |
| claimedById | String | No | - | FK to User (who claimed it) |
| claimedAt | DateTime | No | - | When alert was claimed |
| triggeredAt | DateTime | Yes | now() | When alert triggered |
| acknowledgedAt | DateTime | No | - | When acknowledged |
| resolvedAt | DateTime | No | - | When resolved |
| resolutionNotes | String | No | - | Clinician's notes |
| actionTaken | String | No | - | Action taken to resolve |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `organization` → Organization (many-to-one)
- `patient` → Patient (many-to-one)
- `rule` → AlertRule (many-to-one)
- `clinician` → Clinician (many-to-one, nullable)

**Index**: `[organizationId, status]` for fast triage queue queries

---

#### TimeLog
**Table**: `time_logs`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| patientId | String | Yes | - | FK to Patient |
| clinicianId | String | Yes | - | FK to Clinician (REQUIRED!) |
| activity | TimeLogActivity | Yes | - | CALL_PATIENT, REVIEW_DATA, etc. |
| duration | Int | Yes | - | Minutes spent |
| cptCode | String | No | - | CPT billing code |
| notes | String | No | - | Activity notes |
| billable | Boolean | Yes | false | Whether billable |
| loggedAt | DateTime | Yes | now() | When activity occurred |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `patient` → Patient (many-to-one)
- `clinician` → Clinician (many-to-one)

**Critical**: `clinicianId` MUST be a valid Clinician ID, not a User ID!

---

#### AssessmentTemplateItem
**Table**: `assessment_template_items`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| templateId | String | Yes | - | FK to AssessmentTemplate |
| metricDefinitionId | String | Yes | - | FK to MetricDefinition |
| displayOrder | Int | Yes | 0 | Display sequence |
| isRequired | Boolean | Yes | false | Required field flag |
| helpText | String | No | - | Help text for field |
| defaultValue | String | No | - | Default value |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `template` → AssessmentTemplate (many-to-one)
- `metricDefinition` → MetricDefinition (many-to-one)

**Unique Constraint**: `[templateId, metricDefinitionId]`

**Important**: Links metrics to assessment templates for data collection.

---

#### ConditionPreset
**Table**: `condition_presets`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| organizationId | String | No | - | FK to Organization (nullable for standardized) |
| sourcePresetId | String | No | - | FK to source preset (if cloned) |
| name | String | Yes | - | Preset name |
| description | String | No | - | Preset description |
| category | String | No | - | Category (e.g., "Pain Management") |
| isStandardized | Boolean | Yes | false | Whether preset is standardized |
| clinicalGuidelines | Json | No | - | Clinical guidelines JSON |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `organization` → Organization (many-to-one, nullable)
- `sourcePreset` → ConditionPreset (many-to-one, nullable)
- `clonedPresets` → ConditionPreset[] (one-to-many)
- `diagnoses` → ConditionPresetDiagnosis[] (one-to-many)
- `templates` → ConditionPresetTemplate[] (one-to-many)
- `alertRules` → ConditionPresetAlertRule[] (one-to-many)

**Important**: Standardized presets have `organizationId = null` and `isStandardized = true`.

---

#### ConditionPresetDiagnosis
**Table**: `condition_preset_diagnoses`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| conditionPresetId | String | Yes | - | FK to ConditionPreset |
| icd10 | String | Yes | - | ICD-10 code |
| snomed | String | No | - | SNOMED CT code |
| label | String | Yes | - | Diagnosis label/description |
| isPrimary | Boolean | Yes | false | Primary diagnosis flag |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `conditionPreset` → ConditionPreset (many-to-one)

**Unique Constraint**: `[conditionPresetId, icd10]`

**Important**: Links ICD-10 diagnoses to condition presets. Use `label` for description, NOT `description`.

---

#### ConditionPresetTemplate
**Table**: `condition_preset_templates`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| conditionPresetId | String | Yes | - | FK to ConditionPreset |
| templateId | String | Yes | - | FK to AssessmentTemplate |
| frequency | String | No | - | Assessment frequency (e.g., "7" for weekly) |
| isRequired | Boolean | Yes | false | Required assessment flag |
| displayOrder | Int | Yes | 0 | Display sequence |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `conditionPreset` → ConditionPreset (many-to-one)
- `template` → AssessmentTemplate (many-to-one)

**Unique Constraint**: `[conditionPresetId, templateId]`

**Important**: Links assessment templates to condition presets. Use `templateId`, NOT `assessmentTemplateId`. `frequency` is a String, not Int.

---

#### ConditionPresetAlertRule
**Table**: `condition_preset_alert_rules`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| conditionPresetId | String | Yes | - | FK to ConditionPreset |
| alertRuleId | String | Yes | - | FK to AlertRule |
| priority | Int | Yes | 0 | Rule priority (0-10) |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `conditionPreset` → ConditionPreset (many-to-one)
- `rule` → AlertRule (many-to-one)

**Unique Constraint**: `[conditionPresetId, alertRuleId]`

**Important**: Links alert rules to condition presets. Use `priority`, NOT `displayOrder`. Use `rule`, NOT `alertRule` in queries.

---

#### Observation
**Table**: `observations`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| patientId | String | Yes | - | FK to Patient |
| enrollmentId | String | No | - | FK to Enrollment (optional) |
| metricId | String | Yes | - | FK to MetricDefinition |
| value | Json | Yes | - | Observation value (flexible type) |
| unit | String | No | - | Unit of measurement |
| source | ObservationSource | Yes | MANUAL | MANUAL, DEVICE, API, IMPORT |
| sourceIdentifier | String | No | - | Device ID or API source |
| context | ObservationContext | No | - | WELLNESS, PROGRAM_ENROLLMENT, etc. |
| notes | String | No | - | Clinical notes |
| recordedAt | DateTime | Yes | now() | When observation recorded |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `patient` → Patient (many-to-one)
- `enrollment` → Enrollment (many-to-one, nullable)
- `metric` → MetricDefinition (many-to-one)

**Index**: `[patientId, metricId, recordedAt]` for time-series queries

---

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Controller | Function | Auth Required |
|--------|----------|------------|----------|---------------|
| POST | `/api/auth/register` | authController | register | No |
| POST | `/api/auth/login` | authController | login | No |
| POST | `/api/auth/refresh` | authController | refreshToken | No (refresh token) |
| GET | `/api/auth/me` | authController | getCurrentUser | Yes |
| POST | `/api/auth/logout` | authController | logout | Yes |
| POST | `/api/auth/forgot-password` | authController | forgotPassword | No |
| POST | `/api/auth/reset-password` | authController | resetPassword | No |
| POST | `/api/auth/verify-email` | authController | verifyEmail | No |

### User Endpoints

| Method | Endpoint | Controller | Function | Auth Required |
|--------|----------|------------|----------|---------------|
| GET | `/api/users` | userController | getAllUsers | Yes (Admin) |
| GET | `/api/users/:id` | userController | getUserById | Yes |
| PUT | `/api/users/:id` | userController | updateUser | Yes |
| DELETE | `/api/users/:id` | userController | deleteUser | Yes (Admin) |

### Organization Endpoints

| Method | Endpoint | Controller | Function | Auth Required |
|--------|----------|------------|----------|---------------|
| GET | `/api/organizations` | orgController | getAllOrganizations | Yes (Platform Admin) |
| GET | `/api/organizations/:id` | orgController | getOrganizationById | Yes |
| POST | `/api/organizations` | orgController | createOrganization | Yes (Platform Admin) |
| PUT | `/api/organizations/:id` | orgController | updateOrganization | Yes (Org Admin) |
| DELETE | `/api/organizations/:id` | orgController | deleteOrganization | Yes (Platform Admin) |

### Patient Endpoints

| Method | Endpoint | Controller | Function | Auth Required |
|--------|----------|------------|----------|---------------|
| GET | `/api/patients` | patientController | getAllPatients | Yes |
| GET | `/api/patients/:id` | patientController | getPatientById | Yes |
| POST | `/api/patients` | patientController | createPatient | Yes (PATIENT_CREATE) |
| PUT | `/api/patients/:id` | patientController | updatePatient | Yes (PATIENT_UPDATE) |
| DELETE | `/api/patients/:id` | patientController | deletePatient | Yes (PATIENT_DELETE) |
| GET | `/api/patients/stats` | patientController | getPatientStats | Yes |

### Alert Endpoints

| Method | Endpoint | Controller | Function | Auth Required |
|--------|----------|------------|----------|---------------|
| GET | `/api/alerts` | alertController | getAllAlerts | Yes |
| GET | `/api/alerts/:id` | alertController | getAlertById | Yes |
| POST | `/api/alerts` | alertController | createAlert | Yes (ALERT_CREATE) |
| PUT | `/api/alerts/:id` | alertController | updateAlert | Yes (ALERT_UPDATE) |
| POST | `/api/alerts/:id/acknowledge` | alertController | acknowledgeAlert | Yes |
| POST | `/api/alerts/:id/resolve` | alertController | resolveAlert | Yes |
| POST | `/api/alerts/:id/dismiss` | alertController | dismissAlert | Yes |
| POST | `/api/alerts/:id/assign` | alertController | assignAlert | Yes (ALERT_ASSIGN) |
| GET | `/api/alerts/recent` | alertController | getRecentAlerts | Yes |
| GET | `/api/alerts/stats` | alertController | getAlertStats | Yes |

**Important**: Alert resolution requires these request body fields:
```json
{
  "resolutionNotes": "string (required)",
  "actionTaken": "CALL_PATIENT | ADJUST_MEDICATION | SCHEDULE_APPOINTMENT | REFER_SPECIALIST | EDUCATION_PROVIDED | NO_ACTION",
  "timeSpentMinutes": "number (required for billing)",
  "cptCode": "string (optional, e.g., '99453', '99457')"
}
```

---

## Controller Functions Reference

### alertController.js

#### resolveAlert(req, res)
**Purpose**: Resolve an alert with clinical documentation and billing

**Request Parameters**:
- `id` (path param): Alert ID
- `resolutionNotes` (body, required): Clinical notes
- `actionTaken` (body, required): Action taken enum
- `timeSpentMinutes` (body, required): Time spent in minutes
- `cptCode` (body, optional): CPT billing code

**Process**:
1. Validates alert exists and user has access
2. Determines clinicianId for TimeLog:
   - Uses alert's assigned clinician if available
   - Falls back to finding any clinician in organization
   - Gracefully skips TimeLog if no clinician found
3. Updates alert status to RESOLVED
4. Creates TimeLog entry (if clinician available)
5. Sends notification to assigned clinician
6. Creates audit log entry
7. Returns updated alert + timeLog

**Response**:
```json
{
  "success": true,
  "alert": { /* updated alert object */ },
  "timeLog": { /* created timeLog or null */ }
}
```

**Error Handling**:
- 404: Alert not found
- 403: User lacks permission
- 400: Invalid request body
- 500: Database error

**File**: `/home/vsumup/pain-db/src/controllers/alertController.js:395-680`

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

### Middleware
- `/home/vsumup/pain-db/src/middleware/auth.js` - requireAuth, requirePermission
- `/home/vsumup/pain-db/src/middleware/validate.js` - Input validation
- `/home/vsumup/pain-db/src/middleware/errorHandler.js` - Global error handler

### Database
- `/home/vsumup/pain-db/prisma/schema.prisma` - Database schema
- `/home/vsumup/pain-db/prisma/migrations/` - Migration history
- `/home/vsumup/pain-db/src/services/db.js` - Prisma client instance

---

## Troubleshooting Common Errors

### Foreign Key Constraint Violation (P2003)
**Error**: `Foreign key constraint violated on the constraint: 'X_fkey'`

**Common Causes**:
1. Using User ID where Clinician ID is required (TimeLog, Alert)
2. Referencing non-existent organization/patient/clinician
3. Multi-tenant violation (referencing entity from different org)

**Solution**:
- Always verify foreign key references exist
- Use correct ID type (User vs Clinician)
- Ensure organizationId matches across related entities

### Unique Constraint Violation (P2002)
**Error**: `Unique constraint failed on the constraint: 'X_unique'`

**Common Causes**:
1. Duplicate email, MRN, or other unique field
2. Attempting to create duplicate userOrganization relationship

**Solution**:
- Check for existing records before creating
- Use `upsert` instead of `create` when appropriate
- Handle 409 Conflict responses in frontend

### Missing organizationId Filter
**Error**: User sees data from other organizations

**Solution**:
- ALWAYS filter by `organizationId: req.user.currentOrganization`
- Use organization-scoped queries in all controllers
- Test with multiple organizations to verify isolation

---

**Last Updated**: 2025-10-16
**Maintainer**: Development Team
**Review Frequency**: Update after each schema change or new feature addition
