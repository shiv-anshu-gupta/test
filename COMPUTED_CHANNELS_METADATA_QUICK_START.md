# Computed Channels Metadata - Quick Start (5 Minutes)

## 🚀 TL;DR

Your computed channels now have:
✅ **Centralized metadata storage** (name, equation, color, stats)
✅ **LaTeX equations in uPlot sidebar** (auto-rendered via MathJax)
✅ **Query functions** (get by ID, name, group)
✅ **Export/import capabilities**

---

## 📍 Where It Works

### 1. When Creating Computed Channels

User enters equation in popup → **Metadata auto-saved**

### 2. When Viewing Chart

Computed channels chart renders → **Sidebar auto-created** with all channels

### 3. In the Sidebar

Shows:

- Channel name with color dot
- Equation as LaTeX: $\sqrt{a_0^2 + a_1^2 + a_2^2}$
- Stats: Min, Max, Avg, RMS

---

## 💻 Code Examples

### Get a Channel's Metadata

```javascript
import { computedChannelMetadata } from "../utils/computedChannelMetadata.js";

// By ID
const channel = computedChannelMetadata.get("computed_0");
console.log(channel.name); // "RMS_Voltage"
console.log(channel.equation); // "sqrt(a0^2 + a1^2)"
console.log(channel.color); // "#FF6B6B"
```

### Get All Channels

```javascript
const allChannels = computedChannelMetadata.getAll();
console.log(`Total: ${allChannels.length}`);

allChannels.forEach((ch) => {
  console.log(`${ch.name}: ${ch.equation}`);
});
```

### Query by Name or Group

```javascript
// Find by name
const rms = computedChannelMetadata.getByName("RMS_Voltage");

// Find all in group
const powerChannels = computedChannelMetadata.getByGroup("Power");
console.log(`Power channels: ${powerChannels.length}`);
```

### Manually Add Channel

```javascript
computedChannelMetadata.set("manual_1", {
  name: "Custom Equation",
  equation: "a0 + a1 * 2",
  color: "#4ECDC4",
  group: "Custom",
  unit: "V",
  stats: { min: 0, max: 100, mean: 50, rms: 55 },
});
```

### Save/Load Metadata

```javascript
// Save to localStorage
const json = computedChannelMetadata.toJSON();
localStorage.setItem("myChannels", json);

// Load later
const saved = localStorage.getItem("myChannels");
computedChannelMetadata.fromJSON(saved);
```

---

## 🎨 UI Layout

When viewing computed channels chart:

```
┌─────────────────┬────────────────────┐
│  SIDEBAR        │  CHART             │
├─────────────────┼────────────────────┤
│ 📊 Computed Ch. │                    │
│                 │  Time Series       │
│ ● RMS_Voltage   │  Data Points       │
│ $$...\sqrt{...}$$│                    │
│ Min: 200        │  Data Points       │
│ Max: 280        │  More...           │
│ Avg: 240        │                    │
│ RMS: 245        │                    │
│                 │                    │
│ ● Power_P       │                    │
│ $$a_0 \cdot a_3$$│                    │
│ Stats...        │                    │
└─────────────────┴────────────────────┘
```

---

## 🔍 Metadata Structure

Each channel stores:

```javascript
{
  id: "computed_0",
  name: "RMS_Voltage",
  equation: "sqrt(a0^2 + a1^2)",
  latexEquation: "\\sqrt{a_0^2 + a_1^2}",
  color: "#FF6B6B",
  group: "Voltages",
  unit: "V",
  type: "Computed",
  stats: {
    min: 200,
    max: 280,
    mean: 240,
    rms: 245,
    stdDev: 15
  },
  scalingFactor: 1.0,
  createdAt: "2025-12-11T10:30:00Z",
  description: "RMS value of three-phase voltages"
}
```

---

## ⚡ Quick API Reference

### Essential Methods

```javascript
// Store
computedChannelMetadata.set(id, metadata);

// Retrieve
computedChannelMetadata.get(id); // By ID
computedChannelMetadata.getAll(); // All channels
computedChannelMetadata.getByName(name); // By name
computedChannelMetadata.getByGroup(group); // By group

// Check
computedChannelMetadata.has(id); // Exists?
computedChannelMetadata.count(); // Total count

// Delete
computedChannelMetadata.delete(id);

// Persistence
computedChannelMetadata.toJSON(); // Export
computedChannelMetadata.fromJSON(json); // Import

// Clear
computedChannelMetadata.clear();
```

---

## 🔄 Data Flow

### Creating a Channel

```
User enters equation
        ↓
Popup evaluates: "sqrt(a0^2 + a1^2)"
        ↓
Results calculated with stats
        ↓
metadata.set() called automatically
        ↓
✅ Metadata stored
```

### Viewing Channels

```
User views Computed Channels chart
        ↓
renderComputedChannels() called
        ↓
Sidebar created with createComputedChannelsSidebar()
        ↓
MathJax renders equations: $\sqrt{a_0^2 + a_1^2}$
        ↓
✅ Beautiful sidebar displayed
```

---

## 📁 Files to Know

| File                                               | Purpose                              |
| -------------------------------------------------- | ------------------------------------ |
| `src/utils/computedChannelMetadata.js`             | Metadata manager (storage + queries) |
| `src/components/ComputedChannelsSidebar.js`        | Sidebar UI with LaTeX equations      |
| `src/components/EquationEvaluatorInChannelList.js` | Auto-saves metadata on create        |
| `src/components/renderComputedChannels.js`         | Auto-creates sidebar on display      |

---

## 🎯 Common Tasks

### 1. Get all voltage-related channels

```javascript
const voltageChannels = computedChannelMetadata.getByGroup("Voltages");
```

### 2. Find channel by name

```javascript
const channel = computedChannelMetadata.getByName("RMS_Voltage_ABC");
if (channel) {
  console.log(`Equation: ${channel.equation}`);
  console.log(`RMS: ${channel.stats.rms}`);
}
```

### 3. Update a channel's color

```javascript
const ch = computedChannelMetadata.get("computed_0");
computedChannelMetadata.set("computed_0", {
  ...ch,
  color: "#4ECDC4", // New color
});
```

### 4. Export and save

```javascript
const backup = computedChannelMetadata.toJSON();
localStorage.setItem("channels_backup", backup);
```

### 5. Delete a channel

```javascript
computedChannelMetadata.delete("computed_0");
```

---

## ✨ What's Automatic

You don't need to do anything - these happen automatically:

✅ **Metadata saved** when equation is created in popup
✅ **Sidebar created** when viewing computed channels chart
✅ **Equations formatted** to LaTeX automatically
✅ **MathJax rendering** triggered on display
✅ **Statistics calculated** and stored
✅ **Color assigned** and stored

---

## 🚨 Errors?

### "Module not found"

Make sure import path is correct:

```javascript
// ✅ Correct
import { computedChannelMetadata } from "../utils/computedChannelMetadata.js";

// ❌ Wrong
import { computedChannelMetadata } from "./computedChannelMetadata.js";
```

### Equations not rendering in sidebar

1. Check MathJax is loaded in popup
2. Check browser console for errors
3. Verify `window.MathJax !== undefined`

### Sidebar not showing

1. Check `ComputedChannelsSidebar.js` is imported
2. Verify chart container exists in DOM
3. Check console for errors

---

## 📚 More Info

- **Full Guide:** `COMPUTED_CHANNELS_METADATA_GUIDE.md`
- **Examples:** `src/examples/computedChannelMetadataExample.js`
- **Implementation Details:** `COMPUTED_CHANNELS_METADATA_IMPLEMENTATION_SUMMARY.md`

---

## 🎉 You're All Set!

Your computed channels now have professional metadata management and beautiful LaTeX equation display. Start creating computed channels in the popup and watch them appear in the sidebar with their equations rendered as LaTeX! 🚀
