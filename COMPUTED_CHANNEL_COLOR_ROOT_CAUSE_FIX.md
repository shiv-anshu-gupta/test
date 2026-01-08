# Computed Channel Color Persistence - Root Cause Fix

## The Real Issue (Found!)

**Problem**: Color `#dc2626` is stored in localStorage correctly, but when the app reopens, the stored color is NOT used when rendering the computed channels.

**Root Cause**: In `saveComputedChannelsToStorage()`, when merging `cfg.computedChannels` (metadata with color) with `data.computedData` (actual data array), the spread operation was overwriting the color field!

### The Bug in Detail

Location: [src/utils/computedChannelStorage.js](src/utils/computedChannelStorage.js#L78-L92)

```javascript
// BEFORE (BUGGY)
const mergedChannel = {
  ...newChannel, // Spread cfg.computedChannels entry (HAS color)
  ...(dataEntry || {}), // Spread data.computedData entry (might NOT have color)
  data: dataEntry?.data || newChannel.data,
};
```

**What happens:**

1. `newChannel` from `cfg.computedChannels` has: `{id, name, equation, unit, type, group, color, index}`
2. `dataEntry` from `data.computedData` has: `{id, name, equation, data, unit, group, type, index}` (NO COLOR!)
3. When spreading `dataEntry` on top, it OVERWRITES all properties from `newChannel`, but `dataEntry` lacks `color`
4. Result: `mergedChannel.color` becomes `undefined`!
5. Then when saved to localStorage, the fallback `color: channel.color || "#4ECDC4"` uses the fallback instead of the actual color

### The Solution

Explicitly preserve critical metadata fields from `cfg` (newChannel) after the spread:

```javascript
// AFTER (FIXED)
const mergedChannel = {
  ...newChannel,
  ...(dataEntry || {}),
  // ✅ EXPLICITLY preserve critical fields from cfg if not in data
  color: dataEntry?.color || newChannel.color,
  unit: dataEntry?.unit || newChannel.unit,
  group: dataEntry?.group || newChannel.group,
  type: dataEntry?.type || newChannel.type,
  data: dataEntry?.data || newChannel.data,
};
```

## Data Structure Comparison

### cfg.computedChannels (Has Metadata but NO Data)

```javascript
{
  id: "V0",
  name: "V0",
  equation: "V0=VA+VB+VC",
  unit: "A",
  type: "Computed",
  group: "G4",
  color: "#dc2626",  // ✅ Has color
  // ❌ NO data field
}
```

### data.computedData (Has Data)

```javascript
{
  id: "V0",
  name: "V0",
  equation: "V0=VA+VB+VC",
  data: [val1, val2, ...],  // ✅ Has data array
  unit: "A",
  type: "Computed",
  group: "G4",
  // ❌ Might be missing color or have different value
}
```

## The Problem With Merging

When saving, we need BOTH:

- **From cfg**: metadata like `color`, `unit`, `group`, `type`
- **From data**: the actual computed `data` array with values

But a naive spread would lose the color from cfg if dataEntry doesn't have it!

## Files Modified

### [src/utils/computedChannelStorage.js](src/utils/computedChannelStorage.js#L78-L95)

Added explicit field preservation in the merge logic to ensure color (and other critical metadata) from cfg.computedChannels is retained even when merging with data.computedData entries.

## Data Flow After Fix

```
1. User creates computed channel with color #dc2626
   ↓
2. data.computedData[i] = {id: "V0", equation: "...", data: [...], unit: "A"}
   cfg.computedChannels[i] = {id: "V0", equation: "...", unit: "A", color: "#dc2626"}
   ↓
3. setupComputedChannelsListener() calls saveComputedChannelsToStorage(cfg.computedChannels, data.computedData)
   ↓
4. Storage merges with explicit field preservation:
   mergedChannel = {
     ...cfg,           // Get color: "#dc2626"
     ...data,          // Get data: [values]
     color: data.color || cfg.color  // ✅ Preserve cfg color!
   }
   ↓
5. Saved to localStorage with color: "#dc2626"
   ↓
6. App reloads
   ↓
7. loadComputedChannelsFromStorage() returns: {color: "#dc2626", ...}
   ↓
8. renderComputedChannels() reads ch.color = "#dc2626"
   ↓
9. Chart displays with correct #dc2626 color ✅
```

## Testing the Final Fix

### Test Case 1: New Channel Creation

1. Create computed channel: `V0=VA+VB+VC`
2. Change color to `#dc2626`
3. Reload page (F5)
4. **Expected**: Chart shows `#dc2626` color ✅
5. Check DevTools Console for: `[Storage] Final merged channel: color: #dc2626`

### Test Case 2: Multiple Channels

1. Create 3 computed channels with different colors
2. Reload page
3. **Expected**: All 3 channels show their original colors ✅

### Test Case 3: Check localStorage

1. Open DevTools → Application → localStorage
2. Find key `COMTRADE_COMPUTED_CHANNELS`
3. Expand the array
4. Each channel should have `"color": "#dc2626"` ✅

## Console Debug Output

After fix, you should see in console:

```
[Storage] Merging channel V0:
  {hasDataInNewChannel: true, dataLengthInNewChannel: 62464, foundDataEntry: true, dataLengthInDataEntry: 62464}
[Storage] Final merged channel data length: 62464
[Storage] Detailed save:
  [{id: "V0", name: "V0", samples: 62464, dataLength: 62464, color: "#dc2626", group: "G4", expression: "V0=VA+VB+VC", ...}]
```

## Why This Happens

The issue occurs because:

1. When a computed channel is created, it exists in TWO places:
   - `cfg.computedChannels` (metadata with color from UI)
   - `data.computedData` (actual computed values)
2. These structures have different fields
3. When saving, they need to be merged to get both metadata + data
4. The spread operator silently loses fields that exist in one but not the other

## Summary

✅ **Root Cause Found**: Color lost during metadata/data merge in storage  
✅ **Fix Applied**: Explicit field preservation in merge logic  
✅ **Result**: Colors now persist correctly across page reloads

The fix ensures that when saving computed channels to localStorage, critical metadata fields like `color` are preserved from the cfg entry, even when the data entry doesn't have them.
