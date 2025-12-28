# Global Sidebar Store - Quick Reference Card

## What It Does
✅ Ensures only **ONE sidebar** is visible at a time  
✅ Both sidebars **CLOSED by default**  
✅ Centralized management system  
✅ Easy to add new sidebars  

## Quick Commands

```javascript
import { sidebarStore } from './utils/sidebarStore.js';

// Show sidebar (hide others)
sidebarStore.show('analysis-sidebar');
sidebarStore.show('delta-drawer');

// Hide sidebar
sidebarStore.hide('analysis-sidebar');

// Toggle visibility
sidebarStore.toggle('delta-drawer');

// Check what's visible
sidebarStore.getActiveSidebar();  // Returns ID or null

// Check if specific sidebar open
sidebarStore.isOpen('delta-drawer');  // Returns true/false

// Hide everything
sidebarStore.hideAll();

// List all registered sidebars
sidebarStore.getRegisteredSidebars();  // Returns array
```

## Sidebar IDs

| ID | Display Name | Default |
|----|--------------|---------|
| `analysis-sidebar` | Analysis (Phasor) | Closed |
| `delta-drawer` | Delta Drawer | Closed |

## How to Register New Sidebar

```javascript
import { sidebarStore } from './utils/sidebarStore.js';

sidebarStore.register('my-sidebar', {
  show: () => { myPanel.style.display = 'block'; },
  hide: () => { myPanel.style.display = 'none'; },
  isOpen: () => myPanel.style.display !== 'none',
  isClosedByDefault: true,
});

// Use it
sidebarStore.show('my-sidebar');
```

## Key Behavior

```
sidebarStore.show('A')  → A opens, B hides
sidebarStore.show('B')  → B opens, A hides
sidebarStore.hide('A')  → A closes
sidebarStore.toggle('A') → If closed, open; if open, close
sidebarStore.getActiveSidebar() → Returns currently visible ID
sidebarStore.isOpen('A') → Returns true if visible
```

## File Locations

| File | Purpose |
|------|---------|
| `src/utils/sidebarStore.js` | Core store |
| `src/main.js` | Analysis sidebar registration |
| `src/components/DeltaDrawer.js` | Delta drawer registration |

## Documentation

| File | Contains |
|------|----------|
| `SIDEBAR_STORE_README.md` | User guide |
| `SIDEBAR_STORE_BEFORE_AFTER.md` | Architecture comparison |
| `SIDEBAR_STORE_DEVELOPER_GUIDE.md` | Developer reference |
| `SIDEBAR_STORE_DOCUMENTATION.js` | API documentation |
| `SIDEBAR_STORE_IMPLEMENTATION_SUMMARY.md` | Complete summary |

## Debugging in Console

```javascript
// Open DevTools (F12) and run:

// Show analysis sidebar
sidebarStore.show('analysis-sidebar')

// Check what's visible
sidebarStore.getActiveSidebar()

// List all sidebars
sidebarStore.getRegisteredSidebars()

// Show delta drawer (hides analysis)
sidebarStore.show('delta-drawer')

// Hide delta drawer
sidebarStore.hide('delta-drawer')

// Hide everything
sidebarStore.hideAll()
```

## Common Use Cases

### Show Analysis
```javascript
sidebarStore.show('analysis-sidebar');
// Analysis opens, Delta hides
```

### Show Delta Measurements
```javascript
sidebarStore.show('delta-drawer');
// Delta opens, Analysis hides
```

### Close Everything
```javascript
sidebarStore.hideAll();
// Full-width charts
```

### Check Current State
```javascript
const active = sidebarStore.getActiveSidebar();
console.log(active); // 'analysis-sidebar', 'delta-drawer', or null
```

### Toggle a Sidebar
```javascript
sidebarStore.toggle('analysis-sidebar');
// If closed, opens. If open, closes.
```

## Console Logs (Shows)

```
[SidebarStore] Registered sidebar: analysis-sidebar
[SidebarStore] Registered sidebar: delta-drawer
[SidebarStore] Hiding sidebar: analysis-sidebar
[SidebarStore] Showing sidebar: delta-drawer
[SidebarRegistry] Sidebar registry initialized...
```

## Status

✅ **COMPLETE** - Ready for production use

---

**Quick Start**: Import sidebarStore → Use show()/hide()/toggle() → Done!
