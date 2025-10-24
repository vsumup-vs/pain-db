# Browser Testing Guide: Vitals Trend Indicators

> Created: 2025-10-22
> Component: Patient Context Panel
> Purpose: Verify 30-day trend indicators (↗↘→) are displaying correctly

## Quick Start: 3-Step Verification

### Step 1: Hard Refresh the Browser

**Why**: Browser may be caching old JavaScript without trend indicators.

**Instructions**:
- **Windows/Linux**: Press `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`
- **Alternative**: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### Step 2: Open Patient Context Panel

1. Navigate to **Triage Queue**: `http://localhost:5174/triage`
2. Find **Emily Rodriguez's** pain alert
3. Click on her **name** (with chart icon) to open Patient Context Panel
4. Panel should slide in from the right

### Step 3: Check for Trend Arrows

**Look for**:
- **Section Title**: "Recent Vitals (30-Day Trends)" (not just "Recent Vitals")
- **Pain Level Card**: Should show current value with an arrow next to it
  - Example: `3 ↘` (green) or `9 ↗` (red)
- **Trend Label Below**: "Improving", "Worsening", or "Stable"
- **Reading Count**: "(30 readings)" or similar

**Expected Display**:
```
Recent Vitals (30-Day Trends)
┌─────────────────────────┐
│ Pain Level (NRS 0-10)   │
│ 4 ↘    2h ago           │  ← Green arrow if decreasing
│ Improving (30 readings) │
└─────────────────────────┘
```

---

## Detailed Troubleshooting

### Issue 1: Still Don't See Trend Arrows After Hard Refresh

**Check Browser Console Logs**:

1. Open **Developer Tools** (F12 or Right-click → Inspect)
2. Click **Console** tab
3. Look for these debug messages:

```javascript
PatientContextPanel - vitals data: {
  hasTrends: true,
  trendsKeys: ['pain_level_nrs'],
  hasLastReadings: true,
  lastReadingsKeys: ['pain_level_nrs']
}

vitals.trends: {
  pain_level_nrs: {
    metric: { id: '...', key: 'pain_level_nrs', displayName: 'Pain Level (NRS 0-10)', ... },
    readings: [
      { value: 4, recordedAt: '2025-10-22T10:00:00Z', source: 'MANUAL' },
      // ... 29 more readings
    ]
  }
}

Vital pain_level_nrs: {
  hasTrendData: true,
  readingsCount: 30
}

Trend for pain_level_nrs: {
  direction: 'decreasing',
  indicator: { arrow: '↘', color: 'text-green-600', label: 'Improving' }
}
```

**What Each Log Means**:
- `hasTrends: true` → Backend sent trend data ✅
- `trendsKeys: ['pain_level_nrs']` → Pain data available ✅
- `readingsCount: 30` → Sufficient data for trend calculation ✅
- `direction: 'decreasing'` → Trend algorithm calculated direction ✅
- `indicator: { arrow: '↘', color: 'text-green-600', label: 'Improving' }` → Arrow and color determined ✅

**If you see these logs**, the code is working correctly. The issue is likely CSS not loading or the component not re-rendering.

**If you DON'T see these logs**:
- Panel may not be open (click patient name again)
- Wrong patient selected (must have vitals data)
- Backend API call failed (check Network tab)

---

### Issue 2: Backend Data Not Loading

**Check Network Tab**:

1. Open **Developer Tools** (F12) → **Network** tab
2. Filter by **XHR** or **Fetch**
3. Click patient name to open context panel
4. Look for API request: `GET /api/patients/{patientId}/context`

**Click on the request** → **Preview** or **Response** tab:

**Expected Response Structure**:
```json
{
  "patient": { ... },
  "vitals": {
    "lastReadings": {
      "pain_level_nrs": {
        "displayName": "Pain Level (NRS 0-10)",
        "value": 4,
        "unit": "scale",
        "lastReading": "2025-10-22T11:49:52.591Z"
      }
    },
    "trends": {
      "pain_level_nrs": {
        "metric": {
          "id": "...",
          "key": "pain_level_nrs",
          "displayName": "Pain Level (NRS 0-10)",
          "unit": "scale",
          "category": "Pain"
        },
        "readings": [
          { "value": 4, "recordedAt": "2025-10-22T11:49:52.591Z", "source": "MANUAL" },
          { "value": 5, "recordedAt": "2025-10-21T11:49:52.591Z", "source": "MANUAL" },
          // ... 28 more readings
        ]
      }
    }
  },
  "conditions": [ ... ],
  "medications": [ ... ]
}
```

**What to Verify**:
- ✅ `vitals.trends` object exists
- ✅ `vitals.trends.pain_level_nrs` object exists
- ✅ `vitals.trends.pain_level_nrs.readings` array has 30 items
- ✅ Keys match between `lastReadings` and `trends` (e.g., both have `pain_level_nrs`)

**If response is missing `vitals.trends`**:
- Backend controller may not be sending trend data
- Check backend server logs for errors

**If response has `trends` but array is empty**:
- Patient has no historical observations
- Try a different patient with more data

---

### Issue 3: Component Not Re-Rendering

**Force Component Remount**:

1. Close Patient Context Panel (click X button)
2. Wait 2 seconds
3. Click patient name again to re-open panel
4. Check console logs again

**If still not working**, try:
- Clear browser cache completely: `Ctrl+Shift+Delete` → Clear all cached images and files
- Restart Vite dev server:
  ```bash
  # Stop current server (Ctrl+C in terminal)
  cd frontend
  npm run dev
  ```
- Refresh browser again after server restarts

---

### Issue 4: CSS Not Loading

**Check if Tailwind classes are working**:

1. Open **Developer Tools** (F12) → **Elements** tab
2. Find the Pain Level vital card in the DOM
3. Look for the trend arrow `<span>` element
4. Check if it has these classes:
   - `text-xl` (large arrow size)
   - `font-bold` (bold arrow)
   - `text-green-600` or `text-red-600` (color)

**Expected HTML**:
```html
<span
  class="text-xl font-bold text-green-600"
  title="Improving (30 readings over 30 days)"
>
  ↘
</span>
```

**If classes are present but arrow not colored**:
- Tailwind CSS may not be compiling correctly
- Restart Vite dev server
- Check `frontend.log` for CSS compilation errors

**If `<span>` element is missing entirely**:
- Trend data is not reaching the rendering logic
- Check console logs (Issue 1)
- Verify Network tab response (Issue 2)

---

## Step-by-Step Debugging Checklist

Run through this checklist in order:

### Phase 1: Browser State
- [ ] Performed hard refresh (`Ctrl+Shift+R` or `Cmd+Shift+R`)
- [ ] Opened Patient Context Panel for Emily Rodriguez
- [ ] Visually checked for "Recent Vitals (30-Day Trends)" section title
- [ ] Visually checked for trend arrow (↗↘→) next to pain value

### Phase 2: Console Logs
- [ ] Opened Developer Tools (F12) → Console tab
- [ ] Saw "PatientContextPanel - vitals data:" log
- [ ] Confirmed `hasTrends: true` in the log
- [ ] Confirmed `trendsKeys: ['pain_level_nrs']` in the log
- [ ] Saw "Vital pain_level_nrs:" log with `readingsCount: 30`
- [ ] Saw "Trend for pain_level_nrs:" log with `direction` and `indicator`

### Phase 3: Network Data
- [ ] Opened Developer Tools (F12) → Network tab
- [ ] Found `GET /api/patients/{id}/context` request
- [ ] Verified response has `vitals.trends` object
- [ ] Verified `vitals.trends.pain_level_nrs.readings` has 30 items
- [ ] Verified keys match between `lastReadings` and `trends`

### Phase 4: HTML Elements
- [ ] Opened Developer Tools (F12) → Elements tab
- [ ] Found Pain Level vital card in DOM
- [ ] Located trend arrow `<span>` element
- [ ] Verified `<span>` has Tailwind classes (`text-xl`, `font-bold`, color class)
- [ ] Verified arrow character (↗↘→) is present in the span

### Phase 5: Nuclear Options
- [ ] Cleared all browser cache (`Ctrl+Shift+Delete`)
- [ ] Restarted Vite dev server (`npm run dev`)
- [ ] Restarted browser completely
- [ ] Tried a different browser (Chrome, Firefox, Edge)

---

## Expected Behavior (Success Criteria)

When everything is working correctly, you should see:

### 1. Section Title Changed
- **Old**: "Recent Vitals"
- **New**: "Recent Vitals (30-Day Trends)"

### 2. Trend Arrows Displayed
- **Pain Level**: Should have an arrow (↗↘→) next to the current value
- **Other Vitals**: May also have arrows if they have 3+ historical readings

### 3. Color Coding
- **Green (↘)**: Pain decreasing = Improving
- **Red (↗)**: Pain increasing = Worsening
- **Gray (→)**: Stable (less than 5% change)

### 4. Trend Label
- Below the value and arrow: "Improving", "Worsening", or "Stable"
- With reading count: "(30 readings)" or similar

### 5. Hover Tooltip
- Hover over the arrow → Should show tooltip
- Example: "Improving (30 readings over 30 days)"

### 6. Console Logs
- Debug logs should appear in console when panel opens
- Should show trend calculation details for each vital

---

## Common Patterns and Solutions

### Pattern 1: "I see the section title changed but no arrows"
**Solution**: Check console logs - likely insufficient data (<3 readings) or trend calculation failing

### Pattern 2: "I see arrows but they're all gray"
**Solution**: All trends are stable (less than 5% change) - this is actually correct behavior

### Pattern 3: "I see arrows but wrong colors"
**Solution**: Clinical context awareness may be incorrectly determining lower-is-better vs higher-is-better

### Pattern 4: "Console logs show everything correct but no visual arrows"
**Solution**: CSS issue - clear cache, restart Vite, check if Tailwind classes are applied

### Pattern 5: "Nothing changed at all after hard refresh"
**Solution**: Browser is aggressively caching - try incognito/private window or different browser

---

## Testing with Different Patients

If Emily Rodriguez doesn't work, try these patients:

### Patients with Sufficient Data
- **John Smith**: Likely has blood pressure readings
- **Jane Doe**: Likely has glucose readings
- **Any patient with alerts**: Usually has observation history

### Creating Test Data (Optional)
If no patients have sufficient data, you can create observations:

```javascript
// In browser console (while on site)
// This is just an example - actual API call may differ
await fetch('/api/observations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    patientId: 'patient-id-here',
    metricDefinitionId: 'metric-id-for-pain',
    value: 7,
    recordedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  })
});
```

Repeat with different values and dates to create trend data.

---

## Still Not Working? Diagnostic Information to Provide

If you've gone through all troubleshooting steps and still don't see trend indicators, provide:

1. **Screenshot** of Patient Context Panel showing the vitals section
2. **Console logs** (copy/paste or screenshot)
3. **Network tab** screenshot showing the API response structure
4. **Browser and version** (e.g., Chrome 120, Firefox 121)
5. **OS** (Windows, Mac, Linux)
6. **Time of last hard refresh** (to confirm using latest code)

---

## Reference: Implementation Files

**Frontend**:
- Component: `frontend/src/components/PatientContextPanel.jsx`
- Lines 91-133: `calculateTrendDirection()` function
- Lines 135-206: `getTrendIndicator()` function
- Lines 536-591: Vitals display with trend arrows

**Backend**:
- Controller: `src/controllers/patientController.js`
- Endpoint: `GET /api/patients/:id/context`
- Lines 656-678: Vitals trends calculation
- Lines 835-849: Grouping observations by metric key

**Documentation**:
- Full specification: `docs/VITALS-TREND-INDICATORS-IMPLEMENTATION.md`
- Algorithm details, clinical context rules, success criteria

---

**Last Updated**: 2025-10-22
**Frontend Compiled**: 6:16:54 PM (per frontend.log)
**Backend Verified**: ✅ Emily Rodriguez has 30 pain readings
**Data Structure Verified**: ✅ Keys match between lastReadings and trends

---

## Quick Diagnostic Summary

Based on my investigation, here's what I verified:

✅ **Backend Data**: Emily Rodriguez has 30 pain readings in database
✅ **Backend API**: Returns correct data structure with matching keys
✅ **Frontend Code**: PatientContextPanel.jsx contains all trend indicator code
✅ **Code Deployment**: HMR updates successful (6:16:54 PM)
✅ **Data Structure**: `vitals.lastReadings['pain_level_nrs']` and `vitals.trends['pain_level_nrs']` both exist

**Most Likely Issue**: Browser cache serving old JavaScript. Solution: Hard refresh (Ctrl+Shift+R).

**If hard refresh doesn't work**: Follow the detailed debugging checklist above starting with console logs.
