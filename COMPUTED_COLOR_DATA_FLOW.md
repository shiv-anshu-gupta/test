# Computed Channel Color Data Flow (Complete Pipeline)

## Overview

Complete end-to-end data flow for computed channel color changes **without** using subscribers. Simple, direct update path.

## Data Flow Pipeline

### STEP 1: User Changes Color in Tabulator (ChannelList.js)

```
ChannelList.js cellEdited event
  ↓
field === "color" detected
  ↓
Build payload:
{
  channelID: rowData?.channelID,
  type: rowData?.type,           ← "computed"
  idx: rowData?.originalIndex,   ← Channel index
  color: newValue,               ← New hex color
  row: rowData
}
  ↓
postMessage to parent window
```

**File**: [src/components/ChannelList.js](src/components/ChannelList.js#L2219)
**Key Code**: Lines 2243-2250 (payload building for color field)

---

### STEP 2: Main Process Receives Message (main.js)

```
Window message listener detects "callback_color" type
  ↓
Extracts payload:
- messageType = "computed"
- messageIdx = payload.idx
- color = payload.color
  ↓
Logs diagnostic info
```

**File**: [src/main.js](src/main.js#L3920) (message listener)
**Flow**: Lines 3920-3930 dispatch to COLOR case handler

---

### STEP 3: COLOR Case Handler - 3-Part Update (main.js)

```
updateChannelFieldByIndex("computed", idx, "lineColors", color)
  ↓
  ├─→ PART A: channelState.computed.lineColors[idx] = color
  │   └─→ Updates reactive state (UI becomes aware of change)
  │
  ├─→ PART B: updateComputedChartColor(idx, color)
  │   ├─→ Get chart from chartsComputed[idx]
  │   ├─→ Update series.stroke = () => newColor
  │   ├─→ Clear series._paths cache
  │   └─→ chart.redraw(false) → Visual update
  │
  └─→ PART C: saveComputedChannelsToStorage()
      ├─→ Load existing channels from localStorage
      ├─→ Merge with current cfg.computedChannels
      ├─→ Save with new color to localStorage
      └─→ Persist color across page reloads
```

**File**: [src/main.js](src/main.js#L3967)
**Color Handler**: Lines 3967-4069
**Chart Update Function**: `updateComputedChartColor()` at line ~440

---

## Critical Functions

### 1. updateChannelFieldByIndex() - State Update

**Location**: [src/main.js](src/main.js#L933)

```javascript
function updateChannelFieldByIndex(type, idx, fieldName, value) {
  // Updates channelState[type][fieldName][idx] = value
  // Triggers Proxy mutation detection → reactive update
  if (type === "computed") {
    channelState.computed[fieldName][idx] = value;
  }
}
```

### 2. updateComputedChartColor() - Chart Visual Update

**Location**: [src/main.js](src/main.js#~440)

```javascript
function updateComputedChartColor(computedIdx, newColor) {
  const chart = chartsComputed[computedIdx];

  // Update stroke functions
  for (let i = 1; i < chart.series.length; i++) {
    chart.series[i].stroke = () => newColor;
    if (chart.series[i]._paths) chart.series[i]._paths = null;
  }

  // Force redraw
  chart.redraw(false);
}
```

### 3. saveComputedChannelsToStorage() - Persistence

**Location**: [src/utils/computedChannelStorage.js](src/utils/computedChannelStorage.js#L14)

```javascript
function saveComputedChannelsToStorage(computedData, dataOrMetadata) {
  // Merges with existing localStorage data
  // Preserves cfg colors (priority: cfg > data)
  // Saves complete channel metadata including new color
}
```

---

## Message Flow Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPUTED COLOR CHANGE                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    USER EDITS COLOR IN TABULATOR
                    (ChannelList.js cellEdited)
                              ↓
                    BUILD MESSAGE PAYLOAD
                    {type: "computed", idx: 0, color: "#fff"}
                              ↓
                    postMessage() to parent
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   MAIN PROCESS RECEIVES                       │
│              (main.js message listener @ line 3920)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ROUTE TO COLOR CASE HANDLER
                        (line 3967)
                              ↓
                ┌─────────────┬──────────────┬──────────────┐
                ↓             ↓              ↓              ↓
            UPDATE       UPDATE CHART   SAVE TO STORAGE
            STATE        VISUAL          (localStorage)
                ↓             ↓              ↓
            State      Chart sees     Persists color
            updates    new color      across reloads
```

---

## Data Structures Involved

### Payload from ChannelList

```javascript
{
  channelID: "computed_0",
  type: "computed",
  idx: 0,
  color: "#d1dd2c",
  row: { originalIndex: 0, type: "computed", ... }
}
```

### channelState after update

```javascript
channelState.computed.lineColors[0] = "#d1dd2c";
```

### Chart series object

```javascript
chart.series[1].stroke = () => "#d1dd2c";
chart.series[1]._paths = null; // Force regeneration
```

### localStorage after save

```javascript
COMTRADE_COMPUTED_CHANNELS: [
  {
    id: "...",
    name: "Computed 1",
    color: "#d1dd2c",  ← NEW COLOR SAVED
    ...
  }
]
```

---

## Why No Subscribers?

✅ **Direct & Simple**: Color change → Update state → Update chart → Save  
✅ **No Race Conditions**: Single synchronous flow, no async subscribers  
✅ **Reliable**: Each step directly controls the next  
✅ **Debuggable**: Console logs show exact flow  
✅ **Performant**: No watcher overhead, just direct updates

---

## Console Logs Expected

When changing a computed channel color from Tabulator:

```
[ChannelList] 📤 POSTMESSAGE DIAGNOSTIC...
[ChannelList] Message type: callback_color
[ChannelList] Field: color
[COLOR HANDLER] 📢 Color change received...
[COLOR HANDLER] ✅ Updated by channelID or index
[updateComputedChartColor] 🎨 Updating chart 0 color → #d1dd2c
[updateComputedChartColor] ✅ Updated series[1] stroke function
[updateComputedChartColor] ✅ Chart 0 redrawn successfully
[COLOR HANDLER] 💾 Chart updated and localStorage saved
[COLOR HANDLER] ✅ Chart updated and localStorage saved
```

---

## Testing Checklist

- [ ] Change computed channel color in Tabulator
- [ ] Color updates immediately in computed chart
- [ ] Console shows all expected logs
- [ ] Refresh page - color persists
- [ ] localStorage contains new color in COMTRADE_COMPUTED_CHANNELS
- [ ] No console errors
- [ ] Analog/Digital color changes still work
- [ ] No interference between channel types
