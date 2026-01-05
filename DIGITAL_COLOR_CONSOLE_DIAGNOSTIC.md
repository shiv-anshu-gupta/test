# 🔍 Digital Chart Color Update - Console Diagnostic Guide

## What to Look For in Browser Console (F12)

### When You Change a Digital Channel Color:

#### ✅ EXPECTED OUTPUT (After Fix)

```javascript
// Step 1: Color change triggered from Tabulator
[TABULATOR] ✅ onCellEdited: digital color for channel 0 changed
id: "digital-color-channel-0"
newColor: "#ff0000"

// Step 2: postMessage sent to parent window
[ChannelList] 📤 Sending postMessage to parent:
type: "CHANNEL_COLOR_CHANGED"
payload: {
  type: "digital",
  globalIdx: 0,
  newColor: "#ff0000"
}

// Step 3: Parent receives message and updates state
[MESSAGE_LISTENER] 📥 Received message:
type: "CHANNEL_COLOR_CHANGED"
globalIdx: 0
newColor: "#ff0000"

// Step 4: chartManager color subscriber fires
[color subscriber] 🎨 Color changed:
type: "digital"
globalIdx: 0
newColor: "#ff0000"
chartsWithThisChannel: 1

// Step 5: CRITICAL DEBUG - Shows the fix working!
[color subscriber] 📊 CRITICAL DEBUG - Digital color update:
globalChannelIdx: 0
chartChannelCount: 5                          ✅ Display order count
displayColorCount: 5                          ✅ MATCHES plugin signal count!
fullColorCount: 592                           ℹ️ Full array count
mapping: [0, 3, 7, 12, 15]                    ✅ Original channel indices
displayColors: [                              ✅ Filtered colors in display order
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff"
]

// Step 6: Plugin receives correct colors
[digitalFillPlugin] updateColors called:
receivedLength: 5                              ✅ Correct count!
signalsLength: 5                               ✅ MATCHES!
currentColors: [
  "#0f766e",  // Old color for signal 0
  "#f5cc7f",  // Signal 1
  "#e5989b",  // Signal 2
  "#7209b7",  // Signal 3
  "#3a86ff"   // Signal 4
]

// Step 7: Plugin maps new colors correctly
[digitalFillPlugin] Signal 0 color: "#0f766e" → "#ff0000"  ✅ CORRECT MAPPING!
[digitalFillPlugin] Signal 1 color: "#f5cc7f" → "#00ff00"
[digitalFillPlugin] Signal 2 color: "#e5989b" → "#0000ff"
[digitalFillPlugin] Signal 3 color: "#7209b7" → "#ffff00"
[digitalFillPlugin] Signal 4 color: "#3a86ff" → "#ff00ff"

[digitalFillPlugin] updateColors result:
changed: true                                  ✅ Colors actually changed!
updatedColors: [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff"
]

// Step 8: Plugin confirms color change
[color subscriber] ✅ Plugin confirmed color change for 5 signals

// Step 9: Canvas cleared for redraw
[color subscriber] 🧹 Cleared 4 canvas layers

// Step 10: Plugin draw hook executes with new colors
[digitalFillPlugin] 🎨 Draw hook called
signals: 5
currentColors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"]  ✅ NEW COLORS!
yScaleMin: -0.5
yScaleMax: 14.5
xDataLength: 12000

// Step 11: Signal 0 drawing details
[digitalFillPlugin] Signal 0 drawing:
currentColor: "#ff0000"                       ✅ USES NEW COLOR!
sigColor: "#ff0000"
usingColor: "#ff0000"
yDataLength: 12000
offset: 12
targetVal: 1

// Step 12: Rectangles actually drawn
[digitalFillPlugin] Signal 0 DRAW OPERATIONS:
rectanglesDrawn: 45                            ✅ Rectangles drawn!
yHeightValid: true                             ✅ Height valid!
fillColorValid: true                           ✅ Color valid!
operations: [                                  ✅ First 5 fill operations
  {op: "fillRect", x: 150, y: 245, width: 42, height: 13, color: "#ff0000"},
  {op: "fillRect", x: 234, y: 245, width: 84, height: 13, color: "#ff0000"},
  ...
]

// Step 13: Chart redrawn
[color subscriber] ✅ Digital chart canvas repainted with new colors

// ✅ RESULT: Rectangle on screen changes to RED immediately!
```

---

## ❌ BROKEN OUTPUT (Before Fix)

```javascript
// When you change a color, you'd see:

[color subscriber] 📊 Digital color update:
globalChannelIdx: 0

// ❌ WRONG! Full array size instead of display count
chartChannelCount: 5
displayColorCount: 592                        ❌ TOO MANY!
fullColorCount: 592

[digitalFillPlugin] updateColors called:
receivedLength: 592                            ❌ WRONG!
signalsLength: 5                               ❌ MISMATCH!

// ❌ Can't map - indices don't match
[digitalFillPlugin] Signal 0 color: "#0f766e" → undefined  ❌ CAN'T MAP!
[digitalFillPlugin] Signal 1 color: "#f5cc7f" → undefined
[digitalFillPlugin] Signal 2 color: "#e5989b" → undefined
[digitalFillPlugin] Signal 3 color: "#7209b7" → undefined
[digitalFillPlugin] Signal 4 color: "#3a86ff" → undefined

[digitalFillPlugin] updateColors result:
changed: false                                 ❌ NO CHANGE!

// Rectangle doesn't update on screen ❌
```

---

## 🎯 What Each Log Means

### "displayColorCount: 5" ✅

**Good!** This means the fix is working - we're passing only the display colors, not the full 592-color array.

### "displayColors: [...filtered array...]" ✅

**Good!** Shows the filtered colors in the correct order that matches plugin signals.

### "Signal 0 color: #old → #new" ✅

**Good!** Plugin is successfully mapping the color change.

### "changed: true" ✅

**Good!** Plugin detected the color actually changed and will redraw.

### "rectanglesDrawn: 45" ✅

**Good!** Rectangles are being drawn on canvas.

### "Canvas repainted with new colors" ✅

**Good!** Final step - chart is redrawn with new colors.

---

## 🚨 Troubleshooting

### If you see "displayColorCount: 592":

**Problem:** Still using the full array, not the filtered display colors
**Solution:** Check that chartManager.js has been updated with the `mapping` fix

### If you see "Signal 0 color: #old → undefined":

**Problem:** Color mapping failed - array index mismatch
**Solution:** Verify that `displayColors` array has exactly 5 elements and matches signal count

### If you see "changed: false":

**Problem:** Plugin didn't detect color change
**Solution:** Check that the new color is actually different from the old color

### If rectangles don't update visually:

1. Verify "rectanglesDrawn" count > 0 in console
2. Verify "yHeightValid: true" (rectangles have valid height)
3. Verify "fillColorValid: true" (color is not transparent)
4. Check browser DevTools → Elements → Find canvas element
5. Verify canvas has proper z-index and is not hidden behind other elements

---

## 📊 Data Flow Verification

To verify the complete data flow, follow this checklist:

- [ ] 1. Tabulator cell edit fires → See "[TABULATOR]" log
- [ ] 2. postMessage sent → See "[ChannelList] 📤 Sending postMessage"
- [ ] 3. Parent receives → See "[MESSAGE_LISTENER] 📥 Received message"
- [ ] 4. State updated → See "[color subscriber] 🎨 Color changed"
- [ ] 5. Debug info shows → See "[color subscriber] 📊 CRITICAL DEBUG"
- [ ] 6. displayColorCount = chartChannelCount → See both equal (not 592!)
- [ ] 7. Plugin receives colors → See "[digitalFillPlugin] updateColors called"
- [ ] 8. Signals map correctly → See "Signal 0 color: #old → #new"
- [ ] 9. Colors changed flag true → See "changed: true"
- [ ] 10. Canvas repaints → See "Digital chart canvas repainted"
- [ ] 11. Rectangle visual updates → **See new color on screen** ✅

If all 11 steps pass, the fix is working correctly!
