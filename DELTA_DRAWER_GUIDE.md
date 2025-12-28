# Delta Drawer Implementation Guide

## Overview
The Delta Drawer is a modern sidebar component that replaces the popup window for displaying delta measurements. It provides a better user experience by:

✅ **Not blocking the parent window** - Users can still interact with the main chart
✅ **Slide-out animation** - Smooth transitions from the right side
✅ **Sticky toggle button** - A button appears on the right edge when drawer is closed
✅ **Keyboard support** - Press ESC to close the drawer
✅ **Responsive design** - Works on all screen sizes

## Features

### 1. Side Drawer Panel
- Slides in from the right side of the screen
- Shows delta measurements in a clean, organized format
- Semi-transparent backdrop (click to close)
- Close button in the top-right corner

### 2. Toggle Button
- Sticky button on the right edge when drawer is closed
- Automatically hidden when drawer is open
- Can be clicked to reopen the drawer
- Displays a delta (Δ) symbol with "Data" text

### 3. Data Organization
Delta measurements are grouped by channel:
```
[Channel Name] (with color indicator)
  ├─ Label 1: value
  ├─ Label 2: value
  └─ Label 3: value
```

## Usage in Code

### Creating the drawer
```javascript
import { createDeltaDrawer } from "./components/DeltaDrawer.js";

export const deltaWindow = createDeltaDrawer();
```

### Available Methods

#### `show()`
Opens the drawer with slide-in animation.
```javascript
deltaWindow.show();
```

#### `hide()`
Closes the drawer with slide-out animation and shows the toggle button.
```javascript
deltaWindow.hide();
```

#### `update(deltaData)`
Updates the drawer content with delta measurement data.
```javascript
deltaWindow.update([
  { channel: "Voltage", label: "ΔV", value: "1.5 kV", color: "#ff0000" },
  { channel: "Current", label: "ΔI", value: "2.3 A", color: "#00ff00" }
]);
```

#### `isOpen()`
Returns whether the drawer is currently open.
```javascript
if (deltaWindow.isOpen()) {
  // Drawer is open
}
```

#### `toggle()`
Toggles the drawer open/close state.
```javascript
deltaWindow.toggle();
```

## Data Format

The `update()` method expects an array of objects with this structure:

```javascript
{
  channel: "string",        // Channel name (e.g., "Voltage", "Current")
  label: "string",          // Delta label (e.g., "ΔV", "ΔI")
  value: "string",          // Formatted value (e.g., "1.5 kV")
  color: "string"           // Hex color (e.g., "#ff0000")
}
```

### Example:
```javascript
const deltaData = [
  {
    channel: "Phase A Voltage",
    label: "ΔV",
    value: "123.45 V",
    color: "#e41a1c"
  },
  {
    channel: "Phase A Current",
    label: "ΔI",
    value: "45.67 A",
    color: "#377eb8"
  }
];

deltaWindow.update(deltaData);
deltaWindow.show();
```

## Styling

The drawer uses inline CSS with Tailwind classes:
- **Panel width**: `max-w-md` (384px)
- **Animation duration**: `duration-500`
- **Backdrop opacity**: `opacity-75`
- **Header background**: `bg-white` with bottom border
- **Content area**: Scrollable with padding

### Customizing Appearance

To customize colors/styles, edit the drawer creation in `/src/components/DeltaDrawer.js`:

```javascript
// Change panel width (in the HTML template)
class="ml-auto block size-full max-w-md ..."  // ← max-w-md controls width

// Change animation duration
class="transition duration-500 ease-in-out ..."  // ← duration-500 is 500ms

// Change backdrop opacity
class="bg-gray-500/75 ..."  // ← /75 is 75% opacity
```

## Integration Points

### 1. Vertical Line Plugin (`src/plugins/verticalLinePlugin.js`)
When vertical lines are dragged with 2+ lines:
```javascript
const { deltaWindow } = await import("../main.js");
if (deltaWindow) {
  deltaWindow.show();
  deltaWindow.update(allDeltaData);
}
```

### 2. Computed Channels (`src/components/renderComputedChannels.js`)
When computed channels are created:
```javascript
const { deltaWindow } = await import("../main.js");
if (deltaWindow && verticalLinesX.value.length > 1) {
  deltaWindow.show();
  deltaWindow.update(deltaData);
}
```

### 3. Delta Calculation (`src/utils/calculateDeltas.js`)
After calculating deltas:
```javascript
const { deltaWindow } = await import("../main.js");
if (deltaWindow && deltaData.length > 0 && verticalLinesX.length > 1) {
  deltaWindow.show();
  deltaWindow.update(deltaData);
}
```

## Keyboard Shortcuts

- **ESC**: Close the drawer (if open)
- **Click backdrop**: Close the drawer
- **Click close button**: Close the drawer
- **Click toggle button**: Open the drawer (when closed)

## Performance Considerations

✅ DOM elements are created once and reused
✅ CSS transitions use GPU acceleration (transform)
✅ Event listeners are attached once during initialization
✅ No polling or interval timers

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ All modern Chromium-based browsers

## Troubleshooting

### Drawer doesn't appear
1. Check that `deltaWindow.show()` is being called
2. Verify `deltaWindow.update(data)` has valid data
3. Check browser console for errors

### Toggle button not visible
1. Ensure drawer is closed: `deltaWindow.hide()`
2. Check z-index conflicts with other elements
3. Verify CSS isn't being overridden

### Animation feels slow
Adjust `duration-500` to `duration-300` or `duration-200` in DeltaDrawer.js

### Data not displaying
1. Verify data format matches expected structure
2. Check that `channel`, `label`, `value`, and `color` are all present
3. Log the data before calling `update()`: `console.log(deltaData)`

## Migration from Popup Window

If updating from the old popup window:

**Before:**
```javascript
const deltaWindow = createDeltaWindow();  // Creates popup
deltaWindow.show();
deltaWindow.update(data);
```

**After:**
```javascript
const deltaWindow = createDeltaDrawer();  // Creates drawer
deltaWindow.show();
deltaWindow.update(data);  // Same API!
```

The API is identical, so no code changes are needed in the calling code! ✅

## Future Enhancements

Potential improvements:
- [ ] Keyboard navigation between delta items
- [ ] Copy delta values to clipboard
- [ ] Export delta data as CSV/JSON
- [ ] Resize drawer width
- [ ] Pinned toggle button position
- [ ] Dark mode support
