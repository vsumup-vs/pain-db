# Database Schema Reference

> **Auto-generated** from Prisma schema
> Last Updated: 2025-10-16T13:52:06.132Z

## Models

### User

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| email | String | Yes | - | Unique |
| firstName | String? | No | - | - |
| lastName | String? | No | - | - |
| avatar | String? | No | - | - |
| phone | String? | No | - | - |
| isPlatformAdmin | Boolean | Yes | false | - |
| level | administrator | Yes | - | - |
| isActive | Boolean | Yes | true | - |
| mfaEnabled | Boolean | Yes | false | - |
| backupCodes | String[] | Yes | - | - |
| lastLoginAt | DateTime? | No | - | - |
| passwordResetToken | String? | No | - | Unique |
| Make | unique | Yes | - | - |
| passwordResetExpires | DateTime? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | socialAccounts | Yes | - | - |
| userOrganizations | UserOrganization[] | Yes | - | - |
| refreshTokens | RefreshToken[] | Yes | - | - |
| auditLogs | AuditLog[] | Yes | - | - |
| Add | indexes | Yes | - | - |
| for | common | Yes | - | - |

### Organization

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| name | String | Yes | - | Unique |
| Organization | names | Yes | - | - |
| should | be | Yes | - | - |
| unique | type | Yes | - | - |
| OrganizationType | email | Yes | - | - |
| Organization | emails | Yes | - | - |
| should | be | Yes | - | - |
| unique | phone | Yes | - | - |
| address | String? | No | - | - |
| website | String? | No | - | - |
| isActive | Boolean | Yes | true | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | userOrganizations | Yes | - | - |
| carePrograms | CareProgram[] | Yes | - | - |
| patients | Patient[] | Yes | - | - |
| clinicians | Clinician[] | Yes | - | - |
| enrollments | Enrollment[] | Yes | - | - |
| metricDefinitions | MetricDefinition[] | Yes | - | - |
| Custom | metrics | Yes | - | - |
| for | this | Yes | - | - |
| org | assessmentTemplates | Yes | - | - |
| Custom | templates | Yes | - | - |
| for | this | Yes | - | - |
| org | conditionPresets | Yes | - | - |
| Custom | condition | Yes | - | - |
| presets | for | Yes | - | - |
| this | org | Yes | - | - |
| alertRules | AlertRule[] | Yes | - | - |
| Custom | alert | Yes | - | - |
| rules | for | Yes | - | - |
| this | org | Yes | - | - |
| tasks | Task[] | Yes | - | - |
| encounterNotes | EncounterNote[] | Yes | - | - |
| Add | indexes | Yes | - | - |

### UserOrganization

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| userId | String | Yes | - | - |
| organizationId | String | Yes | - | - |
| role | UserRole | Yes | - | - |
| permissions | Permission[] | Yes | - | - |
| isActive | Boolean | Yes | true | - |
| Relationships | user | Yes | - | - |

### SocialAccount

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| userId | String | Yes | - | - |
| provider | SocialProvider | Yes | - | - |
| providerId | String | Yes | - | - |
| email | String? | No | - | - |
| accessToken | String? | No | - | - |
| refreshToken | String? | No | - | - |
| expiresAt | DateTime? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | user | Yes | - | - |

### RefreshToken

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| userId | String | Yes | - | - |
| token | String | Yes | - | Unique |
| Relationships | user | Yes | - | - |

### CareProgram

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String | Yes | - | - |
| name | String | Yes | - | - |
| type | ProgramType | Yes | - | - |
| description | String? | No | - | - |
| isActive | Boolean | Yes | true | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| enrollments | Enrollment[] | Yes | - | - |
| Unique | program | Yes | - | - |
| names | per | Yes | - | - |

### AuditLog

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| userId | String? | No | - | - |
| organizationId | String? | No | - | - |
| action | String | Yes | - | - |
| resource | String? | No | - | - |
| resourceId | String? | No | - | - |
| ipAddress | String? | No | - | - |
| userAgent | String? | No | - | - |
| oldValues | Json? | No | - | - |
| newValues | Json? | No | - | - |
| metadata | Json? | No | - | - |
| hipaaRelevant | Boolean | Yes | false | - |
| Relationships | user | Yes | - | - |
| Add | indexes | Yes | - | - |
| for | audit | Yes | - | - |

### Patient

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String | Yes | - | - |
| firstName | String | Yes | - | - |
| lastName | String | Yes | - | - |
| dateOfBirth | DateTime | Yes | - | - |
| gender | String? | No | - | - |
| email | String? | No | - | - |
| phone | String? | No | - | - |
| address | String? | No | - | - |
| emergencyContact | String? | No | - | - |
| medicalRecordNumber | String? | No | - | Unique |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| enrollments | Enrollment[] | Yes | - | - |
| observations | Observation[] | Yes | - | - |
| assessments | Assessment[] | Yes | - | - |
| timeLogs | TimeLog[] | Yes | - | - |
| alerts | Alert[] | Yes | - | - |
| patientMedications | PatientMedication[] | Yes | - | - |
| tasks | Task[] | Yes | - | - |
| encounterNotes | EncounterNote[] | Yes | - | - |
| assessmentReminders | AssessmentReminder[] | Yes | - | - |
| Add | composite | Yes | - | - |
| unique | constraint | Yes | - | - |
| and | indexes | Yes | - | - |
| Unique | email | Yes | - | - |
| per | organization | Yes | - | - |

### Clinician

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String | Yes | - | - |
| firstName | String | Yes | - | - |
| lastName | String | Yes | - | - |
| email | String | Yes | - | Unique |
| address | String? | No | - | - |
| licenseNumber | String? | No | - | Unique |
| License | numbers | Yes | - | - |
| should | be | Yes | - | - |
| unique | specialization | Yes | - | - |
| department | String? | No | - | - |
| credentials | String? | No | - | - |
| emergencyContact | String? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| enrollments | Enrollment[] | Yes | - | - |
| observations | Observation[] | Yes | - | - |
| assessments | Assessment[] | Yes | - | - |
| timeLogs | TimeLog[] | Yes | - | - |
| alerts | Alert[] | Yes | - | - |
| encounterNotes | EncounterNote[] | Yes | - | - |
| Add | indexes | Yes | - | - |

### Enrollment

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String | Yes | - | - |
| patientId | String | Yes | - | - |
| clinicianId | String | Yes | - | - |
| careProgramId | String | Yes | - | - |
| conditionPresetId | String? | No | - | - |
| status | EnrollmentStatus | Yes | PENDING | - |
| notes | String? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| assessmentReminders | AssessmentReminder[] | Yes | - | - |
| Prevent | duplicate | Yes | - | - |

### MetricDefinition

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String? | No | - | - |
| level | standardized | Yes | - | - |
| specific | custom | Yes | - | - |
| sourceMetricId | String? | No | - | - |
| Reference | to | Yes | - | - |
| original | standardized | Yes | - | - |
| if | cloned | Yes | - | - |
| key | String | Yes | - | - |
| No | longer | Yes | - | - |
| globally | unique | Yes | - | - |
| allow | per | Yes | - | - |
| org | duplicates | Yes | - | - |
| displayName | String | Yes | - | - |
| No | longer | Yes | - | - |
| globally | unique | Yes | - | - |
| description | String? | No | - | - |
| unit | String? | No | - | - |
| valueType | ValueType | Yes | - | - |
| category | String? | No | - | - |
| isStandardized | Boolean | Yes | false | - |
| True | for | Yes | - | - |
| platform | library | Yes | - | - |
| items | scaleMin | Yes | - | - |
| scaleMax | Decimal? | No | - | - |
| decimalPrecision | Int? | No | - | - |
| options | Json? | No | - | - |
| normalRange | Json? | No | - | - |
| standardCoding | Json? | No | - | - |
| validationInfo | Json? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| templateItems | AssessmentTemplateItem[] | Yes | - | - |
| Unique | per | Yes | - | - |
| or | globally | Yes | - | - |
| if | null | Yes | - | - |

### Observation

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String | Yes | - | - |
| patientId | String | Yes | - | - |
| clinicianId | String? | No | - | - |
| metricId | String | Yes | - | - |
| value | Json | Yes | - | - |
| unit | String? | No | - | - |
| source | SourceType | Yes | MANUAL | - |
| notes | String? | No | - | - |
| recordedAt | DateTime | Yes | now( | - |
| updatedAt | DateTime | Yes | - | - |
| Relationships | patient | Yes | - | - |
| Add | composite | Yes | - | - |
| unique | constraint | Yes | - | - |
| and | indexes | Yes | - | - |
| Prevent | duplicate | Yes | - | - |

### AssessmentTemplate

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String? | No | - | - |
| level | standardized | Yes | - | - |
| specific | custom | Yes | - | - |
| sourceTemplateId | String? | No | - | - |
| Reference | to | Yes | - | - |
| original | standardized | Yes | - | - |
| if | cloned | Yes | - | - |
| name | String | Yes | - | - |
| No | longer | Yes | - | - |
| globally | unique | Yes | - | - |
| description | String? | No | - | - |
| questions | Json | Yes | - | - |
| scoring | Json? | No | - | - |
| isStandardized | Boolean | Yes | false | - |
| True | for | Yes | - | - |
| platform | library | Yes | - | - |
| items | category | Yes | - | - |
| standardCoding | Json? | No | - | - |
| validationInfo | Json? | No | - | - |
| scoringInfo | Json? | No | - | - |
| copyrightInfo | String? | No | - | - |
| clinicalUse | String? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| conditionPresetTemplates | ConditionPresetTemplate[] | Yes | - | - |
| items | AssessmentTemplateItem[] | Yes | - | - |
| assessmentReminders | AssessmentReminder[] | Yes | - | - |
| Unique | per | Yes | - | - |
| or | globally | Yes | - | - |
| if | null | Yes | - | - |

### AssessmentTemplateItem

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| templateId | String | Yes | - | - |
| metricDefinitionId | String | Yes | - | - |
| displayOrder | Int | Yes | 0 | - |
| helpText | String? | No | - | - |
| defaultValue | String? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | template | Yes | - | - |

### Assessment

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| patientId | String | Yes | - | - |
| clinicianId | String? | No | - | - |
| templateId | String | Yes | - | - |
| responses | Json | Yes | - | - |
| score | Json? | No | - | - |
| completedAt | DateTime? | No | - | - |
| notes | String? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | patient | Yes | - | - |
| tasks | Task[] | Yes | - | - |
| Add | indexes | Yes | - | - |

### TimeLog

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| patientId | String | Yes | - | - |
| clinicianId | String | Yes | - | - |
| activity | String | Yes | - | - |
| duration | Int | Yes | - | - |
| cptCode | CPTCode? | No | - | - |
| notes | String? | No | - | - |
| billable | Boolean | Yes | true | - |
| tracking | fields | Yes | - | - |
| Phase | 1a | Yes | - | - |
| autoStarted | Boolean | Yes | false | - |
| True | if | Yes | - | - |
| timer | was | Yes | - | - |
| started | source | Yes | - | - |
| How | this | Yes | - | - |
| time | log | Yes | - | - |
| was | created | Yes | - | - |
| startedAt | DateTime? | No | - | - |
| When | timer | Yes | - | - |
| actually | started | Yes | - | - |
| for | active | Yes | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | patient | Yes | - | - |
| Add | indexes | Yes | - | - |

### ConditionPreset

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String? | No | - | - |
| level | standardized | Yes | - | - |
| specific | custom | Yes | - | - |
| sourcePresetId | String? | No | - | - |
| Reference | to | Yes | - | - |
| original | standardized | Yes | - | - |
| if | cloned | Yes | - | - |
| name | String | Yes | - | - |
| No | longer | Yes | - | - |
| globally | unique | Yes | - | - |
| allow | per | Yes | - | - |
| org | duplicates | Yes | - | - |
| defaultProtocolId | String? | No | - | - |
| description | String? | No | - | - |
| isActive | Boolean | Yes | true | - |
| True | for | Yes | - | - |
| platform | library | Yes | - | - |
| items | category | Yes | - | - |
| standardCoding | Json? | No | - | - |
| clinicalGuidelines | Json? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| templates | ConditionPresetTemplate[] | Yes | - | - |
| alertRules | ConditionPresetAlertRule[] | Yes | - | - |
| enrollments | Enrollment[] | Yes | - | - |
| Unique | per | Yes | - | - |
| or | globally | Yes | - | - |
| if | null | Yes | - | - |

### ConditionPresetDiagnosis

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| conditionPresetId | String | Yes | - | - |
| icd10 | String | Yes | - | - |
| snomed | String? | No | - | - |
| label | String | Yes | - | - |
| isPrimary | Boolean | Yes | false | - |
| Relationships | conditionPreset | Yes | - | - |
| Add | composite | Yes | - | - |
| unique | constraint | Yes | - | - |

### ConditionPresetTemplate

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| conditionPresetId | String | Yes | - | - |
| templateId | String | Yes | - | - |
| isRequired | Boolean | Yes | true | - |
| displayOrder | Int | Yes | 0 | - |
| Relationships | conditionPreset | Yes | - | - |

### AlertRule

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String? | No | - | - |
| level | standardized | Yes | - | - |
| specific | custom | Yes | - | - |
| sourceRuleId | String? | No | - | - |
| Reference | to | Yes | - | - |
| original | standardized | Yes | - | - |
| if | cloned | Yes | - | - |
| name | String | Yes | - | - |
| No | longer | Yes | - | - |
| globally | unique | Yes | - | - |
| allow | per | Yes | - | - |
| org | duplicates | Yes | - | - |
| description | String? | No | - | - |
| conditions | Json | Yes | - | - |
| actions | Json | Yes | - | - |
| isActive | Boolean | Yes | true | - |
| True | for | Yes | - | - |
| platform | library | Yes | - | - |
| items | category | Yes | - | - |
| severity | Severity? | No | - | - |
| priority | Int | Yes | 0 | - |
| clinicalEvidence | Json? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | organization | Yes | - | - |
| conditionPresets | ConditionPresetAlertRule[] | Yes | - | - |
| Unique | per | Yes | - | - |
| or | globally | Yes | - | - |
| if | null | Yes | - | - |

### ConditionPresetAlertRule

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| conditionPresetId | String | Yes | - | - |
| alertRuleId | String | Yes | - | - |
| isEnabled | Boolean | Yes | true | - |
| Relationships | conditionPreset | Yes | - | - |

### Alert

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| organizationId | String | Yes | - | - |
| ruleId | String | Yes | - | - |
| patientId | String | Yes | - | - |
| clinicianId | String? | No | - | - |
| severity | Severity | Yes | - | - |
| status | AlertStatus | Yes | PENDING | - |
| triggeredAt | DateTime | Yes | now( | - |
| resolvedAt | DateTime? | No | - | - |
| Triage | Queue | Yes | - | - |
| Phase | 1a | Yes | - | - |
| riskScore | Float? | No | - | - |
| 10 | risk | Yes | - | - |
| score | for | Yes | - | - |
| prioritization | priorityRank | Yes | - | - |
| Global | rank | Yes | - | - |
| across | all | Yes | - | - |
| highest | priority | Yes | - | - |
| slaBreachTime | DateTime? | No | - | - |
| When | SLA | Yes | - | - |
| will | be | Yes | - | - |
| breached | claimedById | Yes | - | - |
| User | who | Yes | - | - |
| claimed | this | Yes | - | - |
| alert | claimedAt | Yes | - | - |
| When | alert | Yes | - | - |
| was | claimed | Yes | - | - |
| Resolution | Documentation | Yes | - | - |
| Critical | Fix | Yes | - | - |
| resolvedById | String? | No | - | - |
| User | who | Yes | - | - |
| resolved | the | Yes | - | - |
| alert | resolutionNotes | Yes | - | - |
| Clinical | documentation | Yes | - | - |
| min | 10 | Yes | - | - |
| interventionType | InterventionType? | No | - | - |
| Type | of | Yes | - | - |
| intervention | performed | Yes | - | - |
| patientOutcome | PatientOutcome? | No | - | - |
| Patient | outcome | Yes | - | - |
| after | intervention | Yes | - | - |
| timeSpentMinutes | Int? | No | - | - |
| Time | spent | Yes | - | - |
| in | minutes | Yes | - | - |
| for | TimeLog | Yes | - | - |
| creation | and | Yes | - | - |
| Phase | 1b | Yes | - | - |
| snoozedUntil | DateTime? | No | - | - |
| When | snooze | Yes | - | - |
| alert | will | Yes | - | - |
| snoozedById | String? | No | - | - |
| User | who | Yes | - | - |
| snoozed | the | Yes | - | - |
| alert | snoozedAt | Yes | - | - |
| When | alert | Yes | - | - |
| was | snoozed | Yes | - | - |
| isSuppressed | Boolean | Yes | false | - |
| Active | suppression | Yes | - | - |
| flag | suppressReason | Yes | - | - |
| Documented | reason | Yes | - | - |
| for | suppression | Yes | - | - |
| suppressedById | String? | No | - | - |
| User | who | Yes | - | - |
| suppressed | the | Yes | - | - |
| alert | suppressedAt | Yes | - | - |
| When | alert | Yes | - | - |
| was | suppressed | Yes | - | - |
| suppressNotes | String? | No | - | - |
| Additional | notes | Yes | - | - |
| for | suppression | Yes | - | - |
| required | if | Yes | - | - |
| reason | is | Yes | - | - |
| Escalation | Tracking | Yes | - | - |
| Phase | 1b | Yes | - | - |
| isEscalated | Boolean | Yes | false | - |
| Alert | has | Yes | - | - |
| been | escalated | Yes | - | - |
| escalatedAt | DateTime? | No | - | - |
| When | alert | Yes | - | - |
| was | escalated | Yes | - | - |
| escalatedToId | String? | No | - | - |
| Supervisor | who | Yes | - | - |
| received | escalation | Yes | - | - |
| escalationLevel | Int? | No | - | - |
| Number | of | Yes | - | - |
| times | escalated | Yes | - | - |
| escalationReason | String? | No | - | - |
| Why | alert | Yes | - | - |
| was | escalated | Yes | - | - |
| SLA | breach | Yes | - | - |
| Manual | escalation | Yes | - | - |
| Relationships | rule | Yes | - | - |
| tasks | Task[] | Yes | - | - |
| encounterNotes | EncounterNote[] | Yes | - | - |
| Add | indexes | Yes | - | - |

### Drug

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| name | String | Yes | - | Unique |
| Drug | names | Yes | - | - |
| should | be | Yes | - | - |
| unique | genericName | Yes | - | - |
| brandName | String? | No | - | - |
| dosageForm | String? | No | - | - |
| strength | String? | No | - | - |
| manufacturer | String? | No | - | - |
| ndcNumber | String? | No | - | Unique |
| sideEffects | String[] | Yes | - | - |
| contraindications | String[] | Yes | - | - |
| interactions | String[] | Yes | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | patientMedications | Yes | - | - |
| Add | indexes | Yes | - | - |

### PatientMedication

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| patientId | String | Yes | - | - |
| drugId | String | Yes | - | - |
| prescribedBy | String? | No | - | - |
| dosage | String | Yes | - | - |
| frequency | String | Yes | - | - |
| route | String? | No | - | - |
| startDate | DateTime | Yes | - | - |
| endDate | DateTime? | No | - | - |
| isActive | Boolean | Yes | true | - |
| notes | String? | No | - | - |
| createdAt | DateTime | Yes | now( | - |
| Relationships | patient | Yes | - | - |
| medicationAdherence | MedicationAdherence[] | Yes | - | - |
| Add | composite | Yes | - | - |
| unique | constraint | Yes | - | - |
| and | indexes | Yes | - | - |
| Prevent | duplicate | Yes | - | - |

### MedicationAdherence

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| patientMedicationId | String | Yes | - | - |
| takenAt | DateTime | Yes | - | - |
| doseTaken | String? | No | - | - |
| adherenceScore | Float? | No | - | - |
| notes | String? | No | - | - |
| recordedAt | DateTime | Yes | now( | - |
| Relationships | patientMedication | Yes | - | - |
| Add | composite | Yes | - | - |
| unique | constraint | Yes | - | - |
| and | indexes | Yes | - | - |
| Prevent | duplicate | Yes | - | - |
| adherence | records | Yes | - | - |

### Task

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| taskType | TaskType | Yes | - | - |
| title | String | Yes | - | - |
| Text | status | Yes | - | - |
| priority | TaskPriority | Yes | MEDIUM | - |
| completionNotes | String? | No | - | - |
| updatedAt | DateTime | Yes | - | - |
| Assignment | assignedToId | Yes | - | - |
| String | assignedTo | Yes | - | - |
| assignedById | String | Yes | - | - |
| completedById | String? | No | - | - |
| Clinical | Context | Yes | - | - |
| patientId | String | Yes | - | - |
| alertId | String? | No | - | - |
| assessmentId | String? | No | - | - |
| Tenant | organizationId | Yes | - | - |
| String | organization | Yes | - | - |

### EncounterNote

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| encounterType | EncounterType | Yes | - | - |
| populated | fields | Yes | - | - |
| only | after | Yes | - | - |
| vitalsSnapshot | Json? | No | - | - |
| Snapshot | of | Yes | - | - |
| recent | vitals | Yes | - | - |
| at | time | Yes | - | - |
| of | creation | Yes | - | - |
| assessmentSummary | String? | No | - | - |
| Summary | of | Yes | - | - |
| recent | assessments | Yes | - | - |
| alertsSummary | String? | No | - | - |
| Summary | of | Yes | - | - |
| alerts | that | Yes | - | - |
| triggered | this | Yes | - | - |
| editable | fields | Yes | - | - |
| SOAP | format | Yes | - | - |
| subjective | String? | No | - | - |
| s | reported | Yes | - | - |
| concerns | objective | Yes | - | - |
| s | observations | Yes | - | - |
| and | vital | Yes | - | - |
| signs | assessment | Yes | - | - |
| Clinical | assessment | Yes | - | - |
| and | diagnosis | Yes | - | - |
| plan | String? | No | - | - |
| Treatment | plan | Yes | - | - |
| and | next | Yes | - | - |
| Additional | documentation | Yes | - | - |
| additionalNotes | String? | No | - | - |
| form | clinical | Yes | - | - |
| Attestation | workflow | Yes | - | - |
| isLocked | Boolean | Yes | false | - |
| Once | attested | Yes | - | - |
| note | cannot | Yes | - | - |
| be | edited | Yes | - | - |
| attestedById | String? | No | - | - |
| User | who | Yes | - | - |
| finalized | the | Yes | - | - |
| note | attestedAt | Yes | - | - |
| When | note | Yes | - | - |
| was | attested | Yes | - | - |
| Timestamps | createdAt | Yes | - | - |
| updatedAt | DateTime | Yes | - | - |
| Relationships | organizationId | Yes | - | - |
| String | organization | Yes | - | - |
| patientId | String | Yes | - | - |
| clinicianId | String | Yes | - | - |
| alertId | String? | No | - | - |
| link | to | Yes | - | - |
| specific | alert | Yes | - | - |
| that | triggered | Yes | - | - |
| encounter | alert | Yes | - | - |

### AssessmentReminder

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| id | String | Yes | - | Primary Key |
| Relationships | patientId | Yes | - | - |
| String | patient | Yes | - | - |
| templateId | String | Yes | - | - |
| enrollmentId | String | Yes | - | - |
| Reminder | details | Yes | - | - |
| reminderType | ReminderType | Yes | - | - |
| ESCALATION | sentAt | Yes | - | - |
| When | reminder | Yes | - | - |
| was | sent | Yes | - | - |
| dueAt | DateTime | Yes | - | - |
| When | assessment | Yes | - | - |
| was | due | Yes | - | - |
| Response | tracking | Yes | - | - |
| assessmentId | String? | No | - | - |
| If | patient | Yes | - | - |
| completed | assessment | Yes | - | - |
| in | response | Yes | - | - |
| completedAt | DateTime? | No | - | - |
| When | assessment | Yes | - | - |
| was | completed | Yes | - | - |
| Timestamps | createdAt | Yes | - | - |
| updatedAt | DateTime | Yes | - | - |

## Enums

### ValueType

```
numeric
text
boolean
categorical
ordinal
date
time
datetime
json
```

### Severity

```
LOW
MEDIUM
HIGH
CRITICAL
```

### SourceType

```
MANUAL
DEVICE
API
IMPORT
```

### EnrollmentStatus

```
PENDING
ACTIVE
INACTIVE
COMPLETED
WITHDRAWN
```

### AlertStatus

```
PENDING
ACKNOWLEDGED
RESOLVED
DISMISSED
```

### InterventionType

```
PHONE_CALL
VIDEO_CALL
IN_PERSON_VISIT
SECURE_MESSAGE
MEDICATION_ADJUSTMENT
REFERRAL
PATIENT_EDUCATION
CARE_COORDINATION
MEDICATION_RECONCILIATION
NO_PATIENT_CONTACT
```

### PatientOutcome

```
IMPROVED
STABLE
DECLINED
NO_CHANGE
PATIENT_UNREACHABLE
```

### CPTCode

```
CODE_99201
CODE_99202
CODE_99203
CODE_99204
CODE_99205
CODE_99211
CODE_99212
CODE_99213
CODE_99214
CODE_99215
CODE_99453
RTM:
Setup
and
patient
education
CODE_99454
RTM:
Device
supply
with
daily
recording/transmission
CODE_99457
RTM:
Interactive
communication
(20+
minutes)
CODE_99458
RTM:
Additional
20
minutes
CODE_99091
CCM:
Collection
and
interpretation
of
physiologic
data
```

### UserRole

```
ORG_ADMIN
CLINICIAN
NURSE
BILLING_ADMIN
PATIENT
CAREGIVER
RESEARCHER
```

### OrganizationType

```
HOSPITAL
CLINIC
PRACTICE
RESEARCH
INSURANCE
PHARMACY
```

### SocialProvider

```
GOOGLE
FACEBOOK
APPLE
MICROSOFT
```

### ProgramType

```
PAIN_MANAGEMENT
DIABETES
HYPERTENSION
MENTAL_HEALTH
CARDIAC_REHAB
GENERAL_WELLNESS
```

### ObservationContext

```
WELLNESS
PROGRAM_ENROLLMENT
CLINICAL_MONITORING
ROUTINE_FOLLOWUP
```

### TaskType

```
FOLLOW_UP_CALL
MED_REVIEW
ADHERENCE_CHECK
LAB_ORDER
REFERRAL
CUSTOM
```

### TaskStatus

```
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
```

### TaskPriority

```
LOW
MEDIUM
HIGH
URGENT
```

### EncounterType

```
RPM
RTM
CCM
TCM
GENERAL
```

### Permission

```
USER_CREATE
USER_READ
USER_UPDATE
USER_DELETE
USER_INVITE
USER_ROLE_ASSIGN
PATIENT_CREATE
PATIENT_READ
PATIENT_UPDATE
PATIENT_DELETE
PATIENT_ASSIGN
PATIENT_MEDICAL_RECORD_READ
CLINICIAN_CREATE
CLINICIAN_READ
CLINICIAN_UPDATE
CLINICIAN_DELETE
CLINICIAN_ASSIGN
ORG_CREATE
ORG_READ
ORG_UPDATE
ORG_DELETE
ORG_SETTINGS_MANAGE
ORG_USERS_MANAGE
ORG_BILLING_MANAGE
PROGRAM_CREATE
PROGRAM_READ
PROGRAM_UPDATE
PROGRAM_DELETE
PROGRAM_ASSIGN
ASSESSMENT_CREATE
ASSESSMENT_READ
ASSESSMENT_UPDATE
ASSESSMENT_DELETE
METRIC_CREATE
METRIC_READ
METRIC_UPDATE
METRIC_DELETE
OBSERVATION_CREATE
OBSERVATION_READ
OBSERVATION_UPDATE
OBSERVATION_DELETE
ALERT_CREATE
ALERT_READ
ALERT_UPDATE
ALERT_DELETE
ALERT_ACKNOWLEDGE
MEDICATION_CREATE
MEDICATION_READ
MEDICATION_UPDATE
MEDICATION_DELETE
MEDICATION_PRESCRIBE
TASK_CREATE
TASK_READ
TASK_UPDATE
TASK_DELETE
TASK_ASSIGN
REPORT_READ
REPORT_CREATE
ANALYTICS_READ
SYSTEM_ADMIN
AUDIT_READ
BILLING_READ
BILLING_MANAGE
COMPLIANCE_READ
```

### TimeLogSource

```
AUTO
MANUAL
ADJUSTED
```

### ReminderType

```
UPCOMING
Reminder
sent
before
due
date
OVERDUE
Reminder
sent
after
due
date
ESCALATION
Escalation
reminder
for
severely
overdue
```

### SuppressReason

```
FALSE_POSITIVE
Alert
triggered
incorrectly
PATIENT_CONTACTED
Patient
already
contacted,
issue
resolved
DUPLICATE_ALERT
Duplicate
of
existing
alert
PLANNED_INTERVENTION
Intervention
already
scheduled
PATIENT_HOSPITALIZED
Patient
in
hospital,
alert
not
actionable
DEVICE_MALFUNCTION
Device
error
causing
false
reading
DATA_ENTRY_ERROR
Manual
data
entry
mistake
CLINICAL_JUDGMENT
Clinician
determines
alert
not
actionable
OTHER
Other
reason
(requires
notes)
```

