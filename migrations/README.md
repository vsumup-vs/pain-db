# Database Migration Instructions

## Issue: Permission Denied

The `pain_user` database account doesn't have permission to alter the `saved_views` table structure. This migration needs to be run by a database superuser.

## How to Run the Migration

Run the SQL migration file as the postgres superuser:

### Option 1: Using psql command line

```bash
sudo -u postgres psql pain_management_db -f migrations/add-saved-views-template-columns.sql
```

### Option 2: Using psql interactive mode

```bash
sudo -u postgres psql pain_management_db
```

Then paste the contents of `add-saved-views-template-columns.sql` or use:
```sql
\i migrations/add-saved-views-template-columns.sql
```

### Option 3: If you know the postgres password

```bash
psql -U postgres -d pain_management_db -f migrations/add-saved-views-template-columns.sql
```

## After Running Migration

Once the migration is complete:

1. Regenerate Prisma Client (if needed):
   ```bash
   npx prisma generate
   ```

2. Run the seed script to populate default templates:
   ```bash
   node scripts/seed-default-saved-views.js
   ```

3. Verify the templates were created:
   ```bash
   # This should show 25 templates
   psql -U pain_user -d pain_management_db -c "SELECT COUNT(*) FROM saved_views WHERE is_template = true;"
   ```

## What This Migration Does

- Adds `is_template` column (BOOLEAN) to mark system-provided templates
- Adds `suggested_role` column (TEXT) for role suggestions
- Creates index on `is_template` for better query performance
- Grants necessary permissions to `pain_user`

## Rollback (if needed)

If you need to revert this migration:

```sql
ALTER TABLE saved_views DROP COLUMN IF EXISTS is_template;
ALTER TABLE saved_views DROP COLUMN IF EXISTS suggested_role;
DROP INDEX IF EXISTS saved_views_is_template_idx;
```
