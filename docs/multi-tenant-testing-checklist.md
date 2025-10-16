# Multi-Tenant Customization Testing Checklist

> Implementation Status: Complete
> Testing Phase: Ready to Begin
> Last Updated: 2025-10-13

## Overview

This document provides a comprehensive testing checklist for the clone-on-customize multi-tenant architecture implemented for MetricDefinitions and AssessmentTemplates.

---

## Prerequisites for Testing

### Test Organizations Setup

You need at least 2 test organizations to verify isolation:

- **Organization A** (e.g., "Hospital ABC")
- **Organization B** (e.g., "Clinic XYZ")

### Test Users Setup

Create test users with access to different organizations:

- **User 1**: Member of Organization A only
- **User 2**: Member of Organization B only
- **User 3**: Member of both organizations (to test org switching)
- **Platform Admin**: Has `isPlatformAdmin: true` flag

---

## Test Suite 1: Metric Definitions

### 1.1 Standardized Metrics Visibility ✓

**Objective**: Verify all organizations see platform-level standardized metrics

**Steps**:
1. Login as User 1 (Organization A)
2. Navigate to Metric Definitions page
3. Verify you see all 26 standardized metrics with "⭐ Standardized" badge
4. Logout and login as User 2 (Organization B)
5. Navigate to Metric Definitions page
6. Verify you see the same 26 standardized metrics

**Expected Result**: Both organizations see identical standardized metrics

**Pass Criteria**:
- [ ] All 26 metrics visible to Org A
- [ ] All 26 metrics visible to Org B
- [ ] All have "⭐ Standardized" badge
- [ ] "Customize" button visible on all standardized metrics

---

### 1.2 Customize Metric Workflow ✓

**Objective**: Verify cloning creates organization-specific copy

**Steps**:
1. Login as User 1 (Organization A)
2. Find metric "pain_intensity_scale" (or any standardized metric)
3. Click "Customize" button (duplicate icon)
4. Confirm dialog: "Create a customizable copy for your organization?"
5. Wait for success toast: "Metric customized successfully!"
6. Refresh the page

**Expected Result**:
- New metric appears with same key but with "🏥 Custom" badge
- Original standardized metric still visible
- Custom metric has no "Customize" button

**Pass Criteria**:
- [ ] Confirmation dialog appears
- [ ] Success toast appears
- [ ] Custom metric created with "🏥 Custom" badge
- [ ] Both standardized and custom versions visible
- [ ] Custom metric has Edit/Delete buttons
- [ ] Custom metric has NO Customize button

---

### 1.3 Organization Isolation ✓

**Objective**: Verify custom metrics are isolated per organization

**Steps**:
1. As User 1 (Organization A), customize metric "pain_intensity_scale"
2. Verify custom version appears for Org A
3. Edit the custom metric (change displayName to "Pain Scale - Hospital ABC Custom")
4. Save changes
5. Logout and login as User 2 (Organization B)
6. Navigate to Metric Definitions
7. Search for "Hospital ABC Custom"

**Expected Result**:
- Organization B does NOT see Organization A's custom metric
- Organization B only sees the original standardized metric

**Pass Criteria**:
- [ ] Org A sees both standardized and custom versions
- [ ] Org A can edit custom version
- [ ] Org B does NOT see Org A's custom metric
- [ ] Org B only sees standardized metric

---

### 1.4 Duplicate Prevention ✓

**Objective**: Verify cannot customize same metric twice

**Steps**:
1. As User 1 (Organization A), customize metric "pain_intensity_scale" (if not already done)
2. Try to customize the same metric again by clicking "Customize" button

**Expected Result**:
- Error toast: "This metric has already been customized for your organization"
- No duplicate custom metric created

**Pass Criteria**:
- [ ] Cannot customize already-customized metric
- [ ] Error message clear and helpful
- [ ] No duplicate entries in database

---

### 1.5 Edit Custom Metric ✓

**Objective**: Verify editing custom metric doesn't affect standardized or other orgs

**Steps**:
1. As User 1 (Organization A), find custom metric (created in 1.2)
2. Click Edit button
3. Change displayName to "Custom Pain Scale v2"
4. Change description to "Modified by Organization A"
5. Save changes
6. Logout and login as User 2 (Organization B)
7. View the standardized "pain_intensity_scale" metric

**Expected Result**:
- Organization A sees updated custom metric
- Organization B still sees original standardized metric unchanged

**Pass Criteria**:
- [ ] Org A custom metric updated successfully
- [ ] Org B standardized metric unchanged
- [ ] Changes isolated to Org A

---

### 1.6 Delete Custom Metric ✓

**Objective**: Verify deleting custom metric doesn't affect standardized

**Steps**:
1. As User 1 (Organization A), delete the custom metric created earlier
2. Confirm deletion
3. Verify metric list

**Expected Result**:
- Custom metric deleted
- Standardized metric still visible
- Can customize again if needed

**Pass Criteria**:
- [ ] Custom metric deleted successfully
- [ ] Standardized metric remains visible
- [ ] "Customize" button reappears on standardized metric

---

### 1.7 Query Performance ✓

**Objective**: Verify org-aware queries are efficient

**Steps**:
1. Login as User 1 (Organization A)
2. Open browser DevTools → Network tab
3. Navigate to Metric Definitions page
4. Check API request: `GET /api/metric-definitions`
5. Review response time and data

**Expected Result**:
- Response time < 500ms
- Response contains only standardized + Org A custom metrics
- No metrics from other organizations in response

**Pass Criteria**:
- [ ] Fast response time
- [ ] Correct data filtering
- [ ] No cross-organization data leak

---

## Test Suite 2: Assessment Templates

### 2.1 Standardized Templates Visibility ✓

**Objective**: Verify all organizations see platform-level standardized templates

**Steps**:
1. Login as User 1 (Organization A)
2. Navigate to Assessment Templates page
3. Verify you see all 8 standardized templates with "⭐ Standardized" badge
4. Logout and login as User 2 (Organization B)
5. Navigate to Assessment Templates page
6. Verify you see the same 8 standardized templates

**Expected Result**: Both organizations see identical standardized templates

**Pass Criteria**:
- [ ] All 8 templates visible to Org A
- [ ] All 8 templates visible to Org B
- [ ] All have "⭐ Standardized" badge
- [ ] "Customize" button visible on all standardized templates

---

### 2.2 Customize Template Workflow ✓

**Objective**: Verify cloning creates organization-specific copy

**Steps**:
1. Login as User 1 (Organization A)
2. Find template "Pain Assessment - Comprehensive" (or any standardized template)
3. Click "Customize" button (duplicate icon)
4. Confirm dialog: "Create a customizable copy for your organization?"
5. Wait for success toast: "Template customized successfully!"
6. Refresh the page

**Expected Result**:
- New template appears with same name but with "🏥 Custom" badge
- Original standardized template still visible
- Custom template has no "Customize" button

**Pass Criteria**:
- [ ] Confirmation dialog appears
- [ ] Success toast appears
- [ ] Custom template created with "🏥 Custom" badge
- [ ] Both standardized and custom versions visible
- [ ] Custom template has Edit/Delete buttons
- [ ] Custom template has NO Customize button

---

### 2.3 Organization Isolation ✓

**Objective**: Verify custom templates are isolated per organization

**Steps**:
1. As User 1 (Organization A), customize template "Pain Assessment - Comprehensive"
2. Verify custom version appears for Org A
3. Edit the custom template (change name to "Pain Assessment - Hospital ABC Edition")
4. Save changes
5. Logout and login as User 2 (Organization B)
6. Navigate to Assessment Templates
7. Search for "Hospital ABC"

**Expected Result**:
- Organization B does NOT see Organization A's custom template
- Organization B only sees the original standardized template

**Pass Criteria**:
- [ ] Org A sees both standardized and custom versions
- [ ] Org A can edit custom version
- [ ] Org B does NOT see Org A's custom template
- [ ] Org B only sees standardized template

---

### 2.4 Duplicate Prevention ✓

**Objective**: Verify cannot customize same template twice

**Steps**:
1. As User 1 (Organization A), customize template "Pain Assessment - Comprehensive" (if not already done)
2. Try to customize the same template again by clicking "Customize" button

**Expected Result**:
- Error toast: "This template has already been customized for your organization"
- No duplicate custom template created

**Pass Criteria**:
- [ ] Cannot customize already-customized template
- [ ] Error message clear and helpful
- [ ] No duplicate entries in database

---

### 2.5 Edit Custom Template ✓

**Objective**: Verify editing custom template doesn't affect standardized or other orgs

**Steps**:
1. As User 1 (Organization A), find custom template (created in 2.2)
2. Click Edit button
3. Change name to "Custom Pain Assessment v2"
4. Change description to "Modified by Organization A"
5. Add/remove metrics if desired
6. Save changes
7. Logout and login as User 2 (Organization B)
8. View the standardized "Pain Assessment - Comprehensive" template

**Expected Result**:
- Organization A sees updated custom template
- Organization B still sees original standardized template unchanged

**Pass Criteria**:
- [ ] Org A custom template updated successfully
- [ ] Org B standardized template unchanged
- [ ] Changes isolated to Org A

---

### 2.6 Delete Custom Template ✓

**Objective**: Verify deleting custom template doesn't affect standardized

**Steps**:
1. As User 1 (Organization A), delete the custom template created earlier
2. Confirm deletion
3. Verify template list

**Expected Result**:
- Custom template deleted
- Standardized template still visible
- Can customize again if needed

**Pass Criteria**:
- [ ] Custom template deleted successfully
- [ ] Standardized template remains visible
- [ ] "Customize" button reappears on standardized template

---

## Test Suite 3: Edge Cases & Security

### 3.1 Cross-Organization Access Attempt ✓

**Objective**: Verify users cannot access other organizations' custom items via direct API calls

**Steps**:
1. As User 1 (Organization A), create a custom metric
2. Note the custom metric ID from browser DevTools
3. Logout and login as User 2 (Organization B)
4. Attempt to access Org A's custom metric via direct URL or API call:
   - Try: `GET /api/metric-definitions/{orgA-custom-metric-id}`
   - Try: `PUT /api/metric-definitions/{orgA-custom-metric-id}`
   - Try: `DELETE /api/metric-definitions/{orgA-custom-metric-id}`

**Expected Result**:
- All requests should return 403 Forbidden or 404 Not Found
- No data from Organization A accessible to Organization B

**Pass Criteria**:
- [ ] GET returns 404 or 403
- [ ] PUT returns 404 or 403
- [ ] DELETE returns 404 or 403
- [ ] No cross-org data leak

---

### 3.2 Customize Other Org's Custom Item ✓

**Objective**: Verify cannot customize another organization's custom items

**Steps**:
1. As User 1 (Organization A), create a custom metric
2. Logout and login as User 2 (Organization B)
3. Org B should NOT see Org A's custom metric
4. Verify Org B cannot customize Org A's custom item (shouldn't even be visible)

**Expected Result**:
- Organization B cannot see Organization A's custom items
- Only standardized items are customizable

**Pass Criteria**:
- [ ] Org B doesn't see Org A's custom items
- [ ] Only standardized items have Customize button

---

### 3.3 Organization Switching (Multi-Org User) ✓

**Objective**: Verify users with multiple organizations see correct items per org

**Steps**:
1. Login as User 3 (member of both Organization A and Organization B)
2. Select Organization A context
3. Customize a metric for Org A
4. Switch to Organization B context (via org selector)
5. Navigate to Metric Definitions
6. Verify you see standardized metrics + Org B custom items (NOT Org A's)
7. Customize a different metric for Org B
8. Switch back to Organization A context
9. Verify you see standardized metrics + Org A custom items (NOT Org B's)

**Expected Result**:
- Context switching properly filters visible items
- Each organization sees only their own custom items

**Pass Criteria**:
- [ ] Org A context shows Org A custom items only
- [ ] Org B context shows Org B custom items only
- [ ] No cross-contamination of custom items
- [ ] Standardized items visible in both contexts

---

### 3.4 Platform Admin View ✓

**Objective**: Verify platform admins can see all items (optional enhancement)

**Steps**:
1. Login as Platform Admin user
2. Navigate to Metric Definitions
3. Check what is visible

**Expected Result** (Current Implementation):
- Platform admin sees standardized items + their own org's custom items
- Does NOT see other organizations' custom items (unless explicitly added in future)

**Future Enhancement**: Platform admin dashboard showing all organizations' items

**Pass Criteria**:
- [ ] Platform admin has appropriate access level
- [ ] No unintended visibility issues

---

## Test Suite 4: Data Integrity

### 4.1 Source Tracking ✓

**Objective**: Verify custom items correctly track their source

**Steps**:
1. As User 1 (Organization A), customize metric "pain_intensity_scale"
2. Use browser DevTools to inspect API response
3. Check custom metric data for `sourceMetricId` field

**Expected Result**:
- `sourceMetricId` points to original standardized metric
- Can trace custom item back to source

**Pass Criteria**:
- [ ] `sourceMetricId` is populated
- [ ] Points to correct standardized metric
- [ ] `isStandardized: false` on custom metric
- [ ] `organizationId` is populated with correct org

---

### 4.2 Standardized Metrics Immutability ✓

**Objective**: Verify standardized metrics cannot be edited directly

**Steps**:
1. As User 1 (Organization A), try to edit a standardized metric
2. Verify behavior

**Expected Implementation**:
- Edit button may be visible but should guide user to customize first
- Or Edit button disabled on standardized items

**Pass Criteria**:
- [ ] Standardized metrics protected from direct edits
- [ ] Users guided to customize workflow

---

### 4.3 Database Constraints ✓

**Objective**: Verify unique constraints work correctly

**Steps**:
1. Check database directly or via Prisma Studio
2. Verify unique constraints: `@@unique([organizationId, key])` for metrics
3. Try to manually create duplicate (same org + same key) via API or database

**Expected Result**:
- Duplicate rejected by database
- Error message returned

**Pass Criteria**:
- [ ] Unique constraint prevents duplicates per org
- [ ] Allows same key across different orgs

---

## Test Suite 5: UI/UX Validation

### 5.1 Badge Display ✓

**Objective**: Verify badges display correctly

**Steps**:
1. View Metric Definitions page
2. Check badge display for:
   - Standardized metrics: "⭐ Standardized"
   - Custom metrics: "🏥 Custom"

**Pass Criteria**:
- [ ] Badges clearly visible
- [ ] Correct badge for each item type
- [ ] Badges styled consistently

---

### 5.2 Button Visibility Logic ✓

**Objective**: Verify Customize button shows/hides correctly

**Steps**:
1. Check standardized metric: Should have Customize button
2. Check custom metric: Should NOT have Customize button
3. Check other org's custom metric: Should not be visible at all

**Pass Criteria**:
- [ ] Customize button only on standardized, non-customized items
- [ ] Edit/Delete buttons on custom items
- [ ] UI logic correct across all views

---

### 5.3 Confirmation Dialogs ✓

**Objective**: Verify user confirmation works

**Steps**:
1. Click Customize button
2. Click Cancel on confirmation dialog
3. Verify no customization occurs
4. Click Customize again
5. Click OK on confirmation dialog
6. Verify customization proceeds

**Pass Criteria**:
- [ ] Confirmation dialog appears
- [ ] Cancel prevents action
- [ ] OK proceeds with action

---

### 5.4 Toast Notifications ✓

**Objective**: Verify user feedback is clear

**Steps**:
1. Customize a metric successfully → Check success toast
2. Try to customize already-customized metric → Check error toast
3. Edit a custom metric → Check success toast
4. Delete a custom metric → Check success toast

**Pass Criteria**:
- [ ] Success toasts appear on successful actions
- [ ] Error toasts appear on errors
- [ ] Messages are clear and helpful

---

## Test Suite 6: Performance & Scalability

### 6.1 Large Dataset Performance ✓

**Objective**: Verify performance with many custom items

**Steps**:
1. As Organization A, customize 10-15 metrics
2. Navigate to Metric Definitions page
3. Check load time and responsiveness

**Pass Criteria**:
- [ ] Page loads in < 2 seconds
- [ ] UI remains responsive
- [ ] No performance degradation

---

### 6.2 Concurrent Customization ✓

**Objective**: Verify multiple users can customize simultaneously

**Steps**:
1. User 1 (Org A) and User 2 (Org B) both customize same standardized metric at same time
2. Verify both succeed without conflicts

**Pass Criteria**:
- [ ] Both organizations get their own custom copies
- [ ] No database conflicts
- [ ] No data corruption

---

## Test Results Summary

### Overall Status: ⏳ Pending Testing

| Test Suite | Status | Pass Rate | Notes |
|------------|--------|-----------|-------|
| 1. Metric Definitions | ⏳ Pending | - | - |
| 2. Assessment Templates | ⏳ Pending | - | - |
| 3. Edge Cases & Security | ⏳ Pending | - | - |
| 4. Data Integrity | ⏳ Pending | - | - |
| 5. UI/UX Validation | ⏳ Pending | - | - |
| 6. Performance | ⏳ Pending | - | - |

---

## Known Issues / Limitations

1. **Platform Admin View**: Currently platform admins see standardized + their org's items. Future enhancement: Admin dashboard showing all orgs.

2. **Standardized Metric Edit**: Edit button may need conditional logic to prevent direct edit of standardized items (guide to customize first).

3. **Condition Presets & Alert Rules**: Not yet implemented. Follow same pattern when ready (Phase 1 - Phase 2).

---

## Testing Environment Setup

### Database State Verification

Before testing, verify database state:

```sql
-- Check standardized metrics count
SELECT COUNT(*) FROM metric_definitions WHERE "organizationId" IS NULL AND "isStandardized" = true;
-- Expected: 26

-- Check standardized templates count
SELECT COUNT(*) FROM assessment_templates WHERE "organizationId" IS NULL AND "isStandardized" = true;
-- Expected: 8

-- Check organizations exist
SELECT id, name, type FROM organizations WHERE name != 'Platform Administration';
-- Should have at least 2 test organizations
```

### API Testing Tools

- **Browser DevTools**: Network tab for API inspection
- **Postman/Insomnia**: For direct API testing
- **Prisma Studio**: For database inspection (`npx prisma studio`)

---

## Sign-Off

**Tester**: _____________________ **Date**: _____________________

**Issues Found**: _____________________

**Recommendations**: _____________________

---

## Next Steps After Testing

1. Fix any issues discovered during testing
2. Document any edge cases or limitations
3. Update user documentation with customization workflow
4. Consider implementing for ConditionPresets and AlertRules (Phase 2)
5. Add automated tests (Jest/Playwright) for critical workflows
