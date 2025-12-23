# Multi-Y-Axes Functional Architecture Documentation

## Overview

This document describes the **functional approach** to managing multiple Y-axes across all chart types in the COMTRADE visualization application. It explains how channels with different units (Voltage, Current, Power, Frequency) are intelligently grouped and displayed with proper axis alignment.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Multi-Y-Axes Functional Approach          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Event Layer (User Interaction)                          │
│     └─ User changes group assignment in Tabulator           │
│        └─ chartManager detects group change via subscriber  │
│                                                               │
│  2. Analysis Layer (Calculate Requirements)                 │
│     └─ analyzeGroupsAndPublish.js                          │
│        ├─ Reads: group assignments, channel definitions     │
│        ├─ Analyzes: axis requirements per group             │
│        ├─ Publishes: maxYAxes to global store               │
│        └─ Logs: detailed group analysis for debugging       │
│                                                               │
│  3. State Layer (Global Store)                              │
│     └─ maxYAxesStore.js                                     │
│        ├─ Holds: single maxYAxes value (1, 2, 3+)          │
│        ├─ Provides: getMaxYAxes() read access               │
│        └─ Updates: setMaxYAxes() write access               │
│                                                               │
│  4. Rendering Layer (Chart Creation)                        │
│     ├─ renderAnalogCharts.js                                │
│     │  └─ Reads maxYAxes, creates multi-axis charts        │
│     ├─ renderDigitalCharts.js                               │
│     │  └─ Reads maxYAxes, preserves special formatting      │
│     └─ renderComputedChannels.js                            │
│        └─ Reads maxYAxes, synchronizes with others          │
│                                                               │
│  5. Axis Definition Layer (Build Configurations)            │
│     ├─ axisCalculator.js                                    │
│     │  └─ Pre-calculation: determine axes per group        │
│     └─ axisBuilder.js                                       │
│        └─ Rendering: convert calculations to uPlot objects  │
│                                                               │
│  6. Chart Display Layer (Visual Output)                      │
│     └─ uPlot renders: [X-axis, Y1-axis, Y2-axis, ...]      │
│        All charts show same # of axes for visual alignment   │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. **maxYAxesStore.js** - Global State Manager

**Purpose:** Single source of truth for Y-axes count across all charts.

**Key Functions:**

```javascript
getMaxYAxes(); // Read current value (1, 2, 3, etc.)
setMaxYAxes(value); // Publish new value to store
resetMaxYAxes(); // Reset to default (1)
getMaxYAxesState(); // Advanced: get reactive object
```

**Why Not Subscriptions?**

- Avoids memory leaks from forgotten unsubscribes
- Simpler to debug than callback chains
- Direct property access is faster

**Data Flow:**

```
analyzeGroupsAndPublish()
    ↓
  setMaxYAxes(2)  ← Publish to store
    ↓
maxYAxesState.maxYAxes = 2
    ↓
All charts read via getMaxYAxes() → Get value 2
```

---

### 2. **analyzeGroupsAndPublish.js** - Group Analyzer

**Purpose:** Calculate how many Y-axes are needed based on group composition.

**Key Function:**

```javascript
analyzeGroupsAndPublishMaxYAxes(charts, channelState, cfg)
  → Returns: number (the published maxYAxes value)
```

**Algorithm:**

1. **Extract Groups**

   - Read group assignments from channelState.analog.groups
   - Convert string IDs ("G0", "G1") to numeric (0, 1)

2. **Analyze Each Group**

   - For group 0: Find all channels assigned to it
   - For group 1: Find all channels assigned to it
   - ... and so on

3. **Calculate Requirements Per Group**

   - Call axisCalculator.calculateAxisCountForGroup()
   - Get axis count needed for this group's unit mix

4. **Find Global Maximum**

   - Max across all groups = how many axes ALL charts need
   - Example: G0 needs 1 axis, G1 needs 2 axes → use 2 globally

5. **Publish to Store**
   - Call setMaxYAxes(maxYAxesNeeded)
   - Only side effect of this pure function

**Console Output:**

```
[analyzeGroupsAndPublishMaxYAxes] 📊 Analysis:
  G0(3ch,1ax:[V,V,V]) | G1(2ch,2ax:[A,A])
[analyzeGroupsAndPublishMaxYAxes] 🎯 Publishing maxYAxes: 2
```

This tells you:

- Group 0: 3 channels, 1 axis needed, all Voltage
- Group 1: 2 channels, 2 axes needed, all Current
- Global requirement: 2 axes

---

### 3. **axisCalculator.js** - Pre-Calculation Engine

**Purpose:** Determine how many Y-axes a group of channels needs.

**Key Data Structures:**

```javascript
UNIT_TO_TYPE = {
  V: "voltage",
  A: "current",
  W: "power",
  Hz: "frequency",
  kV: "voltage",
  mA: "current",
  // ... etc
};

TYPE_TO_AXIS = {
  voltage: 1, // Axis 1
  current: 2, // Axis 2
  power: 2, // Axis 2 (can share with current)
  frequency: 2, // Axis 2
};
```

**Key Functions:**

```javascript
getChannelType(unit);
// 'V' → 'voltage'
// 'A' → 'current'
// 'Hz' → 'frequency'

getAxisForType(channelType);
// 'voltage' → 1
// 'current' → 2
// Returns: axis number the type should use

calculateAxisCountForGroup(channels);
// [{ unit: 'V' }] → 1
// [{ unit: 'V' }, { unit: 'A' }] → 2
// Returns: max axis number needed (= axis count)
```

**Unit Classification Strategy:**

Why different axes?

- **Voltage (V):** ~0-500 V range, sensitive to small changes
- **Current (A):** ~0-1000+ A range, different sensitivity
- Mixing them on same axis makes one unreadable

Solution: Assign to different axes

- Axis 1: Voltage only (primary reference)
- Axis 2: Current, Power, Frequency (secondary measurements)

---

### 4. **axisBuilder.js** - Configuration Builder

**Purpose:** Convert axis requirements into uPlot axis objects.

**Key Functions:**

```javascript
createSingleAxisDefinition(config);
// Input: { yLabels, yUnits, scaleValue }
// Output: Single axis object { scale: "y", label, grid, values, ... }

createMultiAxisDefinition(config);
// Input: { yLabels, yUnits, axesScales, axisCount, maxYAxes }
// Output: Array of axis objects [axis0, axis1, ...]

buildCompleteAxesArray(config);
// Input: { xLabel, xUnit, yLabels, yUnits, maxYAxes, singleYAxis }
// Output: Complete array [xAxis, yAxis0, yAxis1, ...]
```

**Key Innovation: maxYAxes Priority**

Old logic:

```javascript
if (singleYAxis) {
  axisCount = 1;
} else if (maxYAxes) {
  axisCount = maxYAxes;
}
```

Problem: singleYAxis always wins → digital charts stuck at 1 axis

New logic:

```javascript
if (maxYAxes !== undefined) {
  axisCount = maxYAxes; // Global override takes priority
} else if (singleYAxis) {
  axisCount = 1;
}
```

Benefit: Digital charts respect global sync while keeping custom formatting

**Axis Numbering:**

```
Scale Names in uPlot:
  "x"   → X-axis (time)
  "y0"  → Y-axis 1 (usually voltage)
  "y1"  → Y-axis 2 (usually current)
  "y2"  → Y-axis 3 (if needed)
```

**Theme Integration:**

```javascript
// Axes read CSS variables for colors
stroke: () => {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue("--chart-text") || "#ffffff";
};
```

---

### 5. **Rendering Components** - Chart Creators

#### renderAnalogCharts.js

```javascript
// Reads maxYAxes from global store
const maxYAxes = getMaxYAxes() || 1;

// Passes to createChartOptions
const opts = createChartOptions({
  maxYAxes: maxYAxes, // Global sync value
  singleYAxis: false, // Mixed units allowed
  // ...
});
```

#### renderDigitalCharts.js

```javascript
// Digital channels (0/1 state) need special formatting
const maxYAxes = getMaxYAxes() || 1;

const opts = createChartOptions({
  maxYAxes: maxYAxes, // Respect global sync
  singleYAxis: true, // Special 0/1 display needed
  // ...
});

// Keep custom formatting on first axis, preserve additional axes
opts.axes = [
  opts.axes[0], // X-axis
  firstAxis, // Y1 with custom 0/1 values
  ...opts.axes.slice(2), // Y2+ preserved for multi-axis sync
];
```

#### renderComputedChannels.js

```javascript
// Computed channels (formula results) are typically single-axis
const maxYAxes = getMaxYAxes() || 1;

const opts = createChartOptions({
  maxYAxes: maxYAxes,
  singleYAxis: true,
  // ...
});
```

---

## Data Flow: From Group Change to Chart Update

### Scenario: User changes channel to different group

```
1. User Action (UI Layer)
   └─ User moves channel from "Group 0" to "Group 1" in Tabulator
      └─ ChannelList popup sends message to parent window

2. State Update (main.js)
   └─ Parent receives message
   └─ Updates channelState.analog.groups[index] = 1
      └─ This triggers subscribed observers (group subscriber in chartManager)

3. Analysis (chartManager.js - group subscriber)
   └─ Subscriber detects group change
   └─ Calls: analyzeGroupsAndPublishMaxYAxes(charts, channelState, cfg)
      ├─ Function reads: groups array, channel definitions
      ├─ Analyzes: G0 needs 1 axis (all V), G1 now needs 2 axes (A + moved channel)
      └─ Publishes: setMaxYAxes(2)

4. Store Update (maxYAxesStore.js)
   └─ maxYAxesState.maxYAxes = 2
      └─ Next getMaxYAxes() calls will return 2

5. Chart Rebuilding (chartManager.js - continued)
   └─ chartManager destroys existing charts (old axis count)
   └─ Calls: renderComtradeCharts(data, ..., channelState, cfg)
      └─ renderAnalogCharts reads: getMaxYAxes() → 2
      └─ renderDigitalCharts reads: getMaxYAxes() → 2
      └─ renderComputedChannels reads: getMaxYAxes() → 2

6. Axis Building (axisBuilder.js)
   └─ buildCompleteAxesArray({
        maxYAxes: 2,        // From global store
        singleYAxis: false, // Analog allows multi
        // ...
      })
   └─ Creates: [xAxis, y1Axis, y2Axis]

7. Chart Rendering (uPlot)
   └─ Renders all three chart types with 2 Y-axes
   └─ Visual result: All charts now have consistent axis count
```

---

## Key Design Principles

### 1. **Pure Functions**

- `analyzeGroupsAndPublish` is pure except for one side effect: `setMaxYAxes()`
- Makes testing and debugging easy
- Deterministic: same input always produces same output

### 2. **Single Responsibility**

- **maxYAxesStore:** Holds state only
- **analyzeGroupsAndPublish:** Calculates requirements only
- **axisCalculator:** Determines axes per group only
- **axisBuilder:** Builds axis objects only

### 3. **Separation of Concerns**

- Pre-calculation (axisCalculator) vs Rendering (axisBuilder)
- Analysis (analyzeGroupsAndPublish) vs Storage (maxYAxesStore)
- Logic in utils/ vs UI in components/

### 4. **Reactive State Management**

- No subscriptions needed (memory-safe)
- Direct reads via getMaxYAxes()
- Charts always get latest value when they render

### 5. **Global Synchronization**

- One maxYAxes value → all charts get same axis count
- Ensures visual alignment across different chart types
- Makes comparisons easier for the user

---

## Unit Classification System

The heart of the multi-axis approach: **different units need different axes**

### Voltage (V)

- Units: V, mV, kV
- Typical range: 0-500 V
- Axis: 1 (primary reference)
- Why: Different scale sensitivity than current

### Current (A)

- Units: A, mA, kA
- Typical range: 0-1000+ A
- Axis: 2 (secondary)
- Shares with: Power, Frequency (similar magnitude)

### Power (W)

- Units: W, kW, MW, Var, kVar, VA, kVA
- Typical range: Highly variable
- Axis: 2 (secondary)
- Why: Needs isolation from voltage

### Frequency (Hz)

- Units: Hz
- Typical range: 40-60 Hz
- Axis: 2 (secondary)
- Why: Completely different magnitude than voltage/current

---

## Error Handling

All functional modules include error handling:

```javascript
try {
  // Analysis and calculation
  const result = analyzeGroupsAndPublishMaxYAxes(...);
  return result;
} catch (err) {
  console.error("[module] ❌ Error:", err);
  // Fallback: always safe to use 1 axis
  setMaxYAxes(1);
  return 1;
}
```

This ensures:

- App never crashes due to analysis failure
- Falls back to single-axis mode (always safe)
- Error is logged for debugging

---

## Logging and Debugging

All modules include console logging with emoji prefixes:

```javascript
📊 Analysis & calculations
🎯 Publishing/target values
✅ Successful operations
❌ Errors
ℹ️ Informational messages
🔄 Processing/transitions
```

Example console output when channel group changes:

```
[analyzeGroupsAndPublishMaxYAxes] 📊 Analysis:
  G0(3ch,1ax:[V,V,V]) | G1(2ch,2ax:[A,A])
[analyzeGroupsAndPublishMaxYAxes] 🎯 Publishing maxYAxes: 2
[renderAnalogCharts] ✅ Chart config: group="Group 1",
  globalMaxYAxes=2, channels=2, yUnits=[A, A]
[renderDigitalCharts] ✅ Chart config: maxYAxes=2,
  channels=15, yMin=0, yMax=15
```

---

## Files Involved

### Core Functional Files

- `src/utils/maxYAxesStore.js` - Global state
- `src/utils/analyzeGroupsAndPublish.js` - Group analyzer
- `src/utils/axisCalculator.js` - Axis pre-calculator
- `src/utils/axisBuilder.js` - Axis definition builder

### Integration Points

- `src/components/renderAnalogCharts.js` - Analog chart renderer
- `src/components/renderDigitalCharts.js` - Digital chart renderer
- `src/components/renderComputedChannels.js` - Computed channel renderer
- `src/components/renderComtradeCharts.js` - Chart orchestrator
- `src/components/chartManager.js` - Chart lifecycle manager

### Called By

- `src/main.js` - Main entry point
- `src/components/ChannelList.js` - Channel/group UI

---

## Testing the Architecture

### Test Case 1: Single-Unit Group

```javascript
// Group 0: All voltage channels
const channels = [{ unit: "V" }, { unit: "kV" }, { unit: "mV" }];

// Expected: 1 axis
const count = calculateAxisCountForGroup(channels);
assert(count === 1, "Should need 1 axis for all voltage");
```

### Test Case 2: Mixed-Unit Group

```javascript
// Group 1: Voltage and current
const channels = [{ unit: "V" }, { unit: "A" }, { unit: "A" }];

// Expected: 2 axes
const count = calculateAxisCountForGroup(channels);
assert(count === 2, "Should need 2 axes for mixed units");
```

### Test Case 3: Global Synchronization

```javascript
// Group 0 naturally needs 1 axis, Group 1 needs 2
// Expected: ALL charts create 2 axes for consistency
analyzeGroupsAndPublishMaxYAxes(charts, channelState, cfg);
const max = getMaxYAxes();
assert(max === 2, "Global max should be 2");
```

---

## Performance Considerations

### Why This Approach is Efficient

1. **Lazy Calculation**

   - Axes only calculated when group changes
   - Not on every data point update

2. **Memory Safe**

   - No subscription callbacks accumulating
   - No memory leaks from forgotten unsubscribes

3. **Direct State Access**

   - getMaxYAxes() is O(1) lookup
   - No event loop overhead

4. **One-Time Analysis**
   - analyzeGroupsAndPublishMaxYAxes runs once per group change
   - Not during render loop

---

## Future Enhancements

1. **Support for 3+ Axes**

   - Current system designed for 1-2 axes (common case)
   - Can extend TYPE_TO_AXIS to support more

2. **Custom Unit Mapping**

   - Allow users to define custom unit classifications
   - Store in configuration

3. **Per-Group Axis Configuration**

   - Different groups could have different axis arrangements
   - Would require more complex store structure

4. **Axis Swapping**
   - Allow users to swap which units go on which axis
   - Would need UI controls + updated analyzeGroupsAndPublish

---

## Summary

The **Multi-Y-Axes Functional Approach** provides:

✅ **Clear Separation of Concerns** - Each module does one thing well
✅ **Pure Functions** - Easy to test and reason about
✅ **Global Synchronization** - All charts align visually
✅ **Memory Safe** - No subscription leaks
✅ **Debuggable** - Detailed console logging at each step
✅ **Flexible** - Easy to extend for new unit types
✅ **Robust** - Fallback to safe defaults on errors

The architecture is designed to scale from 2 charts (analog + digital) to any number of chart types, all synchronized through a single global maxYAxes value.
