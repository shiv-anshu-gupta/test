# Channel Grouping & Rendering Architecture Analysis

## 1. Channel Type Grouping Patterns

### Current Approach (Existing Channels)

Channels are automatically grouped by **pattern matching** based on channel ID:

**File:** `src/utils/autoGroupChannels.js`

```javascript
const patterns = [
  {
    name: "Currents",
    regex: /^I[ABC]$/i,
    colorSet: ["#e41a1c", "#377eb8", "#4daf4a"],
  },
  {
    name: "Voltages",
    regex: /^V[ABC]$/i,
    colorSet: ["#984ea3", "#ff7f00", "#ffff33"],
  },
  {
    name: "Line Voltages",
    regex: /^V(AB|BC|CA)$/i,
    colorSet: ["#a65628", "#f781bf", "#999999"],
  },
];
```

**Grouping Logic:**

1. Patterns matched in order (Currents → Voltages → Line Voltages)
2. Matched channels assigned to pattern group
3. Unmatched channels go to "Other" group
4. Each group gets dedicated colors from colorSet

---

## 2. Chart Rendering Architecture

### File Structure

| File                        | Purpose                                           | Scope             |
| --------------------------- | ------------------------------------------------- | ----------------- |
| `renderComtradeCharts.js`   | **Orchestrator** - Clears all, renders all types  | Master controller |
| `renderAnalogCharts.js`     | Render analog channels (Currents, Voltages, etc.) | Grouped charts    |
| `renderDigitalCharts.js`    | Render digital channels (changed values only)     | Single chart      |
| `renderComputedChannels.js` | Render user-created computed channels             | Single chart      |

### Rendering Flow in main.js (Line 1143)

```
[File Load] → parseCFG/parseDAT → renderComtradeCharts()
            ↓
        renderAnalogCharts() → Creates multiple grouped charts (by pattern)
        renderDigitalCharts() → Creates single digital chart
        renderComputedChannels() → Creates single computed chart
```

### Analog Rendering (Groups by Pattern)

**File:** `renderAnalogCharts.js`

```javascript
// Build groups using autoGroupChannels
const autoGroups = autoGroupChannels(cfg.analogChannels || []);
groups = autoGroups.map((g) => ({
  name: g.name, // "Currents", "Voltages", etc.
  indices: g.indices, // [0, 1, 2] for this group
  ids: g.indices.map((idx) => channelIDs[idx]),
  colors: g.colors, // ["#e41a1c", "#377eb8", "#4daf4a"]
}));

// Each group → separate chart
groups.forEach((group) => {
  // Create dragBar, chartContainer, initChart...
  const chart = initUPlotChart(opts, chartData, chartDiv, charts);
});
```

**Result:** Multiple charts (one per pattern group)

### Digital Rendering (Single Chart)

**File:** `renderDigitalCharts.js`

```javascript
// Find changed indices only
const changedIndices = findChangedDigitalChannelIndices(data.digitalData);
const digitalChannelsToShow = changedIndices.map((i) => ({
  ...cfg.digitalChannels[i],
  originalIndex: i,
}));

// All changed channels in one chart
const chart = initUPlotChart(opts, chartData, chartDiv, charts);
```

**Result:** Single chart (all digital channels together)

---

## 3. Current Computed Channel Implementation

### renderComputedChannels.js Analysis

**Current State:** ✅ Functionally complete, but has diagnostic code

**Issues to Clean Up:**

1. **Excessive Console Logging** (8 console.log statements)

   - Lines: 35, 44, 69, 77, 83-84, 91, 106, 128
   - **Impact:** Professional appearance, performance

2. **Overly Defensive Data Extraction** (Lines 88-102)

   - Checks 3 different time array locations
   - Multiple fallbacks with error handling
   - **Assessment:** Necessary but verbose

3. **Comments with Emoji** (Lines ✅, 🔥)

   - Not consistent with other render files
   - **Impact:** Unprofessional

4. **Error Recovery** (Line 77)
   - Empty array return for missing data
   - **Assessment:** Ok but not consistent with analog/digital approach

---

## 4. Comparison: Analog vs Computed Rendering

| Aspect             | Analog                          | Computed                    |
| ------------------ | ------------------------------- | --------------------------- |
| **Grouping**       | Pattern-based (multiple charts) | All together (single chart) |
| **Data**           | cfg + data arrays               | Computed data only          |
| **Colors**         | Pattern colorSet                | Fixed palette               |
| **Scaling**        | From config scale factor        | Applied during evaluation   |
| **Plugins**        | verticalLinePlugin + deltaBox   | Same                        |
| **Tooltip**        | Standard implementation         | Custom logic (necessary)    |
| **Console**        | Minimal                         | 8 statements (REMOVE)       |
| **Error Handling** | Silent                          | Verbose (REDUCE)            |

---

## 5. Optimizations for Professional Appearance

### Priority 1: Remove Non-Essential Logging

- Remove 8 console.log statements
- Keep 2 error/warning statements only

### Priority 2: Simplify Data Extraction

- Reduce 3 fallbacks to 1 clear source
- Keep defensive checks minimal

### Priority 3: Comment Style

- Replace emoji comments with standard comments
- Align with renderAnalogCharts.js style

### Priority 4: Code Structure

- Match function signature of renderAnalogCharts.js
- Consistent indentation (2 spaces)

---

## 6. Flow: Edit Channel Expression → Chart Rendering

### Step 1: User Creates Computed Channel

**File:** `src/components/ChannelList.js`

```javascript
openMathLiveEditor() → User enters \sqrt{IA+IB+IC}
                  ↓
User clicks Save
                  ↓
evaluateAndSaveComputedChannel() → Evaluates against 62,464 samples
                  ↓
saveComputedChannelToGlobals() → Stores in cfg.computedChannels, data.computedData
                  ↓
Dispatches "computedChannelSaved" event
```

### Step 2: Parent Window Listener

**File:** `src/main.js` (Lines 1460-1520)

```javascript
window.addEventListener("computedChannelSaved", (event) => {
  // Remove old chart (if exists)
  if (existingComputedChartDiv) {
    existingComputedChartDiv.remove();
    charts.splice(chartIndex, 1);
  }

  // Recreate with all current computed channels
  renderComputedChannels(
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState
  );
});
```

### Step 3: Chart Creation

**File:** `src/components/renderComputedChannels.js`

```javascript
renderComputedChannels() → Gets data.computedData
                      ↓
                  Builds color palette (5 colors)
                      ↓
                  Assembles chartData = [time, channel1, channel2, ...]
                      ↓
                  initUPlotChart() → Chart rendered in DOM
                      ↓
                  Added to charts[] array
```

### Complete Flow Diagram

```
MathLive Editor
    ↓
Save Button
    ↓
evaluateAndSaveComputedChannel()
    ├─ Math.js evaluation
    ├─ Generate stats (min/max)
    └─ Apply scaling
    ↓
cfg.computedChannels + data.computedData
    ↓
Dispatch "computedChannelSaved"
    ↓
Parent Event Listener (main.js)
    ├─ Remove old chart div
    └─ Remove from charts[]
    ↓
renderComputedChannels()
    ├─ Extract channels from data.computedData
    ├─ Generate colors (fixed palette)
    ├─ Build chart data [time, ...channels]
    └─ Create new uPlot instance
    ↓
Append to chartsContainer
    ↓
Chart visible with all computed channels
```

---

## 7. Optimization Checklist

- [ ] Remove 8 console.log statements
- [ ] Keep 2 error statements only
- [ ] Simplify time array extraction (remove 3 fallbacks)
- [ ] Replace emoji comments with standard comments
- [ ] Verify tooltip still works with reduced logging
- [ ] Test with 2+ computed channels
- [ ] Verify colors cycle correctly
- [ ] Check vertical lines appear
- [ ] Validate delta box displays

---

## 8. Test Scenarios

### Scenario 1: First Computed Channel

```
Input: \sqrt{IA^2 + IB^2 + IC^2}
Expected:
  - Chart created with 1 line
  - Table shows in "Computed Channels" group
  - Vertical lines visible
  - Tooltip works
```

### Scenario 2: Second Computed Channel

```
Input: IA + IB + IC
Expected:
  - Chart updated to show 2 lines
  - Different colors (#4ECDC4)
  - Legend updated
  - Both channels visible
  - No chart replacement
```

### Scenario 3: Third Computed Channel

```
Input: sqrt(VA^2 + VB^2 + VC^2)
Expected:
  - Chart shows 3 lines
  - Third color (#45B7D1)
  - All previous channels still visible
  - Table has 3 rows
```
