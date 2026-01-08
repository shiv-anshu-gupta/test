# Complete Computed Channel Color Update - Ready to Test

## ✅ Implementation Complete

All code changes have been made to enable computed channel color changes:

1. **Tabulator** → sends message
2. **Main.js** → receives, updates state, chart, and storage
3. **localStorage** → persists color

**NO SUBSCRIBERS USED** - Direct, synchronous updates only.

---

## Code Changes Summary

### File: src/main.js

#### Change 1: Added Helper Function (Line ~440)

```javascript
function updateComputedChartColor(computedIdx, newColor) {
  // Gets chart from chartsComputed[idx]
  // Updates series.stroke = () => newColor
  // Clears _paths cache
  // Calls chart.redraw(false)
}
```

#### Change 2: Enhanced COLOR Case Handler (Line 3967-4111)

```javascript
case CALLBACK_TYPE.COLOR: {
  // Extract: messageType, messageIdx, color from payload

  // PART A: updateChannelFieldByIndex(type, idx, "lineColors", color)
  // PART B: updateComputedChartColor(idx, color)
  // PART C: saveComputedChannelsToStorage()
}
```

**No changes to other files** - ChannelList and computedChannelStorage already work correctly.

---

## Data Flow (Visual)

```
┌─────────────────────────────────────────────┐
│  USER: Edit Color in ChannelList (Tabulator) │
└────────────────┬──────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ cellEdited event    │
        │ Payload generated:  │
        │ {type: "computed",  │
        │  idx: 0,            │
        │  color: "#fff"}     │
        └────────┬────────────┘
                 │
                 ▼ postMessage()
                 │
        ┌────────────────────────────┐
        │ MAIN PROCESS MESSAGE LISTENER
        │ (main.js line 3920)        │
        └────────┬───────────────────┘
                 │
                 ▼ Routes to COLOR case
                 │
        ┌────────────────────────────────┐
        │ COLOR HANDLER (line 3967)      │
        │                                │
        │ ✅ THREE SIMULTANEOUS UPDATES: │
        │                                │
        │ 1️⃣ UPDATE STATE                │
        │   channelState.computed        │
        │   .lineColors[0] = "#fff"      │
        │                                │
        │ 2️⃣ UPDATE CHART               │
        │   chartsComputed[0]            │
        │   .series[1].stroke =          │
        │   () => "#fff"                 │
        │   .redraw(false)               │
        │                                │
        │ 3️⃣ UPDATE STORAGE             │
        │   saveToStorage()              │
        │   localStorage updated         │
        └────────┬───────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ RESULT: All three sync        │
        │ ✅ UI aware of change         │
        │ ✅ Chart visually updated     │
        │ ✅ Persisted to localStorage  │
        └───────────────────────────────┘
```

---

## What Happens in Each Step

### Step 1: ChannelList Sends Message

**File**: src/components/ChannelList.js (line 2219)

```javascript
table.on("cellEdited", (cell) => {
  if (field === "color") {
    payload = {
      channelID: rowData?.channelID, // "computed_0"
      type: rowData?.type, // "computed"
      idx: rowData?.originalIndex, // 0
      color: newValue, // "#d1dd2c"
      row: rowData,
    };
    targetParent.postMessage({
      type: "callback_color",
      payload: payload,
    });
  }
});
```

### Step 2: Main Process Receives & Routes

**File**: src/main.js (line 3920)

```javascript
window.addEventListener("message", (event) => {
  if (event.data.type === "callback_color") {
    // Extract payload
    // Route to CALLBACK_TYPE.COLOR case handler
  }
});
```

### Step 3: COLOR Case Handler - Triple Update

**File**: src/main.js (line 3967)

```javascript
case CALLBACK_TYPE.COLOR: {
  const messageType = payload.type;      // "computed"
  const messageIdx = payload.idx;        // 0
  const color = payload.color;           // "#d1dd2c"

  // UPDATE 1: channelState
  updateChannelFieldByIndex("computed", 0, "lineColors", "#d1dd2c");

  // UPDATE 2: Chart visual
  updateComputedChartColor(0, "#d1dd2c");
  // └─> chartsComputed[0].series[1].stroke = () => "#d1dd2c"
  // └─> chartsComputed[0].redraw(false)

  // UPDATE 3: Storage
  saveComputedChannelsToStorage(
    cfg.computedChannels,
    globalData.computedData
  );
}
```

---

## Expected Console Output

When user changes a computed channel color, you should see:

```
[ChannelList] 📤 POSTMESSAGE DIAGNOSTIC - Sending to parent
[ChannelList] Message type: callback_color
[ChannelList] Field: color
[ChannelList] Channel ID: computed_0
[ChannelList] New value: #d1dd2c

[COLOR HANDLER] 📢 Color change received: {
  type: "computed",
  idx: 0,
  color: "#d1dd2c",
  isComputed: true
}

[COLOR HANDLER] 🎨 Updating computed[0] color → #d1dd2c
[COLOR HANDLER] 💾 Updating computed channel...

[updateComputedChartColor] 🎨 Updating chart 0 color → #d1dd2c
[updateComputedChartColor] ✅ Updated series[1] stroke function
[updateComputedChartColor] ✅ Chart 0 redrawn successfully

[COLOR HANDLER] ✅ Chart updated and localStorage saved
```

---

## How to Test

### Test 1: Immediate Visual Update

```
1. Load COMTRADE file with computed channel
2. Right-click chart → Open ChannelList
3. Find computed channel row
4. Click color cell
5. Select new color (e.g., red #ff0000)
6. EXPECT: Chart color changes instantly
7. EXPECT: Console shows all logs above
```

### Test 2: Persistence Across Reload

```
1. Change computed channel color to #00ff00 (green)
2. Open DevTools → Application → localStorage
3. Find "COMTRADE_COMPUTED_CHANNELS" key
4. Verify: color field = "#00ff00"
5. Refresh page (F5 or Ctrl+R)
6. EXPECT: Computed channel still green in chart
7. EXPECT: ChannelList shows green in color cell
```

### Test 3: No Interference with Other Types

```
1. Change ANALOG channel color → should work normally
2. Change DIGITAL channel color → should work normally
3. Change COMPUTED channel color → should work normally
4. EXPECT: No cross-type interference
5. EXPECT: No console errors
```

### Test 4: Verify Storage Merge

```
1. Change computed channel name to "Test"
2. Change computed channel color to #123456
3. Reload page
4. Open DevTools → Application → localStorage
5. Check COMTRADE_COMPUTED_CHANNELS:
   {
     name: "Test",
     color: "#123456",     ← NEW COLOR
     ...other fields
   }
```

---

## Debugging If Issues Occur

### Issue: Color doesn't change in chart

**Check**:

1. Console logs show "[updateComputedChartColor] ✅" ?
   - If YES: chart.redraw() succeeded, but may be rendering off-screen
   - If NO: chart not found at index, check chartsComputed array
2. Is chartsComputed[idx] defined?
   ```javascript
   window.__chartsComputed[0]; // Should show uPlot instance
   ```

### Issue: localStorage not updating

**Check**:

1. Console shows "[COLOR HANDLER] ✅ Chart updated and localStorage saved" ?
2. Run in console:
   ```javascript
   JSON.parse(localStorage.COMTRADE_COMPUTED_CHANNELS)[0].color;
   ```
   Should show the new color

### Issue: Color reverts after reload

**Check**:

1. Are you using `import()` correctly in async context?
   - The `import()` is inside the message handler
   - Handler must be async (it already is via case statement)
2. Check storage merge logic in computedChannelStorage.js:
   - It prioritizes cfg color over data color ✓ (already fixed)

---

## Code Safety Checks

✅ **Variable Scope**: messageType, messageIdx defined before use
✅ **Type Checking**: messageType === "computed" comparison
✅ **Error Handling**: try/catch around chart update and storage
✅ **Null Checks**: if (chartsComputed[idx]), if (chart.series)
✅ **Logging**: Comprehensive logs for debugging
✅ **Async/Await**: import() used correctly in message handler
✅ **No Breaking Changes**: Analog/Digital paths unchanged

---

## Ready to Test! 🚀

1. Refresh browser (Ctrl+Shift+R) to clear cache
2. Load COMTRADE file
3. Create or open computed channel
4. Right-click chart → ChannelList
5. Edit computed channel color
6. Watch console for logs
7. Verify chart updates and localStorage saves

All code is in place and ready!
