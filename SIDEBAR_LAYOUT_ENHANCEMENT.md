# Sidebar Layout Enhancement - Three-State Toggle System

## Overview
The analysis sidebar (Phasor Diagram) now supports three different layout modes, allowing flexible placement of the visualization based on user preference. The button icon changes to reflect the current state.

## Features Implemented

### 1. Three Layout Modes

#### Mode 1: **Sidebar** (Default)
- **Icon**: ⊞ (Box outline)
- **Tooltip**: "Move to charts container"
- **Description**: Phasor diagram displays in the right-side analysis sidebar
- **Best For**: Side-by-side view with full sidebar details
- **Main Content**: Adjusted to account for sidebar width

#### Mode 2: **Floating Window**
- **Icon**: ▦ (Distribution/grid symbol)
- **Tooltip**: "Move to sidebar"
- **Description**: Phasor diagram appears as a draggable floating window
- **Best For**: Temporary detachment without losing sidebar functionality
- **Features**: 
  - Fully draggable window
  - Can be repositioned anywhere on screen
  - Constrained to viewport

#### Mode 3: **Charts Inline** (NEW - Boss Requirement)
- **Icon**: ⬅ (Left arrow)
- **Tooltip**: "Return to sidebar"
- **Description**: Phasor diagram displays INSIDE the charts container alongside other chart visualizations
- **Best For**: Comprehensive multi-chart analysis view
- **Layout**: Two-column grid (Phasor + Charts) when in charts container
- **Best For**: When you want to see the phasor diagram together with other COMTRADE charts

## How to Use

### Cycling Between Modes
1. Click the button in the "Analysis" sidebar header (top right of sidebar)
2. Each click cycles through the three modes:
   ```
   Sidebar ⊞ → Floating ▦ → Charts Inline ⬅ → Sidebar ⊞ (repeats)
   ```

### Mode Transitions

**Sidebar → Floating**
- Sidebar hides
- Main content expands to full width
- Phasor diagram floats as movable window
- Button shows "▦" icon

**Floating → Charts Inline**
- Floating window closes
- Sidebar remains hidden
- Phasor diagram moves to charts container
- Creates 2-column layout: [Phasor | Charts]
- Button shows "⬅" icon

**Charts Inline → Sidebar**
- Charts inline mode ends
- Phasor diagram returns to sidebar
- Sidebar becomes visible again
- Main content adjusts back to normal width
- Button shows "⊞" icon

## Technical Implementation

### State Management
```javascript
let sidebarLayoutMode = "sidebar"; // Tracks current mode
```
Global variable tracks which layout mode is active.

### Core Functions

#### `movePolarChartSection(targetMode)`
- Handles the actual DOM manipulation
- Moves/appends polar chart section to appropriate container
- Updates display styles based on target mode
- Manages sidebar visibility

#### `updateDetachButtonIcon(mode)`
- Updates button text to show current state
- Updates tooltip to describe next action
- Provides visual feedback for user

### DOM Elements Involved
- `#sidebar` - Analysis sidebar container
- `.polar-chart-section` - Phasor diagram wrapper
- `#charts` - Charts container (receives polar chart in inline mode)
- `#detachSidebarBtn` - The toggle button
- `#detachedWindow` - Floating window container

### CSS Styling
New styles added for polar chart in charts container:
```css
#charts .polar-chart-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  padding: 16px;
  margin: 0;
}

#charts .polar-chart-container {
  min-height: 300px;
  height: 100%;
}
```

## Button Icon Legend

| Icon | Mode | Current State | Next Action |
|------|------|---------------|------------|
| ⊞ | Sidebar | Phasor in sidebar | Click to move to floating |
| ▦ | Floating | Phasor in floating window | Click to move to charts |
| ⬅ | Charts Inline | Phasor in charts container | Click to return to sidebar |

## Files Modified

1. **index.html**
   - Updated button from "⬆" (arrow) to "⊞" (box)
   - Added more meaningful tooltip: "Move to charts container"

2. **src/main.js**
   - Added `sidebarLayoutMode` state variable
   - Created `movePolarChartSection()` function
   - Created `updateDetachButtonIcon()` function
   - Replaced simple detach logic with three-way toggle system
   - Updated attach/close handlers to reset layout state

3. **styles/main.css**
   - Added CSS rules for polar chart in charts container
   - Ensures proper spacing and styling when inline with charts
   - Maintains responsive layout

## User Benefits

✅ **Flexibility**: Choose layout that best suits current task
✅ **Space Management**: Sidebar or inline based on needs
✅ **Visual Feedback**: Button icon clearly shows current state
✅ **Smooth Transitions**: No data loss when switching modes
✅ **Boss Requirement Met**: Can now place phasor inside charts container alongside other visualizations

## Usage Recommendations

### Sidebar Mode (⊞)
- Default mode
- Use when you want full sidebar access
- Best for general analysis with channel details

### Floating Mode (▦)
- Use when you need the phasor temporarily visible
- Good for comparing specific waveforms
- Can reposition window as needed

### Charts Inline Mode (⬅) - Recommended by Boss
- **Best for comprehensive analysis**: See phasor diagram + other charts together
- Excellent for comparing:
  - Voltage/Current phasors (from phasor diagram)
  - Actual waveform plots (from charts container)
  - Multi-chart correlation analysis
- Makes full use of screen space
- Perfect for presentations or detailed analysis reports

## Notes

- Chart content is moved (not cloned) to preserve state
- All transitions are smooth with no data loss
- Sidebar can be toggled closed/open independently with the "✕" button
- The main toggle button "⊞/▦/⬅" is different from the close button "✕"

## Testing Checklist

- [ ] Click button cycles through all 3 modes
- [ ] Icons change correctly at each transition
- [ ] Tooltips update appropriately
- [ ] Charts display properly when polar is inline
- [ ] Two-column layout works (phasor + charts)
- [ ] Sidebar returns correctly from all modes
- [ ] Close button "✕" still functions
- [ ] Sidebar toggle button works from main content
