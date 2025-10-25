# FilterBuilder Temporal Dead Zone Fix

> Date: 2025-10-25
> Status: ✅ Complete
> File: `frontend/src/components/FilterBuilder.jsx`

## Summary

Fixed Temporal Dead Zone (TDZ) error in FilterBuilder component where `availableFields` was accessed before initialization.

## Problem Identified

### User Report
Console error when navigating to Saved Views page:
```
Uncaught ReferenceError: Cannot access 'availableFields' before initialization
    at FilterBuilder.jsx:80:24
    at Array.map (<anonymous>)
    at convertFiltersToRules (FilterBuilder.jsx:79:36)
    at FilterBuilder (FilterBuilder.jsx:71:9)
```

### Root Cause
The code had a variable declaration order issue:

**Original Order** (INCORRECT):
1. Line 69-73: `useState` initialized with `convertFiltersToRules(filters)` call
2. Line 75: `availableFields` declared
3. Line 78: `convertFiltersToRules` function defined
4. Line 80: Inside function, `availableFields` accessed

**The Problem**:
- When `useState` initializer ran (line 71), it called `convertFiltersToRules(filters)`
- Function declarations are hoisted, so `convertFiltersToRules` existed
- But when the function executed and tried to access `availableFields` (line 80), it was in the Temporal Dead Zone
- `availableFields` is a `const` declaration which is NOT hoisted and remained uninitialized until line 75

## Solution Implemented

Reordered declarations to respect JavaScript's execution order:

**New Order** (CORRECT):
1. Line 70: Declare `availableFields` first
2. Lines 73-101: Define `convertFiltersToRules` function (can now safely access `availableFields`)
3. Lines 104-108: Initialize `useState` with `convertFiltersToRules(filters)` call

### Changes Made

#### Before:
```javascript
const FilterBuilder = ({ viewType, filters, onChange, showJson = false }) => {
  const [rules, setRules] = useState(
    filters && Object.keys(filters).length > 0
      ? convertFiltersToRules(filters)  // ❌ Calls function that accesses availableFields
      : [{ id: Date.now(), field: '', operator: '>=', value: '' }]
  );

  const availableFields = FIELD_DEFINITIONS[viewType] || [];  // ❌ Declared AFTER useState

  function convertFiltersToRules(filters) {
    return Object.entries(filters).map(([key, value], index) => {
      const fieldDef = availableFields.find(f => f.key === key);  // ❌ TDZ error!
      // ...
    });
  }
}
```

#### After:
```javascript
const FilterBuilder = ({ viewType, filters, onChange, showJson = false }) => {
  // ✅ Define available fields first (before convertFiltersToRules is called)
  const availableFields = FIELD_DEFINITIONS[viewType] || [];

  // ✅ Convert existing JSON filters to UI rules
  function convertFiltersToRules(filters) {
    return Object.entries(filters).map(([key, value], index) => {
      const fieldDef = availableFields.find(f => f.key === key);  // ✅ availableFields is available
      // ...
    }).filter(Boolean);
  }

  // ✅ Initialize rules state with existing filters or default rule
  const [rules, setRules] = useState(
    filters && Object.keys(filters).length > 0
      ? convertFiltersToRules(filters)  // ✅ Function and dependencies both available
      : [{ id: Date.now(), field: '', operator: '>=', value: '' }]
  );
}
```

## How the Fix Works

1. **Declare Dependencies First**: `availableFields` is declared immediately after component props destructuring
2. **Define Functions Next**: `convertFiltersToRules` can safely reference `availableFields` because it's already declared
3. **Initialize State Last**: `useState` can call `convertFiltersToRules` because both the function and its dependencies (`availableFields`) are defined

## JavaScript Concepts Involved

### Temporal Dead Zone (TDZ)
- Variables declared with `let` or `const` exist in a "temporal dead zone" from the start of the block until the declaration is reached
- Accessing them before declaration results in `ReferenceError`
- This is different from `var` which is hoisted and initialized with `undefined`

### Function Hoisting
- Function declarations are hoisted to the top of their scope
- But they can still reference variables that aren't hoisted (like `const`)
- This creates a subtle bug when functions are called before their dependencies are declared

## Benefits

✅ **Fixes TDZ Error**: No more "Cannot access before initialization" error
✅ **Maintains Functionality**: Component still converts filters correctly
✅ **Cleaner Code**: Logical order (dependencies → functions → state)
✅ **No Breaking Changes**: Component API unchanged

## Testing

### Manual Testing Steps
1. Navigate to Saved Views page
2. Verify no console errors appear
3. Create a new saved view with filters
4. Edit existing saved views
5. Verify filter builder displays and functions correctly

### Expected Behavior
- ✅ No "Cannot access before initialization" error in console
- ✅ Filter builder loads without errors
- ✅ Filters convert correctly between JSON and UI representation
- ✅ Component displays filter rules properly

## Files Modified

### Frontend Files
- ✅ `frontend/src/components/FilterBuilder.jsx` - Reordered variable declarations

## Related Context

This error appeared when user navigated to Saved Views page. The FilterBuilder component is used by SavedViews.jsx to build filter rules for custom patient/alert/task lists.

## Completion Status

✅ **TDZ error fixed**
✅ **Component compiles without errors**
✅ **Frontend server running successfully**
✅ **Ready for user testing**

---

**Fixed By**: AI Assistant
**Completion Date**: 2025-10-25
**Status**: ✅ COMPLETE

## Instructions for User

**Refresh your browser** to see the fix. Navigate to the Saved Views page and verify that:
- No console errors appear
- The filter builder component loads correctly
- You can create and edit saved views with filters
