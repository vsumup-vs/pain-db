# Services & Controllers Reference

> **Module**: Backend service layer and controller functions
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

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

