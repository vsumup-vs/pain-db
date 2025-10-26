# Saved Views Template Feature - Implementation Status

> Date: 2025-10-26
> Status: Blocked - Manual Database Migration Required

## Summary

I've implemented the saved views template feature to provide default, role-based view filters that users can customize. However, we've hit a database permission issue that requires manual intervention.

## ✅ Completed Work

### 1. Schema Updates
- **File**: `prisma/schema.prisma`
- Added `isTemplate` field (Boolean, marks system-provided templates)
- Added `suggestedRole` field (String, role suggestion for templates)
- Added index on `isTemplate` for filtering performance

### 2. Seed Script Created
- **File**: `scripts/seed-default-saved-views.js`
- Created 25 comprehensive template views covering:
  - **Care Manager** (5 templates): Morning Triage, High Risk Patients, SLA Breached, Follow-Up, RPM Data Collection
  - **Clinician** (5 templates): Diabetes, Hypertension, Chronic Pain, Clinical Review, Overdue Assessments
  - **Billing Administrator** (5 templates): RPM/RTM/CCM Eligible, Close to Threshold, Action Needed
  - **Nurse/Care Coordinator** (5 templates): Due Today, Medication Adherence, New Enrollments, Follow-Up Calls, Vital Signs
  - **General/All Roles** (5 templates): Active Patients, Recent Patients, Open Tasks, Overdue Tasks, Critical Alerts

### 3. Migration Files Created
- **SQL File**: `migrations/add-saved-views-template-columns.sql`
- **Instructions**: `migrations/README.md`
- **Helper Script**: `scripts/add-template-columns.js` (attempted workaround)

## 🚫 Current Blocker

### Issue: Database Permission Denied

The `pain_user` database account doesn't have permission to alter the `saved_views` table structure. Error:
```
ERROR: must be owner of table saved_views
```

The table was likely created by the `postgres` superuser, and structural changes require superuser permissions.

## 🔧 Required Manual Action

You need to run the SQL migration as the PostgreSQL superuser. Here's how:

### Option 1: Command Line (Recommended)

```bash
sudo -u postgres psql pain_management_db -f migrations/add-saved-views-template-columns.sql
```

### Option 2: Interactive psql

```bash
sudo -u postgres psql pain_management_db
```

Then run:
```sql
\i migrations/add-saved-views-template-columns.sql
```

### What the Migration Does

```sql
-- Add template columns
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS suggested_role TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS saved_views_is_template_idx ON saved_views(is_template);

-- Grant permissions to pain_user
GRANT ALL PRIVILEGES ON TABLE saved_views TO pain_user;
```

## 📋 Next Steps After Manual Migration

Once you run the SQL migration manually:

### 1. Verify Migration Success

```bash
psql -U postgres -d pain_management_db -c "\d saved_views"
```

You should see the new columns:
- `is_template` (boolean, default false)
- `suggested_role` (text)

### 2. Regenerate Prisma Client

```bash
npx prisma generate
```

### 3. Run Seed Script

```bash
node scripts/seed-default-saved-views.js
```

Expected output:
```
🔖 Seeding default saved view templates...
Using template owner: michael.chen@clinictest.com
Using organization: ClinMetrics Platform
Creating 25 template views...
✅ Created: "Morning Triage - Critical Alerts" (CARE_MANAGER)
...
📊 Summary:
   Created: 25 templates
   Skipped: 0 (already exist)
   Total: 25 templates
```

### 4. Verify Templates

```bash
psql -U pain_user -d pain_management_db -c "SELECT COUNT(*) FROM saved_views WHERE is_template = true;"
```

Should return: 25

## 🔄 Remaining Tasks

After migration and seeding are complete:

- [ ] Update SavedViews UI to display templates separately
- [ ] Add "Use as Template" clone button
- [ ] Add template filtering by role
- [ ] Add visual badges for templates
- [ ] Test template cloning workflow

## 📁 Files Created/Modified

### Modified
- `prisma/schema.prisma` - Added template fields

### Created
- `scripts/seed-default-saved-views.js` - Template seed script (300+ lines)
- `migrations/add-saved-views-template-columns.sql` - Migration SQL
- `migrations/README.md` - Migration instructions
- `scripts/add-template-columns.js` - Attempted workaround (not working)
- `SAVED-VIEWS-TEMPLATE-STATUS.md` - This file

## 💡 Alternative Approach (If Migration Fails)

If you're unable to run the migration with postgres superuser, we can:

1. Drop the `saved_views` table and recreate it with correct ownership
2. Use a Prisma migration instead (requires shadow database permissions)
3. Create a new table `saved_view_templates` (separate from `saved_views`)

Let me know if you need help with any of these alternatives.

## 📞 Support

If you encounter issues:

1. Check database connection: `psql -U postgres -d pain_management_db -c "SELECT version();"`
2. Check table ownership: `psql -U postgres -d pain_management_db -c "\dt saved_views"`
3. Check current user permissions: `psql -U pain_user -d pain_management_db -c "SELECT current_user, current_database();"`

---

**Status**: Waiting for manual database migration to proceed with seeding and UI implementation.
