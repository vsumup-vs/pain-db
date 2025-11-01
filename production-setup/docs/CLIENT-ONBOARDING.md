# Client Organization Onboarding Guide

> **Audience**: Organization Administrators (Healthcare Provider Staff)
> **Last Updated**: 2025-11-01
> **Version**: 1.0.0

---

## Overview

This guide walks you through setting up your healthcare organization on VitalEdge after the Platform Admin has created your organization account.

**Your Organization Type**: HOSPITAL, CLINIC, PRACTICE, RESEARCH, INSURANCE, or PHARMACY

**Your Role**: Organization Admin

**Your Goal**: Configure organization settings, create care programs, onboard clinicians, and start patient care operations.

---

## Prerequisites

Before starting, you should have received:

✅ Email invitation from Platform Admin
✅ Temporary password
✅ Organization name and details
✅ Link to VitalEdge platform

---

## Step 1: First Login & Account Setup

### Login
1. Navigate to VitalEdge platform URL (e.g., https://app.vitaledge.com)
2. Enter credentials:
   - **Email**: Your assigned email (e.g., admin@abcclinic.com)
   - **Password**: Temporary password from invitation
3. Click **"Login"**

### Change Password
1. You'll be prompted to change password immediately
2. Enter new password (8+ characters, uppercase, lowercase, number, special character)
3. Click **"Update Password"**

### Setup Multi-Factor Authentication (Optional but Recommended)
1. Navigate to **Profile** → **Security**
2. Click **"Enable MFA"**
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter 6-digit code to verify
5. Save backup codes in secure location

---

## Step 2: Configure Organization Settings

### Basic Information
1. Navigate to **Settings** → **Organization**
2. Verify/Update:
   ```
   Organization Name: ABC Clinic
   Type: CLINIC
   Email: admin@abcclinic.com
   Phone: +1-555-123-4567
   Address: 123 Medical Plaza, San Francisco, CA 94102
   Website: https://abcclinic.com
   ```
3. Click **"Save"**

### Billing Configuration
1. Navigate to **Settings** → **Billing**
2. Configure CPT codes your organization will use:
   - RPM: 99453, 99454, 99457, 99458
   - RTM: 98975, 98976, 98977, 98980, 98981
   - CCM: 99490, 99491, 99439
3. Set timezone (for billing month calculations)
4. Click **"Save"**

### Branding (Optional)
1. Navigate to **Settings** → **Branding**
2. Upload organization logo
3. Set primary color
4. Click **"Save"**

---

## Step 3: Create Care Programs

Care programs define how you monitor and bill for patient care. VitalEdge supports:

- **RPM** (Remote Patient Monitoring) - Device-based vital sign monitoring
- **RTM** (Remote Therapeutic Monitoring) - Therapeutic exercise/adherence tracking
- **CCM** (Chronic Care Management) - Comprehensive chronic disease management
- **General Wellness** - Non-billable wellness programs

### Create RPM Program

1. Navigate to **Programs** → **Create Program**
2. Fill in details:
   ```
   Name: Remote Patient Monitoring - Diabetes
   Type: RPM
   Description: RPM program for diabetic patients with glucometer
   Billing Program: CMS_RPM_2025 (select from dropdown)
   Required Metrics: blood_glucose, weight, blood_pressure
   Assessment Frequency: Weekly
   ```
3. Configure billing requirements:
   ```
   Setup Time: 20 minutes (CPT 99453)
   Device Readings: 16+ days per month (CPT 99454)
   Clinical Time: 20+ minutes per month (CPT 99457)
   ```
4. Click **"Create"**

### Create RTM Program

1. Navigate to **Programs** → **Create Program**
2. Fill in details:
   ```
   Name: Remote Therapeutic Monitoring - Pain Management
   Type: RTM
   Description: RTM program for chronic pain with daily symptom tracking
   Billing Program: CMS_RTM_2025
   Required Metrics: pain_level, pain_location, mood, sleep_quality
   Assessment Frequency: Daily
   ```
3. Configure billing requirements:
   ```
   Setup Time: 20 minutes (CPT 98975)
   Data Submissions: 16+ days per month (CPT 98976)
   Clinical Time: 20+ minutes per month (CPT 98977)
   ```
4. Click **"Create"**

### Create CCM Program

1. Navigate to **Programs** → **Create Program**
2. Fill in details:
   ```
   Name: Chronic Care Management - Hypertension
   Type: CCM
   Description: CCM program for hypertension with monthly clinician touchpoints
   Billing Program: CMS_CCM_2025
   Required Metrics: systolic_bp, diastolic_bp, weight
   Assessment Frequency: Weekly
   ```
3. Configure billing requirements:
   ```
   Clinical Time: 20+ minutes per month (CPT 99490)
   Complex Clinical Time: 30+ minutes for complex patients (CPT 99491)
   ```
4. Click **"Create"**

---

## Step 4: Link Condition Presets to Programs

VitalEdge provides a standardized library of condition presets. You can:
- **Clone** standardized presets (recommended)
- **Create custom** presets for your organization

### Clone Standardized Preset

1. Navigate to **Library** → **Condition Presets**
2. Find preset to clone (e.g., "Type 2 Diabetes Management")
3. Click **"Clone"**
4. Customize for your organization:
   ```
   Name: Type 2 Diabetes Management (ABC Clinic)
   Description: Customized for ABC Clinic workflow
   ICD-10 Codes: E11.9 (Type 2 Diabetes)
   Assessment Templates: Diabetes Distress Scale, Daily Symptom Tracker
   Alert Rules: Hypoglycemia (<70 mg/dL), Hyperglycemia (>250 mg/dL)
   ```
5. Adjust alert rule thresholds (e.g., lower BP threshold for elderly patients)
6. Click **"Save"**

### Link Preset to Program

1. Navigate to **Programs** → Select program (e.g., "RPM - Diabetes")
2. Click **"Edit"**
3. Select **Condition Preset**: Type 2 Diabetes Management (ABC Clinic)
4. Click **"Save"**

**Result**: Patients enrolled in this program will automatically:
- Use metrics defined in preset
- Trigger alerts based on preset rules
- Receive assessments from preset templates

---

## Step 5: Onboard Clinicians

### Create Clinician Accounts

1. Navigate to **Clinicians** → **Create Clinician**
2. Fill in details:
   ```
   First Name: Sarah
   Last Name: Johnson
   Email: sarah.johnson@abcclinic.com
   NPI Number: 1234567890
   Specialization: Family Medicine
   License Number: CA-FM-123456
   License State: California
   Department: Primary Care
   Phone: +1-555-234-5678
   ```
3. Click **"Create"**

### Create User Account for Clinician

1. Navigate to **Users** → **Create User**
2. Fill in details:
   ```
   Email: sarah.johnson@abcclinic.com (same as clinician email)
   First Name: Sarah
   Last Name: Johnson
   Role: CLINICIAN
   ```
3. Assign permissions:
   - PATIENT_READ, PATIENT_UPDATE
   - OBSERVATION_CREATE, OBSERVATION_READ
   - ALERT_READ, ALERT_UPDATE
   - TASK_CREATE, TASK_READ, TASK_UPDATE
   - ASSESSMENT_CREATE, ASSESSMENT_READ
4. Click **"Create & Send Invite"**

**Clinician will receive**:
- Email invitation
- Temporary password
- Link to set up account

---

## Step 6: Create Patients

### Manual Patient Creation

1. Navigate to **Patients** → **Create Patient**
2. Fill in demographics:
   ```
   First Name: John
   Last Name: Doe
   Date of Birth: 1965-03-15
   Gender: Male
   Medical Record Number: MRN-12345
   Email: john.doe@email.com
   Phone: +1-555-345-6789
   Address: 456 Patient St, San Francisco, CA 94103
   ```
3. Fill in insurance information:
   ```
   Insurance Type: Medicare Part B
   Member ID: 1A2B3C4D5E
   Group Number: 12345
   ```
4. Fill in medical information:
   ```
   Primary Diagnosis: E11.9 (Type 2 Diabetes)
   Comorbidities: I10 (Hypertension), E78.5 (Hyperlipidemia)
   Current Medications: Metformin 500mg BID, Lisinopril 10mg QD
   Allergies: Penicillin
   ```
5. Fill in emergency contact:
   ```
   Name: Jane Doe
   Relationship: Spouse
   Phone: +1-555-345-6780
   ```
6. Click **"Create"**

### Bulk Patient Import (CSV)

1. Navigate to **Patients** → **Import CSV**
2. Download template CSV
3. Fill in patient data
4. Upload CSV file
5. Review import preview
6. Click **"Import"**

**CSV Format**:
```csv
firstName,lastName,dateOfBirth,gender,medicalRecordNumber,email,phone,insuranceType,memberId,primaryDiagnosis
John,Doe,1965-03-15,Male,MRN-12345,john.doe@email.com,+1-555-345-6789,Medicare Part B,1A2B3C4D5E,E11.9
```

---

## Step 7: Enroll Patients in Programs

### Enroll Individual Patient

1. Navigate to **Patients** → Select patient (e.g., John Doe)
2. Click **"Enrollments"** tab
3. Click **"Create Enrollment"**
4. Fill in details:
   ```
   Care Program: RPM - Diabetes (select from dropdown)
   Clinician: Dr. Sarah Johnson (primary care provider)
   Condition Preset: Type 2 Diabetes Management (ABC Clinic)
   Start Date: 2025-11-01
   Status: ACTIVE
   ```
5. Verify billing eligibility:
   ```
   ✅ Patient has Medicare Part B coverage
   ✅ Patient has chronic condition (Type 2 Diabetes)
   ✅ Patient consent obtained for remote monitoring
   ```
6. Click **"Create"**

### Bulk Enrollment (CSV)

1. Navigate to **Enrollments** → **Import CSV**
2. Download template CSV
3. Fill in enrollment data
4. Upload CSV file
5. Review import preview
6. Click **"Import"**

**CSV Format**:
```csv
patientMRN,programName,clinicianEmail,conditionPresetName,startDate,status
MRN-12345,RPM - Diabetes,sarah.johnson@abcclinic.com,Type 2 Diabetes Management (ABC Clinic),2025-11-01,ACTIVE
```

---

## Step 8: Patient Monitoring & Alert Management

### Start Monitoring

Once patients are enrolled:

1. **Device Setup** (for RPM/RTM):
   - Provision devices (glucometers, BP monitors, etc.)
   - Train patients on device use
   - Log setup time (CPT 99453 for RPM, CPT 98975 for RTM)

2. **Assessments**:
   - Patients receive automated assessment reminders
   - Clinicians can manually assign assessments
   - Completed assessments stored with timestamps

3. **Observations**:
   - Device readings automatically imported
   - Clinicians can manually enter observations
   - All observations linked to enrollments for billing accuracy

4. **Alerts**:
   - System automatically evaluates observations against alert rules
   - Critical alerts trigger immediate notifications
   - Clinicians triage and resolve alerts
   - Alert resolution time tracked for billing

### Alert Triage Workflow

1. Navigate to **Triage Queue**
2. View prioritized alerts (sorted by risk score and severity)
3. Click alert to view:
   - Patient demographics
   - Alert details and severity
   - Recent observations (trend chart)
   - Active medications
4. Actions:
   - **Call Patient**: Log time (billable)
   - **Review Vitals**: Log time (billable)
   - **Adjust Medications**: Log time (billable)
   - **Create Task**: Schedule follow-up
   - **Resolve Alert**: Mark as resolved with disposition
5. Time tracking:
   - Timer auto-starts when engaging with patient
   - Timer auto-stops on alert resolution
   - CPT code auto-selected based on program and time logged

---

## Step 9: Billing Readiness Monitoring

### View Billing Dashboard

1. Navigate to **Billing** → **Billing Readiness**
2. Select month/year
3. View summary:
   ```
   Total Enrollments: 50
   Eligible for Billing: 42 (84%)
   Not Eligible: 8 (16%)
   Total Potential Revenue: $5,432.17
   ```
4. View by program:
   ```
   CMS_RPM_2025: 25 patients, $3,215.25
   CMS_RTM_2025: 10 patients, $1,500.00
   CMS_CCM_2025: 17 patients, $2,216.92
   ```
5. View patient-level details:
   ```
   John Doe | CMS_RPM_2025 | ✓ Eligible | 3 of 4 CPT codes | $135.27
   - [99453] Setup: Eligible ($19.19)
   - [99454] Device: Eligible (18 days, need 16) ($64.53)
   - [99457] Clinical Time: Eligible (25 min, need 20) ($51.55)
   - [99458] Additional Time: Not Eligible (0 increments)
   ```

### Export Billing Package

1. Click **"Export CSV"**
2. File downloaded: `billing-summary-2025-11.csv`
3. Submit to billing department for claims processing

---

## Best Practices

### Clinician Training
- Train on assessment completion workflows
- Train on alert triage and time logging
- Train on device provisioning (RPM/RTM)
- Provide quick reference guides

### Patient Engagement
- Provide device training and support
- Send assessment reminders via SMS/email
- Offer tech support for connectivity issues
- Track adherence and follow up with non-compliant patients

### Billing Compliance
- Review billing readiness dashboard weekly
- Ensure 16+ days of readings for RPM/RTM
- Log all clinical time accurately
- Verify eligibility criteria before billing

### Data Quality
- Review observations for outliers
- Flag suspicious device readings
- Validate patient-reported data
- Maintain accurate medication lists

---

## Troubleshooting

### Issue: Patient not appearing in billing readiness

**Cause**: No active enrollment with billing program

**Fix**:
1. Navigate to **Patients** → Select patient
2. Click **"Enrollments"**
3. Verify enrollment exists and has:
   - Status: ACTIVE
   - Billing Program: Selected (e.g., CMS_RPM_2025)
   - Billing Eligibility: Verified (✓)

---

### Issue: Observations not counting toward "16 days of readings"

**Cause**: Observations not linked to enrollment

**Fix**:
1. Navigate to **Observations** → Filter by patient
2. Check if observations have `enrollmentId` populated
3. If missing, contact Platform Admin to run migration script

---

### Issue: Clinical time not showing in billing readiness

**Cause**: Time logs not linked to enrollment or marked as non-billable

**Fix**:
1. Navigate to **Time Logs** → Filter by patient
2. Verify:
   - `enrollmentId` populated
   - `billable` = true
   - `cptCode` selected
3. Re-log time if needed

---

## Documentation

- **Platform Admin Guide**: `production-setup/docs/PLATFORM-ADMIN-GUIDE.md`
- **Quick Start**: `production-setup/docs/QUICK-START.md`
- **Billing Architecture**: `docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md`
- **Developer Reference**: `docs/developer-reference.md`

---

## Support

For organization-level support:
- **Email**: support@vitaledge.com
- **Documentation**: https://docs.vitaledge.com
- **Training**: Schedule onboarding session with success team

---

**Last Updated**: 2025-11-01
**Maintainer**: Customer Success Team
**Version**: 1.0.0
