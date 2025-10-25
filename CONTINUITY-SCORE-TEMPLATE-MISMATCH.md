# Continuity Score Analysis - Template Selection Issue

> **Date**: 2025-10-23
> **Status**: ✅ Root Cause Identified & Solution Found
> **Issue**: 0% continuity score despite 42 observations

## Problem Statement

When testing the Smart Assessment Continuity Test Panel with Jennifer Lee's data:
- **Selected Template**: PROMIS Pain Interference (4-item)
- **Expected**: High continuity score (she has 42 observations)
- **Actual**: 0% continuity score

## Root Cause

**Template-Observation Metric Mismatch**

### Template Requirements
The "PROMIS Pain Interference" template requires:
- `metric-pain-interference-standard` (Pain Interference Score)

### Jennifer Lee's Observations (42 total)
- `metric-pain-nrs-standard` - Pain Level (NRS 0-10): **19 observations**
- `metric-activity-standard` - Physical Activity: 5 observations
- `metric-sleep-standard` - Sleep Quality: 5 observations
- `metric-fatigue-standard` - Fatigue: 5 observations
- `metric-mood-standard` - Mood: 5 observations
- Plus 8 other observations for various metrics

### Result
**Zero overlapping metrics = 0% continuity score**

The continuity system is working correctly - it just can't reuse data when the template requires different metrics than what the patient has recorded.

---

## Solution: Use Matching Templates

I analyzed all 18 templates in the system and found **TWO PERFECT MATCHES**:

### ✅ Option 1: PROMIS Pain Intensity (3-item) - RECOMMENDED
- **Template ID**: `template-promis-pain-intensity`
- **Match**: 1 of 1 metrics (100%)
- **Matching Metric**: Pain Level (NRS 0-10)
- **Jennifer Lee's Data**: 19 observations
- **Expected Continuity**: ~95-100% (recent observations within 7 days)

**Why This Is Best**:
- Standardized PROMIS assessment
- Perfect 100% metric match
- 19 observations available for reuse
- Most recent observations from the past 7 days

### ✅ Option 2: Daily Symptom Tracker
- **Template ID**: `template-daily-symptoms`
- **Match**: 5 of 5 metrics (100%)
- **Matching Metrics**:
  - Pain Level (NRS 0-10) - 19 observations
  - Physical Activity Level - 5 observations
  - Sleep Quality - 5 observations
  - Fatigue Level - 5 observations
  - Mood Rating - 5 observations
- **Expected Continuity**: ~95-100%

**Why This Is Also Good**:
- Matches ALL of Jennifer Lee's observation types
- Comprehensive symptom tracking
- Would demonstrate the multi-metric continuity feature

---

## Testing Instructions

### Browser Test with Correct Template

1. **Navigate to Dashboard** with ContinuityTestPanel
2. **Select Patient**: Jennifer Lee
3. **Select Template**: **PROMIS Pain Intensity (3-item)** (NOT Pain Interference)
4. **Click "Test Assessment"**

**Expected Results**:
```json
{
  "assessment": {
    "responses": {
      "pain_level": 7  // Reused from recent observation
    },
    "score": 7,
    "notes": "Reused observation data for 1 of 1 metrics (100% continuity)",
    "continuityScore": 100
  },
  "continuityUsed": true,
  "reusedItems": [
    {
      "itemId": "...",
      "metricName": "Pain Level (NRS 0-10)",
      "value": { "numeric": 7 },
      "source": "observation",
      "recordedAt": "2025-10-23T..."
    }
  ],
  "message": "Assessment completed using recent observation data (100% continuity)"
}
```

### Alternative Test with Daily Symptom Tracker

1. **Select Patient**: Jennifer Lee
2. **Select Template**: **Daily Symptom Tracker**
3. **Click "Test Assessment"**

**Expected Results**:
```json
{
  "assessment": {
    "responses": {
      "pain_level": 7,
      "activity": 6,
      "sleep": 8,
      "fatigue": 4,
      "mood": 7
    },
    "score": null,
    "notes": "Reused observation data for 5 of 5 metrics (100% continuity)",
    "continuityScore": 100
  },
  "continuityUsed": true,
  "reusedItems": [
    { "metricName": "Pain Level (NRS 0-10)", ... },
    { "metricName": "Physical Activity Level", ... },
    { "metricName": "Sleep Quality", ... },
    { "metricName": "Fatigue Level", ... },
    { "metricName": "Mood Rating", ... }
  ],
  "message": "Assessment completed using recent observation data (100% continuity)"
}
```

---

## Technical Details

### Continuity Calculation Logic

**File**: `src/services/smartAssessmentContinuityService.js`

The continuity score is calculated as:
```javascript
continuityScore = (matchingMetrics / totalTemplateMetrics) * 100
```

**Requirements for Metric Match**:
1. **Exact metric ID match**: `observation.metricId === templateItem.metricDefinitionId`
2. **Within validity window**: Observation within 7 days (168 hours)
3. **Valid value**: Observation has a non-null value

**Example Calculation (PROMIS Pain Intensity)**:
```
Template: PROMIS Pain Intensity (3-item)
- Total metrics: 1 (Pain Level NRS 0-10)

Jennifer Lee's observations:
- metric-pain-nrs-standard: 19 observations (most recent within 1 day)

Match check:
- Pain Level (NRS 0-10) ✅ Found: 19 observations, most recent < 7 days old

Result:
- Matching metrics: 1
- Total metrics: 1
- Continuity score: (1 / 1) * 100 = 100%
```

**Example Calculation (Daily Symptom Tracker)**:
```
Template: Daily Symptom Tracker
- Total metrics: 5 (Pain, Activity, Sleep, Fatigue, Mood)

Jennifer Lee's observations:
- metric-pain-nrs-standard: 19 observations ✅
- metric-activity-standard: 5 observations ✅
- metric-sleep-standard: 5 observations ✅
- metric-fatigue-standard: 5 observations ✅
- metric-mood-standard: 5 observations ✅

Result:
- Matching metrics: 5
- Total metrics: 5
- Continuity score: (5 / 5) * 100 = 100%
```

### Why PROMIS Pain Interference Failed

```
Template: PROMIS Pain Interference (4-item)
- Total metrics: 1 (Pain Interference Score)

Jennifer Lee's observations:
- metric-pain-interference-standard: 0 observations ❌

Match check:
- Pain Interference Score ❌ Not found

Result:
- Matching metrics: 0
- Total metrics: 1
- Continuity score: (0 / 1) * 100 = 0%
```

---

## Analysis Scripts Created

### 1. check-continuity-mismatch.js
**Purpose**: Diagnose why the continuity score was 0%

**Output**:
```
=== Template Analysis ===
Template: PROMIS Pain Interference (4-item)
Required Metrics:
  1. Pain Interference Score
     ID: metric-pain-interference-standard

=== Jennifer Lee Observations (last 7 days) ===
Total Observations: 42
Observations by Metric:
  - Pain Level (NRS 0-10) - Count: 19
  - Physical Activity Level - Count: 5
  - Sleep Quality - Count: 5
  - Fatigue Level - Count: 5
  - Mood Rating - Count: 5

✅ Matching Metrics: 0 of 1
❌ NO MATCHES - This explains the 0% continuity score
```

### 2. find-matching-templates.js
**Purpose**: Identify templates that match Jennifer Lee's observations

**Output**:
```
=== Templates with Matching Metrics ===

1. PROMIS Pain Intensity (3-item)
   Match: 1 of 1 metrics (100%)
   ✅ PERFECT MATCH

2. Daily Symptom Tracker
   Match: 5 of 5 metrics (100%)
   ✅ PERFECT MATCH

=== Recommendation ===
✅ Use "PROMIS Pain Intensity (3-item)" (ID: template-promis-pain-intensity)
   This template has 100% match with Jennifer Lee's observations!
```

---

## Frontend Update Recommendation

To prevent this issue in the future, consider adding template filtering to the ContinuityTestPanel:

**Option A: Show Match Percentage in Dropdown**
```javascript
// In ContinuityTestPanel.jsx
const { data: templatesWithMatches } = useQuery({
  queryKey: ['templates-with-matches', selectedPatient],
  queryFn: async () => {
    if (!selectedPatient) return [];

    // Get patient's observation metrics
    const patientContext = await api.getPatientContext(selectedPatient);
    const patientMetrics = new Set();

    // Extract metric IDs from recent observations
    if (patientContext.vitals?.trends) {
      Object.values(patientContext.vitals.trends).forEach(trend => {
        if (trend.metric?.id) {
          patientMetrics.add(trend.metric.id);
        }
      });
    }

    // Get all templates
    const templatesResponse = await api.getAssessmentTemplates();
    const templates = templatesResponse.data || [];

    // Calculate match percentage for each template
    return templates.map(template => {
      const templateMetrics = template.items?.map(item => item.metricDefinitionId) || [];
      const matches = templateMetrics.filter(id => patientMetrics.has(id));
      const matchPercentage = templateMetrics.length > 0
        ? Math.round((matches.length / templateMetrics.length) * 100)
        : 0;

      return {
        ...template,
        matchPercentage,
        matchCount: matches.length,
        totalCount: templateMetrics.length
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage); // Best matches first
  },
  enabled: !!selectedPatient
});
```

**Dropdown Display**:
```jsx
<select
  value={selectedTemplate}
  onChange={(e) => setSelectedTemplate(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
>
  <option value="">Choose a template...</option>
  {templatesWithMatches?.map((template) => (
    <option key={template.id} value={template.id}>
      {template.name} {template.isStandardized ? '(Standardized)' : ''}
      {template.matchPercentage > 0 && ` - ${template.matchPercentage}% match`}
      {template.matchPercentage === 100 && ' ✓'}
    </option>
  ))}
</select>
```

**Option B: Filter to Only Show Compatible Templates**
```javascript
// Only show templates with at least 50% metric match
return templates.filter(template => {
  const matchPercentage = calculateMatchPercentage(template, patientMetrics);
  return matchPercentage >= 50;
});
```

**Option C: Show Warning for Low Matches**
```jsx
{selectedTemplate && templatesWithMatches && (
  (() => {
    const selected = templatesWithMatches.find(t => t.id === selectedTemplate);
    if (selected && selected.matchPercentage < 50) {
      return (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ This template has low compatibility ({selected.matchPercentage}% match).
            You may get a low continuity score.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Matching metrics: {selected.matchCount} of {selected.totalCount}
          </p>
        </div>
      );
    }
    if (selected && selected.matchPercentage === 100) {
      return (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ Perfect match! This template should give 100% continuity.
          </p>
        </div>
      );
    }
  })()
)}
```

---

## Summary

**Problem**: Selected the wrong template (PROMIS Pain Interference) that requires metrics Jennifer Lee doesn't have.

**Solution**: Use **PROMIS Pain Intensity (3-item)** or **Daily Symptom Tracker** - both have 100% metric matches with her existing observations.

**Result**: Will demonstrate the continuity system working as designed with high continuity scores (95-100%).

**User Action Required**:
1. Refresh browser (Ctrl+Shift+R)
2. Select Jennifer Lee
3. Select **PROMIS Pain Intensity (3-item)** template
4. Click "Test Assessment"
5. Expect 100% continuity score!

---

## Files Referenced

- **Analysis Script 1**: `/home/vsumup/pain-db/check-continuity-mismatch.js`
- **Analysis Script 2**: `/home/vsumup/pain-db/find-matching-templates.js`
- **Test Panel Component**: `/home/vsumup/pain-db/frontend/src/components/ContinuityTestPanel.jsx`
- **Service Logic**: `/home/vsumup/pain-db/src/services/smartAssessmentContinuityService.js`
- **Controller**: `/home/vsumup/pain-db/src/controllers/enhancedAssessmentController.js`
