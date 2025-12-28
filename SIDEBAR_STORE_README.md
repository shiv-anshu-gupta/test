# Global Sidebar Store - Quick Start Guide

## Overview

Created a centralized **Global Sidebar Store** that manages the visibility of all sidebars and drawers in the application. This ensures that **only ONE sidebar is visible at a time** and prevents overlapping UI elements.

## Key Features

✅ **Only One Sidebar Visible at a Time**

- When you show one sidebar, all others automatically close
- No more overlapping panels fighting for screen space

✅ **Closed by Default**

- Analysis sidebar (Phasor Diagram) starts CLOSED
- Delta drawer starts CLOSED
- User gets a clean interface on page load

✅ **Centralized Management**

- Single source of truth for sidebar visibility
- Easy to add new sidebars to the system
- No scattered DOM manipulation code

✅ **Simple API**

- `sidebarStore.show('sidebar-id')` - Show a sidebar, hide others
- `sidebarStore.hide('sidebar-id')` - Close a sidebar
- `sidebarStore.toggle('sidebar-id')` - Toggle visibility
- `sidebarStore.getActiveSidebar()` - Check what's currently visible

## Files Created/Modified

### New Files:

1. **`src/utils/sidebarStore.js`**

   - Core SidebarStore class
   - Manages all sidebar state and visibility
   - Exported as `sidebarStore` singleton

2. **`src/utils/SIDEBAR_STORE_DOCUMENTATION.js`**
   - Complete API documentation
   - Usage examples
   - Best practices and troubleshooting

### Modified Files:

1. **`src/main.js`**

   - Added import: `import { sidebarStore } from './utils/sidebarStore.js'`
   - Added `initSidebarSystem()` function to register all sidebars
   - Registers "analysis-sidebar" and calls `deltaWindow.registerWithStore()`
   - Calls `initializeDefaults()` to close all sidebars on startup

2. **`src/components/DeltaDrawer.js`**
   - Added import: `import { sidebarStore } from '../utils/sidebarStore.js'`
   - Added `registerWithStore()` method
   - Automatically registers "delta-drawer" with the store

## Registered Sidebars

### 1. Analysis Sidebar (Phasor Diagram)

- **ID:** `"analysis-sidebar"`
- **Location:** Left sidebar
- **Default:** CLOSED
- **Contains:** Phasor diagram visualization
- **Show:** `sidebarStore.show('analysis-sidebar')`

### 2. Delta Drawer

- **ID:** `"delta-drawer"`
- **Location:** Right slide-out drawer
- **Default:** CLOSED
- **Contains:** Delta measurements between vertical lines
- **Show:** `sidebarStore.show('delta-drawer')`

## How It Works

### Initialization (Page Load)

```
1. initSidebarSystem() called in main.js
   ↓
2. Registers "analysis-sidebar" with show/hide/isOpen functions
   ↓
3. Calls deltaWindow.registerWithStore() to register "delta-drawer"
   ↓
4. Calls sidebarStore.initializeDefaults()
   ↓
5. Both sidebars are hidden (isClosedByDefault: true)
   ↓
6. User sees clean interface with no sidebars visible
```

### User Opens a Sidebar

```
1. User clicks button to show analysis sidebar
   ↓
2. sidebarStore.show('analysis-sidebar') called
   ↓
3. Store checks if any sidebar is currently open
   ↓
4. If delta-drawer was open, it gets hidden automatically
   ↓
5. Analysis sidebar is shown
   ↓
6. activeSidebar = 'analysis-sidebar'
```

### User Switches to Another Sidebar

```
1. User clicks button to show delta-drawer
   ↓
2. sidebarStore.show('delta-drawer') called
   ↓
3. Store detects 'analysis-sidebar' is open and hides it
   ↓
4. Delta drawer is shown
   ↓
5. activeSidebar = 'delta-drawer'
   ↓
6. Result: Analysis sidebar gone, delta drawer visible
```

## Usage Examples

### Example 1: Show Analysis Sidebar

```javascript
import { sidebarStore } from "./utils/sidebarStore.js";

// Show analysis sidebar
sidebarStore.show("analysis-sidebar");
// Delta drawer automatically hides if it was open
```

### Example 2: Show Delta Drawer

```javascript
import { sidebarStore } from "./utils/sidebarStore.js";

// Show delta drawer
sidebarStore.show("delta-drawer");
// Analysis sidebar automatically hides if it was open
```

### Example 3: Check What's Currently Visible

```javascript
import { sidebarStore } from "./utils/sidebarStore.js";

const active = sidebarStore.getActiveSidebar();

if (active === "delta-drawer") {
  console.log("Delta measurements are visible");
} else if (active === "analysis-sidebar") {
  console.log("Phasor diagram is visible");
} else {
  console.log("No sidebar is currently visible");
}
```

### Example 4: Close All Sidebars

```javascript
import { sidebarStore } from "./utils/sidebarStore.js";

// Hide everything
sidebarStore.hideAll();
```

### Example 5: Toggle a Sidebar

```javascript
import { sidebarStore } from "./utils/sidebarStore.js";

// If analysis sidebar is open, close it
// If analysis sidebar is closed, open it and hide others
sidebarStore.toggle("analysis-sidebar");
```

## Adding a New Sidebar

If you want to add another sidebar to the system:

```javascript
import { sidebarStore } from "./utils/sidebarStore.js";

// Get references to your sidebar elements
const mySidebar = document.getElementById("my-sidebar");
const toggleBtn = document.getElementById("my-toggle-btn");

// Define what "show" means for your sidebar
const showMySidebar = () => {
  mySidebar.style.display = "flex";
  mySidebar.style.visibility = "visible";
  toggleBtn.style.display = "none";
  console.log("My sidebar is now visible");
};

// Define what "hide" means for your sidebar
const hideMySidebar = () => {
  mySidebar.style.display = "none";
  mySidebar.style.visibility = "hidden";
  toggleBtn.style.display = "flex";
  console.log("My sidebar is now hidden");
};

// Define how to check if it's open
const isOpen = () => {
  return mySidebar.style.display !== "none";
};

// Register it with the store
sidebarStore.register("my-sidebar", {
  show: showMySidebar,
  hide: hideMySidebar,
  isOpen: isOpen,
  isClosedByDefault: true, // Start closed
});

// Now use it like any other sidebar
sidebarStore.show("my-sidebar"); // Shows your sidebar, hides others
```

## Console Logging

The system logs all activities to the browser console for debugging:

```
[SidebarStore] Registered sidebar: analysis-sidebar
[SidebarStore] Registered sidebar: delta-drawer
[SidebarStore] Showing sidebar: analysis-sidebar
[SidebarRegistry] Sidebar registry initialized. Active sidebars: ["analysis-sidebar", "delta-drawer"]
```

Open DevTools (F12) → Console to see these messages.

## Benefits

1. **Better UX**: Users don't see multiple overlapping sidebars
2. **Cleaner Code**: No scattered `display: none/flex` logic across files
3. **Maintainable**: Easy to add/remove sidebars from the system
4. **Predictable**: Clear single source of truth for sidebar state
5. **Debuggable**: Console logs show exactly what's happening
6. **Extensible**: Can be enhanced with animations, persistence, etc.

## Current State

✅ **Analysis Sidebar**: Closed by default (was always visible)
✅ **Delta Drawer**: Closed by default (opens when needed)
✅ **Mutual Exclusion**: Only one visible at a time
✅ **System Ready**: All functionality working correctly

## Next Steps (Optional)

- Users can customize which sidebar is shown by default
- Could add keyboard shortcuts for quick switching
- Could add animations when switching sidebars
- Could remember user's last sidebar preference
- Could support showing sidebars on mobile/desktop differently

---

**Status**: ✅ COMPLETE - Global sidebar store system fully implemented and tested.
