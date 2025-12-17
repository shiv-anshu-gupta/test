# Delta Window Integration - Implementation Summary

## Overview

This document summarizes the implementation of the Delta Window feature, which provides a dedicated floating UI component for displaying and managing delta measurements between vertical line markers in COMTRADE charts.

## Key Changes

### 1. **calculateDeltas.js** - Enhanced to Support Delta Window

- **File**: `src/utils/calculateDeltas.js`
- **Changes**:
  - Made function `async` to support dynamic import of deltaWindow
  - Updated signature: `calculateDeltas(verticalLinesX, chart, timeUnit)`
  - Now builds `deltaData` array with structured format:
    ```javascript
    {
      deltaTime: string (formatted with unit),
      series: [
        {
          name: string,
          color: string,
          v1: number,
          v2: number,
          deltaY: number,
          percentage: number
        }
      ]
    }
    ```
  - Added dynamic import to update delta window when available
  - Enhanced error handling with defensive guards
  - Calculates percentage change: `(ΔY / |v1|) * 100`

### 2. **DeltaWindow.js** - Floating Delta Display Component

- **File**: `src/components/DeltaWindow.js`
- **Status**: Already implemented with complete functionality
- **Features**:
  - Floating draggable window with dark theme
  - Real-time delta measurements display
  - Color-coded series data matching chart colors
  - Shows: values (v1 → v2), ΔY, percentage change
  - Scrollable content area with custom styling
  - Close button to minimize window
  - Styles with gradient header and semi-transparent sections

### 3. **verticalLinePlugin.js** - Async Handler Updates

- **File**: `src/plugins/verticalLinePlugin.js`
- **Changes**:
  - Updated vertical line state subscription to async handler
  - Modified mousemove handler to await calculateDeltas calls
  - Ensures delta window updates as lines are dragged
  - Properly handles async/await chain

### 4. **handleVerticalLineShortcuts.js** - Keyboard Event Handlers

- **File**: `src/components/handleVerticalLineShortcuts.js`
- **Changes**:
  - Made function `async`
  - Updated to use new calculateDeltas signature (3 parameters)
  - Alt+0: Clear all vertical lines
  - Alt+1: Add vertical line at cursor position
  - Alt+2: Remove last vertical line
  - Each action now properly awaits delta calculations

### 5. **main.js** - Event Listener Updates

- **File**: `src/main.js`
- **Changes**:
  - Updated keydown event listener to properly handle async handleVerticalLineShortcuts
  - Added error handling with .catch() for async operations
  - Exports `deltaWindow` instance for use in calculateDeltas

### 6. **renderComtradeCharts.js** - Chart Initialization

- **File**: `src/components/renderComtradeCharts.js`
- **Changes**:
  - Updated calculateDeltas calls after chart rendering
  - Now calls with new 3-parameter signature: `calculateDeltas(verticalLinesX, chart, TIME_UNIT)`
  - Iterates through each chart individually

## Data Flow

### Vertical Line Creation/Modification

```
User Action (keyboard/drag)
    ↓
verticalLinesXState updates
    ↓
Subscription triggered
    ↓
calculateDeltas(verticalLinesX, chart, timeUnit) [ASYNC]
    ↓
Build deltaData array
    ↓
Import deltaWindow
    ↓
deltaWindow.update(deltaData)
    ↓
Delta Window Rendered with measurements
```

### Delta Calculation Process

```
For each pair of consecutive vertical lines (i, i+1):
  1. Find nearest data indices
  2. Get time difference: ΔX = timeArr[idx2] - timeArr[idx1]
  3. For each series:
     - Get values: v1, v2
     - Calculate: ΔY = v2 - v1
     - Calculate: % = (ΔY / |v1|) * 100
     - Store color reference from chart
  4. Build section object with time and series data
  5. Add to deltaData array
```

## Error Handling

All functions implement defensive programming:

- Guard checks for null/undefined inputs
- Validates array types and lengths
- Returns early on invalid data
- Graceful fallback if deltaWindow not available
- Try/catch for dynamic imports

## Performance Considerations

1. **Async Pattern**: Prevents UI blocking during calculations
2. **Dynamic Import**: DeltaWindow only imported when needed
3. **Early Returns**: Skip processing on invalid data
4. **Efficient Indexing**: getNearestIndex for fast lookups
5. **Minimal DOM Updates**: Batch updates through deltaWindow.update()

## Testing Checklist

- [x] Vertical lines can be added with Alt+1
- [x] Vertical lines can be removed with Alt+2
- [x] All lines clear with Alt+0
- [x] Delta window appears when lines are created
- [x] Delta values update as lines are dragged
- [x] Colors match between chart and delta window
- [x] Percentage calculations are correct
- [x] Window is draggable
- [x] Scrollbar appears with multiple series
- [x] No console errors on operations

## API Summary

### calculateDeltas(verticalLinesX, chart, timeUnit)

```javascript
/**
 * Calculates ΔX and ΔY between consecutive vertical lines.
 * Updates both DOM and delta window with measurements.
 *
 * @param {number[]} verticalLinesX - X positions of vertical lines
 * @param {uPlot} chart - Chart instance containing data
 * @param {string} [timeUnit='microseconds'] - Time unit for labels
 * @returns {Promise<void>}
 */
```

### deltaWindow.update(deltaData)

```javascript
/**
 * Updates the delta window with measurement data.
 * Shows the window if it's hidden.
 *
 * @param {Object[]} deltaData - Array of delta measurement objects
 * @returns {void}
 */
```

## Future Enhancements

1. **Export Delta Data**: Button to export measurements as CSV/JSON
2. **Delta History**: Track historical delta measurements
3. **Threshold Alerts**: Highlight unusual delta values
4. **Statistical Analysis**: Min/Max/Average of deltas
5. **Line Labels**: Custom naming for vertical lines
6. **Multiple Windows**: Separate windows for different measurements

## Files Modified

- `src/utils/calculateDeltas.js` - Core calculation logic
- `src/plugins/verticalLinePlugin.js` - Plugin integration
- `src/components/handleVerticalLineShortcuts.js` - Keyboard handling
- `src/components/renderComtradeCharts.js` - Chart initialization
- `src/main.js` - Event listener setup

## Files Already Present

- `src/components/DeltaWindow.js` - Complete implementation
- `src/main.js` - Exports deltaWindow instance

## Verification

All source files pass error checking:

```
✓ No compilation errors in src/
✓ All async/await patterns properly handled
✓ All imports/exports correctly resolved
✓ Defensive programming guards in place
```

## Notes

- Delta Window uses modern CSS with gradients and glassmorphism effects
- Scrollbar styling is custom for consistency
- All measurements use fixed decimal precision (2 decimal places)
- Percentage changes color-coded (green for positive, red for negative)
- Window remembers drag position until page reload
