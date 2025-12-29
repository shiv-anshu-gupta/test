# Simple Sidebar Resize - Implementation Guide

## 🎯 The Simple Mechanism

```
1. Calculate sidebar width
2. When sidebar opens → add margin to main content
3. When sidebar closes → remove margin from main content
4. Charts auto-resize to fit
```

---

## 📦 What's Included

### 1. **Utility Function** (`src/utils/sidebarResize.js`)

```javascript
adjustMainContent(position, sidebarWidth);
// position: 'left' or 'right'
// sidebarWidth: pixels (0 to close)
```

### 2. **CSS Transitions** (in `styles/main.css`)

```css
#main-content,
#charts,
.charts-container {
  transition: margin-left 0.3s ease, margin-right 0.3s ease;
}
```

### 3. **Auto Chart Resizing**

- Detects `window.charts` and `window.__chartsComputed`
- Calls `chart.setSize()` automatically
- Respects CSS transition timing

---

## 🔧 Quick Integration (Copy-Paste)

### Step 1: Add Import

```javascript
// In your src/main.js at the top
import { adjustMainContent } from "./utils/sidebarResize.js";
```

### Step 2: Add to Your Button Handlers

**For Delta Window (Left Side):**

```javascript
const deltaBtn = document.getElementById("delta-btn");
if (deltaBtn) {
  deltaBtn.addEventListener("click", () => {
    const deltaWin = window.open(
      "",
      "Delta Window",
      "width=400,height=600,left=0,top=0"
    );

    // ✅ ADD THIS LINE:
    adjustMainContent("left", 400);

    // When window closes
    deltaWin.addEventListener("beforeunload", () => {
      adjustMainContent("left", 0);
    });
  });
}
```

**For Phasor Window (Right Side):**

```javascript
const phasorBtn = document.getElementById("phasor-btn");
if (phasorBtn) {
  phasorBtn.addEventListener("click", () => {
    const phasorWin = window.open(
      "",
      "Phasor Diagram",
      "width=500,height=600,right=0,top=0"
    );

    // ✅ ADD THIS LINE:
    adjustMainContent("right", 500);

    // When window closes
    phasorWin.addEventListener("beforeunload", () => {
      adjustMainContent("right", 0);
    });
  });
}
```

**For Analysis Drawer (Left Side):**

```javascript
function toggleAnalysisDrawer() {
  const drawer = document.getElementById("analysis-drawer");

  if (drawer.style.display === "none") {
    drawer.style.display = "block";
    // ✅ ADD THIS LINE (get actual drawer width):
    adjustMainContent("left", drawer.offsetWidth);
  } else {
    drawer.style.display = "none";
    // ✅ ADD THIS LINE (close):
    adjustMainContent("left", 0);
  }
}
```

---

## 📊 Visual Examples

### Delta Window Only (Left 400px)

```
┌──────────────┬───────────────────────────────────────────┐
│              │                                           │
│  Delta (400) │      MAIN CHARTS (~calc(100% - 400px))   │
│              │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### Phasor Window Only (Right 500px)

```
┌──────────────────────────────────────────────┬─────────────┐
│                                              │             │
│       MAIN CHARTS (~calc(100% - 500px))     │  Phasor     │
│                                              │  (500px)    │
└──────────────────────────────────────────────┴─────────────┘
```

### Both Open

```
┌──────────────┬──────────────────────────┬─────────────┐
│              │                          │             │
│  Delta (400) │  MAIN CHARTS (middle)   │  Phasor     │
│              │                          │  (500px)    │
└──────────────┴──────────────────────────┴─────────────┘
```

---

## 🧪 Testing in Browser Console

```javascript
// Test: Open Delta window
adjustMainContent("left", 400);

// Test: Open Phasor window
adjustMainContent("right", 500);

// Test: Both open
adjustMainContent("left", 400);
adjustMainContent("right", 500);

// Test: Close all
adjustMainContent("left", 0);
adjustMainContent("right", 0);
```

Expected console output:

```
✅ Charts resized
```

---

## 🔑 Key Points

| Feature               | Details                       |
| --------------------- | ----------------------------- |
| **Position**          | 'left' or 'right'             |
| **Sidebar Width**     | Number in pixels (e.g., 400)  |
| **Close**             | Pass 0 as width               |
| **Transition**        | 300ms smooth animation        |
| **Chart Resize**      | Automatic after transition    |
| **Multiple Sidebars** | Can call twice (left + right) |

---

## 📝 Example: Complete Integration

```javascript
// ============ In your src/main.js ============

import { adjustMainContent } from "./utils/sidebarResize.js";

// Delta button
document.getElementById("delta-btn")?.addEventListener("click", () => {
  const deltaWin = window.open(
    "",
    "Delta Window",
    "width=400,height=600,left=0,top=0"
  );
  adjustMainContent("left", 400);

  deltaWin.addEventListener("beforeunload", () => {
    adjustMainContent("left", 0);
  });
});

// Phasor button
document.getElementById("phasor-btn")?.addEventListener("click", () => {
  const phasorWin = window.open(
    "",
    "Phasor Diagram",
    "width=500,height=600,right=0,top=0"
  );
  adjustMainContent("right", 500);

  phasorWin.addEventListener("beforeunload", () => {
    adjustMainContent("right", 0);
  });
});

// Analysis drawer toggle
document.getElementById("analysis-toggle")?.addEventListener("click", () => {
  const drawer = document.getElementById("analysis-drawer");
  if (drawer.style.display === "none") {
    drawer.style.display = "block";
    adjustMainContent("left", drawer.offsetWidth);
  } else {
    drawer.style.display = "none";
    adjustMainContent("left", 0);
  }
});
```

---

## ✅ What Happens Automatically

1. **Margin Applied** - `margin-left` or `margin-right` updated smoothly
2. **CSS Transition** - 0.3s animation for visual appeal
3. **Chart Detection** - Finds all uPlot chart instances
4. **Chart Resize** - Calls `setSize()` on each chart
5. **Responsive** - Works at any window size
6. **No Complex Code** - Just 3 lines per button

---

## 🚀 Done!

That's it! No complex code, no event listeners on every chart. Just:

1. Import the utility
2. Call it when sidebar opens/closes
3. Charts handle themselves

See `SIDEBAR_RESIZE_SIMPLE_EXAMPLE.js` for complete copy-paste examples.
