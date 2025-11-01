# VitalEdge Production Quick Start

> **Goal**: Get VitalEdge platform running in 5-10 minutes
> **Audience**: Developers, DevOps, System Administrators

---

## Prerequisites

Before starting, ensure you have:

- ✅ PostgreSQL 12+ running
- ✅ Node.js 18+ installed
- ✅ Git repository cloned
- ✅ `.env` file configured with database credentials

**Example `.env`**:
```
DATABASE_URL="postgresql://vsumup:password@localhost:5432/pain_db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
NODE_ENV="development"
```

---

## Quick Setup (Automated)

**Run the automated setup script**:
```bash
cd production-setup/scripts
chmod +x *.sh         # Make scripts executable
./0-full-setup.sh     # Run full automated setup
```

**What this does**:
1. Drops and recreates database schema
2. Seeds CMS 2025 billing programs (RPM, RTM, CCM)
3. Seeds standardized clinical library (6 presets, 27 metrics, 9 templates, 10 alert rules)
4. Creates Platform Admin user (admin@vitaledge.com)
5. Creates PLATFORM organization and assigns admin

**Result**: Platform ready for first login!

---

## Manual Setup (Step-by-Step)

If you prefer manual control:

```bash
cd production-setup/scripts
chmod +x *.sh

# Step 1: Database reset
./1-database-reset.sh

# Step 2: Seed billing programs
./2-seed-billing-programs.sh

# Step 3: Seed standardized library
./3-seed-library.sh

# Step 4: Create Platform Admin user
node 4-create-platform-admin.js

# Step 5: Setup PLATFORM organization
node 5-setup-platform-org.js
```

---

## Start the Platform

**Backend**:
```bash
npm run dev
# Server starts on http://localhost:3000
```

**Frontend** (separate terminal):
```bash
cd frontend
npm run dev
# UI starts on http://localhost:5173
```

---

## First Login

**Navigate to**: http://localhost:5173

**Credentials**:
- **Email**: `admin@vitaledge.com`
- **Password**: `Admin123!`

⚠️ **IMPORTANT**: Change password after first login!

---

## Create First Client Organization

Once logged in as Platform Admin:

1. **Navigate to Organizations** (sidebar menu)
2. **Click "Create Organization"**
3. **Fill in details**:
   - Name: e.g., "ABC Clinic"
   - Type: CLINIC (or HOSPITAL, PRACTICE, etc.)
   - Email: admin@abcclinic.com
   - Phone, Address, Website (optional)
4. **Click "Create"**
5. **Assign Organization Admin**:
   - Create user account
   - Assign role: ORG_ADMIN
   - Grant appropriate permissions

---

## What Platform Admin Can Do

✅ **Allowed**:
- Create and manage client organizations
- Manage platform users
- View cross-organization analytics
- Manage standardized library (metrics, templates, presets)
- Handle support tickets

❌ **Blocked** (controller-level):
- Create patients
- Create clinicians
- Record observations
- Manage alerts
- Access billing readiness (client feature)

**Why?** Platform Admin is the **SaaS provider**, not a healthcare provider. Patient care operations are for **client organizations** only.

---

## Client Organization Setup

After creating a client organization, the Organization Admin can:

1. **Configure organization settings**
2. **Create Care Programs**:
   - RPM (Remote Patient Monitoring)
   - RTM (Remote Therapeutic Monitoring)
   - CCM (Chronic Care Management)
   - General Wellness
3. **Onboard clinicians**
4. **Create patients**
5. **Enroll patients in programs**
6. **Start monitoring and billing**

See: `production-setup/docs/CLIENT-ONBOARDING.md` for full workflow

---

## Verification

**Check Platform Admin Setup**:
```bash
cd scripts
node verify-platform-setup.js
```

**Expected output**:
```
✅ Database connection
✅ Billing programs seeded (3 programs, 12 CPT codes)
✅ Standardized library seeded (6 presets, 27 metrics, 9 templates, 10 alert rules)
✅ Platform organization exists (type: PLATFORM)
✅ Platform admin user exists (admin@vitaledge.com)
✅ Platform admin assigned to PLATFORM org with 16 permissions
```

---

## Troubleshooting

### Issue: "Platform Admin sees no menu items"

**Cause**: Not assigned to PLATFORM organization

**Fix**:
```bash
cd production-setup/scripts
node 5-setup-platform-org.js
```

---

### Issue: "Cannot create patient as Platform Admin"

**Cause**: CORRECT BEHAVIOR - Platform orgs cannot create patients

**Fix**: Create a client organization first, then log in as Organization Admin

---

### Issue: "Database migration errors"

**Cause**: Schema conflicts or ownership issues

**Fix**:
```bash
cd production-setup/scripts
./1-database-reset.sh
```

---

## Next Steps

1. ✅ Platform running
2. ✅ Platform Admin logged in
3. **Create first client organization** (via UI)
4. **Onboard Organization Admin** (via Platform Admin)
5. **Client Admin configures programs** (via Org Admin)
6. **Start patient care operations**

---

## Documentation

- **Full Setup Guide**: `production-setup/README.md`
- **Platform Admin Guide**: `production-setup/docs/PLATFORM-ADMIN-GUIDE.md`
- **Client Onboarding**: `production-setup/docs/CLIENT-ONBOARDING.md`
- **Architecture**: `docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md`
- **Developer Reference**: `docs/developer-reference.md`

---

**Need Help?** See `production-setup/README.md` for comprehensive troubleshooting and architecture details.
