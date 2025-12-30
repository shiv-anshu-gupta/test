# Single Expanding Table Implementation ✅

## Overview

The Delta Drawer has been completely rewritten to display a **single expanding table** instead of multiple tables when users add vertical lines.

## Changes Made

### 1. Rewrote `buildTableColumns()` Function

**File:** `src/components/DeltaDrawer.js` (lines 433-534)

**Changes:**

- Now accepts `verticalLinesCount` parameter
- Dynamically creates columns based on the number of vertical lines
- Creates value columns (v0, v1, v2, ..., vN) for each line
- Creates delta columns (delta0, delta1, ...) for each consecutive pair
- Creates percentage columns (percentage0, percentage1, ...) for each pair
- Each column header includes colored circle dots matching the vertical line colors

**Column Structure:**

```
Channel (frozen) | 🔴 | 🔵 | 🟢 | ... | 🔴→🔵 Δ | 🔴→🔵 % | 🔵→🟢 Δ | 🔵→🟢 % | ...
```

### 2. Rewrote `formatTableData()` Function

**File:** `src/components/DeltaDrawer.js` (lines 536-585)

**Changes:**

- Now accepts both `deltaData` and `verticalLinesCount` parameters
- Consolidates all delta sections into a single table format
- Uses a Map to collect channel data from all line pairs
- For each channel, stores all values and deltas in indexed fields (v0, v1, v2, delta0, delta1, etc.)
- Returns a single unified array of row objects

**Data Structure:**

```javascript
{
  channel: "IA",
  color: "#ef4444",
  v0: "1.91 kA",  // First line value
  v1: "1.78 kA",  // Second line value
  v2: "1.65 kA",  // Third line value
  delta0: "-126 A",  // 1st → 2nd difference
  percentage0: -6.6,  // 1st → 2nd percentage
  delta1: "-130 A",  // 2nd → 3rd difference
  percentage1: -7.3   // 2nd → 3rd percentage
}
```

### 3. Rewrote `update()` Method

**File:** `src/components/DeltaDrawer.js` (lines 663-859)

**Key Changes:**

- **Single Table Creation:** Destroys old table and creates one new table for all data
- **Dynamic Header:** Shows all line pairs in the header
  ```
  3 Lines: 🔴 → 🔵 | 🔵 → 🟢
  ```
- **Single Container:** One `delta-table-main` div instead of multiple `delta-table-0`, `delta-table-1`, etc.
- **Consolidated Data:** Calls `formatTableData(deltaData, verticalLinesCount)` to get unified data
- **Dynamic Columns:** Calls `buildTableColumns(verticalLinesCount)` to build columns for all lines

## Behavior Changes

### Before Implementation

```
Add 2 lines (Red, Blue):
┌─────────────────────────────┐
│ Line Pair: 🔴 → 🔵         │
├────────┬────────┬──────────┤
│ Channel│ Value 1│ Value 2  │
├────────┼────────┼──────────┤
│ IA     │1.91 kA │1.78 kA   │
└────────┴────────┴──────────┘

Add 3rd line (Green):
┌─────────────────────────────┐
│ Line Pair: 🔴 → 🔵         │
├────────┬────────┬──────────┤
│ Channel│ Value 1│ Value 2  │
├────────┼────────┼──────────┤
│ IA     │1.91 kA │1.78 kA   │
└────────┴────────┴──────────┘

┌─────────────────────────────┐  ← SEPARATE TABLE
│ Line Pair: 🔵 → 🟢         │
├────────┬────────┬──────────┤
│ Channel│ Value 1│ Value 2  │
├────────┼────────┼──────────┤
│ IA     │1.78 kA │1.65 kA   │
└────────┴────────┴──────────┘
```

### After Implementation

```
Add 2 lines (Red, Blue):
┌──────────────────────────────────────┐
│ 2 Lines: 🔴 → 🔵                    │
├────────┬────────┬────────┬─────────┤
│ Channel│   🔴   │   🔵   │🔴→🔵 Δ│
├────────┼────────┼────────┼─────────┤
│ IA     │1.91 kA │1.78 kA │-126 A  │
└────────┴────────┴────────┴─────────┘

Add 3rd line (Green):
┌──────────────────────────────────────────────────────────┐
│ 3 Lines: 🔴 → 🔵 | 🔵 → 🟢                             │
├────────┬────────┬────────┬────────┬──────────┬──────────┤
│ Channel│   🔴   │   🔵   │  🟢    │🔴→🔵 Δ │🔵→🟢 Δ │
├────────┼────────┼────────┼────────┼──────────┼──────────┤
│ IA     │1.91 kA │1.78 kA │1.65 kA │-126 A   │-130 A   │
└────────┴────────┴────────┴────────┴──────────┴──────────┘
                           ↑
                    SINGLE TABLE EXPANDS
```

## How It Works

### Column Generation Algorithm

**For 3 vertical lines:**

1. **Channel Column** (frozen) - width: 120px
2. **Value Columns** (3 total) - width: 110px each
   - v0: 🔴 (first line)
   - v1: 🔵 (second line)
   - v2: 🟢 (third line)
3. **Delta Columns** (4 total) - width: 100px or 90px each
   - delta0: 🔴→🔵 Δ (value)
   - percentage0: 🔴→🔵 % (percentage)
   - delta1: 🔵→🟢 Δ (value)
   - percentage1: 🔵→🟢 % (percentage)

**Total Columns:** 1 + 3 + 4 = **8 columns**

### Table Width

- Base: 120px (Channel) + (3 × 110px) values = 450px
- Plus: (2 × 100px) deltas + (2 × 90px) percentages = 380px
- **Total: ~830px** (responsive, scrollable in drawer)

## Integration Points

### Call Sites

The following files already call `deltaWindow.update(deltaData, verticalLinesX.length)` with the correct parameters:

1. **src/utils/calculateDeltas.js** (line 377)

   - Primary calculation engine
   - Passes `verticalLinesX.length` as second parameter ✅

2. **src/plugins/verticalLinePlugin.js** (lines 66, 160)

   - Vertical line interaction handler
   - Passes `linesLength` as second parameter ✅

3. **src/components/handleVerticalLineShortcuts.js** (lines 100, 132)

   - Alt+1 keyboard shortcut handler
   - Passes `verticalLinesX.length` as second parameter ✅

4. **src/components/renderComtradeCharts.js** (line 128)
   - Initial chart rendering
   - Passes `linesLength` as second parameter ✅

All call sites are compatible with the new implementation! ✅

## Console Logging

The implementation includes comprehensive console logging:

```
[DeltaDrawer] update() called with 2 sections and 3 vertical lines
[DeltaDrawer] 🧹 Destroying 1 old table(s)
[DeltaDrawer] ✅ Destroyed table 0
[DeltaDrawer] 📊 Consolidated table data: [{...}, {...}, {...}]
[DeltaDrawer] ✅ Single expanding table created with 3 rows and 8 columns
```

## Testing Checklist

- [ ] Load COMTRADE file
- [ ] Add 2 vertical lines (Alt+1)
  - Verify table shows: Channel, 🔴, 🔵, Δ, %
  - Verify header shows "2 Lines: 🔴 → 🔵"
  - Verify all rows display correctly
  - Verify console shows cleanup and creation logs
- [ ] Add 3rd vertical line
  - Verify table EXPANDS horizontally
  - Verify header shows "3 Lines: 🔴 → 🔵 | 🔵 → 🟢"
  - Verify columns in order: Channel, 🔴, 🔵, 🟢, Δ, %, Δ, %
  - Verify NO scrolling between tables (all data in one table)
  - Verify old table was destroyed
- [ ] Add 4th line
  - Verify table continues to expand
  - Verify all 4 line values visible
  - Verify all 3 delta pairs visible
- [ ] Remove lines
  - Verify table updates correctly
  - Verify old table destroyed on update
- [ ] Test with different COMTRADE files
  - Verify color cycling works (red, blue, green, magenta, purple, orange, brown, black, pink, yellow)
  - Verify SI unit scaling preserved (kA, A, etc.)

## Files Modified

1. **src/components/DeltaDrawer.js**
   - `buildTableColumns()` - lines 433-534 (102 lines)
   - `formatTableData()` - lines 536-585 (50 lines)
   - `update()` method - lines 663-859 (197 lines)

## Backward Compatibility

✅ Fully compatible with existing code:

- All call sites already pass `verticalLinesCount` as second parameter
- No changes needed in calculateDeltas.js, verticalLinePlugin.js, or any caller
- All existing CSS styles preserved
- Tabulator configuration unchanged (responsive layout support)

## Performance

- **Memory:** One table instance instead of multiple
- **Rendering:** Single table with dynamic columns (more efficient)
- **Cleanup:** Proper destruction of old instance before creation
- **Responsive:** Uses `responsiveLayout: "collapse"` for mobile compatibility

## Future Enhancements

1. Add column reordering (drag-drop column headers)
2. Add column visibility toggle
3. Add export to CSV/PDF (already supported by Tabulator)
4. Add column grouping for value/delta pairs
5. Add search/filter functionality
