# Computed Channel Color Persistence - Complete Fix

## Problem Statement

**Issue**: When a computed channel is created with custom color `#dc2626`, it displays correctly initially. But when the application is closed and reopened, the color from localStorage is not applied to the chart - instead, it shows the default gray color.

## Root Causes (3 locations)

### 1. **Storage Merge Loss** ❌ FIXED

**File**: [src/utils/computedChannelStorage.js](src/utils/computedChannelStorage.js#L85-L95)

**Problem**: When merging cfg metadata with data values, the spread operator overwrites the color field

```javascript
// BEFORE (BUGGY)
const mergedChannel = {
  ...newChannel, // HAS color: "#dc2626"
  ...(dataEntry || {}), // LACKS color → overwrites to undefined
  data: dataEntry?.data || newChannel.data,
};
// Result: color becomes undefined!
```

**Solution**: Explicitly preserve metadata fields from cfg

```javascript
// AFTER (FIXED)
const mergedChannel = {
  ...newChannel,
  ...(dataEntry || {}),
  color: dataEntry?.color || newChannel.color, // ✅ Preserve
  unit: dataEntry?.unit || newChannel.unit, // ✅ Preserve
  group: dataEntry?.group || newChannel.group, // ✅ Preserve
  type: dataEntry?.type || newChannel.type, // ✅ Preserve
  data: dataEntry?.data || newChannel.data,
};
```

---

### 2. **Missing Color in Data Object on Load** ❌ FIXED

**File**: [src/main.js](src/main.js#L2923-2951) (handleLoadFiles PHASE 6)

**Problem**: When loading persisted channels from localStorage into `data.computedData`, the color field was not being copied

```javascript
// BEFORE (BUGGY)
for (const savedChannel of savedChannels) {
  data.computedData.push({
    id: savedChannel.name,
    equation: savedChannel.expression,
    data: savedChannel.data,
    index: data.computedData.length,
    // ❌ MISSING COLOR!
  });
}
```

**Solution**: Include all metadata fields when loading

```javascript
// AFTER (FIXED)
for (const savedChannel of savedChannels) {
  data.computedData.push({
    id: savedChannel.name,
    name: savedChannel.name,
    equation: savedChannel.expression,
    data: savedChannel.data,
    color: savedChannel.color, // ✅ CRITICAL
    unit: savedChannel.unit, // ✅ Include
    group: savedChannel.group, // ✅ Include
    type: savedChannel.type, // ✅ Include
    index: data.computedData.length,
  });
}
```

---

### 3. **Unsafe Color Handling During Rehydration** ✅ ALREADY FIXED

**File**: [src/main.js](src/main.js#L1481-1486) (rehydrateStoredComputedChannels)

**Already Fixed**: Added type checking before calling `.trim()`

```javascript
const color =
  savedChannel?.color &&
  typeof savedChannel.color === "string" &&
  savedChannel.color.trim()
    ? savedChannel.color.trim()
    : COMPUTED_COLOR_PALETTE[paletteIndex % COMPUTED_COLOR_PALETTE.length];
```

---

### 4. **Missing Fallback in Render** ✅ ALREADY FIXED

**File**: [src/components/renderComputedChannels.js](src/components/renderComputedChannels.js#L135-140)

**Already Fixed**: Added validation and fallback

```javascript
const groupLineColors = computedChannels.map((ch) =>
  ch.color && typeof ch.color === "string" && ch.color.trim()
    ? ch.color.trim()
    : "#888"
);
```

---

## Complete Data Flow

### Scenario: Create Channel with Color #dc2626, Close App, Reopen

```
STEP 1: CREATE & SAVE
─────────────────────
User creates: V0=VA+VB+VC
User sets color: #dc2626

data.computedData[0] = {
  id: "V0",
  equation: "V0=VA+VB+VC",
  data: [val1, val2, ...],
  color: "#dc2626"
}

cfg.computedChannels[0] = {
  id: "V0",
  equation: "V0=VA+VB+VC",
  unit: "A",
  color: "#dc2626"
}

setupComputedChannelsListener() triggers:
  saveComputedChannelsToStorage(cfg.computedChannels, data.computedData)

  ↓ MERGE STEP (FIXED #1)

  mergedChannel = {
    ...cfg,              // color: "#dc2626"
    ...data,             // data array + values
    color: data.color || cfg.color  // ✅ Preserve cfg color
  }

  ↓ SAVE TO STORAGE

  localStorage["COMTRADE_COMPUTED_CHANNELS"] = [
    {
      id: "V0",
      name: "V0",
      color: "#dc2626",  // ✅ Stored!
      data: [val1, val2, ...],
      expression: "V0=VA+VB+VC",
      unit: "A",
      group: "G4",
      type: "Computed",
      ...
    }
  ]


STEP 2: CLOSE APP
─────────────────


STEP 3: REOPEN APP & LOAD FILES
────────────────────────────────
User loads CFG and DAT files

handleLoadFiles() executes...

...PHASE 6: Load persisted computed channels
const savedChannels = loadComputedChannelsFromStorage()
  ↓ RETURNS: [{id: "V0", color: "#dc2626", data: [...], ...}]

for (const savedChannel of savedChannels) {
  data.computedData.push({
    id: savedChannel.name,
    name: savedChannel.name,
    equation: savedChannel.expression,
    data: savedChannel.data,
    color: savedChannel.color,  // ✅ CRITICAL FIX #2: NOW INCLUDED!
    unit: savedChannel.unit,
    group: savedChannel.group,
    type: savedChannel.type,
    index: 0
  });
}

Now data.computedData = [
  {
    id: "V0",
    name: "V0",
    equation: "V0=VA+VB+VC",
    data: [val1, val2, ...],
    color: "#dc2626",  // ✅ Color is HERE!
    unit: "A",
    group: "G4",
    type: "Computed",
    index: 0
  }
]


STEP 4: RENDER
──────────────
renderComputedChannels(data, chartsContainer, charts, verticalLinesX, channelState)

const computedChannels = data.computedData  // [{ color: "#dc2626", ... }]

const groupLineColors = computedChannels.map((ch) =>
  ch.color && typeof ch.color === "string" && ch.color.trim()
    ? ch.color.trim()      // ✅ "#dc2626"
    : "#888"
);

groupLineColors = ["#dc2626"]  // ✅ Correct color!

Chart rendered with lineColors: ["#dc2626"]

─────────────────────────────────────────────
RESULT: Chart displays with #dc2626 color ✅
─────────────────────────────────────────────
```

## Files Modified

| File                                                                                          | Change                                                          | Status   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| [src/utils/computedChannelStorage.js](src/utils/computedChannelStorage.js)                    | Explicit field preservation in merge (color, unit, group, type) | ✅ FIXED |
| [src/main.js](src/main.js#L2923-2951)                                                         | Include color when pushing loaded channels to data.computedData | ✅ FIXED |
| [src/main.js](src/main.js#L1481)                                                              | Type check before trim() on color                               | ✅ FIXED |
| [src/components/renderComputedChannels.js](src/components/renderComputedChannels.js#L135-140) | Color validation with fallback                                  | ✅ FIXED |

## Testing Verification

### Test Case 1: Color Persistence

1. Load COMTRADE file
2. Create: `V0=VA+VB+VC`
3. Set color to `#dc2626` (red)
4. Observe chart shows red line ✅
5. Reload browser (F5)
6. **Expected**: Chart shows red line with same color ✅

### Test Case 2: Console Verification

Open DevTools Console, should see:

```javascript
// During PHASE 6 load
[handleLoadFiles] 📟 PHASE 6: Computed channels
✅ Loaded 1 computed channels from localStorage (saved at ...)

// During render
[renderComputedChannels] 🎨 DEBUG - computedChannels:
[{id: "V0", color: "#dc2626", data: [...], ...}]

[renderComputedChannels] 🎨 DEBUG - groupLineColors:
["#dc2626"]
```

### Test Case 3: localStorage Verification

DevTools → Application → localStorage → `COMTRADE_COMPUTED_CHANNELS`

```json
[{
  "id": "V0",
  "name": "V0",
  "color": "#dc2626",
  "data": [val1, val2, ...],
  "expression": "V0=VA+VB+VC",
  "unit": "A",
  "group": "G4",
  "type": "Computed"
}]
```

## Why This Was Broken

The color was being lost at two critical points:

1. **Storage merge**: cfg.computedChannels had color, but data.computedData didn't. The spread operator silently lost it.

2. **Data loading**: When reading from localStorage and populating data.computedData, only id/equation/data were copied, color was left out.

3. **Rendering**: Even if color made it to data.computedData, it wasn't being read in the push operation.

## Summary

✅ **Root cause 1**: Fixed metadata preservation during storage merge  
✅ **Root cause 2**: Fixed missing color field when loading into data.computedData  
✅ **Root cause 3**: Fixed unsafe color handling with type checks  
✅ **Root cause 4**: Fixed rendering with proper validation and fallback

Colors should now persist correctly from creation → save → close → reopen → render.
