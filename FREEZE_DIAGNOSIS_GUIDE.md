## FREEZE DIAGNOSIS GUIDE

### The Problem

When you change a color in Tabulator, the entire application freezes for 500ms-2s instead of updating instantly.

### The Pipeline

```
Tabulator (child window)
    ↓ (postMessage)
Main.js (message event listener)
    ↓ updateChannelFieldByIndex()
    ↓ debugLite.log() ← 🔴 POTENTIAL BOTTLENECK
    ↓ (state mutation)
Subscribers fire
    ↓ chartManager color subscriber
    ↓ chart.redraw(false) ← 🔴 POTENTIAL BOTTLENECK
    ↓
UI updates
```

### Known Bottlenecks

#### 1. **debugLite.log() DOM Updates** (MOST LIKELY)

- **Location**: Called from `updateChannelFieldByID()` and `updateChannelFieldByIndex()`
- **Impact**: Each log() call updates the debug panel DOM, triggering reflows
- **Evidence**: If messages show >50ms, DOM updates are the culprit
- **Fix**: Comment out all `debugLite.log()` calls in the message handler

```javascript
// Try replacing all debugLite.log() calls with comments
// debugLite.log("updateByID.attempt", {...}); // DISABLED
```

#### 2. **chart.redraw(false) Performance**

- **Location**: `chartManager.js` color subscriber (line ~500)
- **Impact**: uPlot canvas redraw can be expensive with many series
- **Evidence**: Color update timing > 20ms but < 100ms
- **Fix**: Skip redraw if possible, or debounce multiple color changes

#### 3. **Multiple Subscribers Firing**

- **Location**: Both `color` and `name` subscribers might fire
- **Evidence**: Two separate timing logs (~10ms each = 20ms total)
- **Fix**: Batch color + name updates together, redraw once

#### 4. **Full Chart Recreation**

- **Location**: `chartManager.js` chart.setSeries() failure fallback
- **Impact**: Destroys and recreates entire chart (~500-1000ms)
- **Evidence**: Single color change takes >200ms
- **Fix**: Check if chart.\_channelIndices is set correctly

---

## HOW TO DIAGNOSE (STEP BY STEP)

### Step 1: Open Browser DevTools

Press **F12** → Go to **Console** tab

### Step 2: Change a Color in Tabulator

Look for these logs:

```
[Performance] 📨 Message received from ChildWindow: callback_color
[Performance] ✅ Message processing: callback_color { totalMs: "45.32" }
[Performance] 🐢 Color update: 8.5ms for 2 charts ✅
```

**Key metrics:**

- First log = message arrived at main.js
- Second log = main.js finished processing
- Third log = chart update finished

### Step 3: Check Which Phase is Slow

**If message processing time > 100ms:**

- Problem is in main.js (likely debugLite.log)
- Solution: Disable debugLite.log() calls

**If color update time > 50ms:**

- Problem is in chartManager (likely chart.redraw())
- Solution: Optimize redraw or skip it

**If message processing time > 200ms:**

- Problem is full chart recreation
- Solution: Check chart.\_channelIndices is set

### Step 4: Disable debugLite.log() to Test

Edit `src/main.js` and comment out these lines:

```javascript
// In updateChannelFieldByID() and updateChannelFieldByIndex():
// debugLite.log("updateByID.attempt", {...}); // DISABLED
```

Then reload and test color change again. If it becomes fast, debugLite was the problem.

---

## DETAILED ANALYSIS TEMPLATE

When you change a color, paste the console output here:

```
TIME BREAKDOWN:
┌─ Message Processing: _____ ms
│  ├─ Path parsing: _____ ms
│  ├─ State update: _____ ms
│  └─ Subscribers: _____ ms ← Which one is slow?
└─ Chart Update: _____ ms
   ├─ Series update: _____ ms
   ├─ Redraw: _____ ms
   └─ debugLite.log: _____ ms
```

---

## QUICK FIXES (Try in Order)

### Fix #1: Disable debugLite.log() in Hot Path

Search `src/main.js` for `debugLite.log` and comment out all calls in the message handler.

Expected improvement: 50-100ms faster (if that was the bottleneck)

### Fix #2: Batch Multiple Color Changes

If you're changing multiple colors at once, batch them:

```javascript
// Instead of:
color1 = "red";
color2 = "blue"; // triggers 2 separate updates

// Use:
Object.assign(state, { color1: "red", color2: "blue" }); // 1 batch
```

### Fix #3: Skip Redraw for Color Changes

In `chartManager.js`, skip `chart.redraw()` for color-only changes:

```javascript
// Instead of: chart.redraw(false) every time
// Use: Skip redraw, browser will update canvas on next paint anyway
```

### Fix #4: Debounce Rapid Changes

If Tabulator sends 10 messages in 100ms, debounce them:

```javascript
let pendingUpdate = null;
function handleMessage(msg) {
  clearTimeout(pendingUpdate);
  pendingUpdate = setTimeout(() => processMessage(msg), 16); // batch in 1 frame
}
```

---

## ADVANCED: Profile the Exact Bottleneck

### Using Performance API (DevTools → Performance tab)

1. Open DevTools → **Performance** tab
2. Click **Record**
3. Change a color in Tabulator
4. Stop recording
5. Look for:
   - **Long yellow bar** = JavaScript execution
   - **Long purple bar** = Rendering (reflow/repaint)
   - **Long green bar** = Composite

If you see **long yellow bars** > 100ms: JavaScript is blocking
If you see **long purple bars** > 50ms: DOM updates are expensive

### Console Timings (Our Diagnostics)

We added detailed timing logs. Look for:

```
[Performance] 🐢 Color update SLOW: 145ms |
[Extract: 0.1ms | Cache: 0.05ms | Series: 5.2ms | Redraw: 139.8ms]
```

The `Redraw: 139.8ms` tells you exactly where time is spent!

---

## ROOT CAUSE CHECKLIST

Check each of these:

- [ ] **debugLite.log() calls** - Comment them all out and test
- [ ] **chart.redraw(false)** - See if skipping it makes colors fast
- [ ] **Multiple subscribers** - Check if both color + name subscribers fire
- [ ] **chart.\_channelIndices** - Verify it's set correctly (check console logs)
- [ ] **Full chart recreation** - Check if setSeries() is failing silently
- [ ] **Browser performance** - Check if system is under load (CPU, memory)

---

## NEXT STEPS

1. **Run a color change** and paste ALL console logs here
2. **Identify which phase is slow** using the timing breakdown
3. **Apply the corresponding fix**
4. **Test** and confirm improvement

The diagnostics system is now in place. Every state change will show you exactly where time is spent! 🎯
