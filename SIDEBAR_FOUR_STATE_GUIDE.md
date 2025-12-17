# Sidebar Enhancement - Four-State Layout System

## Overview
The analysis sidebar now supports **4 different layout modes**, including the new ability to place the phasor diagram **below the charts container**.

## Four Layout Modes

### Mode 1: **Sidebar** (Default)
- **Icon**: ⊞ (Box outline)
- **Tooltip**: "Move to floating window"
- **Description**: Phasor diagram in right sidebar
- **Layout**: Normal sidebar on right side

### Mode 2: **Floating** (Detached Window)
- **Icon**: ▦ (Grid/distribution)
- **Tooltip**: "Move to charts (side by side)"
- **Description**: Phasor as draggable window
- **Layout**: Floating window over main content

### Mode 3: **Charts Side-by-Side** (Inline)
- **Icon**: ⬇ (Down arrow)
- **Tooltip**: "Move to charts (below)"
- **Description**: Phasor alongside charts in 2-column layout
- **Layout**: `[Phasor | Charts]`

### Mode 4: **Charts Below** (NEW)
- **Icon**: ⬅ (Left arrow)
- **Tooltip**: "Return to sidebar"
- **Description**: Phasor displayed below charts container
- **Layout**: 
  ```
  [Charts Area]
  [Phasor Below]
  ```

## State Transition Flow

```
⊞ SIDEBAR
    ↓ click
▦ FLOATING
    ↓ click
⬇ SIDE-BY-SIDE
    ↓ click
⬅ BELOW
    ↓ click
⊞ SIDEBAR (cycles back)
```

## How to Use

### Accessing Charts Below Mode
1. Click the button to cycle through modes
2. First click: Sidebar → Floating (▦)
3. Second click: Floating → Side-by-Side (⬇)
4. Third click: Side-by-Side → **Charts Below (⬅)**
5. Fourth click: Charts Below → Sidebar (⊞)

### Visual Result in Charts Below Mode
```
┌─────────────────────────────────────────────────┐
│           CHARTS (Full Width)                    │
│                                                  │
│    [Chart 1]    [Chart 2]                       │
│    [Chart 3]    [Chart 4]                       │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│    PHASOR DIAGRAM (Below)                       │
│                                                  │
│    Displays full phasor diagram below charts    │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Button Icon Reference

| Icon | Mode | Current | Next Action |
|------|------|---------|-------------|
| **⊞** | Sidebar | In sidebar | → Floating |
| **▦** | Floating | Floating window | → Side-by-Side |
| **⬇** | Side-by-Side | Left-right layout | → Below |
| **⬅** | Below | Below charts | → Sidebar |

## Best Uses for Each Mode

### ⊞ Sidebar Mode
- ✅ General viewing
- ✅ Access channel details in sidebar
- ✅ Default comfortable mode

### ▦ Floating Mode
- ✅ Quick reference while working
- ✅ Need to temporarily move window around
- ✅ Don't want sidebar hidden

### ⬇ Side-by-Side Mode
- ✅ Compare phasor + charts equally
- ✅ See both together in detail
- ✅ Professional presentation view
- ✅ Detailed analysis work

### ⬅ Charts Below Mode
- ✅ **BEST FOR**: More chart details needed
- ✅ Focus on charts first, phasor reference below
- ✅ Charts get full width
- ✅ Phasor has dedicated space below
- ✅ Easier scrolling on smaller screens

## Technical Implementation

### State Variable
```javascript
let sidebarLayoutMode = "sidebar"; // Tracks current mode
```

### Four Cases in Toggle
```javascript
"sidebar" → "floating" → "charts-inline" → "charts-below" → "sidebar"
```

### CSS Classes
- `charts-block-layout` - Added to #charts in below mode
- Automatically removed when returning to other modes

## Files Modified

1. **src/main.js**
   - Extended state machine to 4 modes
   - Updated `movePolarChartSection()` for 4 cases
   - Updated `updateDetachButtonIcon()` for 4 icons
   - Updated button click handler for 4-state cycling

2. **styles/main.css**
   - Added `#charts.charts-block-layout` styles
   - Added styling for phasor section when below charts
   - Proper spacing and borders for below layout

## Charts Below Mode Features

### Layout
- Charts display at full width above
- Phasor diagram with full width below
- Clear visual separation with border line
- Proper spacing between sections

### Styling
- Top border separates charts from phasor
- 24px margin for spacing
- Minimum height of 350px for phasor container
- Professional appearance

### Responsive
- Works on all screen sizes
- Charts stay on top, phasor below
- Scrollable for smaller screens
- No overlapping elements

## Console Output

When using the feature, you'll see:
```
[main.js] Sidebar moved to floating window
[main.js] Sidebar moved to charts container inline (side by side)
[main.js] Sidebar moved to charts container below
[main.js] Sidebar returned to original sidebar position
```

## Testing the New Charts Below Mode

1. **Test Setup**
   - Load COMTRADE data with charts
   - Have phasor diagram rendering

2. **Test Steps**
   - Click button 3 times to reach "Charts Below" (⬅)
   - Verify phasor appears below charts
   - Verify charts are full width above
   - Verify button shows ⬅ icon
   - Verify tooltip says "Return to sidebar"

3. **Test Visual**
   - Phasor should have dedicated space
   - No overlapping with charts
   - Professional appearance
   - Clear visual separation

4. **Test Functionality**
   - Click again to return to sidebar
   - Phasor should restore to sidebar
   - Button should show ⊞ icon
   - Sidebar should become visible

## Summary of Changes

✅ **4 states instead of 3**
✅ **Charts Below mode added**
✅ **4 unique button icons**
✅ **All transitions smooth**
✅ **CSS styling included**
✅ **No breaking changes**
✅ **Ready to use immediately**
