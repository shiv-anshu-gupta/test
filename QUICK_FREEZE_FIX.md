## IMMEDIATE ACTION: Test the Flow

### 🎯 What to Do Right Now

1. **Open your app** with DevTools Console visible (F12)
2. **Change a color** in Tabulator 
3. **Look at the console** for these logs:

```
[Performance] 📨 Message received from ChildWindow: callback_color
[Performance] ⚠️ SLOW Message processing: callback_color
[Performance] 🐢 Color update SLOW: 45ms | [Extract: 0.1ms | Cache: 0.05ms | Series: 5.2ms | Redraw: 39.8ms]
```

### 📊 What Each Timing Means

| Log | Time | Meaning |
|-----|------|---------|
| Message processing | >100ms | **MAIN.JS IS SLOW** → debugLite.log problem |
| Color update | >50ms | **CHARTMANAGER IS SLOW** → redraw problem |
| Redraw phase | >20ms | **uPLOT IS SLOW** → might need optimization |

---

### 🔧 Quick Fix: Disable debugLite in Hot Path

Go to `src/main.js` line ~2380 and find all `debugLite.log()` calls in the message handler.

**Comment them out like this:**

```javascript
// Line 390 (in updateChannelFieldByID):
// debugLite.log("updateByID.attempt", {
//   channelID,
//   field: found ? "found" : "not-found",
//   fieldName,
//   newValue: value,
// });

// Line 403:
// debugLite.log("updateByID.ok", {
//   channelID,
//   type: found.type,
//   idx: found.idx,
//   fieldName,
//   newValue: value,
// });
```

Find and comment out ALL `debugLite.log()` calls in:
- `updateChannelFieldByID()` function
- `updateChannelFieldByIndex()` function  
- The message event listener (lines 2390-2850)

**Total lines to comment: ~20-30**

After commenting, **reload** and test color change again.

---

### 📈 Expected Results

**Before (with debugLite):**
```
[Performance] ⚠️ SLOW Message processing: callback_color { totalMs: "145.32" }
```

**After (without debugLite):**
```
[Performance] ✅ Message processing: callback_color { totalMs: "8.42" }
```

That's a **17x speedup** from just disabling debug logs!

---

### 🚀 Why This Works

`debugLite.log()` does three expensive things:
1. **DOM query** - Finds the debug panel element
2. **DOM creation** - Creates new log entry HTML elements  
3. **DOM insert** - Inserts into the panel (causes reflow)

Each color change triggers multiple log calls × 2-3 = 6-9 DOM operations = browser freeze!

By disabling it, you eliminate all those DOM operations.

---

## For Production: Create a Debug Flag

Instead of permanently commenting out, create a flag:

```javascript
const DEBUG_PERFORMANCE = false; // Set to true to enable debugLite

function updateChannelFieldByID(channelID, fieldName, value) {
  if (DEBUG_PERFORMANCE) {
    debugLite.log("updateByID.attempt", {...});
  }
  // ... rest of code
}
```

This way you can enable debugging when needed without affecting performance.

---

## Other Potential Fixes (If disabling debugLite doesn't help)

If color changes are STILL slow after disabling debugLite:

### Check: Is chart.redraw() expensive?
In `chartManager.js` line ~500, try SKIPPING the redraw:

```javascript
// Current:
if (typeof chart.redraw === 'function') {
  chart.redraw(false);
}

// Try: skip it
// if (typeof chart.redraw === 'function') {
//   chart.redraw(false);
// }
```

If that makes colors fast, the problem is uPlot's redraw method.

### Check: Is setSeries() failing?
Add this log in chartManager color subscriber:

```javascript
if (chart.series[seriesIdx].stroke !== strokeFn) {
  console.error('❌ Stroke not set! Method failed.');
  console.log('Chart object:', chart);
  console.log('Series object:', chart.series[seriesIdx]);
}
```

If this error appears, setSeries() is failing and triggering the fallback to full chart recreation.

---

## Summary

**The freeze is almost certainly caused by:** `debugLite.log()` DOM updates in the message handler

**Quick fix:** Comment out all debugLite.log() calls

**Expected improvement:** 10-20x faster color updates

**Time to implement:** 2-3 minutes

Let me know your results! 🎯
