# Smart Template Filtering - Browser Testing Guide

> **Status**: ✅ Implementation Complete - Ready for Testing
> **Date**: 2025-10-23
> **Feature**: Smart template filtering to prevent 0% continuity scores

## What Was Fixed

### Problem
The template dropdown was showing "No templates match this patient's observations" for every patient, preventing proper testing of the continuity system.

### Root Cause
1. **Patient Context API Issue**: `/api/patients/:id/context` returned no vitals data (`hasVitals: false`)
2. **Templates List API Issue**: List endpoint doesn't include the `items` array needed for metric matching

### Solution Implemented
1. **Changed Data Source**: Use `suggestions.reusableObservations` (which already contains patient observations with metric IDs) instead of patient context API
2. **Individual Template Fetching**: Fetch each template individually using `api.getAssessmentTemplate(id)` to get the items array
3. **Query Reordering**: Load suggestions query BEFORE templates query so data is available for filtering
4. **Fixed Variable Redeclaration**: Removed duplicate `suggestions` query declaration

## How to Test

### Quick Test (5 minutes)

1. **Refresh Browser**
   - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Open Developer Tools (F12) → Console tab

2. **Select Jennifer Lee**
   - Choose "Jennifer Lee" from patient dropdown
   - Wait 2-3 seconds for data to load

3. **Verify Console Logs**
   - Should see: "Patient metric IDs collected: (5) ['metric-pain-nrs-standard', ...]"
   - Should see: "Templates with items fetched: 18"
   - Should see: "Filtered templates: (2) [...]"

4. **Check Template Dropdown**
   - Should show: "PROMIS Pain Intensity (3-item) - 100% match ✓"
   - Should show: "Daily Symptom Tracker - 100% match ✓"
   - Should NOT show: "PROMIS Pain Interference"

5. **Test Assessment Creation**
   - Select "PROMIS Pain Intensity (3-item)"
   - Green card should appear: "✓ Perfect match! Expected continuity: ~100%"
   - Click "Test Assessment"
   - Result should show: `"continuityScore": 100, "continuityUsed": true`

## Expected Console Output

```javascript
Template filtering - suggestions data: {
  hasSuggestions: true,
  hasReusableObservations: true,
  observationsCount: 19
}

Adding metric ID: metric-pain-nrs-standard from observation: Pain Level (NRS 0-10)
Adding metric ID: metric-activity-standard from observation: Physical Activity Level
Adding metric ID: metric-sleep-standard from observation: Sleep Quality
Adding metric ID: metric-fatigue-standard from observation: Fatigue Level
Adding metric ID: metric-mood-standard from observation: Mood Rating

Patient metric IDs collected: (5) ['metric-pain-nrs-standard', 'metric-activity-standard', 'metric-sleep-standard', 'metric-fatigue-standard', 'metric-mood-standard']

Templates with items fetched: 18

Filtered templates: (2) [
  { name: 'PROMIS Pain Intensity (3-item)', match: 100 },
  { name: 'Daily Symptom Tracker', match: 100 }
]
```

## Troubleshooting

### Still Seeing "No templates match"?

**Check Console for:**
- `observationsCount: 0` → Problem: Suggestions API not returning observations
- `Patient metric IDs collected: []` → Problem: No metric IDs extracted from suggestions
- `Templates with items fetched: 0` → Problem: Template fetch failing

**Verify Backend is Running:**
```bash
# Backend should be running on port 3000
curl http://localhost:3000/api/health

# Frontend should be running on port 5173
# Browser should be accessing http://localhost:5173
```

### Dropdown Loading Forever?

1. Open Network tab in DevTools
2. Filter by "XHR" or "Fetch"
3. Look for failed API calls (red status codes)
4. Check for CORS errors or authentication issues

### JavaScript Errors?

- Check Console tab for error messages
- Verify no syntax errors or missing imports
- Clear browser cache and try again

## Files Modified

- `/home/vsumup/pain-db/frontend/src/components/ContinuityTestPanel.jsx`
  - Lines 26-32: Added suggestions query (loads first)
  - Lines 34-128: Modified template query with smart filtering
  - Lines 292-361: Enhanced template dropdown with match percentages and feedback cards

## Documentation Created

- `/home/vsumup/pain-db/SMART-TEMPLATE-FILTERING.md` - Complete feature documentation
- `/home/vsumup/pain-db/CONTINUITY-SCORE-TEMPLATE-MISMATCH.md` - Root cause analysis
- `/home/vsumup/pain-db/find-matching-templates.js` - Analysis script
- `/home/vsumup/pain-db/check-continuity-mismatch.js` - Diagnostic script

## Success Criteria

✅ Template dropdown shows only matching templates for each patient
✅ Templates display match percentages (e.g., "100% match ✓")
✅ Perfect matches show green feedback card
✅ Partial matches show blue feedback card with expected continuity
✅ Empty state shows yellow warning when no templates match
✅ Assessment creation with matching template yields 100% continuity score

## Next Steps After Testing

1. **If successful**: Document the solution and close the testing issue
2. **If issues persist**: Share console logs and network tab details for further debugging
3. **Consider**: Remove extensive console logging once feature is stable (performance optimization)

---

**Testing Owner**: User
**Implementation Owner**: AI Assistant
**Last Updated**: 2025-10-23
