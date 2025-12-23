## Quick Reference: New Modular Utilities

### 1. axisBuilder.js - Axis Creation Factory

```javascript
import {
  buildCompleteAxesArray,
  createMultiAxisDefinition,
  createSingleAxisDefinition,
  getAxisCount
} from '../utils/axisBuilder.js';

// Build complete X + Y axes array
const axes = buildCompleteAxesArray({
  xLabel: "Time",
  xUnit: "ms",
  xScale: 1000,
  yLabels: ["Voltage", "Current"],
  yUnits: ["V", "A"],
  axesScales: [1000, 1000, 1000],
  singleYAxis: false,
  maxYAxes: 2
});

// Get axis count
const count = getAxisCount(
  yLabels.length,  // 2
  maxYAxes,        // 2
  singleYAxis      // false
); // Returns: 2
```

### 2. seriesMapper.js - Series Configuration Factory

```javascript
import {
  createSeriesDefinitions,
  createYAxisScales,
  getSeriesAxisIndex
} from '../utils/seriesMapper.js';

// Create series configs with smart axis mapping
const series = createSeriesDefinitions({
  yLabels: ["Voltage", "Current", "Current"],
  lineColors: ["#FF0000", "#00FF00", "#0000FF"],
  yUnits: ["V", "A", "A"],
  singleYAxis: false,
  maxYAxes: 2
});
// Returns series where:
// - Series 0 (Voltage) → axis 0
// - Series 1 (Current) → axis 1
// - Series 2 (Current) → axis 1

// Create Y-axis scales
const scales = createYAxisScales(2); // { y0: { auto: true }, y1: { auto: true } }

// Get specific series axis
const axisIdx = getSeriesAxisIndex(
  1,                 // series index
  ["V", "A", "A"],  // yLabels
  ["V", "A", "A"],  // yUnits
  false,             // singleYAxis
  2                  // maxYAxes
); // Returns: 1
```

### 3. chartAxisAlignment.js - Global Synchronization

```javascript
import {
  getGlobalAxisAlignment,
  validateAxisAlignment,
  logAxisAlignment,
  getAxisRequirementsSummary,
  hasAxisCountChanged
} from '../utils/chartAxisAlignment.js';

// Get max axes needed globally
const maxAxes = getGlobalAxisAlignment(groups);
// Looks at all groups and returns the maximum axisCount

// Validate alignment
const report = validateAxisAlignment(groups, globalMaxAxes);
// {
//   isAligned: true,
//   maxAxes: 2,
//   groupStatus: [
//     { groupIndex: 0, groupName: "G1", requiredAxes: 1, globalAxes: 2, isAligned: true },
//     { groupIndex: 1, groupName: "G2", requiredAxes: 2, globalAxes: 2, isAligned: true }
//   ]
// }

// Log for debugging
logAxisAlignment(groups, globalMaxAxes);
// Outputs: ✅ Group 0 (G1): requires 1, using 2
//          ✅ Group 1 (G2): requires 2, using 2

// Get summary
const summary = getAxisRequirementsSummary(groups);
// [
//   { index: 0, name: "G1", axisCount: 1, channels: 2 },
//   { index: 1, name: "G2", axisCount: 2, channels: 3 }
// ]

// Check if axis count changed
const changed = hasAxisCountChanged(previousGroups, currentGroups);
// Useful for detecting when chart rebuild is needed
```

### 4. Updated chartComponent.js Usage

```javascript
import { createChartOptions } from './chartComponent.js';
import { getGlobalAxisAlignment } from '../utils/chartAxisAlignment.js';

// Calculate global alignment once
const globalMaxAxes = getGlobalAxisAlignment(groups);

// Pass to all chart instances
const opts = createChartOptions({
  title: "Analog Channels",
  yLabels: ["V", "I"],
  lineColors: ["#FF0000", "#00FF00"],
  yUnits: ["V", "A"],
  axesScales: [1000, 1000, 1000],
  singleYAxis: false,
  maxYAxes: globalMaxAxes  // ✅ Same for ALL charts
});
```

### 5. Updated renderAnalogCharts.js Usage

```javascript
import { getGlobalAxisAlignment } from '../utils/chartAxisAlignment.js';

// In renderAnalogCharts function
const globalMaxYAxes = getGlobalAxisAlignment(groups);

// Use for all charts in the loop
groups.forEach((group) => {
  const opts = createChartOptions({
    // ... other config
    maxYAxes: globalMaxYAxes  // ✅ All charts same axis count
  });
  // ... create chart
});
```

### CSS Variables (Updated in main.css)

```css
:root {
  /* Chart colors - now defined! */
  --chart-text: #1e293b;       /* Axis labels (light) */
  --chart-grid: #cbd5e1;       /* Grid lines (light) */
  --chart-bg: #ffffff;         /* Chart background */
  --chart-axis: #64748b;       /* Axis line color */
}

/* Dark theme handled by themeManager.js */
```

### Key Architecture Points

1. **Separation of Concerns:**
   - `axisBuilder` → Axis creation logic
   - `seriesMapper` → Series mapping logic
   - `chartAxisAlignment` → Global synchronization

2. **Reusability:**
   - Each utility is independent
   - Can be imported in any component
   - Easy to extend

3. **Global Consistency:**
   - All charts get same `globalMaxYAxes` value
   - Ensures UI alignment
   - Calculated once per render cycle

4. **Theme Support:**
   - CSS variables properly defined
   - Works with existing theme manager
   - Colors now visible

