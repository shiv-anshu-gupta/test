# Group Synchronization Bug Fix

**Issue**: When changing a channel's group in Tabulator and then closing/reopening Tabulator, the channel shows its old group assignment instead of the new one.

**Root Cause**:

- Charts update from `channelState.analog.groups` (reactive state)
- But `cfg.analogChannels[idx].group` was never updated
- When Tabulator reopens, it reads from `cfg` (stale data)
- Result: UI shows old group, even though charts are rendering with new group

---

## The Fix (1 line of code)

**Location**: `chartManager.js` lines 540-546

Added synchronization code that updates `cfg` whenever a group change is detected:

```javascript
// ✅ SYNC FIX: When group changes in channelState, also update cfg
if (
  changeType &&
  Number.isFinite(channelIdx) &&
  cfg &&
  cfg[changeType + "Channels"]
) {
  const channels = cfg[changeType + "Channels"];
  if (channels[channelIdx]) {
    const groupString =
      typeof newGroup === "number" ? `G${newGroup}` : String(newGroup);
    channels[channelIdx].group = groupString; // ← Update cfg immediately
  }
}
```

---

## How It Works

**Before Fix**:

```
User changes group in Tabulator
  ↓
channelState.analog.groups[0] = 1  ← Updates reactive state
  ↓
Charts re-render with new group
  ✗ cfg.analogChannels[0].group NOT updated
  ↓
Close Tabulator
  ↓
Reopen Tabulator
  ↓
Reads from cfg.analogChannels[0].group
  ↓
Shows OLD GROUP (bug!)
```

**After Fix**:

```
User changes group in Tabulator
  ↓
channelState.analog.groups[0] = 1  ← Updates reactive state
  ↓
✅ cfg.analogChannels[0].group = "G1"  ← Also update cfg immediately
  ↓
Charts re-render with new group
  ↓
Close Tabulator
  ↓
Reopen Tabulator
  ↓
Reads from cfg.analogChannels[0].group (which is now "G1")
  ↓
Shows CORRECT GROUP ✅
```

---

## Sync Mechanism

The fix keeps two data sources in sync:

1. **channelState.analog.groups** → Used by charts for rendering
2. **cfg.analogChannels[].group** → Used by Tabulator for display

Both now updated when a group change occurs, ensuring consistency.

---

## Testing

1. **Load COMTRADE file**
2. **Open Tabulator (ChannelList window)**
3. **Change a channel's group** (e.g., move channel from G0 to G2)
   - Charts update immediately ✓
4. **Close Tabulator window**
5. **Reopen Tabulator window**
   - Channel should show the **NEW group** ✓ (was showing old before)
6. **Verify with console**
   - Look for: `[group subscriber] ✅ Synced cfg: analog[0].group = "G2"`

---

## Console Output

**Success**:

```
[group subscriber] ✅ Synced cfg: analog[0].group = "G2"
[group subscriber] 🔄 Processing group change...
[group subscriber] ⚡ FAST PATH: Reusing 5 analog charts (skipping recreation)
[group subscriber] ✅ Fast path complete: 124ms (data update only)
```

**If sync fails** (shouldn't happen):

```
[group subscriber] ⚠️ Failed to sync cfg: [error details]
```

---

## Technical Notes

- Syncs immediately when group change detected (no delay)
- Converts numeric groups to string format (e.g., `0` → `"G0"`)
- Handles both analog and digital channels
- Fails gracefully if `cfg` not available
- Logged for debugging purposes
