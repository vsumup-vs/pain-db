# Platform Admin Operations Guide

> **Audience**: Platform Administrators (SaaS Provider Staff)
> **Last Updated**: 2025-11-01
> **Version**: 1.0.0

---

## Overview

As a **Platform Administrator**, you manage the VitalEdge SaaS platform. Your role is distinct from healthcare provider roles—you manage client organizations, not patient care.

**Platform Organization Type**: `PLATFORM`

**Your Responsibilities**:
- Onboard new client organizations (clinics, hospitals, practices)
- Manage standardized clinical content library
- Provide cross-organization analytics and support
- Handle platform settings and billing

---

## Platform Admin Permissions

You have **16 platform-level permissions**:

### Platform Operations (11 permissions)
1. `PLATFORM_ORG_CREATE` - Create client organizations
2. `PLATFORM_ORG_READ` - View all organizations
3. `PLATFORM_ORG_UPDATE` - Edit organization settings
4. `PLATFORM_ORG_DELETE` - Delete organizations (use with caution!)
5. `PLATFORM_USER_MANAGE` - Manage platform-level users
6. `PLATFORM_BILLING_READ` - View cross-org billing analytics
7. `PLATFORM_BILLING_MANAGE` - Manage billing configurations
8. `PLATFORM_SUPPORT_READ` - View support tickets
9. `PLATFORM_SUPPORT_MANAGE` - Manage support tickets
10. `PLATFORM_ANALYTICS_READ` - View cross-org analytics
11. `PLATFORM_SETTINGS_MANAGE` - Manage platform settings

### Standardized Library Management (4 permissions)
12. `METRIC_CREATE` - Create standardized metrics
13. `METRIC_READ` - View metrics
14. `METRIC_UPDATE` - Update metrics
15. `METRIC_DELETE` - Delete metrics

### System Administration (1 permission)
16. `SYSTEM_ADMIN` - Full system access

---

## What You CANNOT Do

Platform Admins are **blocked from patient care operations**:

❌ Create patients
❌ Create clinicians
❌ Record observations
❌ Manage alerts
❌ Create tasks
❌ Enroll patients in programs
❌ Access organization-level billing readiness

**Why?** You are the **SaaS provider**, not a healthcare provider. Patient care is for **client organizations** only.

---

## Core Workflows

### 1. Create Client Organization

**Via UI**:
1. Navigate to **Organizations** (sidebar)
2. Click **"Create Organization"**
3. Fill in details:
   ```
   Name: ABC Clinic
   Type: CLINIC (or HOSPITAL, PRACTICE, RESEARCH, etc.)
   Email: admin@abcclinic.com
   Phone: +1-555-123-4567
   Address: 123 Medical Plaza, San Francisco, CA 94102
   Website: https://abcclinic.com
   ```
4. Click **"Create"**

**Via Script** (for bulk onboarding):
```bash
node scripts/create-client-organization.js \
  --name "ABC Clinic" \
  --type CLINIC \
  --email "admin@abcclinic.com" \
  --adminFirstName "John" \
  --adminLastName "Doe"
```

---

### 2. Assign Organization Admin

After creating organization:

1. Navigate to **Users**
2. Click **"Create User"**
3. Fill in details:
   ```
   Email: admin@abcclinic.com
   First Name: John
   Last Name: Doe
   Role: ORG_ADMIN
   Organization: ABC Clinic
   ```
4. Assign **Organization Admin permissions**:
   - USER_CREATE, USER_READ, USER_UPDATE, USER_DELETE
   - ORG_SETTINGS_MANAGE, ORG_USERS_MANAGE
   - PATIENT_CREATE, PATIENT_READ, PATIENT_UPDATE, PATIENT_DELETE
   - CLINICIAN_CREATE, CLINICIAN_READ, CLINICIAN_UPDATE, CLINICIAN_DELETE
   - OBSERVATION_CREATE, ALERT_CREATE, TASK_CREATE
   - BILLING_READ, BILLING_MANAGE
   - ANALYTICS_READ, REPORT_READ

5. Click **"Create & Send Invite"**

**Organization Admin will receive**:
- Email invitation
- Temporary password
- Link to set up account

---

### 3. Manage Standardized Library

**Standardized Content** (organizationId = NULL, isStandardized = TRUE):
- Condition Presets (e.g., Chronic Pain, Diabetes, Hypertension)
- Metrics (e.g., Blood Pressure, Blood Glucose, Pain Level)
- Assessment Templates (e.g., PROMIS Pain, PHQ-9, GAD-7)
- Alert Rules (e.g., Critical High BP, Hypoglycemia)

**Create New Standardized Metric**:
1. Navigate to **Metrics**
2. Click **"Create Metric"**
3. Fill in details:
   ```
   Name: SpO2 (Oxygen Saturation)
   Code: O2_SAT
   Value Type: numeric
   Unit: %
   Normal Range: 95-100
   Critical Low: <90
   LOINC Code: 2708-6 (optional)
   Description: Arterial oxygen saturation
   ```
4. **Leave organizationId blank** (makes it standardized)
5. Check **"Is Standardized"**
6. Click **"Create"**

**Result**: All client organizations can now use this metric

---

### 4. Update Billing Programs

**CMS Billing Programs** (seeded in database):
- CMS_RPM_2025 (Remote Patient Monitoring)
- CMS_RTM_2025 (Remote Therapeutic Monitoring)
- CMS_CCM_2025 (Chronic Care Management)

**Update CPT Code Criteria** (when CMS rules change):
```bash
node scripts/update-billing-cpt-code.js \
  --code "99454" \
  --threshold 18  # Changed from 16 days
```

**Or via database**:
```sql
UPDATE billing_cpt_codes
SET criteria = jsonb_set(criteria, '{threshold}', '18')
WHERE code = '99454' AND billing_program_code = 'CMS_RPM_2025';
```

**Add New Billing Program** (e.g., UK NHS):
```bash
node scripts/create-billing-program.js \
  --code "NHS_REMOTE_2025" \
  --name "NHS Remote Monitoring 2025" \
  --region "UK" \
  --payer "NHS"
```

---

### 5. Cross-Organization Analytics

**View Platform Analytics**:
1. Navigate to **Analytics** → **Platform Overview**
2. View metrics:
   - Total organizations: 25
   - Total patients: 1,250
   - Total enrollments: 1,800
   - Active alerts: 45
   - Billing-eligible enrollments (current month): 1,350

**Export Data** (for reporting):
- Click **"Export CSV"**
- Date range selection
- Organization filter (optional)

---

### 6. Support Ticket Management

**View Support Tickets**:
1. Navigate to **Support**
2. Filter by:
   - Status (Open, In Progress, Resolved)
   - Priority (Critical, High, Medium, Low)
   - Organization
3. Click ticket to view details

**Respond to Ticket**:
1. Click ticket
2. Add response
3. Assign to support team member
4. Update status
5. Click **"Save"**

---

## Organization Types

You can create the following organization types:

### HOSPITAL
- Large healthcare systems
- Multi-department facilities
- Integrated care networks

### CLINIC
- Primary care clinics
- Specialty clinics
- Outpatient facilities

### PRACTICE
- Private practices
- Small group practices
- Solo practitioners

### RESEARCH
- Academic research institutions
- Clinical trial organizations
- Outcome studies

### INSURANCE
- Health insurance companies
- Payer organizations
- Managed care organizations

### PHARMACY
- Retail pharmacies
- Hospital pharmacies
- Specialty pharmacies

---

## Client Organization Lifecycle

### 1. Onboarding
- Platform Admin creates organization
- Assigns Organization Admin
- Org Admin receives invitation email

### 2. Configuration
- Org Admin configures organization settings
- Creates Care Programs (RPM, RTM, CCM, Wellness)
- Onboards clinicians
- Clones or creates custom templates/presets

### 3. Active
- Patients enrolled
- Observations recorded
- Alerts managed
- Billing readiness tracked

### 4. Offboarding (if needed)
- Export all data
- Anonymize patient data (HIPAA requirement)
- Archive organization
- Retain audit logs (7 years)

---

## Best Practices

### Standardized Library Maintenance
- **Quarterly Review**: Clinical advisory board reviews content
- **Version Tracking**: Track changes in `clinicalGuidelines` JSON
- **Update Notifications**: Notify orgs when standards updated
- **Migration Tools**: Provide scripts for org-level updates

### Client Onboarding
- **Training**: Provide onboarding documentation
- **Support**: Assign dedicated support contact
- **Customization**: Allow org-specific templates/presets
- **Success Metrics**: Track engagement and adoption

### Security & Compliance
- **Access Control**: Enforce organization-level isolation
- **Audit Logging**: Track all platform-level actions
- **HIPAA Compliance**: Ensure all orgs meet requirements
- **Backup Strategy**: Daily automated backups

---

## Troubleshooting

### Issue: Organization Admin can't create patients

**Cause**: Insufficient permissions

**Fix**:
1. Navigate to **Users** → Find Organization Admin
2. Edit user
3. Verify permissions include:
   - PATIENT_CREATE
   - PATIENT_READ
   - PATIENT_UPDATE
   - PATIENT_DELETE
4. Click **"Save"**

---

### Issue: Standardized metric not appearing for client organization

**Cause**: `isStandardized` flag not set or organizationId not NULL

**Fix**:
```bash
node scripts/fix-standardized-metric.js --metricId <metric-id>
```

Or via database:
```sql
UPDATE metric_definitions
SET organization_id = NULL, is_standardized = TRUE
WHERE id = '<metric-id>';
```

---

## Documentation

- **Full Setup Guide**: `production-setup/README.md`
- **Platform Architecture**: `docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md`
- **Client Onboarding**: `production-setup/docs/CLIENT-ONBOARDING.md`
- **Billing Architecture**: `docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md`
- **Developer Reference**: `docs/developer-reference.md`

---

## Support

For platform-level support:
- **Email**: platform-support@vitaledge.com
- **Documentation**: https://docs.vitaledge.com
- **Status Page**: https://status.vitaledge.com

---

**Last Updated**: 2025-11-01
**Maintainer**: Platform Team
**Version**: 1.0.0
