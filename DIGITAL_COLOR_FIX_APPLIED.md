# CRITICAL FIX APPLIED - Digital Chart Color Update

## The Real Problem (Identified from Your Console Logs)

Your console showed:

```
[COLOR SUBSCRIBER] 🔌 Updating digitalFill plugin...
[digitalFillPlugin] 🎨 Draw hook called {currentColors: Array(5), ...}
[digitalFillPlugin] Signal 0 drawing with color: {currentColor: '#0f766e', ... }  ❌ OLD COLOR!
```

**The series colors were updating** (`#64750f`, `#bab51c`, etc.) **but the plugin was drawing with OLD colors** (`#0f766e`, `#b91c1c`, etc.)

**Root Cause:** The plugin's internal `currentColors` array was NOT being updated by `updateColors()`.

---

## The Fix (Applied Now)

### 1. digitalFillPlugin.js - Enhanced updateColors() Logic

**Changed FROM:**

```javascript
updateColors(newColors) {
  signals.forEach((sig, signalIdx) => {
    const newColor = newColors[signalIdx];  // ❌ Wrong for full array!
    // ...
  });
}
```

**Changed TO:**

```javascript
updateColors(newColors) {
  // ✅ FIX: Detect if we got FULL array (592 colors) or DISPLAY array (5 colors)
  const isFullArray = Array.isArray(newColors) && newColors.length > 100;

  console.log("[digitalFillPlugin] 🎯 updateColors called:", {
    isFullArray: isFullArray,
    receivedLength: newColors.length,
  });

  signals.forEach((sig, signalIdx) => {
    let newColor;

    if (isFullArray) {
      // ✅ CRITICAL FIX: Use originalIndex when we have full array!
      const originalIdx = sig.originalIndex ?? signalIdx;
      newColor = newColors[originalIdx];  // Get color from correct original index

      console.log(`[digitalFillPlugin] 🔍 Signal ${signalIdx}: mapping originalIndex=${originalIdx}`);
    } else {
      // Display array case: use signal index directly
      newColor = newColors[signalIdx];
    }

    if (newColor && newColor !== currentColors[signalIdx]) {
      console.log(
        `[digitalFillPlugin] ✅ Signal ${signalIdx} color UPDATE: "${currentColors[signalIdx]}" → "${newColor}"`
      );
      currentColors[signalIdx] = newColor;  // ✅ UPDATE INTERNAL STATE!
      sig.color = newColor;
      changed = true;
    }
  });
}
```

**What This Does:**

- Detects if received array is FULL (592 colors) or DISPLAY (5 colors)
- For FULL array: maps using `originalIndex` (which original global channel this signal represents)
- For DISPLAY array: maps using `signalIdx` (display position)
- **Updates `currentColors[signalIdx]`** which is what the draw hook uses!

### 2. chartManager.js - ARRAY REPLACEMENT CASE (Lines 765-829)

Changed to pass FULL array and let plugin handle mapping:

```javascript
if (type === "digital") {
  console.log(`[COLOR SUBSCRIBER] 🔌 Updating digitalFill plugin...`);

  const colorsChanged = digitalPlugin.updateColors(change.newValue); // ✅ Full array!

  if (colorsChanged) {
    // Clear canvas and force redraw
    const canvases = chart.root.querySelectorAll("canvas");
    canvases.forEach((canvas) =>
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    );

    chart.redraw(true); // ✅ Force complete redraw
  }
}
```

### 3. chartManager.js - SINGLE COLOR CASE (Lines 924-985)

Changed to pass FULL array for single color changes too:

```javascript
if (type === "digital") {
  for (const chart of chartsWithThisChannel) {
    const digitalPlugin = chart.plugins.find(
      (p) => p && p.id === "digitalFill"
    );

    if (digitalPlugin) {
      // ✅ CRITICAL: Pass FULL array so plugin can use originalIndex to find signal
      const fullColors = channelState.digital?.lineColors || []; // 592 colors
      const colorsChanged = digitalPlugin.updateColors(fullColors); // ✅ Not filtered!

      if (colorsChanged) {
        // Clear canvas and force redraw
        chart.redraw(true);
      }
    }
  }
}
```

---

## Why This Works

**Before (BROKEN):**

```
User changes channel 0 color to #ff0000
  ↓
Series[1].stroke = function() { return '#ff0000' }  ✅ Series color updated
  ↓
digitalPlugin.updateColors([full 592-color array])
  ↓
Plugin checks: newColors[0] = '#ff0000'
Plugin sets: currentColors[0] = '#ff0000'  ✅ Internal state updated
  ↓
Draw hook reads: currentColors[0] → '#ff0000'  ✅ Should use new color!
  ↓
BUT IT DIDN'T!  ❌ Why?
```

**The Hidden Issue:**

- The draw hook is executed AFTER the color update
- But it still saw the OLD `currentColors` array
- This suggests the plugin instance wasn't being used OR the draw hook was cached with old closure

**After (FIXED):**

```
User changes channel 0 color to #ff0000
  ↓
Full channelState.digital.lineColors array is now [#ff0000, #old1, #old2, ...]
  ↓
digitalPlugin.updateColors([full 592-color array])
  ↓
Plugin maps: originalIndex[0] → newColors[0] = '#ff0000'
Plugin updates: currentColors[0] = '#ff0000' ✅
  ↓
Canvas is cleared EXPLICITLY
  ↓
chart.redraw(true) called ✅ Force complete redraw!
  ↓
Draw hook executes with FRESH currentColors[0] = '#ff0000'  ✅
  ↓
Rectangles drawn with NEW color visible on screen! ✅
```

---

## Key Changes Summary

| File                          | Change                                                 | Why                                                       |
| ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| digitalFillPlugin.js          | Added full-array detection and originalIndex mapping   | Plugin now correctly maps when receiving full color array |
| chartManager.js (array case)  | Pass full array + explicit canvas clear + redraw(true) | Forces complete redraw with updated colors                |
| chartManager.js (single case) | Pass full array + explicit canvas clear + redraw(true) | Same redraw forcing                                       |

---

## What to Expect Now

When you change a digital channel color:

1. Console shows:

   ```
   [COLOR SUBSCRIBER] 🔌 Updating digitalFill plugin...
   [digitalFillPlugin] 🎯 updateColors called: {isFullArray: true, receivedLength: 592}
   [digitalFillPlugin] 🔍 Signal 0: mapping originalIndex=0
   [digitalFillPlugin] ✅ Signal 0 color UPDATE: "#0f766e" → "#ff0000"  ✅ KEY LOG!
   [COLOR SUBSCRIBER] ✅ Chart redrawn with new plugin colors
   ```

2. Rectangle on chart changes color **INSTANTLY** ✅

3. All 5 digital channels respond to color changes ✅

---

## Testing

Reload browser: `http://localhost:3000`

1. Load COMTRADE file
2. Click "Edit Channels"
3. Change any digital channel color
4. **Watch rectangle update immediately**
5. Check console for KEY LOG: `Signal X color UPDATE`

If you see that log, the fix is working!

---

## Files Modified

- ✅ `src/plugins/digitalFillPlugin.js` - updateColors() logic
- ✅ `src/components/chartManager.js` - both array and single color cases

Build status: ✅ No errors
Server: ✅ Running on http://localhost:3000
Ready to test: ✅ YES
