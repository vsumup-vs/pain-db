# Standardized Data UI Improvements Analysis

**Date**: 2025-10-17
**Author**: Claude Code
**Status**: Analysis Complete - Ready for Implementation

## Executive Summary

The standardized data UI (Condition Presets, Metric Definitions, Assessment Templates, Alert Rules) has three critical issues that need to be addressed to provide an optimal user experience while maintaining data integrity.

---

## Issue 1: Display Header Layout Problems

### Current Problem
The card header layout causes content overflow, making badges and buttons inaccessible or cut off. Specifically:
- Icon, title, badges, and action buttons are in a single row
- Long preset names push badges and buttons out of view
- The "Copy" button (Customize) can become inaccessible on smaller screens

### Root Cause
```jsx
// Lines 287-317 in ConditionPresets.jsx
<div className="flex items-start justify-between mb-4">
  <div className="flex items-center"> // Icon + Text + Badges in one row
    <div className={`p-3 rounded-lg ${colorClasses}`}>
      <PresetIcon className="h-6 w-6" />
    </div>
    <div className="ml-3">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold text-gray-900 truncate"> // Truncate can hide important text
          {preset.name}
        </h3>
        {preset.isStandardized && !preset.isCustomized && (
          <span>⭐ Standardized</span> // Can overflow
        )}
      </div>
    </div>
  </div>
  <div className="flex items-center space-x-2"> // Action buttons
    // Buttons here
  </div>
</div>
```

### Proposed Solution

**Option A: Vertical Stacking (Recommended)**
```jsx
<div className="space-y-3 mb-4">
  {/* Row 1: Icon + Title */}
  <div className="flex items-start">
    <div className={`p-3 rounded-lg ${colorClasses} flex-shrink-0`}>
      <PresetIcon className="h-6 w-6" />
    </div>
    <div className="ml-3 flex-1 min-w-0">
      <h3 className="text-lg font-semibold text-gray-900">
        {preset.name}
      </h3>
      <p className="text-sm text-gray-500">Care Program</p>
    </div>
  </div>

  {/* Row 2: Badges + Actions */}
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      {preset.isStandardized && !preset.isCustomized && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" />
          Platform Standard
        </span>
      )}
      {preset.isCustomized && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <BuildingOfficeIcon className="h-3.5 w-3.5 mr-1" />
          Organization Custom
        </span>
      )}
    </div>
    <div className="flex items-center space-x-1">
      {/* Action buttons */}
    </div>
  </div>
</div>
```

**Benefits**:
- ✅ Clear visual hierarchy
- ✅ All badges and buttons always visible
- ✅ Responsive on all screen sizes
- ✅ Better readability with full preset names

---

## Issue 2: No View-Only Mode for Standardized Items

### Current Problem
Users cannot inspect the full details of standardized items without:
1. Creating a custom copy (which clutters the database)
2. Opening the edit modal (which implies modification)

### User Stories
- **As a clinician**, I want to review the full clinical guidelines and alert rules of a standardized condition preset before using it
- **As an administrator**, I want to compare multiple standardized assessment templates to choose the right one for my organization
- **As a researcher**, I want to inspect the LOINC/SNOMED coding of standardized metrics to ensure compatibility with my data collection tools

### Proposed Solution

**Add a "View Details" Modal**
```jsx
// New component: ViewStandardizedItemModal.jsx
<Modal isOpen={isViewModalOpen} onClose={closeViewModal} title={`View: ${item.name}`} size="2xl">
  <div className="space-y-6">
    {/* Header with badges */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800 border border-green-200">
          <ShieldCheckIcon className="h-4 w-4 mr-1.5" />
          Platform Standard
        </span>
        <span className="text-sm text-gray-500">Read-Only</span>
      </div>
      <button onClick={handleCustomize} className="...">
        <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
        Customize for My Organization
      </button>
    </div>

    {/* Tabs for different sections */}
    <Tabs>
      <Tab label="Overview">
        <div className="prose prose-sm max-w-none">
          <h4>Description</h4>
          <p>{item.description}</p>

          {item.clinicalGuidelines && (
            <>
              <h4>Clinical Guidelines</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium">{item.clinicalGuidelines.source}</p>
                <ul>
                  {item.clinicalGuidelines.recommendations.map(rec => <li key={rec}>{rec}</li>)}
                </ul>
              </div>
            </>
          )}
        </div>
      </Tab>

      <Tab label="Diagnoses ({diagnosisCount})">
        <div className="space-y-2">
          {item.diagnoses.map(diagnosis => (
            <div key={diagnosis.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{diagnosis.label}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span>ICD-10: <code className="text-indigo-600">{diagnosis.icd10}</code></span>
                  {diagnosis.snomed && <span>SNOMED: <code className="text-indigo-600">{diagnosis.snomed}</code></span>}
                  {diagnosis.isPrimary && <span className="text-green-600 font-medium">Primary</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Tab>

      <Tab label="Assessment Templates ({templateCount})">
        {/* List templates with frequency, isRequired, etc. */}
      </Tab>

      <Tab label="Alert Rules ({alertRuleCount})">
        {/* List alert rules with severity, conditions, clinical evidence */}
      </Tab>

      {item.standardCoding && (
        <Tab label="Standard Coding">
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(item.standardCoding, null, 2)}
            </pre>
          </div>
        </Tab>
      )}
    </Tabs>
  </div>
</Modal>
```

**Card UI Changes**
```jsx
<div className="flex items-center space-x-1">
  {/* Add View button for standardized items */}
  {preset.isStandardized && (
    <button
      onClick={() => handleView(preset)}
      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      title="View details"
    >
      <EyeIcon className="h-4 w-4" />
    </button>
  )}

  {/* Customize button */}
  {preset.isStandardized && !preset.isCustomized && (
    <button
      onClick={() => handleCustomize(preset)}
      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
      title="Customize for your organization"
    >
      <DocumentDuplicateIcon className="h-4 w-4" />
    </button>
  )}

  {/* Edit/Delete for custom items */}
  {preset.isCustomized && (
    <>
      <button onClick={() => handleEdit(preset)}>
        <PencilIcon className="h-4 w-4" />
      </button>
      <button onClick={() => handleDelete(preset.id)}>
        <TrashIcon className="h-4 w-4" />
      </button>
    </>
  )}
</div>
```

---

## Issue 3: Selective Editing for Standardized Items

### Current Problem
The current implementation has a binary choice:
- **Standardized items**: Cannot be edited at all (must customize first)
- **Custom items**: Can be fully edited

However, clinically there are valid use cases for **partial modification** of standardized items:
- Adding organization-specific diagnoses to a standardized condition preset
- Associating additional local metrics to a standardized assessment template
- Linking a standardized alert rule to a custom condition preset
- **BUT NOT** changing the core definition (name, description, clinical guidelines, standard coding)

### Clinical Use Case Examples

**Scenario 1: Local Diagnosis Codes**
```
Standardized Preset: "Type 2 Diabetes Management"
- Standard Diagnoses: E11.9, E11.65, E11.22 (from NIH guidelines)
- Clinic wants to add: E11.319 (diabetic nephropathy) for their patient population
- Should NOT be able to: Change preset name, remove standard diagnoses, modify clinical guidelines
```

**Scenario 2: Organization-Specific Metrics**
```
Standardized Assessment: "PHQ-9 Depression Screening"
- Standard Metrics: 9 validated PHQ-9 questions
- Clinic wants to add: Local metric for "Patient has access to mental health resources (Y/N)"
- Should NOT be able to: Change PHQ-9 questions, modify scoring algorithm, remove copyright info
```

**Scenario 3: Alert Rule Threshold Adjustment**
```
Standardized Alert Rule: "Severe Hypoglycemia Alert" (glucose <54 mg/dL)
- Organization wants to: Lower threshold to <70 mg/dL for high-risk patients
- Should be able to: Customize the threshold condition
- Should NOT be able to: Change clinical evidence source, remove standard coding
```

### Proposed Solution: Hybrid Editing Model

**Concept: "Extend but Don't Override"**

Allow organizations to **extend** standardized items with organization-specific data while **locking** core standardized attributes.

#### Implementation Approach

**Option A: Field-Level Permissions (Recommended)**
```javascript
// Backend: Add editableFields to standardized items
const editableFieldsMap = {
  conditionPreset: {
    standardized: {
      locked: ['name', 'description', 'category', 'standardCoding', 'clinicalGuidelines'],
      editable: ['diagnoses', 'templates', 'alertRules'] // Can add, but not remove standard ones
    }
  },
  metricDefinition: {
    standardized: {
      locked: ['key', 'displayName', 'unit', 'valueType', 'standardCoding', 'normalRange', 'validationInfo'],
      editable: ['description', 'category'] // Minor customization only
    }
  },
  assessmentTemplate: {
    standardized: {
      locked: ['name', 'questions', 'scoring', 'standardCoding', 'copyrightInfo', 'clinicalUse'],
      editable: ['items'] // Can add organization-specific metrics
    }
  },
  alertRule: {
    standardized: {
      locked: ['name', 'category', 'standardCoding', 'clinicalEvidence'],
      editable: ['conditions', 'actions', 'severity', 'priority'] // Can customize thresholds
    }
  }
};

// API endpoint: PATCH /api/condition-presets/:id/extend
router.patch('/:id/extend', async (req, res) => {
  const preset = await prisma.conditionPreset.findUnique({
    where: { id: req.params.id },
    include: { diagnoses: true, templates: true, alertRules: true }
  });

  if (!preset.isStandardized) {
    return res.status(400).json({ error: 'Only standardized presets can be extended' });
  }

  // Only allow adding to relationships, not modifying core attributes
  if (req.body.diagnoses) {
    // Add new diagnoses without removing existing ones
    await prisma.conditionPresetDiagnosis.createMany({
      data: req.body.diagnoses.map(d => ({
        conditionPresetId: preset.id,
        ...d
      }))
    });
  }

  // Cannot modify locked fields
  const lockedFields = ['name', 'description', 'standardCoding', 'clinicalGuidelines'];
  const attemptedChanges = Object.keys(req.body).filter(key => lockedFields.includes(key));
  if (attemptedChanges.length > 0) {
    return res.status(403).json({
      error: 'Cannot modify locked fields of standardized item',
      lockedFields: attemptedChanges
    });
  }

  res.json({ success: true, preset });
});
```

**Frontend UI for Hybrid Editing**
```jsx
// ExtendStandardizedItemModal.jsx
<Modal isOpen={isExtendModalOpen} title={`Extend: ${item.name}`}>
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
    <div className="flex items-start">
      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-medium text-yellow-800">Extending Standardized Item</h4>
        <p className="text-sm text-yellow-700 mt-1">
          You can add organization-specific data to this standardized item.
          Core attributes (name, clinical guidelines, standard coding) cannot be modified.
        </p>
      </div>
    </div>
  </div>

  {/* Show locked fields as read-only */}
  <div className="space-y-4 mb-6">
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Core Definition (Locked)</h4>
        <LockClosedIcon className="h-4 w-4 text-gray-400" />
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-medium text-gray-600">Name</dt>
          <dd className="text-gray-900">{item.name}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-600">Description</dt>
          <dd className="text-gray-900">{item.description}</dd>
        </div>
        {/* Show other locked fields */}
      </dl>
    </div>
  </div>

  {/* Editable sections */}
  <div className="space-y-6">
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Diagnoses</h4>
        <button onClick={handleAddDiagnosis} className="text-sm text-indigo-600 hover:text-indigo-800">
          + Add Organization Diagnosis
        </button>
      </div>

      {/* Standardized diagnoses (read-only with locked icon) */}
      <div className="space-y-2 mb-3">
        <p className="text-xs text-gray-500 uppercase font-medium">Standard Diagnoses (Cannot Remove)</p>
        {item.diagnoses.filter(d => d.isStandardized).map(diagnosis => (
          <div key={diagnosis.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{diagnosis.label}</p>
              <p className="text-sm text-gray-600">ICD-10: {diagnosis.icd10}</p>
            </div>
            <LockClosedIcon className="h-4 w-4 text-gray-400" />
          </div>
        ))}
      </div>

      {/* Organization diagnoses (editable with delete icon) */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase font-medium">Organization-Specific Diagnoses</p>
        {item.diagnoses.filter(d => !d.isStandardized).map(diagnosis => (
          <div key={diagnosis.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{diagnosis.label}</p>
              <p className="text-sm text-gray-600">ICD-10: {diagnosis.icd10}</p>
            </div>
            <button onClick={() => handleRemoveDiagnosis(diagnosis.id)} className="text-red-600 hover:text-red-800">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {item.diagnoses.filter(d => !d.isStandardized).length === 0 && (
          <p className="text-sm text-gray-500 italic">No organization-specific diagnoses yet</p>
        )}
      </div>
    </div>

    {/* Similar sections for Templates, Alert Rules, etc. */}
  </div>

  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
    <button onClick={onCancel} className="btn-secondary">Cancel</button>
    <button onClick={handleSave} className="btn-primary">Save Extensions</button>
  </div>
</Modal>
```

**Option B: Full Customization Required (Current Approach)**
Keep the current "Customize" button that creates a full copy. This is simpler but:
- ❌ Clutters database with duplicate standard items
- ❌ Loses connection to source standard (no updates)
- ❌ Organizations miss standard updates

**Recommendation**: Implement Option A (Field-Level Permissions) for better data integrity and UX.

---

## Implementation Priority

### P0 (Critical - Fix Immediately)
1. **Fix card header layout** (Issue #1)
   - Estimated effort: 2-3 hours
   - Files: ConditionPresets.jsx, MetricDefinitions.jsx, AssessmentTemplates.jsx, AlertRules.jsx
   - Impact: Visual bug affecting usability on all pages

### P1 (High Priority - Next Sprint)
2. **Add View-Only Modal** (Issue #2)
   - Estimated effort: 1-2 days
   - Create new component: `ViewStandardizedItemModal.jsx`
   - Add View button to all standardized data cards
   - Impact: Enables users to inspect standards without creating copies

### P2 (Medium Priority - Future Sprint)
3. **Implement Hybrid Editing Model** (Issue #3)
   - Estimated effort: 3-5 days
   - Backend: Field-level permissions, new `/extend` API endpoints
   - Frontend: New `ExtendStandardizedItemModal.jsx` component
   - Database: Add `isStandardized` flag to child entities (diagnoses, templateItems, etc.)
   - Impact: Allows clinical customization while preserving standard integrity

---

## Recommended Action Plan

### Week 1: Card Layout Fix (P0)
- [ ] Update card header layout in all 4 pages
- [ ] Test on mobile, tablet, desktop
- [ ] Verify all badges and buttons accessible

### Week 2: View-Only Modal (P1)
- [ ] Create `ViewStandardizedItemModal.jsx` component
- [ ] Add tabbed interface for different sections
- [ ] Wire up "View" button on all standardized item cards
- [ ] Test with production seed data

### Week 3-4: Hybrid Editing Model (P2)
- [ ] Design database schema changes (add `isStandardized` to child entities)
- [ ] Create `/extend` API endpoints for each entity type
- [ ] Build `ExtendStandardizedItemModal.jsx` component
- [ ] Add field-level locking UI indicators
- [ ] Write tests for permission enforcement
- [ ] Migration plan for existing data

---

## Technical Debt & Considerations

### Database Schema Changes Required for P2
```prisma
model ConditionPresetDiagnosis {
  id                String   @id @default(cuid())
  conditionPresetId String
  icd10             String
  snomed            String?
  label             String
  isPrimary         Boolean  @default(false)
  isStandardized    Boolean  @default(false) // NEW: Marks standard vs org-specific
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  conditionPreset ConditionPreset @relation(fields: [conditionPresetId], references: [id], onDelete: Cascade)

  @@unique([conditionPresetId, icd10, isStandardized]) // Allow same ICD-10 if one is standard
}
```

### API Changes Required
- New endpoints: `PATCH /api/:entity/:id/extend`
- Update existing endpoints to enforce field-level permissions
- Add validation middleware for standardized items

### Testing Requirements
- Unit tests for field-level permission logic
- Integration tests for `/extend` endpoints
- E2E tests for UI workflows (View, Customize, Extend)
- Permission boundary tests (ensure locked fields cannot be modified)

---

## Conclusion

The three issues identified are valid and impact the usability and clinical utility of the standardized data library. The recommended solutions provide:

1. **Immediate visual fix** (Issue #1) - Better card layout
2. **Inspection capability** (Issue #2) - View-Only modal for standards review
3. **Clinical flexibility** (Issue #3) - Hybrid editing model for organization-specific extensions

This approach balances **data integrity** (preserving standards) with **clinical flexibility** (allowing customization) while maintaining **traceability** to authoritative sources.

**Next Steps**: Review this analysis with the team and prioritize implementation based on pilot clinic feedback and development capacity.
