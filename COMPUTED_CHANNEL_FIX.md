# Computed Channels Type Fix

## Problem

Computed channels were being stored as type `"Analog"` instead of `"Computed"`, causing the color handler and other state updates to incorrectly update `channelState.analog.lineColors[0]` instead of `channelState.computed.lineColors[0]`.

### Impact

- Color changes to computed channels were not persisting
- Other field updates (scale, name, invert, start, duration, group) were also not working correctly
- Computed channels were being treated as analog channels in the UI and state management

## Solution

Updated all parts of the system to properly recognize and handle computed channels as their own type:

### 1. **Channel Creation (resultProcessing.js:169)**

Changed computed channel type from `"Analog"` to `"Computed"`:

```javascript
// BEFORE
type: "Analog", // Set type to Analog so it displays with analog channels

// AFTER
type: "Computed", // Set type to Computed so it updates channelState.computed
```

### 2. **Channel Storage (ChannelList.js:1343)**

Updated saveComputedChannelToGlobals to store as `"Computed"` type:

```javascript
// BEFORE
type: "Analog", // SET AS ANALOG TYPE

// AFTER
type: "Computed", // SET AS COMPUTED TYPE
```

### 3. **Channel Mapping (ChannelList.js:2056-2071)**

Updated tableData mapping to use `"Computed"` as default type:

```javascript
// BEFORE
type: ch.type || "Analog", // defaults to Analog

// AFTER
type: ch.type || "Computed", // defaults to Computed
```

### 4. **Channel Row Creation (ChannelList.js:2900)**

Updated newRow creation for dynamic addition to use `"Computed"`:

```javascript
// BEFORE
type: computedCh.type || "Analog",

// AFTER
type: computedCh.type || "Computed",
```

### 5. **Channel Lookup (main.js:557-576)**

Updated `rebuildChannelIDMap()` to include computed channels in the lookup map:

```javascript
// ADDED:
const computedIDs = channelState.computed?.channelIDs || [];
computedIDs.forEach((id, idx) => {
  if (id) channelIDMap.set(id, { type: "computed", idx });
});
```

### 6. **Field Updates (main.js:866-868)**

Updated `updateChannelFieldByIndex()` to support "computed" type:

```javascript
// BEFORE
if (type !== "analog" && type !== "digital") return false;

// AFTER
if (type !== "analog" && type !== "digital" && type !== "computed")
  return false;
```

### 7. **Callback Handlers (main.js)**

Updated all callback type handlers to support "computed" type:

- **CALLBACK_TYPE.COLOR** (3926): Added `|| t === "computed"` check
- **CALLBACK_TYPE.SCALE** (3969): Added `|| t === "computed"` check
- **CALLBACK_TYPE.START** (4010): Added `|| t === "computed"` check
- **CALLBACK_TYPE.DURATION** (4058): Added `|| t === "computed"` check
- **CALLBACK_TYPE.INVERT** (4128): Added `|| t === "computed"` check
- **CALLBACK_TYPE.GROUP** (4211): Added `|| t === "computed"` check

## Result

✅ Computed channels now have their own distinct type (`"Computed"`)
✅ Color changes are properly routed to `channelState.computed.lineColors[index]`
✅ All other field updates (scale, invert, start, duration, group) work correctly
✅ Channel lookup map includes computed channels for efficient ID-based access
✅ Full state management support for computed channels matching analog/digital channels

## Files Modified

1. `/src/services/computedChannels/resultProcessing.js` - Channel type generation
2. `/src/components/ChannelList.js` - Channel storage and mapping
3. `/src/main.js` - State management and callback handlers
