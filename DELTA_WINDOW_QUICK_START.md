# Delta Window - Quick Start Guide

## What is the Delta Window?

The Delta Window is a floating UI component that automatically displays delta measurements (differences) between vertical line markers on COMTRADE charts. It shows time differences (ΔX), value differences (ΔY), and percentage changes for all series.

## How to Use

### Adding Vertical Lines

1. **Add Line**: Press `Alt+1` at your desired chart position

   - A vertical line appears at the cursor X position
   - Delta Window shows measurements between consecutive lines

2. **Add More Lines**: Press `Alt+1` again to add additional lines
   - Delta Window updates to show all pairwise differences
   - Each pair appears as a separate section

### Modifying Vertical Lines

1. **Drag a Line**: Click and drag any vertical line left/right

   - Delta Window updates in real-time
   - Shows new measurements as you drag

2. **Remove Last Line**: Press `Alt+2`

   - Removes the most recently added line
   - Delta Window updates automatically

3. **Clear All Lines**: Press `Alt+0`
   - Removes all vertical lines
   - Clears the Delta Window

### Delta Window Features

#### Layout

```
┌─ DELTA MEASUREMENTS ────────────── [X] ─┐
│                                         │
│ ╔══════════════════════════════════╗   │
│ ║ Time Difference (T1 → T2)        ║   │
│ ║ 125.50 μs                        ║   │ ← Time Delta Box
│ ╚══════════════════════════════════╝   │
│                                         │
│ ┌─ Line Pair: T1 → T2 ──────────────┐  │
│ │ ● Channel_A      0.12 → 0.35      │  │
│ │                  ΔY: 0.23  +192.3%│  │
│ │                                    │  │ ← Series Data
│ │ ● Channel_B      1.50 → 1.62      │  │
│ │                  ΔY: 0.12  +8.0%  │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌─ Line Pair: T2 → T3 ──────────────┐  │
│ │ [More series data...]             │  │
│ └────────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

#### Information Displayed

For each measurement pair:

| Item         | Meaning           | Example          |
| ------------ | ----------------- | ---------------- |
| **Δtime**    | Time difference   | 125.50 μs        |
| **ΔY**       | Value difference  | 0.23             |
| **Change %** | Percentage change | +192.3% / -15.2% |
| **Values**   | Before → After    | 0.12 → 0.35      |

#### Color Coding

- **Series Name Color**: Matches the chart line color
- **Green %**: Positive change (value increased)
- **Red %**: Negative change (value decreased)
- **Gradient Header**: Purple/blue gradient for visual appeal

### Delta Window Controls

| Action              | Effect                                |
| ------------------- | ------------------------------------- |
| Click header & drag | Move window around screen             |
| **[X]** button      | Hide/close window                     |
| Scroll wheel        | Scroll through measurements           |
| Auto-resize         | Handles multiple series automatically |

## Example Workflow

### Scenario: Analyzing a Power Transient

1. **Open COMTRADE file** (charts load automatically)

2. **Mark Event Start**:

   - Position cursor where event begins
   - Press `Alt+1`
   - Vertical line appears (T1)

3. **Mark Event Peak**:

   - Scroll/navigate to peak point
   - Press `Alt+1`
   - Vertical line appears (T2)
   - Delta Window shows:
     - Time between start and peak
     - Value changes for all signals
     - Percentage changes

4. **Mark Event End**:

   - Position at event end
   - Press `Alt+1`
   - Vertical line appears (T3)
   - Delta Window now shows two measurement pairs:
     - T1→T2: Start to peak
     - T2→T3: Peak to end

5. **Fine-Tune Measurements**:

   - Click and drag any line to adjust
   - Delta Window updates in real-time
   - Allows precise measurement

6. **Clear and Repeat**:
   - Press `Alt+0` to clear all lines
   - Start fresh with new measurements

## Keyboard Shortcuts

| Shortcut | Action                      |
| -------- | --------------------------- |
| `Alt+1`  | Add vertical line at cursor |
| `Alt+2`  | Remove last vertical line   |
| `Alt+0`  | Clear all vertical lines    |

## Time Units

The Delta Window automatically detects and displays the appropriate time unit:

- **μs** - Microseconds (default for COMTRADE)
- **ms** - Milliseconds
- **s** - Seconds

## Tips & Tricks

### 1. **Precise Positioning**

- Use your cursor position carefully before pressing Alt+1
- Zoom in on the chart for pixel-perfect placement
- Drag lines after creation for fine adjustments

### 2. **Multiple Series Analysis**

- All series automatically appear in the Delta Window
- Same vertical line marks time for ALL series
- Compare changes across different channels

### 3. **Window Management**

- Drag window to place it where you can see the chart
- Window stays visible while you adjust lines
- Close window with [X] button if needed (reopens on next measurement)

### 4. **Data Interpretation**

- Large ΔY values indicate significant changes
- High percentages show dramatic shifts
- Negative percentages indicate decreases
- Use for quality checks and anomaly detection

## Common Use Cases

### 1. **Transient Analysis**

- Mark start, peak, and end of transient event
- Measure voltage/current changes
- Track timing relationships

### 2. **Frequency Analysis**

- Mark cycle start and end points
- Calculate period and frequency
- Compare across phases

### 3. **Signal Quality Assessment**

- Measure overshoots and undershoots
- Track settling times
- Identify harmonics timing

### 4. **Multi-Signal Correlation**

- Mark same time points on all signals
- Compare how different channels respond
- Identify phase relationships

## Troubleshooting

### Delta Window Not Appearing

- Ensure you've added at least 2 vertical lines (Alt+1)
- Press Alt+1 at two different positions
- Window appears automatically

### Values Seem Wrong

- Check the time unit in the measurement box
- Verify cursor position before adding lines
- Try dragging the line to verify calculations update

### Window Off-Screen

- Drag the header bar to move it back on screen
- Or refresh the page and reposition

### Performance Issues

- This shouldn't occur, but Delta Window is optimized
- It only updates when lines change or are dragged
- Calculations are efficient and don't block UI

## See Also

- **DELTA_WINDOW_IMPLEMENTATION_SUMMARY.md** - Technical details
- **README.md** - General application documentation
- **ARCHITECTURE_FLOWCHART.md** - System overview

## Support

For issues or questions:

1. Check that vertical lines are being created (press Alt+1)
2. Verify window opens when lines exist
3. Ensure measurements update when dragging
4. Refresh page if needed and start fresh

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready
