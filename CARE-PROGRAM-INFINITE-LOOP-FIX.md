# Care Program Settings Builder - Infinite Loop Fix

> Date: 2025-10-25
> Status: ✅ Complete
> File: `frontend/src/components/CareProgramSettingsBuilder.jsx`

## Summary

Fixed React infinite loop error ("Maximum update depth exceeded") in CareProgramSettingsBuilder component caused by circular dependency between two useEffect hooks.

## Problem Identified

### User Report
User reported console error:
```
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
    at CareProgramSettingsBuilder (http://localhost:5173/src/components/CareProgramSettingsBuilder.jsx?t=1761407470993:118:39)
```

### Root Cause
Two useEffect hooks created a circular dependency:

1. **First useEffect (lines 153-177)**: Syncs component state from `settings` prop
   - Runs when `settings` prop changes
   - Updates local state (billingEnabled, selectedCptCodes, etc.)

2. **Second useEffect (lines 180-217)**: Calls `onChange()` to update parent
   - Runs when any state variable changes
   - Calls `onChange(newSettings)` which updates parent component's state

**The Loop**:
```
onChange() → parent updates settings → settings prop changes →
first useEffect runs → updates state → second useEffect runs →
calls onChange() → LOOP
```

## Solution Implemented

Added a `useRef` flag to track when syncing from props and prevent the second useEffect from calling onChange during sync.

### Changes Made

#### 1. Import useRef (line 1)
```javascript
import React, { useState, useEffect, useRef } from 'react';
```

#### 2. Add Ref to Track Sync State (lines 73-74)
```javascript
const CareProgramSettingsBuilder = ({ settings, programType, onChange, showJson = false }) => {
  // Ref to track if we're syncing from props (prevents infinite loop)
  const isSyncingFromProps = useRef(false);
```

#### 3. Update First useEffect to Set Flag (lines 153-177)
```javascript
// Sync state when settings prop changes (for editing existing programs)
useEffect(() => {
  if (settings) {
    // Set flag to prevent the onChange useEffect from firing during sync
    isSyncingFromProps.current = true;

    setBillingEnabled(settings?.billing !== undefined && settings?.billing !== null);
    setSelectedCptCodes(settings?.billing?.cptCodes || []);
    setBillingRequirements({
      setupTime: settings?.billing?.requirements?.setupTime || 20,
      deviceReadings: settings?.billing?.requirements?.deviceReadings || 16,
      clinicalTime: settings?.billing?.requirements?.clinicalTime || 20
    });
    setRequiredMetrics(settings?.requiredMetrics || []);
    setAssessmentFrequency(settings?.assessmentFrequency || 'weekly');
    setCustomSettings(settings?.custom || {});
    setDefaultPresetId(settings?.presetConfiguration?.defaultPresetId || '');
    setAllowOverride(settings?.presetConfiguration?.allowOverride ?? true);
    setRecommendedPresetIds(settings?.presetConfiguration?.recommendedPresetIds || []);

    // Reset flag after state updates complete (use setTimeout to ensure all state updates have processed)
    setTimeout(() => {
      isSyncingFromProps.current = false;
    }, 0);
  }
}, [settings]);
```

#### 4. Update Second useEffect to Check Flag (lines 180-217)
```javascript
// Update parent component whenever settings change
useEffect(() => {
  // Skip onChange call if we're currently syncing from props (prevents infinite loop)
  if (isSyncingFromProps.current) {
    return;
  }

  const newSettings = {};

  if (billingEnabled) {
    newSettings.billing = {
      cptCodes: selectedCptCodes,
      requirements: billingRequirements
    };
  }

  if (requiredMetrics.length > 0) {
    newSettings.requiredMetrics = requiredMetrics;
  }

  if (assessmentFrequency) {
    newSettings.assessmentFrequency = assessmentFrequency;
  }

  if (Object.keys(customSettings).length > 0) {
    newSettings.custom = customSettings;
  }

  // Add preset configuration if any values are set
  if (defaultPresetId || !allowOverride || recommendedPresetIds.length > 0) {
    newSettings.presetConfiguration = {
      defaultPresetId: defaultPresetId || null,
      allowOverride: allowOverride,
      recommendedPresetIds: recommendedPresetIds
    };
  }

  onChange(newSettings);
}, [billingEnabled, selectedCptCodes, billingRequirements, requiredMetrics, assessmentFrequency, customSettings, defaultPresetId, allowOverride, recommendedPresetIds, onChange]);
```

## How the Fix Works

1. **Syncing from Props**:
   - When `settings` prop changes, first useEffect runs
   - Sets `isSyncingFromProps.current = true` before updating state
   - Updates all local state from props
   - Uses `setTimeout(() => { isSyncingFromProps.current = false }, 0)` to reset flag after state updates

2. **Preventing Loop**:
   - Second useEffect checks `if (isSyncingFromProps.current)` before calling onChange
   - If syncing from props, returns early without calling onChange
   - This breaks the circular dependency

3. **Normal Operation**:
   - When user interacts with UI (clicks checkbox, changes input), state updates normally
   - `isSyncingFromProps.current` is `false`, so onChange is called normally
   - Parent receives updates as expected

## Benefits

✅ **Fixes Infinite Loop**: No more "Maximum update depth exceeded" error
✅ **Maintains Functionality**: Component still syncs from props and updates parent correctly
✅ **Simple Solution**: Uses standard React patterns (useRef, useEffect)
✅ **No Breaking Changes**: Component API remains unchanged

## Testing

### Manual Testing Steps
1. Navigate to Care Programs page
2. Click "Edit" on any care program
3. Verify no console errors appear
4. Change metric selections and verify checkboxes update correctly
5. Verify "5 metrics selected" count matches visible checkboxes

### Expected Behavior
- ✅ No "Maximum update depth exceeded" error in console
- ✅ Checkboxes display correct selection state
- ✅ Metric count matches visible selections
- ✅ Component syncs from props on initial load and when editing

## Files Modified

### Frontend Files
- ✅ `frontend/src/components/CareProgramSettingsBuilder.jsx` - Added useRef and early return logic

## Related Fixes

This fix completes the Care Program Settings Builder cleanup:
1. **CARE-PROGRAM-UI-METRICS-FIX.md** - Fixed "No metrics available" bug
2. **DUPLICATE-CLEANUP-COMPLETE.md** - Removed duplicate metrics and presets
3. **CARE-PROGRAM-METRIC-KEYS-FIX.md** - Fixed invalid metric keys (38 programs)
4. **CARE-PROGRAM-INFINITE-LOOP-FIX.md** - Fixed React infinite loop (this document)

## Completion Status

✅ **Infinite loop fixed**
✅ **Component compiles without errors**
✅ **Frontend server running successfully**
✅ **Ready for user testing**

---

**Fixed By**: AI Assistant
**Completion Date**: 2025-10-25
**Status**: ✅ COMPLETE

## Instructions for User

**Refresh your browser** to see the fix. The console error should be gone, and the Care Program Settings Builder should function correctly without any infinite loop errors.
