# ClinMetrics Pro - Developer Reference Guide

> **Purpose**: Complete reference for database schema, API endpoints, controllers, and common patterns
> **Last Updated**: 2025-10-17
> **Version**: 1.2.0

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
9. [Utility Scripts](#utility-scripts)

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
- `timeLogs` → TimeLog[] (one-to-many)
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
| enrollmentId | String | No | - | FK to Enrollment (for billing attribution) |
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
- `enrollment` → Enrollment (many-to-one, nullable)

**Critical**: `clinicianId` MUST be a valid Clinician ID, not a User ID!
**Important**: `enrollmentId` links TimeLog to specific billing program for accurate CMS billing calculations.

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

#### Enrollment
**Table**: `enrollments`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| organizationId | String | Yes | - | FK to Organization |
| patientId | String | Yes | - | FK to Patient |
| clinicianId | String | Yes | - | FK to Clinician (assigned) |
| careProgramId | String | Yes | - | FK to CareProgram |
| billingProgramId | String | No | - | FK to BillingProgram (for CMS billing) |
| status | EnrollmentStatus | Yes | ACTIVE | PENDING, ACTIVE, INACTIVE, COMPLETED, WITHDRAWN |
| startDate | DateTime | Yes | - | Enrollment start date |
| endDate | DateTime | No | - | Enrollment end date |
| billingEligibility | Json | No | - | Billing eligibility details (insurance, conditions, consent) |
| notes | String | No | - | Enrollment notes |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `organization` → Organization (many-to-one)
- `patient` → Patient (many-to-one)
- `clinician` → Clinician (many-to-one)
- `careProgram` → CareProgram (many-to-one)
- `billingProgram` → BillingProgram (many-to-one, nullable)
- `observations` → Observation[] (one-to-many)
- `timeLogs` → TimeLog[] (one-to-many)

**Important**: `billingEligibility` JSON contains:
- `eligible`: boolean
- `insurance`: { type: string } (e.g., "Medicare Part B")
- `chronicConditions`: string[] (e.g., ["Hypertension (I10)", "Diabetes (E11)"])
- `consent`: boolean (optional)

---

#### BillingProgram
**Table**: `billing_programs`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| name | String | Yes | - | Program name (e.g., "CMS RPM 2025") |
| code | String | Yes | - | Unique program code (e.g., "CMS_RPM_2025") |
| description | String | No | - | Program description |
| programType | String | Yes | - | RPM, RTM, CCM, TCM, etc. |
| payer | String | No | - | Payer name (e.g., "CMS", "Medicare") |
| effectiveDate | DateTime | Yes | - | When program became effective |
| expirationDate | DateTime | No | - | When program expires (null = active) |
| eligibilityRules | Json | Yes | - | Structured eligibility requirements |
| isActive | Boolean | Yes | true | Program status |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `cptCodes` → CPTCode[] (one-to-many)
- `enrollments` → Enrollment[] (one-to-many)

**Unique Constraint**: `code`

**Important**: `eligibilityRules` JSON structure:
```json
[
  {
    "ruleType": "INSURANCE",
    "description": "Medicare Part B Coverage",
    "logic": { "payers": ["Medicare", "Medicare Advantage"], "plans": ["Part B"] }
  },
  {
    "ruleType": "DIAGNOSIS",
    "description": "Chronic Condition Requirement",
    "logic": { "operator": "MIN_COUNT", "minCount": 1 }
  },
  {
    "ruleType": "CONSENT",
    "description": "Informed Consent",
    "logic": { "consentTypes": ["TREATMENT", "BILLING"] }
  }
]
```

**Rule Types**: INSURANCE, DIAGNOSIS, CONSENT, CUSTOM
**Operators**: MIN_COUNT, CATEGORY_MATCH (for DIAGNOSIS rules)

---

#### CPTCode
**Table**: `cpt_codes`
**Primary Key**: `id` (String, cuid)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| id | String | Yes | cuid() | Primary key |
| billingProgramId | String | Yes | - | FK to BillingProgram |
| code | String | Yes | - | CPT code (e.g., "99453", "99457") |
| category | CPTCategory | Yes | - | SETUP, DATA_COLLECTION, CLINICAL_TIME, TREATMENT_TIME |
| description | String | Yes | - | Code description |
| requirements | Json | No | - | Billing requirements (days, minutes, frequency) |
| reimbursementAmount | Float | No | - | Typical reimbursement amount |
| billingFrequency | String | No | - | ONCE, MONTHLY, PER_OCCURRENCE |
| isActive | Boolean | Yes | true | Code status |
| createdAt | DateTime | Yes | now() | Record creation timestamp |
| updatedAt | DateTime | Yes | now() | Last update timestamp |

**Relationships**:
- `billingProgram` → BillingProgram (many-to-one)

**Unique Constraint**: `[billingProgramId, code]`

**Important**: `requirements` JSON structure:
```json
{
  "minDays": 16,        // For DATA_COLLECTION
  "minMinutes": 20,     // For CLINICAL_TIME, TREATMENT_TIME
  "maxPerMonth": 1,     // For SETUP
  "consecutiveDays": false,
  "notes": "Additional requirements"
}
```

**CPT Categories**:
- **SETUP**: Initial device setup (99453 for RPM, 98975 for RTM)
- **DATA_COLLECTION**: Device monitoring (99454 for RPM, 98976 for RTM) - requires 16+ days
- **CLINICAL_TIME**: Interactive clinical communication (99457 for RPM first 20 min, 99458 for additional 20 min)
- **TREATMENT_TIME**: Therapeutic interventions (98977 for RTM first 20 min, 98980 for RTM additional 20 min, 98981 for each add'l 20 min)

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

### Billing Endpoints

| Method | Endpoint | Controller | Function | Auth Required |
|--------|----------|------------|----------|---------------|
| GET | `/api/billing/readiness/:enrollmentId/:billingMonth` | billingController | getEnrollmentBillingReadiness | Yes |
| GET | `/api/billing/organization/:organizationId/:billingMonth` | billingController | getOrganizationBillingReadiness | Yes |
| GET | `/api/billing/summary/:organizationId/:billingMonth` | billingController | getOrganizationBillingSummary | Yes |
| GET | `/api/billing/export/:organizationId/:billingMonth` | billingController | exportBillingSummaryCSV | Yes |
| GET | `/api/billing/programs` | billingController | getBillingPrograms | Yes |
| GET | `/api/billing/programs/:code` | billingController | getBillingProgramByCode | Yes |
| GET | `/api/billing/programs/organization/:organizationId` | billingController | getOrganizationBillingPrograms | Yes |

**Important Notes**:
- **Date Format**: `billingMonth` must be in `YYYY-MM` format (e.g., `2025-10`)
- **Breaking Change**: Old API used `{ year: 2025, month: 10 }` query params - now uses path param `2025-10`
- **Enrollment-Centric**: All billing calculations now tied to specific enrollments, not patients

#### Single Enrollment Billing Readiness

**Endpoint**: `GET /api/billing/readiness/:enrollmentId/:billingMonth`

**Response Structure**:
```json
{
  "enrollmentId": "string",
  "patientId": "string",
  "patientName": "string",
  "billingMonth": "string",
  "eligible": boolean,
  "billingProgram": "string",
  "billingProgramCode": "string",
  "eligibilityRules": [
    {
      "ruleId": "string",
      "ruleName": "string",
      "ruleType": "INSURANCE | DIAGNOSIS | CONSENT | AGE | CUSTOM",
      "priority": number,
      "passed": boolean,
      "actualValue": any,
      "reason": "string"
    }
  ],
  "cptCodes": [
    {
      "code": "string",
      "description": "string",
      "category": "SETUP | DATA_COLLECTION | CLINICAL_TIME | TREATMENT_TIME",
      "eligible": boolean,
      "actualValue": number,
      "details": "string",
      "reimbursementRate": number,
      "currency": "string"
    }
  ],
  "totalReimbursement": "string",
  "currency": "string",
  "summary": {
    "totalCPTCodes": number,
    "eligibleCPTCodes": number,
    "setupCompleted": boolean,
    "dataCollectionMet": boolean,
    "clinicalTimeMet": boolean
  }
}
```

#### Organization Billing Summary

**Endpoint**: `GET /api/billing/summary/:organizationId/:billingMonth`

**Response Structure**:
```json
{
  "organizationId": "string",
  "billingMonth": "string",
  "summary": {
    "totalEnrollments": number,
    "eligibleEnrollments": number,
    "notEligibleEnrollments": number,
    "eligibilityRate": "string",
    "totalReimbursement": "string",
    "currency": "string"
  },
  "byProgram": {
    "CMS_RPM_2025": {
      "programName": "string",
      "count": number,
      "totalReimbursement": number,
      "patients": [...]
    },
    "CMS_CCM_2025": { ... }
  },
  "eligiblePatients": [...],
  "notEligiblePatients": [
    {
      "enrollmentId": "string",
      "patientId": "string",
      "patientName": "string",
      "reason": "string"
    }
  ]
}
```

#### CSV Export

**Endpoint**: `GET /api/billing/export/:organizationId/:billingMonth`

**Response**: CSV file download with headers:
- Patient Name
- Patient ID
- Billing Program
- Eligible (Yes/No)
- CPT Codes
- Total Reimbursement

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

### billingController.js

The billing controller provides comprehensive CMS billing readiness calculations using a **configurable, database-driven** approach. All billing criteria are read from the database, eliminating hardcoded thresholds.

#### Key Features:
- **Enrollment-Centric**: All billing tied to specific enrollments (not patients)
- **Date Format**: Uses `YYYY-MM` string format for billing months
- **Configurable**: Reads requirements from BillingProgram and CPTCode models
- **Version-Aware**: Checks effective dates to use correct billing program version
- **Multi-Program Support**: Handles RPM, RTM, CCM, and custom programs

#### getEnrollmentBillingReadiness(req, res)
**Purpose**: Calculate billing readiness for a single enrollment

**Request Parameters**:
- `enrollmentId` (path param): Enrollment ID
- `billingMonth` (path param): Billing month in YYYY-MM format

**Process**:
1. Validates billingMonth format (YYYY-MM regex)
2. Fetches enrollment with billing program and CPT codes
3. Calls `billingReadinessService.calculateBillingReadiness()`
4. Returns comprehensive eligibility details

**Response**: See "Single Enrollment Billing Readiness" in API Endpoints

**File**: `/home/vsumup/pain-db/src/controllers/billingController.js:15-95`

---

#### getOrganizationBillingSummary(req, res)
**Purpose**: Generate organization-wide billing summary with financial projections

**Request Parameters**:
- `organizationId` (path param): Organization ID
- `billingMonth` (path param): Billing month in YYYY-MM format

**Process**:
1. Validates billingMonth format
2. Calls `billingReadinessService.generateBillingSummary()`
3. Groups results by billing program (CMS_RPM_2025, CMS_RTM_2025, etc.)
4. Calculates total potential reimbursement
5. Returns eligible and not eligible patient lists

**Response**: See "Organization Billing Summary" in API Endpoints

**File**: `/home/vsumup/pain-db/src/controllers/billingController.js:138-178`

---

#### exportBillingSummaryCSV(req, res)
**Purpose**: Export billing summary to CSV format

**Request Parameters**:
- `organizationId` (path param): Organization ID
- `billingMonth` (path param): Billing month in YYYY-MM format

**Process**:
1. Fetches billing summary
2. Converts to CSV format with headers
3. Sets Content-Disposition header for download
4. Returns CSV file named `billing-summary-YYYY-MM.csv`

**CSV Columns**: Patient Name, Patient ID, Billing Program, Eligible, CPT Codes, Total Reimbursement

**File**: `/home/vsumup/pain-db/src/controllers/billingController.js:180-255`

---

## Services Reference

### billingReadinessService.js

The billing readiness service is the core calculation engine for CMS billing eligibility. It was **completely rewritten** (592 lines) to replace hardcoded billing logic with a configurable, database-driven system.

#### Key Architecture Changes:
- **Old Approach**: Hardcoded thresholds (`if (totalMinutes >= 20)`)
- **New Approach**: Reads criteria from database (`cptCode.criteria.threshold`)
- **Benefit**: CMS requirement changes don't require code deployment

#### calculateBillingReadiness(enrollmentId, billingMonth)
**Purpose**: Main entry point for calculating billing eligibility

**Parameters**:
- `enrollmentId` (string): Enrollment ID
- `billingMonth` (string): Billing month in YYYY-MM format

**Process**:
1. Fetches enrollment with billing program, CPT codes, and eligibility rules
2. Validates program effective dates
3. Evaluates all eligibility rules (INSURANCE, DIAGNOSIS, CONSENT, etc.)
4. Calculates eligibility for each CPT code:
   - `ONE_TIME_SETUP`: Setup codes (99453, 98975)
   - `DATA_DAYS`: Data collection requirements (99454, 98976)
   - `CLINICAL_TIME`: Time requirements (99457, 98977, 99490)
   - `CLINICAL_TIME_INCREMENTAL`: Additional time (99458, 99439)
5. Returns comprehensive billing readiness report

**Returns**: Object with `eligible`, `eligibilityRules`, `cptCodes`, `totalReimbursement`, `summary`

**File**: `/home/vsumup/pain-db/src/services/billingReadinessService.js:31-273`

---

#### evaluateEligibilityRules(enrollment, rules)
**Purpose**: Evaluate all billing eligibility rules

**Supported Rule Types**:
- **INSURANCE**: Checks patient insurance type matches required (e.g., "Medicare Part B")
- **DIAGNOSIS**: Validates chronic condition count (MIN_COUNT operator) or category (CATEGORY_MATCH)
- **CONSENT**: Verifies patient consent obtained
- **AGE**: Checks patient age requirements
- **CUSTOM**: Custom validation logic

**Returns**: Array of rule evaluation results with `passed`, `actualValue`, `reason`

**File**: `/home/vsumup/pain-db/src/services/billingReadinessService.js:275-355`

---

#### calculateUniqueDaysWithData(enrollmentId, startDate, endDate, calculationMethod)
**Purpose**: Count unique days with observations for data collection requirements

**Calculation Methods**:
- `unique_days_device_observations`: Only counts DEVICE-sourced observations (RPM)
- `unique_days_therapeutic_data`: Counts all clinical monitoring observations (RTM)

**Important**: Now filters by `enrollmentId` for accurate multi-program billing

**Returns**: Number of unique days with data

**File**: `/home/vsumup/pain-db/src/services/billingReadinessService.js:384-420`

---

#### calculateBillableTime(enrollmentId, startDate, endDate, calculationMethod)
**Purpose**: Sum billable time in minutes

**Calculation Methods**:
- `sum_billable_time_logs`: All billable time logs
- `sum_care_coordination_time`: Care coordination activities only

**Important**: Now filters by `enrollmentId` for accurate multi-program billing

**Returns**: Total minutes logged

**File**: `/home/vsumup/pain-db/src/services/billingReadinessService.js:431-465`

---

#### generateBillingSummary(organizationId, billingMonth)
**Purpose**: Generate organization-wide billing summary with financial projections

**Process**:
1. Fetches all active enrollments with billing programs
2. Calculates billing readiness for each enrollment
3. Groups results by billing program
4. Calculates total potential reimbursement
5. Separates eligible and not eligible patients

**Returns**: Object with `summary`, `byProgram`, `eligiblePatients`, `notEligiblePatients`

**File**: `/home/vsumup/pain-db/src/services/billingReadinessService.js:539-590`

---

### billingHelpers.js

Utility functions for billing-related operations.

#### findBillingEnrollment(patientId, organizationId, tx)
**Purpose**: Find active billing-enabled enrollment for a patient

**Selection Logic**:
1. Searches for active enrollments with `billingProgramId` not null
2. Filters by organization (multi-tenant isolation)
3. Checks endDate is null or in the future
4. Returns most recent enrollment (by startDate desc)
5. Returns `null` if no billing enrollment found (backward compatible)

**Use Cases**:
- Auto-populate `enrollmentId` when creating TimeLog
- Auto-populate `enrollmentId` when creating Observation
- Determine which program to bill for alert resolution

**Transaction-Safe**: Accepts Prisma transaction client as optional parameter

**Returns**: `enrollmentId` string or `null`

**File**: `/home/vsumup/pain-db/src/utils/billingHelpers.js:14-36`

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

## Utility Scripts

The `/home/vsumup/pain-db/scripts/` directory contains utility scripts for data management, testing, and maintenance.

### Data Cleanup Scripts

#### cleanup-duplicate-test-patients.js
**Purpose**: Remove duplicate test patients created during multiple seeding operations

**Usage**:
```bash
node scripts/cleanup-duplicate-test-patients.js
```

**What it does**:
1. Finds all patients with test lastNames: 'Eligible', 'NearReadings', 'NearTime', 'NotEligible'
2. For each lastName, keeps the newest patient (by `createdAt` timestamp)
3. Deletes all older duplicates along with related data:
   - Observations
   - Time logs
   - Assessments
   - Patient medications
   - Enrollments
   - Alerts
4. Confirms deletion with console output

**Important**: This script uses `orderBy: { createdAt: 'desc' }` to identify the newest patient to keep.

---

### Test Data Scripts

#### seed-billing-test-data.js
**Purpose**: Seed test patients with varying billing eligibility statuses for Billing Readiness Dashboard testing

**Usage**:
```bash
node scripts/seed-billing-test-data.js
```

**What it creates**:
- **Alice Eligible**: 18 days of observations, 25 minutes of clinical time → Fully eligible
- **Bob NearReadings**: 14 days of observations, 22 minutes of clinical time → Near-eligible (needs 2 more days)
- **Carol NearTime**: 17 days of observations, 18 minutes of clinical time → Near-eligible (needs 2 more minutes)
- **David NotEligible**: 8 days of observations, 10 minutes of clinical time → Not eligible (far from requirements)

**Dependencies**:
- Requires existing organization, clinician, metric definitions, and billing programs
- Uses `CMS_RPM_2025` and `CMS_RTM_2025` billing programs

---

#### delete-test-patients.js
**Purpose**: Delete all test patients by lastName

**Usage**:
```bash
node scripts/delete-test-patients.js
```

**What it does**:
- Finds and deletes patients with lastNames: 'Eligible', 'NearReadings', 'NearTime', 'NotEligible'
- Cascades deletion to related observations, time logs, assessments, medications, enrollments, alerts

---

### Diagnostic Scripts

#### check-carol-data.js
**Purpose**: Inspect Carol NearTime's enrollment data for billing readiness troubleshooting

**Usage**:
```bash
node scripts/check-carol-data.js
```

**What it displays**:
- Enrollment details (ID, billing program, eligibility)
- Observations count and unique dates for billing month
- Time logs count and total minutes
- CPT codes in billing program

**Use case**: Debugging why a test patient shows incorrect billing eligibility status

---

#### test-carol-billing.js
**Purpose**: Test billing readiness calculation for Carol NearTime enrollment

**Usage**:
```bash
node scripts/test-carol-billing.js
```

**What it does**:
- Finds Carol's enrollment
- Calls `billingReadinessService.calculateBillingReadiness(enrollmentId, '2025-10')`
- Displays full billing result JSON including:
  - Eligibility status
  - Eligibility rules pass/fail
  - CPT codes eligibility
  - Data collection and clinical time summary

**Use case**: Testing billing service logic without frontend or API layer

---

### Script Development Guidelines

When creating new utility scripts:

1. **Prisma Client Pattern**:
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Your logic here

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

main();
```

2. **Multi-Tenant Awareness**:
- Always filter by `organizationId` when querying patients, enrollments, etc.
- Document which organization the script expects to work with

3. **Relationship Deletion Order**:
When deleting entities, follow this order to avoid foreign key violations:
```javascript
// 1. Delete child records first
await prisma.observation.deleteMany({ where: { patientId } });
await prisma.timeLog.deleteMany({ where: { patientId } });
await prisma.assessment.deleteMany({ where: { patientId } });
await prisma.patientMedication.deleteMany({ where: { patientId } });
await prisma.enrollment.deleteMany({ where: { patientId } });
await prisma.alert.deleteMany({ where: { patientId } });

// 2. Delete parent record last
await prisma.patient.delete({ where: { id: patientId } });
```

4. **Error Handling**:
- Always wrap Prisma operations in try/catch
- Log errors with context
- Disconnect Prisma client in finally block or catch block

5. **Console Output**:
- Use emoji for visual clarity (✅ ❌ 📊 🌱 ⚠️)
- Provide clear progress indicators
- Summarize actions taken at the end

6. **Documentation**:
- Add purpose comment at top of file
- Document expected preconditions
- Explain what data will be created/modified/deleted

---

### Additional Utility Scripts

#### seed-triage-queue-test-data.js
**Purpose**: Seed test data specifically for triage queue functionality testing

**Usage**:
```bash
node scripts/seed-triage-queue-test-data.js
```

**What it creates**:
- Test patients with various alert severities and priorities
- Pre-configured alerts in different states (PENDING, ACKNOWLEDGED, RESOLVED)
- Risk scores and SLA breach times for queue testing

**Use case**: Testing prioritized triage queue, alert claiming, and risk stratification features

---

#### setup-test-data.js
**Purpose**: General-purpose test data seeding for development and testing environments

**Usage**:
```bash
node scripts/setup-test-data.js
```

**What it creates**:
- Sample patients, clinicians, and enrollments
- Observations and assessments
- Alert rules and triggered alerts
- Complete dataset for comprehensive testing

**Use case**: Initial setup of development environment with realistic test data

---

#### generate-api-docs.js
**Purpose**: Generate API documentation from route definitions

**Usage**:
```bash
node scripts/generate-api-docs.js
```

**What it does**:
- Scans route files in `src/routes/`
- Extracts endpoint definitions, methods, and parameters
- Generates structured API documentation

**Output**: API documentation in markdown or JSON format

**Use case**: Keeping API documentation in sync with route definitions

---

#### generate-schema-reference.js
**Purpose**: Generate database schema reference documentation from Prisma schema

**Usage**:
```bash
node scripts/generate-schema-reference.js
```

**What it does**:
- Parses `prisma/schema.prisma`
- Extracts model definitions, fields, relationships
- Generates comprehensive schema documentation

**Output**: Database schema reference documentation

**Use case**: Auto-generating developer documentation for database structure

---

### Archived Scripts

The following scripts have been moved to `archive/old-scripts/` as they were one-time setup or debugging tools:

**Setup Scripts** (completed their purpose):
- `add-billing-prerequisites-simple.js` - Added initial billing program data
- `add-billing-prerequisites.js` - Seeded comprehensive billing configuration
- `add-missing-assessment-templates.js` - Populated missing templates
- `link-alert-rules-to-presets.js` - Linked existing alert rules to condition presets
- `seed-enrollments-with-billing.js` - Created test enrollments with billing programs
- `create-test-billing-user.js` - Created test user for billing features

**Debugging Scripts** (issue-specific tools):
- `check-carol-data.js` - Inspected Carol test patient data
- `test-carol-billing.js` - Tested billing calculations for Carol
- `check-standardized-data.js` - Verified standardized condition presets
- `inspect-billing-api.js` - Debugging tool for billing API
- `inspect-billing-data.js` - Database inspection for billing data
- `create-alerts-via-api.js` - Alert creation testing tool
- `create-test-alerts.js` - Generated test alerts

**Removed**: `scripts/testing/` folder (5 outdated alert testing scripts superseded by main scripts)

---

**Last Updated**: 2025-10-17
**Maintainer**: Development Team
**Review Frequency**: Update after each schema change or new feature addition
