# API Endpoints Reference

> **Module**: REST API documentation with request/response examples
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

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

