# Relevant Metrics Filtering Feature - COMPLETE

> **Date**: 2025-10-25
> **Status**: ✅ Complete
> **Feature**: Smart metric filtering by program type with expand option
> **Files Modified**: CareProgramSettingsBuilder.jsx, CarePrograms.jsx

---

## Summary

Enhanced the Care Program Settings Builder to intelligently show only relevant metrics by default based on the program type (Pain Management, Diabetes, Hypertension, etc.), with an option to expand and show all metrics.

### Before
- All 79 metrics shown for every program type
- Hard to find relevant metrics among irrelevant ones
- No guidance on which metrics are appropriate for each program

### After
- Shows only relevant metrics by default (e.g., 11 pain-related metrics for Pain Management)
- "Show all metrics →" toggle button to expand to all 79 metrics
- Counter showing "(11 relevant of 79 total)"
- Smart defaults based on clinical best practices

---

## Implementation Details

### 1. Program Type Mapping

Created `RELEVANT_METRICS_BY_TYPE` mapping in `CareProgramSettingsBuilder.jsx`:

```javascript
const RELEVANT_METRICS_BY_TYPE = {
  PAIN_MANAGEMENT: [
    'pain_scale_0_10', 'pain_location', 'pain_quality',
    'pain_interference_daily_activities', 'pain_interference_social_activities',
    'pain_interference_sleep', 'pain_duration', 'mood', 'sleep_quality',
    'fatigue', 'activity_level'
  ],
  DIABETES: [
    'blood_glucose', 'hba1c', 'weight', 'blood_pressure_systolic',
    'blood_pressure_diastolic', 'activity_level', 'diet_adherence',
    'medication_adherence', 'hypoglycemia_episodes'
  ],
  HYPERTENSION: [
    'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
    'weight', 'sodium_intake', 'activity_level', 'medication_adherence',
    'headache', 'dizziness'
  ],
  HEART_FAILURE: [
    'weight', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    'heart_rate', 'oxygen_saturation', 'edema', 'dyspnea', 'fatigue',
    'activity_level', 'medication_adherence'
  ],
  COPD: [
    'oxygen_saturation', 'respiratory_rate', 'dyspnea', 'cough',
    'sputum_production', 'wheezing', 'activity_level',
    'medication_adherence', 'peak_flow', 'fev1'
  ],
  GENERAL_WELLNESS: [
    'weight', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    'heart_rate', 'activity_level', 'sleep_quality', 'mood', 'stress_level'
  ]
};
```

---

### 2. Component Props Enhancement

**File**: `/home/vsumup/pain-db/frontend/src/pages/CarePrograms.jsx`

**Line 459**: Added `programType` prop to CareProgramSettingsBuilder

**Before**:
```jsx
<CareProgramSettingsBuilder
  settings={formData.settings}
  onChange={(settings) => setFormData({ ...formData, settings })}
  showJson={true}
/>
```

**After**:
```jsx
<CareProgramSettingsBuilder
  settings={formData.settings}
  programType={formData.type}  // NEW: Pass program type
  onChange={(settings) => setFormData({ ...formData, settings })}
  showJson={true}
/>
```

---

### 3. Smart Filtering Logic

**File**: `/home/vsumup/pain-db/frontend/src/components/CareProgramSettingsBuilder.jsx`

**Lines 72, 105-114**: Component updates

**Updated Component Signature** (line 72):
```javascript
const CareProgramSettingsBuilder = ({
  settings,
  programType,  // NEW: Accept program type
  onChange,
  showJson = false
}) => {
```

**Added State & Computed Values** (lines 105-114):
```javascript
// State for showing all metrics vs relevant only
const [showAllMetrics, setShowAllMetrics] = useState(false);

// Get relevant metrics for this program type
const relevantMetrics = programType
  ? RELEVANT_METRICS_BY_TYPE[programType] || []
  : [];

// Filter metrics to show based on selection
const displayedMetrics = showAllMetrics || !programType || relevantMetrics.length === 0
  ? availableMetrics  // Show all if toggle is on, no program type, or no relevant metrics
  : availableMetrics.filter(metric => relevantMetrics.includes(metric));  // Show relevant only
```

---

### 4. UI Enhancements

**Lines 341-358**: Enhanced UI with toggle button and counter

**New UI Elements**:

1. **Smart Label with Counter**:
```jsx
<label className="block text-sm font-medium text-gray-700">
  Required Metrics
  {programType && relevantMetrics.length > 0 && !showAllMetrics && (
    <span className="ml-2 text-xs text-gray-500">
      ({displayedMetrics.length} relevant of {availableMetrics.length} total)
    </span>
  )}
</label>
```

2. **Toggle Button**:
```jsx
{programType && relevantMetrics.length > 0 && (
  <button
    type="button"
    onClick={() => setShowAllMetrics(!showAllMetrics)}
    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
  >
    {showAllMetrics ? '← Show relevant only' : 'Show all metrics →'}
  </button>
)}
```

3. **Updated Rendering** (line 372):
```jsx
{displayedMetrics.map(metric => (
  // ... checkbox for each metric
))}
```

---

## User Experience Flow

### Example: Creating Pain Management Program

1. **Select Program Type**: User selects "Pain Management" from dropdown
2. **Smart Filtering Activates**: Only 11 pain-relevant metrics shown automatically
3. **Clear Indication**: Label shows "(11 relevant of 79 total)"
4. **Easy Selection**: User sees only: pain_scale_0_10, pain_location, pain_quality, etc.
5. **Option to Expand**: Click "Show all metrics →" button to see all 79 metrics if needed
6. **Toggle Back**: Click "← Show relevant only" to return to filtered view

### Example: Creating Diabetes Program

1. **Select Program Type**: "Diabetes"
2. **Relevant Metrics Shown**: blood_glucose, hba1c, weight, blood_pressure_systolic, etc. (9 metrics)
3. **Counter Visible**: "(9 relevant of 79 total)"
4. **Clinical Guidance**: Only diabetes-appropriate metrics displayed

### Example: No Program Type Selected

1. **No Type Selected**: Program type dropdown empty
2. **Fallback Behavior**: All 79 metrics shown (no filtering)
3. **No Toggle Button**: Toggle doesn't appear until program type selected

---

## Benefits

### 1. **Improved Usability**
- Reduces cognitive load by showing only relevant options
- Faster program setup (11 metrics vs 79 metrics)
- Clear guidance on appropriate metrics for each condition

### 2. **Clinical Best Practices**
- Encourages evidence-based metric selection
- Aligns with standard monitoring protocols for each condition
- Reduces selection of irrelevant metrics

### 3. **Flexibility Maintained**
- Toggle allows access to all metrics when needed
- Fallback to showing all if no program type selected
- Does not restrict user choices, only provides smart defaults

### 4. **Visual Feedback**
- Counter shows how many relevant vs total
- Toggle button label changes based on state
- Clear indication of filtered vs unfiltered view

---

## Technical Details

### Conditional Rendering Logic

The toggle button only appears when:
1. `programType` is selected (not empty)
2. `relevantMetrics.length > 0` (mapping exists for this type)

The counter only shows when:
1. `programType` is selected
2. `relevantMetrics.length > 0`
3. `!showAllMetrics` (currently showing filtered view)

### Fallback Behavior

```javascript
const displayedMetrics = showAllMetrics || !programType || relevantMetrics.length === 0
  ? availableMetrics      // SHOW ALL when:
                          //   - Toggle is ON
                          //   - No program type selected
                          //   - No relevant metrics defined for this type
  : availableMetrics.filter(metric => relevantMetrics.includes(metric))
                          // SHOW FILTERED when:
                          //   - Toggle is OFF
                          //   - Program type selected
                          //   - Relevant metrics exist
```

---

## Testing Scenarios

### Scenario 1: Create Pain Management Program
1. Click "Create Care Program"
2. Enter name: "Chronic Pain Clinic"
3. Select type: "Pain Management"
4. **Verify**: Only 11 pain-related metrics shown
5. **Verify**: Counter shows "(11 relevant of 79 total)"
6. **Verify**: Toggle button shows "Show all metrics →"
7. Click toggle
8. **Verify**: All 79 metrics now shown
9. **Verify**: Toggle button now shows "← Show relevant only"
10. Click toggle again
11. **Verify**: Back to 11 filtered metrics

### Scenario 2: Create Diabetes Program
1. Select type: "Diabetes"
2. **Verify**: Only 9 diabetes-related metrics shown
3. **Verify**: Includes blood_glucose, hba1c, weight

### Scenario 3: No Program Type
1. Leave type dropdown empty
2. **Verify**: All 79 metrics shown
3. **Verify**: No toggle button visible
4. **Verify**: No counter visible

### Scenario 4: Edit Existing Program
1. Edit existing "Cardiac Rehab" program (type: HEART_FAILURE)
2. **Verify**: Only 10 heart failure metrics shown
3. **Verify**: Previously selected metrics remain checked (even if not in filtered view)
4. Click toggle to show all
5. **Verify**: Can see and uncheck previously selected metrics not in filtered list

---

## Metric Counts by Program Type

| Program Type | Relevant Metrics | Total Metrics | Reduction |
|--------------|------------------|---------------|-----------|
| Pain Management | 11 | 79 | 86% fewer |
| Diabetes | 9 | 79 | 89% fewer |
| Hypertension | 9 | 79 | 89% fewer |
| Heart Failure | 10 | 79 | 87% fewer |
| COPD | 10 | 79 | 87% fewer |
| General Wellness | 8 | 79 | 90% fewer |

**Average Reduction**: 88% fewer metrics to review by default!

---

## Future Enhancements

### Possible Additions:

1. **Search/Filter Input**: Add text search within displayed metrics
2. **Category Grouping**: Group metrics by category (Vitals, Symptoms, Functional, etc.)
3. **Quick Select All Relevant**: Button to select all displayed relevant metrics
4. **Custom Metric Lists**: Allow admins to customize relevant metrics per organization
5. **Visual Indicators**: Badge on metrics showing "Recommended" or "Standard of Care"
6. **Metric Descriptions**: Tooltip showing why each metric is relevant for this program type

---

## Files Modified

1. ✅ `/home/vsumup/pain-db/frontend/src/pages/CarePrograms.jsx`
   - Line 459: Pass `programType` prop to CareProgramSettingsBuilder

2. ✅ `/home/vsumup/pain-db/frontend/src/components/CareProgramSettingsBuilder.jsx`
   - Lines 43-70: Added `RELEVANT_METRICS_BY_TYPE` mapping
   - Line 72: Updated component signature to accept `programType`
   - Lines 105-114: Added filtering logic and state
   - Lines 341-358: Enhanced UI with toggle and counter
   - Lines 366, 372: Use `displayedMetrics` instead of `availableMetrics`

---

## Compilation Status

✅ **Frontend**: HMR updates successful
```
7:11:44 PM [vite] hmr update /src/pages/CarePrograms.jsx
7:12:06 PM [vite] hmr update /src/components/CareProgramSettingsBuilder.jsx
7:12:24 PM [vite] hmr update /src/components/CareProgramSettingsBuilder.jsx
7:12:48 PM [vite] hmr update /src/components/CareProgramSettingsBuilder.jsx
```

✅ **Backend**: No changes needed (backend unaffected)

---

## User Testing Checklist

- [ ] Create new Pain Management program → Verify only 11 metrics shown
- [ ] Toggle to "Show all metrics" → Verify all 79 shown
- [ ] Toggle back to relevant → Verify 11 shown again
- [ ] Select some metrics → Save → Edit program → Verify selections persist
- [ ] Create Diabetes program → Verify 9 different metrics shown
- [ ] Create program without selecting type → Verify all metrics shown, no toggle
- [ ] Switch program type mid-creation → Verify metrics update immediately

---

**Status**: ✅ COMPLETE
**Ready for**: User testing in browser
**Blocking**: Nothing - changes live via HMR
**Next Steps**: User should refresh browser and test the new toggle functionality

---

**Implemented By**: AI Assistant
**Reviewed By**: Pending user verification
**Completion Date**: 2025-10-25
