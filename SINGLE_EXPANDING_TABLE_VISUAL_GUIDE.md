# Single Expanding Table - Visual Guide

## Expected Behavior After Changes

### Scenario 1: Two Vertical Lines Added

**Header:**
```
2 Lines: 🔴 → 🔵                                    Δ time: 191.18 μs
```

**Table:**
```
┌──────────┬──────────┬──────────┬──────────┬────────────────────┐
│ Channel  │    🔴    │    🔵    │ 🔴→🔵 Δ  │   🔴→🔵 %         │
├──────────┼──────────┼──────────┼──────────┼────────────────────┤
│ 🔴 IA    │ 1.91 kA  │ 1.78 kA  │ -126 A   │ -6.6%               │
│ 🔵 IB    │ -975 A   │ -224 A   │  751 A   │ 77.1%              │
│ 🟢 IC    │ -710 A   │ -1.63 kA │ -924 A   │ -130.0%            │
└──────────┴──────────┴──────────┴──────────┴────────────────────┘
```

### Scenario 2: Three Vertical Lines Added

**Header:**
```
3 Lines: 🔴 → 🔵 | 🔵 → 🟢                     Δ time: 191.18 μs
```

**Table (expands horizontally):**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬─────────┬──────────┬─────────┐
│ Channel  │    🔴    │    🔵    │   🟢     │ 🔴→🔵 Δ  │🔴→🔵 %  │🔵→🟢 Δ  │ 🔵→🟢% │
├──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼──────────┼─────────┤
│ 🔴 IA    │ 1.91 kA  │ 1.78 kA  │ 1.65 kA  │ -126 A   │ -6.6%   │ -130 A   │ -7.3%   │
│ 🔵 IB    │ -975 A   │ -224 A   │ -1.35 kA │  751 A   │ 77.1%   │ -1.13 kA │ -504%   │
│ 🟢 IC    │ -710 A   │ -1.63 kA │  95 A    │ -924 A   │ -130.0% │ 1.73 kA  │ 106%    │
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────┴──────────┴─────────┘
```

**Key Observation:** Single table with 8 columns (1 frozen + 3 values + 2 deltas + 2 percentages)

### Scenario 3: Four Vertical Lines Added

**Header:**
```
4 Lines: 🔴 → 🔵 | 🔵 → 🟢 | 🟢 → 🟣       Δ time: 191.18 μs
```

**Table (continues expanding):**
```
┌─────┬─────┬─────┬─────┬─────┬─────┬────┬────┬────┬────┬────┬────┐
│ Ch  │ 🔴  │ 🔵  │ 🟢  │ 🟣  │Δ%  │Δ%  │Δ%  │ ... (more deltas and percentages)
├─────┼─────┼─────┼─────┼─────┼─────┼────┼────┼────┼────┼────┼────┤
│ IA  │1.91K│1.78K│1.65K│1.52K│-6.6%│-7.3%│-7.9%│
│ IB  │-975A│-224A│1.35K│2.30K│77.1%│-504%│70.4%│
│ IC  │-710A│1.63K│95A  │-280A│-130%│106% │-295%│
└─────┴─────┴─────┴─────┴─────┴─────┴────┴────┴────┴────┴────┴────┘

ONE TABLE - Horizontally scrollable in drawer - NOT multiple tables
```

## Console Output Expected

When you add the 3rd vertical line:

```javascript
[DeltaDrawer] update() called with 2 sections and 3 vertical lines
[DeltaDrawer] 🧹 Destroying 1 old table(s)
[DeltaDrawer] ✅ Destroyed table 0
[DeltaDrawer] 📊 Consolidated table data: (3) [{…}, {…}, {…}]
[DeltaDrawer] ✅ Single expanding table created with 3 rows and 8 columns
```

## Column Headers Explained

### Value Columns (🔴 🔵 🟢 🟣)
- Display the measured value at each vertical line
- Color-coded to match the vertical line color
- Header is a small colored circle

### Delta Columns (🔴→🔵 Δ)
- Show the **absolute difference** between two lines
- Example: `🔴→🔵 Δ = Value@Blue - Value@Red`
- Contains unit-scaled value (kA, A, etc.)

### Percentage Columns (🔴→🔵 %)
- Show the **percentage change** between two lines
- Color-coded: Red for negative, Green for positive, Gray for zero
- Format: `-6.6%` or `+77.1%`

## UI/UX Improvements

### Before
❌ Multiple tables stacked vertically  
❌ Need to scroll down to see other pairs  
❌ Confusing "Line Pair" labels  
❌ Duplicate channel list  

### After
✅ Single consolidated table  
✅ Horizontal scrolling for more lines  
✅ Clear "N Lines:" header with all pairs shown  
✅ All data for a channel in one row  
✅ Easy comparison across all lines and pairs  

## Responsive Design

The table uses `responsiveLayout: "collapse"` for mobile/small screens:

```
Small Screen (< 768px):
┌──────────────────────────────┐
│ Channel: IA                  │
├──────────────────────────────┤
│ 🔴 Value: 1.91 kA            │
│ 🔵 Value: 1.78 kA            │
│ 🟢 Value: 1.65 kA            │
│ 🔴→🔵 Δ: -126 A              │
│ 🔴→🔵 %: -6.6%               │
│ 🔵→🟢 Δ: -130 A              │
│ 🔵→🟢 %: -7.3%               │
└──────────────────────────────┘
```

## Testing Steps

### Step 1: Verify 2-Line Table
```
1. Load COMTRADE file
2. Click chart to place first line (Alt+1)
3. Click again to place second line (Alt+1)
4. Delta Drawer should show:
   - Header: "2 Lines: 🔴 → 🔵"
   - Columns: Channel | 🔴 | 🔵 | Δ | %
   - All channels with values and deltas
5. Check browser console for "✅ Single expanding table created"
```

### Step 2: Verify 3-Line Table Expansion
```
1. With 2 lines already showing, add 3rd line (Alt+1)
2. Delta Drawer should show:
   - Header: "3 Lines: 🔴 → 🔵 | 🔵 → 🟢"
   - Columns: Channel | 🔴 | 🔵 | 🟢 | 🔴→🔵 Δ | 🔴→🔵 % | 🔵→🟢 Δ | 🔵→🟢 %
   - Old table DESTROYED and new table CREATED
   - All data in SINGLE table (no multiple tables)
3. Check console for:
   - "🧹 Destroying 1 old table(s)"
   - "✅ Destroyed table 0"
   - "✅ Single expanding table created with X rows and 8 columns"
```

### Step 3: Verify 4+ Lines
```
1. Add more lines (Alt+1)
2. Table continues to expand with new value and delta columns
3. Header shows all line pairs: "N Lines: 🔴→🔵 | 🔵→🟢 | 🟢→🟣 | ..."
4. Scroll table horizontally to see all columns
5. NO additional tables appear - everything in ONE table
```

### Step 4: Verify Data Accuracy
```
1. Check delta calculations are correct:
   Δ = Value[Line2] - Value[Line1]
   % = (Δ / |Value[Line1]|) × 100

2. Check column order matches expectations:
   Channel | v0 | v1 | v2 | ... | delta0 | percent0 | delta1 | percent1 | ...

3. Check values match:
   - Value columns show measured values from chart
   - Colors match vertical line colors
   - SI units preserved (kA, A, etc.)
```

## Troubleshooting

| Issue | Expected | Actual | Cause |
|-------|----------|--------|-------|
| Multiple tables still showing | 1 table | 2+ tables | `tabulatorInstances.destroy()` not called |
| Columns not expanding | 8 cols (3 lines) | 5 cols | `buildTableColumns()` not receiving `verticalLinesCount` |
| Wrong data | All channels | Only one | `formatTableData()` consolidation failed |
| Console no cleanup logs | "🧹 Destroying..." | No logs | `update()` not destroying old instance |
| Column headers blank | 🔴 🔵 circles | Text | HTML rendering issue in title |

## Performance Notes

- **Tabulator Library:** v5.5.0 (lightweight data table library)
- **Rendering:** Single table redraw vs multiple table redraws
- **Memory:** One instance in `tabulatorInstances` array instead of multiple
- **Responsiveness:** `responsiveLayout: "collapse"` handles mobile/tablet screens

## Browser Compatibility

✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ Mobile browsers (with responsive collapse)
