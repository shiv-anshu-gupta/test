# Polar Chart / Phasor Diagram - Understanding "Points"

## What Your Boss Meant by "Points"

Your boss is referring to **phasor data points** in your COMTRADE files. Here's what that means:

### CFG File "Points" Structure

In the CFG file, each analog channel has magnitude and phase angle data. Example:

```
5,VA,A,,V,8.301884740149549E-05,90.7578125,0,-2147483648,2147483647,700,1,P
Format: ID, Name, Phase, Type, Unit, Scale, Offset, Min, Max, Primary, Class

Key Fields:
- VA = Channel name (Voltage A phase)
- 90.7578125 = Phase angle in degrees (0-360°)
- 8.301884740149549E-05 = Multiplier/Scale factor
```

### What Are "Points"?

**Points** in a phasor diagram are:

1. **Magnitude** = The amplitude/strength of the signal (current or voltage)
2. **Phase Angle** = The angle in degrees (0-360°) relative to reference (typically 0° = current)

### Three-Phase System

Your power system has **6 phasor points** (3-phase):

| Channel | Type            | Typical Angle | Color  |
| ------- | --------------- | ------------- | ------ |
| IA      | Current Phase A | 0°            | Cyan   |
| IB      | Current Phase B | 240°          | Blue   |
| IC      | Current Phase C | 120°          | Green  |
| VA      | Voltage Phase A | 30°           | Orange |
| VB      | Voltage Phase B | 270°          | Yellow |
| VC      | Voltage Phase C | 150°          | Red    |

**Note**: The 120° spacing between phases is the standard for balanced three-phase power systems.

---

## Current Implementation

### Dummy Phasor Data (Demo)

The polar chart currently displays **dummy/mock phasor data** based on typical values:

```javascript
[
  { label: "IA", magnitude: 100, angle: 0, color: "#00d9ff" }, // Cyan
  { label: "IB", magnitude: 95, angle: 240, color: "#2196f3" }, // Blue
  { label: "IC", magnitude: 98, angle: 120, color: "#10b981" }, // Green
  { label: "VA", magnitude: 240, angle: 30, color: "#ff6b35" }, // Orange
  { label: "VB", magnitude: 238, angle: 270, color: "#fbbf24" }, // Yellow
  { label: "VC", magnitude: 242, angle: 150, color: "#ef4444" }, // Red
];
```

### Chart Features

✅ Circular phasor diagram with vectors
✅ Grid circles and axis lines (0°, 90°, 180°, 270°)
✅ Labeled vectors with arrows pointing to magnitude values
✅ Color-coded by phase (currents vs voltages)
✅ Responsive SVG rendering
✅ Clean professional styling

---

## Next Steps: Extract Real Data from CFG/DAT

To display **real data** instead of dummy data, we need to:

### 1. **Extract Phase Angles from CFG**

```javascript
// CFG has offset field which often contains phase angle
const phaseAngle = cfg.analogChannels[i].offset; // or another field
```

### 2. **Extract Magnitude from DAT**

```javascript
// Get first sample value from data at time index 0
const magnitude = data.analog[i][0]; // First sample
```

### 3. **Create Real Phasor Data Array**

```javascript
const realPhasorData = cfg.analogChannels
  .filter((ch) => ["VA", "VB", "VC", "IA", "IB", "IC"].includes(ch.name))
  .map((ch) => ({
    label: ch.name,
    magnitude: Math.abs(data.analog[ch.index][0]), // First sample
    angle: ch.phase_angle, // From CFG
    color: getColorForChannel(ch.name),
  }));

polarChart.updateData(realPhasorData);
```

---

## API Reference

### PolarChart Class

#### Constructor

```javascript
const polarChart = new PolarChart("polarChartContainer");
```

#### Methods

**init()**

```javascript
polarChart.init(); // Renders the polar chart
```

**updateData(phasorData)**

```javascript
polarChart.updateData([
  { label: "IA", magnitude: 100, angle: 0, color: "#00d9ff" },
  // ... more phasors
]);
```

**getData()**

```javascript
const currentData = polarChart.getData(); // Returns current phasor array
```

---

## Integration with Vertical Lines

Currently, the polar chart shows **static dummy data**. To make it dynamic with vertical lines:

1. **When user places vertical line** → Get data at that time index
2. **Extract phasor values** at that index from all analog channels
3. **Update polar chart** with new values
4. **Show in sidebar** real-time as user moves lines

This would provide instant phasor visualization at any point in the fault recording!

---

## Files Modified

- ✅ `src/components/PolarChart.js` - New polar chart component
- ✅ `src/main.js` - Added PolarChart import and initialization
- ✅ `index.html` - Added polar chart container in right sidebar
- ✅ `styles/main.css` - Added sidebar styling and layout

---

## What to Show Your Boss

> "The polar/circular chart displays **phasor points** - the magnitude and phase angle of three-phase currents and voltages. Each vector represents one phase (A, B, C), and the 120° spacing shows the balanced power system. We can enhance it to show real-time data as users click on the fault recording timeline."
