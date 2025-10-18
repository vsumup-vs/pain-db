# Database Schema Reference

> **Module**: Database models, fields, and relationships
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

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

