# Memory Leak Fix - Application Freeze Issue

## Problem Reported

When loading COMTRADE files and rendering charts, then viewing the phasor diagram or performing channel regrouping, the application would freeze. The suspected cause was a memory leak occurring after chart parsing/rendering but before or during phasor diagram operations.

## Root Cause Analysis

### What Was Causing the Freeze

The application was attempting to use "fast optimization paths" (smart merge, data reuse) even when the **axis structure needed to change**. This created several problems:

1. **Stale Axis Configuration**: When axes change (e.g., going from 2 axes to 3 axes due to regrouping), the fast paths preserve the old chart options instead of recreating them properly.

2. **Incomplete Chart Updates**: The code would try to update chart data via `setData()` while the axis structure was mismatched, causing inconsistent rendering state and memory accumulation.

3. **Deferred DOM Cleanup**: Stale DOM nodes and SVG elements from old axis renderings weren't properly cleaned up, leading to memory accumulation.

4. **Cascading Issues**: When phasor diagram tried to read data from charts with inconsistent axis structures, it would iterate over stale or malformed data arrays, causing additional memory overhead.

### Code Flow Before Fix

```
User regroups channels (e.g., moves Voltage to Current group)
  ↓
Channel state changes, axes change from [A/B/C] to different structure
  ↓
chartManager subscriber triggered
  ↓
Calculate: axisCountChanged = true  ← Detected axes need to change
  ↓
BUT: Code ignores this and tries fast path anyway
  ↓
Super-fast path: chart.setData() with OLD axis config
  ↓
Smart merge: Rearranges data but doesn't rebuild axes
  ↓
Result: Chart has mismatched data/axes
  ↓
Memory accumulates, DOM not properly cleaned
  ↓
Phasor diagram reads stale data
  ↓
Application freezes ❌
```

## Solution Implemented

### File Modified

[src/components/chartManager.js](src/components/chartManager.js)

### Changes Made

1. **Added Guards to Fast Paths** (Lines 1043, 1115, 1155):

   ```javascript
   if (!axisCountChanged && canReuseCharts(...)) {
     // Only use fast path if axes haven't changed
   }
   ```

2. **Force Full Rebuild When Axes Change** (Lines 1022-1030):

   - When `axisCountChanged === true`, skip ALL fast optimization paths
   - Fall through to full chart rebuild at bottom of subscriber
   - This ensures proper axis recreation and DOM cleanup

3. **Added Comments** to explain the rationale:
   ```javascript
   // ⚠️ CRITICAL: Skip fast paths if axes changed
   // When axes change, we MUST rebuild all charts completely
   // Do NOT attempt smart merge, as it causes memory issues and visual glitches
   ```

### Code Flow After Fix

```
User regroups channels
  ↓
Channel state changes, axes change
  ↓
chartManager subscriber triggered
  ↓
Calculate: axisCountChanged = true
  ↓
Check: if (!axisCountChanged && fast_path) → FALSE
  ↓
Skip super-fast path (guarded by !axisCountChanged)
  ↓
Skip smart merge (guarded by !axisCountChanged)
  ↓
Skip reuse path (guarded by !axisCountChanged)
  ↓
Fall through to full rebuild
  ↓
Full rebuild:
  - Destroy all old charts properly
  - Clear DOM completely
  - Recreate with NEW axis structure
  - Properly clean up memory
  ↓
Result: Clean, consistent state ✅
  ↓
Phasor diagram reads correct data
  ↓
Application responsive ✅
```

## Guards Added

### Guard 1: Super-Fast Path (Line 1043)

```javascript
if (
  !axisCountChanged && // ⚠️ CRITICAL: Skip fast paths if axes changed
  analogCharts.length === expectedGroupCount &&
  expectedGroupCount > 0
) {
  // Data reorder only (safe when axes unchanged)
}
```

### Guard 2: Smart Merge Path (Line 1115)

```javascript
if (
  !axisCountChanged &&
  analogCharts.length > 0 &&
  previousGroups.analog.length > 0
) {
  // Merge channels between charts (safe when axes unchanged)
}
```

### Guard 3: Reuse Path (Line 1155)

```javascript
if (!axisCountChanged && canReuseCharts("analog", expectedGroupCount)) {
  // Reuse existing chart containers (safe when axes unchanged)
}
```

## Why This Fixes the Memory Leak

### Memory Leak Prevention

1. **Proper DOM Cleanup**: Full rebuild destroys old SVG elements completely before recreating
2. **No Stale References**: New charts don't reference old DOM nodes or data arrays
3. **Garbage Collection**: Proper destruction allows JavaScript engine to free memory

### Performance Optimization

1. **Smart Paths Still Work**: When axes DON'T change, fast paths still execute
2. **Only Full Rebuilds When Needed**: Only forces expensive rebuild when structure actually changes
3. **Clear Distinction**: Code now clearly separates "data-only updates" from "structural updates"

## Impact Analysis

### What This Fixes

✅ Application freeze when regrouping channels  
✅ Memory leak during axis changes  
✅ Phasor diagram data consistency  
✅ Visual glitches from mismatched axes

### What Still Works

✅ Fast data updates when axes unchanged  
✅ Smart merge for simple channel moves  
✅ Chart reuse optimization  
✅ All existing functionality

### Performance Impact

- **When axes DON'T change**: Zero performance impact (fast paths still used)
- **When axes DO change**: Full rebuild (correct behavior, necessary for proper cleanup)
- **Net effect**: Better performance overall due to no memory accumulation

## Testing

### How to Verify the Fix

1. **Load a COMTRADE file** with multiple channel types (Voltage, Current, Power, etc.)

   - Example: `HR_85429_ASCII.CFG` (599 analog channels)

2. **Verify charts render** without freezing ✅

3. **View phasor diagram** - should display correct data ✅

4. **Regroup channels** (drag Voltage to Current group) multiple times ✅

5. **Check memory** - should not accumulate indefinitely ✅

6. **Verify console logs** show:
   ```
   [group subscriber] ⚠️ Axis requirement changed... -> FORCE FULL REBUILD
   [group subscriber] 🎯 PHASE 3: Recreating charts (full rebuild)
   ```

### Expected Behavior After Fix

- Charts update smoothly without freezing
- Memory remains stable
- Phasor diagram shows correct data
- All visualizations remain consistent
- No console errors

## Technical Details

### Why Axes Change

Axes change when:

- User regroups channels into different unit types
- Different combinations of units (V, A, MW) need different number of axes
- Example: "Voltage + Current" might need 2 axes, "Voltage only" might need 1 axis

### Why Fast Paths Can't Handle Axis Changes

Fast paths like smart merge:

- Preserve existing chart options via `chart.setOptions()`
- Only update data via `chart.setData()`
- Assume axis count stays the same
- When axes actually change, this creates mismatch

### Why Full Rebuild Is Necessary

Full rebuild:

- Destroys old charts with `chart.destroy()`
- Clears container HTML
- Recreates with new axis configuration
- Ensures proper memory cleanup

## Related Code Sections

### Where Axes Are Calculated

- [src/utils/axisCalculator.js](src/utils/axisCalculator.js) - `didAxisCountChange()`
- [src/utils/chartAxisAlignment.js](src/utils/chartAxisAlignment.js) - `getGlobalAxisAlignment()`

### Where Charts Are Destroyed

- [src/components/chartManager.js](src/components/chartManager.js) - `recreateChart()` function

### Where Data Is Updated

- [src/components/chartManager.js](src/components/chartManager.js) - `updateChartDataInPlace()` function

## Conclusion

The memory leak was caused by attempting fast optimization paths even when the chart structure needed to fundamentally change (axis count/configuration). By adding guards to force a full rebuild when axes change, we ensure:

1. **Proper Memory Management**: Old DOM nodes are fully destroyed and garbage collected
2. **Consistent Visual State**: Charts always have matching axis counts and data
3. **Correct Data Representation**: Phasor diagram and other features get clean data
4. **Performance**: Fast paths still work for simple data updates

The fix is minimal, non-invasive, and maintains all existing optimizations while preventing the freeze condition.
