# Computed Channel Color - ID-Based Lookup Implementation

## What Changed

### Problem

- Previous index-based approach tried to match `idx: 3` from Tabulator to `chartsComputed[3]`
- But indices don't match - Tabulator row index ≠ computed channel array index
- Result: "Chart not found at index 3" error

### Solution

- **Separate callback type**: `callback_computed_color` (not `callback_color`)
- **ID-based lookup**: Search by channel ID like "V4" instead of row index
- **Two new helper functions** for computed-specific operations
- **Dedicated handler** in main.js that finds correct chart by ID

---

## Code Changes

### File: `src/main.js`

#### Added Two New Helper Functions (Lines 446-516)

**1. `findComputedChannelIndexById(channelId)`**

- Searches `cfg.computedChannels` for channel with matching ID
- Returns the actual array index
- Logs success/failure for debugging

**2. `updateComputedChartColorById(channelId, newColor)`**

- Takes channel ID (e.g., "V4") instead of array index
- Uses `findComputedChannelIndexById()` to find correct chart
- Updates chart series stroke directly
- Clears cache and redraws

#### New Case Handler (Lines 4089-4131)

**`case "callback_computed_color":`**

- Separate from analog/digital color handler
- Extracts `id`, `color` from payload
- Calls `updateChannelFieldByID()` for state update
- Calls `updateComputedChartColorById()` for chart update
- Saves to localStorage

#### Modified COLOR Handler (Lines 4009-4061)

**Removed computed channel handling**

- Now only handles analog/digital colors
- Checks if channel is computed and delegates to separate handler
- Cleaner, focused responsibility

---

### File: `src/components/ChannelList.js`

#### Updated Color Field Handling (Lines 2245-2276)

**Conditional Message Type**

```javascript
if (field === "color") {
  if (rowData?.type?.toLowerCase() === "computed") {
    // Send computed-specific callback
    messageType = "callback_computed_color";
    payload = { id: rowData?.id, color: newValue, ... };
  } else {
    // Send regular callback for analog/digital
    messageType = "callback_color";
    payload = { idx, color: newValue, ... };
  }
}
```

**Key Change**: Channel ID is now included in payload instead of row index

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│ USER CHANGES COMPUTED CHANNEL COLOR IN TABULATOR    │
│ - rowData = {id: "V4", type: "Computed", ...}      │
└─────────────────────────┬───────────────────────────┘
                          │
                      Check type
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼ Is "Computed"                     ▼ Is "Analog" or "Digital"

  postMessage({                        postMessage({
    type: "callback_computed_color",     type: "callback_color",
    payload: {                           payload: {
      id: "V4",        ←── ID-based      idx: 3,  ←── Index-based
      color: "#...",                       color: "#...",
    }                                    }
  })                                   })
        │                                   │
        └─────────────────┬─────────────────┘
                          │
            ┌─────────────▼──────────────┐
            │ Main.js Message Listener    │
            └─────────────┬──────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼ case "callback_computed_color"    ▼ case "callback_color"

  1. Extract: id = "V4"              1. Extract: idx = 3
  2. updateChannelFieldByID("V4")     2. updateChannelFieldByIndex("analog", 3)
  3. findComputedChannelIndexById()
     ↓ Searches cfg.computedChannels
     ↓ Returns actual index (e.g., 0)
  4. updateComputedChartColorById("V4", color)
     ↓ Gets correct chart: chartsComputed[0]
     ↓ Updates series.stroke
     ↓ Redraws
  5. saveComputedChannelsToStorage()
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                    ┌─────▼──────┐
                    │ ✅ SUCCESS  │
                    └────────────┘
```

---

## Why This Works

| Issue                | Previous Approach                 | New Approach                                |
| -------------------- | --------------------------------- | ------------------------------------------- |
| **Index Mismatch**   | Used Tabulator row idx            | Uses channel ID lookup                      |
| **Chart Lookup**     | `chartsComputed[idx]` unreliable  | `findComputedChannelIndexById()` guaranteed |
| **Duplicated Logic** | Mixed analog/digital and computed | Separate, focused handlers                  |
| **Debugging**        | Hard to trace index               | Clear ID path in logs                       |

---

## Expected Console Output

When changing computed channel color:

```
[ChannelList] 📤 COMPUTED COLOR MESSAGE: {id: "V4", color: "#e9e10c"}

[COMPUTED COLOR HANDLER] 📢 Computed channel color change received:
[COMPUTED COLOR HANDLER] 🎯 Looking up channel by ID: "V4"

[findComputedChannelIndexById] ✅ Found channel "V4" at computed index 0

[COMPUTED COLOR HANDLER] ✅ Updated state for channel: V4
[COMPUTED COLOR HANDLER] 💾 Updating chart for channel: V4

[updateComputedChartColorById] 🎨 Updating computed channel "V4" color → #e9e10c
[updateComputedChartColorById] ✅ Found chart instance at index 0
[updateComputedChartColorById] ✅ Updated series[1] stroke function
[updateComputedChartColorById] ✅ Chart redrawn successfully

[COMPUTED COLOR HANDLER] ✅ Saved to localStorage
```

---

## Testing

1. **Refresh browser**: Ctrl+Shift+R
2. **Load COMTRADE file** with computed channels
3. **Open ChannelList popup**: Right-click chart
4. **Find computed channel** (e.g., "V4") in Tabulator
5. **Click color cell** and change color
6. **Verify**:
   - ✅ Chart updates instantly
   - ✅ Console shows ID-based lookup logs
   - ✅ No "Chart not found" errors
   - ✅ localStorage updated
   - ✅ Color persists after page reload

---

## Backwards Compatibility

✅ **Analog and Digital channels unchanged**

- Still use index-based approach
- Still use `callback_color` message type
- No impact on existing functionality

---

## Error Handling

All new functions include comprehensive error handling:

- Missing channel ID → warns and continues
- Chart not found → warns with index
- Series not found → warns and returns
- localStorage save → catches and logs error

---

## Summary

This implementation is **simpler, more robust, and easier to debug** because:

1. ID-based lookup is deterministic (always finds the right channel)
2. Separate handler focuses on computed-only logic
3. Clear separation from analog/digital color handling
4. Detailed logging at each step for troubleshooting
5. No shared state/logic between different channel types

Ready to test!
