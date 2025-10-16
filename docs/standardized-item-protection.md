# Standardized Item Protection - Implementation Summary

> **Document Purpose**: Explain what happens when users attempt to directly edit standardized items (metrics, assessment templates, condition presets, alert rules)
> **Last Updated**: 2025-10-13
> **Status**: Complete (All 4 entities protected)

## Overview

This document answers the critical question: **"What happens if an org user directly edits a standardized item (like phq9_score metric, PHQ-9 template, Chronic Pain preset, or High Pain Alert rule) and changes critical fields?"**

## TL;DR - The Answer

**Standardized items CANNOT be directly edited.** We've implemented **three layers of protection** across all four entity types:

1. **Frontend Prevention** (Layer 1): Edit/Delete buttons are hidden for standardized items
2. **Backend Validation** (Layer 2): API endpoints block edit/delete requests with HTTP 403
3. **Workflow Enforcement** (Layer 3): Users must use "Customize" button to create an editable copy first

**Protected Entities**:
- ✅ **MetricDefinition** (e.g., phq9_score, blood_glucose)
- ✅ **AssessmentTemplate** (e.g., PHQ-9, GAD-7)
- ✅ **ConditionPreset** (e.g., Chronic Pain Management, Diabetes Care)
- ✅ **AlertRule** (e.g., High Pain Alert, Medication Adherence Warning)

**Result**: If a user somehow bypasses the UI and attempts to edit a standardized item via API, they receive a clear error message directing them to use the "Customize" feature.

---

## The Problem We Solved

### Original Implementation (DANGEROUS)

Before our fix, the UI showed **both** Customize and Edit buttons on standardized items:

```javascript
// BEFORE (DANGEROUS CODE)
<button onClick={() => onCustomize(metric)}>Customize</button>
<button onClick={() => onEdit(metric)}>Edit</button>  // ⚠️ ALWAYS VISIBLE
<button onClick={() => onDelete(metric)}>Delete</button>  // ⚠️ ALWAYS VISIBLE
```

**What would have happened:**
1. User clicks "Edit" on standardized `phq9_score` metric
2. Modal opens with pre-filled form
3. User changes `displayName` from "PHQ-9 Score" to "My Custom PHQ Name"
4. User changes `description` to something custom
5. Frontend calls `updateMetric({ id: phq9_id, data: {...} })`
6. Backend updates database: `UPDATE metric_definitions SET displayName='My Custom PHQ Name' WHERE id='phq9_id'`
7. **DISASTER**: The standardized metric is now changed for **ALL ORGANIZATIONS**

**Impact:**
- ❌ All organizations see "My Custom PHQ Name" instead of standardized "PHQ-9 Score"
- ❌ Breaks standardization guarantee
- ❌ No audit trail of change
- ❌ Cannot revert without manual database intervention
- ❌ Violates clone-on-customize architecture

---

## Our Multi-Layer Protection System

### Layer 1: Frontend Prevention (Primary Defense)

**Location**: `/frontend/src/components/MetricDefinitions/components/MetricCard.jsx` (lines 70-88)

**Implementation**:
```javascript
// AFTER (SAFE CODE)
<div className="flex items-center space-x-2">
  {metric.isStandardized && !metric.isCustomized && onCustomize && (
    <button onClick={() => onCustomize(metric)}>
      <DocumentDuplicateIcon className="h-4 w-4" />
    </button>
  )}

  {/* Only show Edit/Delete for customized (org-specific) metrics */}
  {metric.isCustomized && (
    <>
      <button onClick={() => onEdit(metric)}>
        <PencilIcon className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(metric)}>
        <TrashIcon className="h-4 w-4" />
      </button>
    </>
  )}
</div>
```

**Files Updated**:
- `/frontend/src/components/MetricDefinitions/components/MetricCard.jsx` (lines 60-89)
- `/frontend/src/components/MetricDefinitions/components/GroupedMetricsList.jsx` (lines 212-239)
- `/frontend/src/pages/AssessmentTemplates.jsx` (lines 328-364)
- `/frontend/src/pages/ConditionPresets.jsx` (lines 286-350)
- `/frontend/src/pages/AlertRules.jsx` (lines 381-455)

**User Experience**:
- **Standardized items**: Only show "Customize" button (purple DocumentDuplicate icon)
- **Customized items**: Show "Edit" and "Delete" buttons
- **Visual cues**:
  - ⭐ Green "Standardized" badge on platform items
  - 🏥 Blue "Custom" badge on org-specific items

---

### Layer 2: Backend Validation (Mandatory Security)

**Location**: `/src/controllers/metricDefinitionController.js` (lines 545-558)

**Implementation**:
```javascript
// BLOCK: Prevent direct editing of standardized metrics
// User must use the customize endpoint first to create an org-specific copy
if (isStandardized && !existingMetric.organizationId) {
  return res.status(403).json({
    success: false,
    message: 'Cannot directly edit standardized metrics. Please use the "Customize" feature to create an editable copy for your organization first.',
    hint: 'Click the "Customize" button to clone this metric for your organization',
    standardizedMetric: {
      id: existingMetric.id,
      key: existingMetric.key,
      displayName: existingMetric.displayName
    }
  });
}
```

**Files Updated**:
- **Metric Definitions**:
  - `updateMetricDefinition` controller (lines 545-558) - Blocks edit
  - `deleteMetricDefinition` controller (lines 669-681) - Blocks delete
- **Assessment Templates**:
  - `updateAssessmentTemplate` controller (lines 290-301) - Blocks edit
  - `deleteAssessmentTemplate` controller (lines 387-397) - Blocks delete
- **Condition Presets**:
  - `updateConditionPreset` controller (lines 334-345) - Blocks edit
  - `deleteConditionPreset` controller (lines 485-495) - Blocks delete
- **Alert Rules**:
  - `updateAlertRule` controller (lines 268-279) - Blocks edit
  - `deleteAlertRule` controller (lines 371-381) - Blocks delete

**API Responses**:

**Edit Attempt on Standardized Metric**:
```http
PUT /api/metric-definitions/phq9_id
{
  "displayName": "My Custom PHQ Name"
}

HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "Cannot directly edit standardized metrics. Please use the \"Customize\" feature to create an editable copy for your organization first.",
  "hint": "Click the \"Customize\" button to clone this metric for your organization",
  "standardizedMetric": {
    "id": "phq9_id",
    "key": "phq9_score",
    "displayName": "PHQ-9 Score"
  }
}
```

**Delete Attempt on Standardized Metric**:
```http
DELETE /api/metric-definitions/phq9_id

HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "Cannot delete standardized metrics. These are platform-level resources shared across all organizations.",
  "standardizedMetric": {
    "id": "phq9_id",
    "key": "phq9_score",
    "displayName": "PHQ-9 Score"
  }
}
```

**Edit Attempt on Standardized Condition Preset**:
```http
PUT /api/condition-presets/chronic_pain_preset_id
{
  "name": "My Custom Pain Program",
  "description": "Modified description"
}

HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "Cannot directly edit standardized presets. Please use the \"Customize\" feature to create an editable copy for your organization first.",
  "hint": "Click the \"Customize\" button to clone this preset for your organization",
  "standardizedPreset": {
    "id": "chronic_pain_preset_id",
    "name": "Chronic Pain Management"
  }
}
```

**Edit Attempt on Standardized Alert Rule**:
```http
PUT /api/alert-rules/high_pain_alert_id
{
  "name": "Modified High Pain Alert",
  "severity": "low"
}

HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "Cannot directly edit standardized alert rules. Please use the \"Customize\" feature to create an editable copy for your organization first.",
  "hint": "Click the \"Customize\" button to clone this rule for your organization",
  "standardizedRule": {
    "id": "high_pain_alert_id",
    "name": "High Pain Alert"
  }
}
```

---

### Layer 3: Correct Workflow - Customize First

**How Users SHOULD Edit Standardized Items**:

1. **User sees standardized metric** `phq9_score` with ⭐ badge
2. **User clicks "Customize" button** (DocumentDuplicate icon)
3. **Confirmation dialog**: "Create a customizable copy of 'PHQ-9 Score' for your organization?"
4. **User confirms**
5. **Backend clones metric**:
   ```javascript
   POST /api/metric-definitions/phq9_id/customize

   // Creates new record:
   {
     id: "new_custom_id",
     organizationId: "org123",  // ← Tied to org
     sourceMetricId: "phq9_id",  // ← Tracks origin
     key: "phq9_score",          // ← Same key, unique per org
     displayName: "PHQ-9 Score (Custom)",
     isStandardized: false,      // ← No longer standardized
     // ... all other fields copied
   }
   ```
6. **Success toast**: "Metric customized successfully! You can now edit 'PHQ-9 Score (Custom)'"
7. **Query cache invalidates**, list refreshes
8. **User now sees**:
   - 🏥 Blue "Custom" badge
   - Edit and Delete buttons appear
9. **User clicks Edit**, modifies displayName/description
10. **Changes apply ONLY to their organization**

---

## Technical Architecture

### Database Schema (Reminder)

All four protected entities follow the same schema pattern:

```prisma
// MetricDefinition
model MetricDefinition {
  id               String    @id @default(cuid())
  organizationId   String?   // NULL = platform-level, non-null = org-specific
  sourceMetricId   String?   // Tracks clone origin
  key              String
  displayName      String
  isStandardized   Boolean   @default(false)

  organization     Organization?      @relation(...)
  sourceMetric     MetricDefinition?  @relation("MetricClones", ...)
  clonedMetrics    MetricDefinition[] @relation("MetricClones")

  @@unique([organizationId, key])  // Unique per organization
  @@index([organizationId])
  @@index([sourceMetricId])
}

// AssessmentTemplate
model AssessmentTemplate {
  id               String    @id @default(cuid())
  organizationId   String?
  sourceTemplateId String?
  name             String
  description      String?
  isStandardized   Boolean   @default(false)

  organization     Organization?         @relation(...)
  sourceTemplate   AssessmentTemplate?   @relation("TemplateClones", ...)
  clonedTemplates  AssessmentTemplate[]  @relation("TemplateClones")

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([sourceTemplateId])
}

// ConditionPreset
model ConditionPreset {
  id               String    @id @default(cuid())
  organizationId   String?
  sourcePresetId   String?
  name             String
  description      String?
  isStandardized   Boolean   @default(false)

  organization     Organization?      @relation(...)
  sourcePreset     ConditionPreset?   @relation("PresetClones", ...)
  clonedPresets    ConditionPreset[]  @relation("PresetClones")

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([sourcePresetId])
}

// AlertRule
model AlertRule {
  id               String    @id @default(cuid())
  organizationId   String?
  sourceRuleId     String?
  name             String
  description      String?
  isStandardized   Boolean   @default(false)

  organization     Organization?  @relation(...)
  sourceRule       AlertRule?     @relation("RuleClones", ...)
  clonedRules      AlertRule[]    @relation("RuleClones")

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([sourceRuleId])
}
```

**Key Properties** (consistent across all entities):
- `organizationId: NULL` = Platform-level standardized item
- `organizationId: "org123"` = Organization-specific customized item
- `sourceMetricId/sourceTemplateId/sourcePresetId/sourceRuleId` = References original standardized item
- `@@unique([organizationId, key/name])` = Same key/name allowed per org
- `@@index([organizationId])` = Fast org-aware filtering
- `@@index([source*Id])` = Fast clone relationship queries

### Query Logic (Reminder)

**Get All Metrics** (org-aware):
```javascript
const where = {
  OR: [
    { organizationId: null, isStandardized: true }, // Platform standardized
    { organizationId: currentOrgId }                 // Org-specific custom
  ]
};
```

**User sees**:
- All standardized metrics (organizationId: NULL)
- Their own customized metrics (organizationId: "org123")
- **NOT** other organizations' metrics

---

## User Scenarios

### Scenario 1: User Tries to Edit Standardized Metric Directly

**Steps**:
1. User somehow accesses Edit form for `phq9_score` (e.g., via browser dev tools or direct API call)
2. User changes `displayName` to "My Custom PHQ"
3. Frontend submits `PUT /api/metric-definitions/phq9_id`

**Result**:
- Backend returns HTTP 403 Forbidden
- Error toast: "Failed to update metric: Cannot directly edit standardized metrics. Please use the 'Customize' feature..."
- No database changes occur
- All organizations still see original "PHQ-9 Score"

### Scenario 2: User Follows Correct Workflow

**Steps**:
1. User clicks "Customize" on `phq9_score`
2. Confirms dialog
3. Backend clones to org-specific copy
4. User sees 🏥 Custom badge, Edit button appears
5. User clicks Edit, changes `displayName` to "My Custom PHQ"
6. Changes save successfully

**Result**:
- New database record created with `organizationId: "org123"`
- Only this organization sees "My Custom PHQ"
- Other organizations still see original "PHQ-9 Score"
- Original standardized metric unchanged

### Scenario 3: User Tries to Delete Standardized Metric

**Steps**:
1. User sends `DELETE /api/metric-definitions/phq9_id`

**Result**:
- Backend returns HTTP 403 Forbidden
- Error: "Cannot delete standardized metrics. These are platform-level resources..."
- Metric remains in database
- All organizations retain access

---

## Benefits of This Architecture

### 1. Data Integrity
- ✅ Standardized items remain immutable
- ✅ All organizations see consistent platform-provided metrics
- ✅ No accidental cross-organization contamination

### 2. Clinical Validity
- ✅ Evidence-based metrics (PHQ-9, GAD-7, etc.) maintain integrity
- ✅ Regulatory compliance (coding systems, validation rules) preserved
- ✅ Audit trail via `sourceMetricId` linkage

### 3. Organizational Flexibility
- ✅ Organizations can customize metrics without affecting others
- ✅ Full edit/delete control over customized items
- ✅ Can maintain both standardized and custom metrics simultaneously

### 4. Security
- ✅ Multi-layer protection (UI + API + database constraints)
- ✅ Clear error messages guide users to correct workflow
- ✅ Backend validation prevents malicious API calls

### 5. Traceability
- ✅ `sourceMetricId` tracks customization origin
- ✅ `isStandardized` flag distinguishes platform vs custom
- ✅ Audit logs capture customize/edit/delete actions

---

## Testing Validation

### Frontend Tests (Manual)

**Test 1: Standardized Metric UI**
- ✅ Standardized metrics show ⭐ Green badge
- ✅ Only "Customize" button visible (purple DocumentDuplicate icon)
- ✅ No Edit or Delete buttons

**Test 2: Customized Metric UI**
- ✅ Customized metrics show 🏥 Blue badge
- ✅ Edit and Delete buttons visible
- ✅ No Customize button (already customized)

**Test 3: Customize Workflow**
- ✅ Click Customize → Confirmation dialog appears
- ✅ Confirm → Success toast: "Metric customized successfully!"
- ✅ List refreshes, new custom metric appears with 🏥 badge
- ✅ Edit button now visible on custom metric

### Backend Tests (API)

**Test 1: Edit Standardized Metric**
```bash
curl -X PUT http://localhost:5000/api/metric-definitions/phq9_id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"displayName": "Custom Name"}'

# Expected: HTTP 403 Forbidden
# Expected body: { "success": false, "message": "Cannot directly edit standardized metrics..." }
```

**Test 2: Delete Standardized Metric**
```bash
curl -X DELETE http://localhost:5000/api/metric-definitions/phq9_id \
  -H "Authorization: Bearer $TOKEN"

# Expected: HTTP 403 Forbidden
# Expected body: { "success": false, "message": "Cannot delete standardized metrics..." }
```

**Test 3: Customize Metric**
```bash
curl -X POST http://localhost:5000/api/metric-definitions/phq9_id/customize \
  -H "Authorization: Bearer $TOKEN"

# Expected: HTTP 201 Created
# Expected body: { "success": true, "data": { "id": "new_id", "organizationId": "org123", ... } }
```

**Test 4: Edit Customized Metric**
```bash
curl -X PUT http://localhost:5000/api/metric-definitions/new_custom_id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"displayName": "My Custom PHQ Name"}'

# Expected: HTTP 200 OK
# Expected body: { "success": true, "data": { "displayName": "My Custom PHQ Name", ... } }
```

---

## Edge Cases Handled

### Edge Case 1: User Bypasses UI with Browser DevTools
**Scenario**: User modifies React component state to show Edit button on standardized metric
**Protection**: Backend validation (Layer 2) blocks API request with HTTP 403

### Edge Case 2: Direct API Call from Postman/cURL
**Scenario**: User sends `PUT /api/metric-definitions/phq9_id` directly
**Protection**: Backend validation (Layer 2) blocks request with clear error message

### Edge Case 3: Duplicate Customization Attempt
**Scenario**: User clicks "Customize" twice on same metric
**Protection**: Backend checks for existing `sourceMetricId` and returns 400 Bad Request: "This metric has already been customized for your organization"

### Edge Case 4: Cross-Organization Customization
**Scenario**: User from Org A tries to customize metric already customized by Org B
**Protection**: Each org creates independent copy. Org A's custom metric has `organizationId: "orgA"`, Org B has `organizationId: "orgB"`

---

## Related Documentation

- **Multi-Tenant Implementation Summary**: `/docs/multi-tenant-implementation-summary.md`
- **Multi-Tenant Testing Checklist**: `/docs/multi-tenant-testing-checklist.md`
- **Multi-Tenant Customization Proposal**: `/docs/multi-tenant-customization-proposal.md`
- **Production Readiness Audit**: `/docs/production-readiness-audit.md`
- **Prisma Schema**: `/prisma/schema.prisma` (MetricDefinition, AssessmentTemplate, ConditionPreset, AlertRule models)

---

## Conclusion

**Answer to the original question**:

> "If the org user directly edits the standardized Metric say phq9_score and as per the editing options if they change the display name and description, what will it affect?"

**Final Answer**:

**NOTHING** - because they **CANNOT** directly edit it. Our three-layer protection system ensures:

1. **UI prevents access** (no Edit button visible)
2. **API blocks attempts** (HTTP 403 Forbidden)
3. **Workflow guides correct approach** ("Customize" button clearly visible)

If a user somehow bypasses layers 1-2, the backend validation (Layer 2) catches it and returns a clear error message directing them to the correct workflow: **"Use the Customize button to create an editable copy first."**

The clone-on-customize architecture ensures organizational flexibility without compromising data integrity for other organizations.
