# 🔍 Color Update Diagnostic Guide

## What Changed

Added comprehensive diagnostic logging throughout the color update subscriber in `chartManager.js` to trace the complete data flow from Tabulator → State → Charts.

## Diagnostic Points Added

### 1. **Subscriber Entry Point** (Line 685-697)

```javascript
[COLOR SUBSCRIBER] 📢 Fired! change: { path, newValue, oldValue, type }
[COLOR SUBSCRIBER] 📍 Extracted: type="analog", globalIdx=5
```

**What to look for:**

- ✅ Do you see this log when you change a color in Tabulator?
- ✅ Is `type` correct (analog/digital)?
- ✅ Is `globalIdx` correct (channel index)?

---

### 2. **Case 2: Array Replacement** (Line 714-770)

```javascript
[COLOR SUBSCRIBER] 📋 CASE 2: Array replacement (26 colors)
  🎨 Chart 0 (analog): Updating 4 channels
    ✅ Series[1] color → #FF5500
    ✅ Chart 0 redrawn
```

**When this fires:** When you change a channel's color in Tabulator (normal case)

**What to look for:**

- ✅ Which CASE is triggered? (CASE 1 or CASE 2?)
- ✅ How many series were updated?
- ✅ Did `chart.redraw()` complete without errors?

---

### 3. **Case 1: Single Color Change** (Line 792-803)

```javascript
[COLOR SUBSCRIBER] 🎯 CASE 1: Single color change
  Channel: analog[5]
  New color: #FF5500
```

**When this fires:** If array replacement detection fails

**What to look for:**

- ✅ Which CASE is actually triggered?
- ✅ Is the new color string valid?

---

### 4. **Fast Index Lookup** (Line 824-835)

```javascript
[COLOR SUBSCRIBER] 🔍 Fast index lookup: "analog-5"
  Found 1 charts with this channel
  Total charts in memory: 2
  Charts by type: { analog: 2, digital: 0, computed: 0 }
```

**CRITICAL DIAGNOSTIC POINT:**

- ✅ Are charts being FOUND in the index?
- ✅ Is the total chart count correct?
- ❌ If "Found 0 charts", the index is broken!

---

### 5. **Series Update Details** (Line 856-920)

```javascript
🔍 Color Update Trace - analog[5] → #FF5500
Charts with this channel: 1
Successfully updated: 1 charts
Redraws scheduled: 1

  📊 Chart 0 (analog): {
    seriesIdx: 1,
    strokeType: "function",
    strokeReturns: "#FF5500",
    pathsCleared: true,
    pointsStroke: "function",
    chartWidth: 800,
    chartHeight: 400,
  }
  ✅ Stroke returns correct color: "#FF5500"
  ✅ chart.redraw() method exists
  ✅ Series is VISIBLE (show: true)
  ✅ Scale: y
```

**CRITICAL CHECKS:**

- ❌ `strokeType: "string"` → Should be `"function"`
- ❌ `pathsCleared: false` → Should be `true`
- ❌ Series is HIDDEN → Shows `show: false`
- ✅ All green = chart should update

---

## How to Test

### Step 1: Open Browser Console

```
Press F12 → Console tab
```

### Step 2: Load COMTRADE File

```
Load a file with both analog and digital channels
```

### Step 3: Open Tabulator

```
Click "Show Channel List" button
```

### Step 4: Change a Color

```
Click on any color cell in Tabulator
Select a new color
Look at Console
```

### Step 5: Read the Logs

```
Look for:
- [COLOR SUBSCRIBER] entries
- [DIAGNOSTIC] section
- Any ❌ ERROR markers
```

---

## Troubleshooting Tree

### Problem: Subscriber not firing

```
❌ No "[COLOR SUBSCRIBER] 📢 Fired!" in console

→ Check if postMessage listener exists in parent window
→ Look for errors in showChannelListWindow.js around line 525-630
→ Verify Tabulator callback is actually calling postMessage
```

### Problem: CASE not detected correctly

```
❌ Wrong case fires (e.g., should be CASE 2 but fires CASE 1)

→ Check the change.path structure
→ Verify change.newValue is an array for CASE 2
→ Look at console logs for globalIdx value
```

### Problem: Charts not found in index

```
❌ "Found 0 charts with this channel"

→ Index not rebuilt after chart creation!
→ Check if rebuildChannelToChartsIndex() is being called
→ Verify chart._channelIndices is populated
→ Check if chart._type is set correctly
```

### Problem: Stroke function exists but returns wrong color

```
❌ "Stroke returns correct color: [MISMATCH]"

→ Stroke function closure captured old color
→ strokeFunctions cache is stale
→ Check if strokeFn._color matches newColor
```

### Problem: Paths not cleared

```
❌ "pathsCleared: false"

→ chart.series[seriesIdx]._paths = null didn't work
→ uPlot version might handle paths differently
→ Check if series object is frozen/immutable
```

### Problem: Series is hidden

```
❌ "Series is HIDDEN (show: false)"

→ Channel disabled in Tabulator
→ Check channelState.analog.show[globalIdx]
→ Verify series visibility isn't being set elsewhere
```

---

## Console Output Format

### Success Scenario

```
✅ [COLOR SUBSCRIBER] 📢 Fired!
✅ [COLOR SUBSCRIBER] 📍 Extracted: type="analog", globalIdx=2
✅ [COLOR SUBSCRIBER] 📋 CASE 2: Array replacement
✅ [COLOR SUBSCRIBER] 🔍 Fast index lookup: "analog-2"
✅ [COLOR SUBSCRIBER] Found 1 charts with this channel
✅ [DIAGNOSTIC] ✅ Stroke returns correct color
✅ [DIAGNOSTIC] ✅ Series is VISIBLE
✅ [DIAGNOSTIC] ✅ chart.redraw() method exists
```

→ **Chart should update immediately on screen!**

### Failure Scenario 1: Subscriber not firing

```
[No logs appear in console]
```

→ **Problem:** Color state change not reaching subscriber
→ **Solution:** Check Tabulator callback and postMessage

### Failure Scenario 2: Charts not found

```
✅ [COLOR SUBSCRIBER] 📢 Fired!
✅ [COLOR SUBSCRIBER] 📍 Extracted: type="analog", globalIdx=2
❌ [COLOR SUBSCRIBER] Found 0 charts with this channel
❌ [COLOR SUBSCRIBER] Total charts in memory: 0
```

→ **Problem:** No charts exist in memory
→ **Solution:** Verify charts array is populated

### Failure Scenario 3: Stroke function wrong

```
✅ All logs up to diagnostic section
❌ [DIAGNOSTIC] ⚠️ STROKE MISMATCH: Expected "#FF5500", got "#000000"
```

→ **Problem:** Stroke function not updated
→ **Solution:** Check strokeFunctions cache

---

## Next Steps

1. **Run the diagnostic**

   - Change a color in Tabulator
   - Screenshot the console output
   - Share with me

2. **What I need to see:**

   - Full console log sequence
   - Any ERROR or WARNING entries
   - The final DIAGNOSTIC block

3. **Then I can:**
   - Identify the exact failure point
   - Provide targeted fix
   - Test the fix works

---

## Key Files Involved

| File                       | Role            | What Changed                        |
| -------------------------- | --------------- | ----------------------------------- |
| `showChannelListWindow.js` | Opens popup     | Color callback → postMessage        |
| `ChannelList.js`           | Tabulator table | postMessage listener                |
| `main.js`                  | Parent window   | Receives postMessage, updates state |
| `chartManager.js`          | Chart updates   | Color subscriber → chart redraw     |
| `chartComponent.js`        | Chart config    | uPlot options                       |

---

**Ready? Change a color and share the console output! 🚀**
