# Computed Channels Metadata System - Quick Reference

## Overview

A centralized metadata management system for computed channels with LaTeX equation display in the uPlot sidebar.

## Components Created

### 1. **`computedChannelMetadata.js`** - Metadata Manager

Class-based system for storing and retrieving computed channel metadata.

**Location:** `src/utils/computedChannelMetadata.js`

**Usage:**

```javascript
import { computedChannelMetadata } from "../utils/computedChannelMetadata.js";

// Add/Update metadata
computedChannelMetadata.set("computed_0", {
  name: "RMS_Voltage",
  equation: "sqrt(a0^2 + a1^2 + a2^2)",
  latexEquation: "\\sqrt{a_0^2 + a_1^2 + a_2^2}",
  color: "#FF6B6B",
  group: "Voltages",
  unit: "V",
  stats: { min: 0, max: 480, mean: 240, rms: 250 },
});

// Retrieve metadata
const channel = computedChannelMetadata.get("computed_0");

// Get all channels
const allChannels = computedChannelMetadata.getAll();

// Query by name
const byName = computedChannelMetadata.getByName("RMS_Voltage");

// Query by group
const voltages = computedChannelMetadata.getByGroup("Voltages");

// Check existence
const exists = computedChannelMetadata.has("computed_0");

// Delete
computedChannelMetadata.delete("computed_0");

// Count
const count = computedChannelMetadata.count(); // 5

// Export/Import
const json = computedChannelMetadata.toJSON();
computedChannelMetadata.fromJSON(json);

// Clear all
computedChannelMetadata.clear();
```

### 2. **`ComputedChannelsSidebar.js`** - Sidebar Display Component

Renders computed channels with LaTeX equations in uPlot sidebar.

**Location:** `src/components/ComputedChannelsSidebar.js`

**Features:**

- Color-coded channel indicators
- LaTeX equation display with MathJax rendering
- Channel statistics (Min, Max, Avg, RMS)
- Group and unit badges
- Hover effects for interactivity

**Usage:**

```javascript
import {
  createComputedChannelsSidebar,
  updateComputedChannelsSidebar,
  injectSidebarIntoUplot,
} from "./ComputedChannelsSidebar.js";

// Create sidebar
const sidebar = createComputedChannelsSidebar(containerEl, cfg, data);

// Update sidebar (after adding new channels)
const listContainer = document.getElementById("computed-channels-list");
updateComputedChannelsSidebar(listContainer);

// Inject into uPlot chart
injectSidebarIntoUplot(uplotContainer, sidebar);
```

## Integration Points

### 1. Equation Evaluator (`EquationEvaluatorInChannelList.js`)

When a computed channel is created, metadata is automatically saved:

```javascript
computedChannelMetadata.set(channelName, {
  name: channelName,
  equation: computation.equation,
  latexEquation: computation.equation,
  mathJsExpression: computation.equation,
  color: randomColor,
  group: usedGroup || "Computed",
  unit: "Computed",
  type: "Computed",
  stats: computation.stats,
  scalingFactor: computation.scalingFactor,
  description: `Auto-computed channel from equation`,
});
```

### 2. Chart Renderer (`renderComputedChannels.js`)

Sidebar is automatically created and injected when rendering computed channels:

```javascript
// Create and inject sidebar with computed channels metadata
const sidebar = createComputedChannelsSidebar(parentDiv, null, data);
if (sidebar) {
  injectSidebarIntoUplot(parentDiv, sidebar);
}
```

## Metadata Structure

Each computed channel stores:

```javascript
{
  id: "computed_0",              // Unique identifier
  name: "RMS_Voltage",           // Display name
  equation: "sqrt(a0^2 + a1^2)", // Math.js format
  latexEquation: "\\sqrt{a_0^2 + a_1^2}", // LaTeX format
  mathJsExpression: "...",       // Original expression
  color: "#FF6B6B",              // Display color (hex)
  group: "Voltages",             // Channel group
  unit: "V",                     // Unit of measurement
  type: "Computed",              // Always "Computed"
  stats: {                        // Statistical data
    min: 0,
    max: 480,
    mean: 240,
    rms: 250,
    stdDev: 15
  },
  scalingFactor: 1.0,            // For display scaling
  createdAt: "2025-12-11T...",   // ISO timestamp
  description: "Auto-computed..." // Optional description
}
```

## LaTeX Formatting

The system automatically converts Math.js notation to LaTeX:

| Math.js   | LaTeX              | Display            |
| --------- | ------------------ | ------------------ |
| `sqrt(x)` | `\sqrt{x}`         | $\sqrt{x}$         |
| `a0^2`    | `a_{0}^2`          | $a_{0}^2$          |
| `sin(x)`  | `\sin(x)`          | $\sin(x)$          |
| `pi`      | `\pi`              | $\pi$              |
| `abs(x)`  | `\left\|x\right\|` | $\left\|x\right\|$ |

## UI Layout

### Sidebar Position

```
┌─────────────────────────────────────────┐
│ 📊 Computed Channels  │                 │
├──────────────────────┤  uPlot Chart    │
│ Channel 1: $eq1$     │                 │
│ Channel 2: $eq2$     │  (Time Series)  │
│ Channel 3: $eq3$     │                 │
└──────────────────────┴─────────────────┘
```

The sidebar:

- Width: 300px (flex: 0 0 300px)
- Position: Left side of chart
- Scrollable: max-height: 100%
- Background: #f9f9f9

### Channel Item Display

```
┌──────────────────────────┐
│ ● Channel_Name          │ ← Color dot + Name
├──────────────────────────┤
│ $$\sqrt{a_0^2 + a_1^2}$$ │ ← LaTeX equation
├──────────────────────────┤
│ Min:  0.00    Max:  100  │
│ Avg: 50.00    RMS: 52.4  │
├──────────────────────────┤
│ 📁 Group     ⚙️ V        │ ← Badges
└──────────────────────────┘
```

## MathJax Integration

The sidebar automatically triggers MathJax rendering after DOM updates:

```javascript
if (window.MathJax) {
  MathJax.typesetPromise([listContainer]).catch((e) => {
    console.warn("[ComputedChannelsSidebar] MathJax typeset error:", e);
  });
}
```

**Requirements:**

- MathJax 3 loaded in `showChannelListWindow.js`
- Polyfill for ES6 support
- MathJax config: `tex-mml-chtml` mode

## Example Workflow

### Step 1: Create Computed Channel

User enters equation in popup: `sqrt(a0^2 + a1^2 + a2^2)`

### Step 2: Auto-Save Metadata

```javascript
computedChannelMetadata.set("computed_0", {
  name: "computed_0",
  equation: "sqrt(a0^2 + a1^2 + a2^2)",
  color: "#FF6B6B",
  // ... other fields
});
```

### Step 3: Render Chart

When viewing computed channels chart:

- Chart renders with time series
- Sidebar automatically created with all computed channels
- MathJax renders equations: $\sqrt{a_0^2 + a_1^2 + a_2^2}$

### Step 4: Display Updates

- User hovers channel item → highlight effect
- New channel created → sidebar updates automatically
- Stats update → display refreshed

## API Reference

### ComputedChannelMetadata Methods

| Method              | Parameters     | Returns      | Description         |
| ------------------- | -------------- | ------------ | ------------------- |
| `set(id, metadata)` | string, object | object       | Add/update metadata |
| `get(id)`           | string         | object\|null | Get metadata by ID  |
| `getAll()`          | none           | array        | Get all metadata    |
| `getByName(name)`   | string         | object\|null | Query by name       |
| `getByGroup(group)` | string         | array        | Query by group      |
| `delete(id)`        | string         | boolean      | Delete metadata     |
| `has(id)`           | string         | boolean      | Check existence     |
| `count()`           | none           | number       | Get channel count   |
| `clear()`           | none           | void         | Clear all           |
| `toJSON()`          | none           | string       | Export as JSON      |
| `fromJSON(json)`    | string         | void         | Import from JSON    |

### Sidebar Methods

| Method                                         | Parameters               | Returns     | Description       |
| ---------------------------------------------- | ------------------------ | ----------- | ----------------- |
| `createComputedChannelsSidebar(el, cfg, data)` | HTMLElement, obj, obj    | HTMLElement | Create sidebar    |
| `updateComputedChannelsSidebar(listContainer)` | HTMLElement              | void        | Refresh display   |
| `injectSidebarIntoUplot(uplotEl, sidebarEl)`   | HTMLElement, HTMLElement | void        | Inject into chart |

## Performance Notes

✅ **Optimized for:**

- O(1) lookup by ID (Map-based storage)
- O(1) insertion (direct push to array)
- Lazy MathJax rendering (only on display)
- Minimal DOM operations

⚠️ **Considerations:**

- MathJax rendering can take 100-500ms for many equations
- Sidebar width fixed at 300px (adjust if needed)
- LaTeX conversion is basic (add custom rules as needed)

## Troubleshooting

**Equations not rendering:**

- Check if MathJax is loaded: `window.MathJax !== undefined`
- Verify MathJax polyfill in popup window
- Check browser console for errors

**Metadata not saving:**

- Verify `computedChannelMetadata` is imported
- Check that channel ID is unique
- Look for console errors in popup window

**Sidebar not showing:**

- Check if `ComputedChannelsSidebar.js` is imported
- Verify `createComputedChannelsSidebar()` is called
- Check if container element exists in DOM

**Statistics not displaying:**

- Ensure `computation.stats` object exists with: min, max, mean, rms
- Check that values are valid numbers (not NaN/Infinity)

## Future Enhancements

- [ ] Edit channel metadata (name, color, description)
- [ ] Delete channels from sidebar
- [ ] Channel grouping/filtering
- [ ] Export metadata to CSV/JSON
- [ ] Metadata persistence (localStorage/IndexedDB)
- [ ] Channel comparison visualization
- [ ] Custom LaTeX formatting rules
- [ ] Equation syntax highlighting
