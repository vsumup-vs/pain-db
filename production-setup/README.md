# VitalEdge Production Setup & Cleanup Guide

> **Purpose**: Master reference for production deployment, database cleanup, and platform administration
> **Last Updated**: 2025-11-01
> **Status**: Living Document

---

## 📁 Folder Structure

```
production-setup/
├── README.md (this file)           # Master guide
├── scripts/                         # Executable scripts
│   ├── 1-database-reset.sh         # Clean database reset
│   ├── 2-seed-billing-programs.sh  # Seed CMS billing programs
│   ├── 3-seed-library.sh           # Seed standardized library
│   ├── 4-create-platform-admin.js  # Create platform admin user
│   ├── 5-setup-platform-org.js     # Setup PLATFORM organization
│   └── cleanup-*.js                # Various cleanup utilities
├── docs/                            # Quick reference docs
│   ├── QUICK-START.md              # 5-minute setup guide
│   ├── PLATFORM-ADMIN-GUIDE.md     # Platform admin operations
│   └── CLIENT-ONBOARDING.md        # Client organization setup
└── references/                      # Links to full documentation
    └── ARCHITECTURE-INDEX.md        # Architecture docs index

```

---

## 🚀 Quick Start (Clean Production Setup)

### Prerequisites
- PostgreSQL 12+ running
- Node.js 18+ installed
- Prisma CLI installed (`npm install -g prisma`)
- Database credentials in `.env`

### Option A: Automated Setup (Recommended)
```bash
cd production-setup
./scripts/0-full-setup.sh
```

### Option B: Manual Step-by-Step
```bash
# Step 1: Reset database to clean state
./scripts/1-database-reset.sh

# Step 2: Seed CMS 2025 billing programs
./scripts/2-seed-billing-programs.sh

# Step 3: Seed standardized library
./scripts/3-seed-library.sh

# Step 4: Create platform admin user
node scripts/4-create-platform-admin.js

# Step 5: Setup PLATFORM organization
node scripts/5-setup-platform-org.js

# Step 6: Start backend server
npm run dev
```

**Expected Result**: Platform Admin can login at http://localhost:5173 with:
- Email: `admin@vitaledge.com`
- Password: `Admin123!`

---

## 🧹 Cleanup & Reset

### Full Database Reset (DANGER - Destroys ALL Data)
```bash
cd production-setup/scripts
./cleanup-full-database-reset.sh
```

### Remove Specific Items
```bash
# Remove all test organizations
node cleanup-test-organizations.js

# Remove all test users
node cleanup-test-users.js

# Reset just billing data
node cleanup-billing-data.js
```

---

## 📚 Documentation Index

### Core Architecture
- **[Platform Organization Architecture](../docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md)** (600 lines)
  - Organization types (PLATFORM vs CLIENT)
  - Access control model
  - Controller-level blocking
  - Permission model
  - Future roadmap

- **[Platform SaaS Refactor Complete](../docs/PLATFORM-SAAS-REFACTOR-COMPLETE.md)**
  - Summary of SaaS architecture implementation
  - Access control matrix
  - Testing instructions
  - Migration notes

### Production Strategy
- **[Production Implementation Strategy](../docs/PRODUCTION-IMPLEMENTATION-STRATEGY.md)** (1074 lines)
  - Multi-tenant hierarchy
  - Standardization strategy
  - Client onboarding workflow
  - Billing program implementation
  - enrollmentId linkage architecture

### Billing Architecture
- **[Flexible Billing Configuration Architecture](../docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md)** (1180 lines)
  - Database-driven billing rules
  - BillingProgram, BillingCPTCode, BillingEligibilityRule models
  - CMS 2025 seed data
  - Configurable billing service

- **[Phase 1: Billing Service Complete](../docs/PHASE-1-BILLING-SERVICE-COMPLETE.md)**
  - billingReadinessService.js implementation
  - Configuration-driven calculations

- **[Phase 2: Billing API & UI Complete](../docs/PHASE-2-BILLING-API-UI-COMPLETE.md)**
  - 7 billing API endpoints
  - BillingReadiness.jsx UI component

- **[enrollmentId Linkage Implementation](../docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md)**
  - TimeLog and Observation enrollment linking
  - Accurate billing calculations

### Developer Reference
- **[Developer Reference Guide](../docs/developer-reference.md)**
  - Database schema
  - API endpoints
  - Code patterns
  - Common utilities

### Testing & Readiness
- **[Core Version Readiness Assessment](../CORE-VERSION-READINESS.md)**
  - Platform completion status (95%)
  - Pilot clinic readiness checklist
  - Success metrics
  - Risk assessment

- **[E2E UI Testing Plan](../E2E-UI-TESTING-PLAN.md)**
  - 25 test scenarios
  - Complete user workflows
  - Manual testing instructions

---

## 🏗️ Platform Organization vs Client Organization

### Platform Organization (SaaS Provider)
**Type**: `PLATFORM`

**Purpose**: Platform operations and standardized library management

**CAN**:
- ✅ Create client organizations
- ✅ Manage platform users
- ✅ Create standardized library (metrics, templates, presets with `organizationId = NULL`)
- ✅ Manage support tickets across all clients
- ✅ View cross-organization analytics
- ✅ Manage subscriptions and billing

**CANNOT**:
- ❌ Create patients
- ❌ Create clinicians
- ❌ Record observations
- ❌ Manage alerts
- ❌ Manage tasks
- ❌ Access client billing readiness
- ❌ Enroll patients in programs

### Client Organizations (Healthcare Providers)
**Types**: `HOSPITAL`, `CLINIC`, `PRACTICE`, `RESEARCH`, `INSURANCE`, `PHARMACY`

**Purpose**: Patient care and clinical operations

**CAN**:
- ✅ Create and manage patients
- ✅ Create and manage clinicians
- ✅ Enroll patients in care programs
- ✅ Record observations and assessments
- ✅ Manage alerts and tasks
- ✅ Access billing readiness calculations
- ✅ Clone from standardized library
- ✅ Create custom templates/presets for their organization

**CANNOT**:
- ❌ Create other client organizations
- ❌ Modify standardized library
- ❌ Access other clients' data
- ❌ Manage platform settings

---

## 🔐 Permission Model

### Platform Admin Permissions (SaaS Provider)
```javascript
permissions: [
  // Platform Operations
  'PLATFORM_ORG_CREATE',
  'PLATFORM_ORG_READ',
  'PLATFORM_ORG_UPDATE',
  'PLATFORM_ORG_DELETE',
  'PLATFORM_USER_MANAGE',
  'PLATFORM_BILLING_READ',
  'PLATFORM_BILLING_MANAGE',
  'PLATFORM_SUPPORT_READ',
  'PLATFORM_SUPPORT_MANAGE',
  'PLATFORM_ANALYTICS_READ',
  'PLATFORM_SETTINGS_MANAGE',

  // Standardized Library Management
  'METRIC_CREATE',
  'METRIC_READ',
  'METRIC_UPDATE',
  'METRIC_DELETE',

  // System Administration
  'SYSTEM_ADMIN'
]
```

### Organization Admin Permissions (Client)
```javascript
permissions: [
  // User Management
  'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE',
  'USER_INVITE', 'USER_ROLE_ASSIGN',

  // Organization Settings
  'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE',

  // Patient Care (full access)
  'PATIENT_CREATE', 'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_DELETE',
  'CLINICIAN_CREATE', 'CLINICIAN_READ', 'CLINICIAN_UPDATE', 'CLINICIAN_DELETE',
  'OBSERVATION_CREATE', 'ASSESSMENT_CREATE', 'ALERT_CREATE',
  'TASK_CREATE', 'MEDICATION_PRESCRIBE',

  // Billing (organization-level)
  'BILLING_READ', 'BILLING_MANAGE',

  // Analytics (organization-level)
  'ANALYTICS_READ', 'REPORT_READ', 'REPORT_CREATE'
]
```

---

## 🔄 Typical Production Workflows

### 1. Initial Platform Deployment
```bash
# Run full setup
cd production-setup
./scripts/0-full-setup.sh

# Verify
node scripts/verify-setup.js
```

### 2. Create First Client Organization
**Via UI** (Recommended):
1. Login as Platform Admin
2. Navigate to Organizations
3. Click "Create Organization"
4. Fill in details, select type (CLINIC/HOSPITAL/PRACTICE)
5. Assign Organization Admin

**Via Script**:
```bash
node scripts/create-client-organization.js \
  --name "ABC Clinic" \
  --type CLINIC \
  --email "admin@abcclinic.com" \
  --adminFirstName "John" \
  --adminLastName "Doe"
```

### 3. Client Onboarding (After Organization Created)
See: `docs/CLIENT-ONBOARDING.md`

1. Organization Admin logs in
2. Configure organization settings
3. Create Care Programs (RPM, RTM, CCM)
4. Onboard clinicians
5. Create patients
6. Enroll patients in programs
7. Start patient monitoring

---

## 🧪 Testing & Validation

### Verify Platform Setup
```bash
node scripts/verify-platform-setup.js
```

**Checks**:
- ✅ Database connection
- ✅ Billing programs seeded (3 programs, 12 CPT codes)
- ✅ Standardized library seeded (6 presets, 27 metrics, 9 templates, 10 alert rules)
- ✅ Platform organization exists (type: PLATFORM)
- ✅ Platform admin user exists
- ✅ Platform admin assigned to PLATFORM org with correct permissions

### Verify Client Organization Setup
```bash
node scripts/verify-client-setup.js --orgId <organization-id>
```

**Checks**:
- ✅ Organization type is not PLATFORM
- ✅ Organization admin assigned
- ✅ Care programs configured
- ✅ Clinicians exist
- ✅ Patients exist
- ✅ Enrollments exist

---

## 📊 Database Seeding Details

### Billing Programs (3 total)
- **CMS_RPM_2025**: Remote Patient Monitoring (4 CPT codes: 99453, 99454, 99457, 99458)
- **CMS_RTM_2025**: Remote Therapeutic Monitoring (5 CPT codes: 98975, 98976, 98977, 98980, 98981)
- **CMS_CCM_2025**: Chronic Care Management (3 CPT codes: 99490, 99439, 99491)

### Standardized Library
- **Condition Presets**: 6 (Chronic Pain, Diabetes, Hypertension, Heart Failure, COPD, General Wellness)
- **Metrics**: 27 (Vitals, Pain, Diabetes, Cardiac, Respiratory, Functional)
- **Assessment Templates**: 9 (PROMIS Pain, PHQ-9, GAD-7, KCCQ, CAT, Daily Symptom Tracker)
- **Alert Rules**: 10 (Critical BP, Hypoxia, Severe Pain, Hypoglycemia, etc.)

---

## ⚠️ Important Notes

### Security
- **NEVER commit** production credentials to Git
- **ALWAYS use environment variables** for sensitive data
- **ROTATE passwords** after initial setup
- **ENABLE MFA** for all platform admins

### Data Isolation
- Platform organization CANNOT access client patient data (enforced at controller level)
- Client organizations CANNOT access other clients' data (enforced by organizationId filters)
- All API endpoints enforce organization context

### Backup Strategy
- **Daily automated backups** of PostgreSQL database
- **Point-in-time recovery** enabled
- **Test restore procedures** monthly

---

## 🆘 Troubleshooting

### Issue: Platform Admin sees no menu items
**Cause**: Not assigned to organization or assigned to wrong organization type

**Fix**:
```bash
node scripts/5-setup-platform-org.js
# This recreates PLATFORM organization and assigns admin
```

### Issue: Cannot create patient as Platform Admin
**Cause**: CORRECT BEHAVIOR - Platform orgs cannot create patients

**Fix**: Create a client organization first, then switch to that org

### Issue: Database migration errors
**Cause**: Schema conflicts or ownership issues

**Fix**:
```bash
./scripts/1-database-reset.sh
# This drops and recreates entire schema
```

### Issue: Billing readiness calculations wrong
**Cause**: Missing enrollmentId linkage

**Fix**: See `docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md`

---

## 📞 Support

- **Documentation**: See `docs/` folder
- **Architecture Questions**: See `docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md`
- **Billing Questions**: See `docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md`
- **Developer Reference**: See `docs/developer-reference.md`

---

**Last Updated**: 2025-11-01
**Maintainer**: Development Team
**Version**: 1.0.0
