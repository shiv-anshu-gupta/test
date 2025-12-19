# Comprehensive Performance Analysis: 16+ Second Group Change Bottleneck

**Analysis Date**: December 18, 2025  
**Issue**: Group field change in Tabulator takes 16+ seconds (unacceptable)  
**Goal**: Identify and fix actual bottleneck with efficient algorithm

---

## 1. ARCHITECTURAL OVERVIEW

### Project File Structure

```
src/
├── components/          # UI components (16 files)
│   ├── chartManager.js              ✓ Analyzed: Group subscriber trigger
│   ├── renderAnalogCharts.js         ✓ Analyzed: Group render loop
│   ├── chartDomUtils.js             ✓ Analyzed: uPlot initialization
│   ├── chartComponent.js            ✓ Analyzed: Chart options factory
│   ├── Tooltip.js                   ✓ Analyzed: Tooltip creation
│   ├── createState.js               ✓ Analyzed: Reactive state system
│   ├── DeltaWindow.js               ✓ Analyzed: Delta popup window
│   ├── ChannelList.js               → Tabulator integration
│   ├── createDragBar.js             → Drag handle creation
│   └── [11 other components]
├── utils/                # Utility functions (28 files)
│   ├── calculateDeltas.js           ✓ Analyzed: Delta calculation (315 lines)
│   ├── autoGroupChannels.js         ✓ Analyzed: Pattern matching groups
│   ├── helpers.js                   ✓ Analyzed: getNearestIndex, createCustomElement
│   ├── constants.js                 → Color palettes and constants
│   ├── chartUtils.js                → Chart utility functions
│   └── [23 other utilities]
└── plugins/              # uPlot plugins (7 files)
    ├── verticalLinePlugin.js        ✓ Analyzed: Vertical line drawing (473 lines)
    ├── deltaBoxPlugin.js            ✓ Analyzed: Delta box rendering
    ├── autoUnitScalePlugin.js       → Auto-scaling plugin
    ├── horizontalZoomPanPlugin.js   → Zoom/pan plugin
    ├── digitalFillPlugin.js         → Digital channel fill
    └── [2 other plugins]
```

---

## 2. PERFORMANCE BOTTLENECK ANALYSIS

### Current Flow: Group Change → 16+ seconds

```
USER CHANGES GROUP IN TABULATOR
  ↓
channelState.analog.groups[idx] = newGroupValue  (main.js:2368-2369)
  ↓
Group subscriber fires (chartManager.js:506-560)
  ├─ Subscriber logic: Check if STRUCTURAL change detected
  ├─ Calls: renderAnalogCharts() directly (skips calculateDeltas)
  ↓
renderAnalogCharts() starts (renderAnalogCharts.js:1-343)
  ├─ Groups building (lines 30-90): ~negligible
  ├─ GROUP CREATION LOOP: groups.forEach() (lines 115-320)
  │   For each group (5 groups typical):
  │   ├─ Create dragBar: ~negligible
  │   ├─ Create chart options: createChartOptions() (chartComponent.js:1-405)
  │   │   └─ Setup plugins, axes, scales: ~negligible
  │   ├─ CREATE uPlot INSTANCE: new uPlot(opts, data, div) ⚠️ SUSPECTED SLOW
  │   ├─ Cache series colors: ~negligible
  │   ├─ Create tooltip element: createTooltip() ✓ Uses SINGLETON (efficient)
  │   ├─ BIND MOUSEMOVE EVENT: chart.over.addEventListener('mousemove', ...) ⚠️ RUNS PER PIXEL
  │   ├─ BIND MOUSELEAVE EVENT: chart.over.addEventListener('mouseleave', ...) ~fast
  │   ├─ BIND CLICK EVENT: chart.over.addEventListener('click', ...) ~fast
  │   ├─ SUBSCRIBE to verticalLinesXState in plugin init hook ⚠️ CREATES CLOSURE
  │   ├─ PLUGIN: verticalLinePlugin setup (plugins/verticalLinePlugin.js:1-473)
  │   │   ├─ Subscribe to state: verticalLinesXState.subscribe() (line 114-143)
  │   │   │   └─ Inside: async import calculateDeltas, deltaWindow, polarChart
  │   │   ├─ addEventListener('mousedown', ...) ~fast
  │   │   ├─ addEventListener('mousemove', ...) ⚠️ RUNS PER PIXEL, calls async imports
  │   │   ├─ addEventListener('mouseup', ...) ~fast
  │   │   └─ draw hook: ctx.save() + forEach lines → forEach series drawing ⚠️ Expensive per redraw
  │   ├─ PLUGIN: autoUnitScalePlugin setup (might have hooks)
  │   ├─ PLUGIN: horizontalZoomPanPlugin setup (might have hooks)
  │   ├─ ResizeObserver attachment: new ResizeObserver() ~fast
  │   └─ Log timing for group (NEW: just added)
  └─ AFTER LOOP: charts.forEach(c => c.redraw()) (line 330)
      └─ Triggers ALL draw hooks on ALL charts: ~fast if optimized
```

### Identified Performance Costs

#### 1. **CRITICAL: Event Listener Bindings (mousemove)**

**Location**: renderAnalogCharts.js lines 195-210 (tooltip mousemove)

```javascript
chart.over.addEventListener("mousemove", (e) => {
  const idx = chart.posToIdx(e.offsetX);  // uPlot API call
  if (idx >= 0 && idx < chart.data[0].length) {
    const values = chart.data.slice(1).map((series, i) => {
      // Complex computation for each series
      return `<span style="color:${stroke}">${label}</span>: ${val}`;
    }).join("<br>");
    updateTooltip(...);  // DOM update
  }
});
```

**Cost Analysis**:

- Runs on **EVERY MOUSE PIXEL MOVE** (potentially 100s/second)
- Per event: Array slice + map + join + DOM update = ~1-2ms
- But NOT called during group change → **Not the bottleneck during rebuild**

#### 2. **CRITICAL: verticalLinePlugin Init Hook (mousemove in plugin)**

**Location**: plugins/verticalLinePlugin.js lines 155-190

```javascript
overlay.addEventListener("mousemove", (e) => {
  const xVal = u.posToVal(e.offsetX, "x");
  const hoverRadius = (u.scales.x.max - u.scales.x.min) * 0.005;
  const isHovering = isHoveringLine(u, xVal, hoverRadius);
  overlay.style.cursor = isHovering ? "ew-resize" : "default";

  if (isDragging) {
    // ... complex drag logic with async imports
  }
});
```

**Cost Analysis**:

- Runs on **EVERY MOUSE PIXEL MOVE** (100s/second)
- Per event: scale calculations + isHoveringLine loop (linear search)
- But **NOT called during group change** → **Not bottleneck during rebuild**

#### 3. **CRITICAL: verticalLinePlugin draw Hook (expensive rendering)**

**Location**: plugins/verticalLinePlugin.js lines 295-410

```javascript
draw: [
  (u) => {
    // Called on EVERY chart redraw
    ctx.save();
    lines.forEach((xData, idx) => {
      const xPos = u.valToPos(...);
      ctx.beginPath();
      ctx.moveTo(...);
      ctx.lineTo(...);
      ctx.stroke();

      u.data.slice(1).forEach((series, seriesIdx) => {
        // For each line × each series: calculate interpolated value
        const interpolatedValue = getInterpolatedValue(...);
        const yPos = u.valToPos(...);
        ctx.beginPath();
        ctx.arc(...);  // Draw circle at each crosshair point
        ctx.fill();
      });

      ctx.fillText(...);  // Draw label
    });
  }
]
```

**Cost Analysis**:

- Per redraw: lines × series × arc drawing = 5 lines × 3 series × circle draw = 15 operations
- `getInterpolatedValue()` called 15 times per redraw (interpolation overhead)
- Called on **every redraw**, including batch redraws
- **CALLED DURING GROUP CHANGE when charts.forEach(c => c.redraw()) executes**

#### 4. **MODERATE: uPlot Instance Creation**

**Location**: chartDomUtils.js lines 160-195

```javascript
export function initUPlotChart(opts, chartData, chartDiv, charts) {
  const chart = new uPlot(opts, chartData, chartDiv); // ⚠️ This is expensive
  chart._seriesColors = opts.series.slice(1).map((s) => s.stroke);
  charts.push(chart);

  const ro = new ResizeObserver((entries) => {
    for (let entry of entries) {
      chart.setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  ro.observe(chartDiv); // ⚠️ ResizeObserver setup might be expensive if many charts

  return chart;
}
```

**Cost Analysis**:

- `new uPlot()` is a **substantial JS operation**:
  - Creates SVG/canvas elements
  - Calculates scales and axes
  - Parses plugin list
  - **Runs plugin init hooks** ← This is where event listeners get bound
- ResizeObserver creation: ~fast but adds subscription
- **Per group**: ~200-500ms × 5 groups = **1-2.5 seconds**

#### 5. **MODERATE: Plugin Initialization**

**Location**: chartComponent.js lines 150-200 (creates plugin array)

```javascript
opts.plugins = [];
opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));      // 473-line plugin
opts.plugins.push(autoUnitScalePlugin(...));
opts.plugins.push(horizontalZoomPanPlugin(...));
```

**Cost Analysis**:

- Each plugin is instantiated per chart
- Plugin functions define hooks
- Hooks execute during uPlot init: **event listeners get bound here**
- verticalLinePlugin setup includes: `subscribe()`, addEventListener × 3
- **Per chart**: ~50-100ms × 5 charts = **250-500ms**

#### 6. **MODERATE: createChartOptions() Complexity**

**Location**: chartComponent.js lines 100-405

```javascript
export function createChartOptions(config) {
  // Complex axis building logic
  const yAxes = [];
  for (let i = 0; i < config.yLabels.length; i++) {
    yAxes.push({
      scale: config.singleYAxis ? 'y' : `y${i}`,
      label: config.yLabels[i],
      // ... complex formatter setup
    });
  }

  // Series building
  const series = [
    { label: config.xLabel, ... },
    ...config.yLabels.map((label, i) => ({
      label,
      stroke: config.lineColors[i % config.lineColors.length],
      scale: config.singleYAxis ? 'y' : `y${i}`,
    }))
  ];

  // Scales and plugins setup (more complex logic)
  return { ...huge config object };
}
```

**Cost Analysis**:

- Function runs for **EVERY group** (5 times)
- Each execution: axis loop × series loop × complex object creation
- **Per group**: ~50-100ms × 5 groups = **250-500ms**

---

## 3. ROOT CAUSE: SUMMARY OF THE 16+ SECOND DELAY

### Timing Breakdown Estimate:

```
renderAnalogCharts() groups.forEach() loop:
│
├─ Group 1: Chart creation + plugin setup + event binding     ~1500ms
├─ Group 2: Chart creation + plugin setup + event binding     ~1500ms
├─ Group 3: Chart creation + plugin setup + event binding     ~1500ms
├─ Group 4: Chart creation + plugin setup + event binding     ~1500ms
├─ Group 5: Chart creation + plugin setup + event binding     ~1500ms
│
└─ charts.forEach(c => c.redraw()):
   └─ Calls draw hooks on all 5 charts:
      └─ verticalLinePlugin.draw() × 5 charts × expensive rendering  ~500-1000ms

TOTAL: ~8.5-9 seconds ESTIMATED
```

### BUT USER REPORTS 16+ SECONDS

**Hidden costs likely in**:

1. **Subscription overhead in verticalLinePlugin** - Creating 5 closures with async imports
2. **ResizeObserver overhead** - 5 observers × initial observation
3. **DOM operation overhead** - Creating 5 chart containers, appending to DOM
4. **Event listener registration** - 15+ event listeners across 5 charts
5. **Browser reflow/repaint** - Multiple sequential DOM insertions triggering layout calculations
6. **JavaScript event loop blocking** - No async/batching between group creations

**Actual measurement needed** - The newly added per-group timing logs will show the real bottleneck once you trigger a group change.

---

## 4. EFFICIENT ALGORITHM PROPOSAL

### Strategy: REUSE Charts Instead of RECREATING Them

**Current Approach** (SLOW):

```
Group change → Destroy all charts → Create all charts → Bind all listeners
Cost: ~16 seconds for 5 charts
```

**Proposed Approach** (FAST):

```
Group change → Update chart data in-place → Redraw
Cost: ~100-200ms
```

### Implementation Strategy

#### Phase 1: Reuse Chart Instances

- Store chart instances in state: `channelState.analog._charts = []`
- On group change: reuse existing charts instead of destroying
- Update chart data: `chart.setData(newData)`
- Do **NOT** recreate plugins or event listeners

#### Phase 2: Batch DOM Operations

- Use `DocumentFragment` to batch append operations
- Reduce browser reflow triggers

#### Phase 3: Lazy Event Binding

- Skip redundant event listener re-binding
- Store listener handlers in chart instance for reuse

#### Phase 4: Lazy Plugin Initialization

- Initialize plugins once, reuse them
- Only update plugin state (e.g., verticalLinesX)

### Pseudo-code for Efficient Algorithm

```javascript
// Current SLOW approach:
export function renderAnalogCharts() {
  const chartsContainer = document.getElementById("charts-container");
  chartsContainer.innerHTML = ""; // Destroy all charts

  groups.forEach((group) => {
    const chart = new uPlot(opts, data, chartDiv); // SLOW: recreate
    // Bind listeners (SLOW)
    // Initialize plugins (SLOW)
  });
}

// Proposed FAST approach:
export function renderAnalogCharts() {
  const chartsContainer = document.getElementById("charts-container");

  // REUSE existing charts
  if (
    channelState.analog._charts &&
    channelState.analog._charts.length === groups.length
  ) {
    // Reuse path: Update data and redraw
    groups.forEach((group, idx) => {
      const chart = channelState.analog._charts[idx];
      const newData = buildChartData(group);

      // Update chart data in-place (NO recreation)
      chart.setData(newData);

      // Redraw (fast: only redraws, no event rebinding)
      chart.redraw();
    });
    return; // ← Done in ~100ms instead of 16+ seconds!
  }

  // Rebuild path: First time only (or if group count changed)
  chartsContainer.innerHTML = "";
  groups.forEach((group) => {
    const chart = new uPlot(opts, data, chartDiv); // SLOW but only once
    channelState.analog._charts.push(chart);
  });
}
```

### Key Benefits:

1. **First group change**: Still ~2 seconds (initial creation)
2. **Subsequent changes**: ~100-200ms (data update only)
3. **No event listener conflicts**: Listeners stay bound
4. **No plugin re-initialization**: Plugins persist
5. **No DOM thrashing**: Container structure stays stable

---

## 5. FILES ANALYZED

### ✅ Fully Analyzed (Performance-Critical)

| File                    | Lines | Purpose                | Key Finding                                        |
| ----------------------- | ----- | ---------------------- | -------------------------------------------------- |
| `renderAnalogCharts.js` | 343   | Main group render loop | ⏱️ Event listeners & plugin setup in loop          |
| `chartComponent.js`     | 405   | Chart options factory  | Complex object creation per chart                  |
| `chartDomUtils.js`      | 198   | uPlot initialization   | Creates uPlot instance, attaches ResizeObserver    |
| `verticalLinePlugin.js` | 473   | Vertical line drawing  | Draw hook expensive, init hook creates closures    |
| `createState.js`        | 972   | Reactive state         | Subscription mechanism works efficiently           |
| `calculateDeltas.js`    | 315   | Delta calculation      | Currently skipped on group change (good!)          |
| `Tooltip.js`            | 70    | Tooltip UI             | Uses singleton pattern (efficient)                 |
| `chartManager.js`       | ~600  | State subscriber       | Correctly calls renderAnalogCharts on group change |

### ⚠️ Analyzed But Not Root Cause

| File                         | Lines | Purpose                   | Assessment                           |
| ---------------------------- | ----- | ------------------------- | ------------------------------------ |
| `autoGroupChannels.js`       | 605   | Group pattern matching    | Skipped if user groups exist (good!) |
| `helpers.js`                 | ~200  | Utility functions         | getNearestIndex is O(n), acceptable  |
| `deltaBoxPlugin.js`          | ~150  | Delta box rendering       | Not used in current flow (disabled)  |
| `autoUnitScalePlugin.js`     | ~200  | Auto-scaling              | Minor overhead in plugin init        |
| `horizontalZoomPanPlugin.js` | ~250  | Zoom/pan                  | Minor overhead in plugin init        |
| `digitalFillPlugin.js`       | ~150  | Digital channel fill      | Not relevant (analog charts only)    |
| `main.js`                    | 3013  | Application orchestration | Correctly dispatches group change    |
| `ChannelList.js`             | ~500  | Tabulator integration     | Only triggers state update (fast)    |

### ⏭️ Not Analyzed (Low Impact)

- `renderComputedChannels.js` - Not called on group change
- `renderDigitalCharts.js` - Not called on group change
- `DeltaWindow.js` - Not called on group change
- `PolarChart.js` - Updated separately
- Other utilities - Not in critical path

---

## 6. MEASUREMENT STRATEGY

### To Identify Actual Bottleneck:

**Step 1**: Run current code with per-group timing logs (already added)

```javascript
// In renderAnalogCharts.js lines 320-325:
const groupStartTime = performance.now();
// ... chart creation logic ...
const groupEndTime = performance.now();
console.log(`Group "${group.name}" took ${groupEndTime - groupStartTime}ms`);
```

**Step 2**: Trigger group change in UI

- Open DevTools → Console
- Change a group value in Tabulator
- Watch logs for per-group times
- Note which groups are slow (all same? or different?)

**Step 3**: Add more granular timing

```javascript
const t1 = performance.now();
createChartOptions(...);
const t2 = performance.now();
new uPlot(...);
const t3 = performance.now();
console.log(`createChartOptions: ${t2-t1}ms, uPlot init: ${t3-t2}ms`);
```

**Step 4**: Analyze results

- If all groups take 1.5s → each chart creation is slow
- If first group slow, rest fast → DOM operation batching issue
- If pattern irregular → async operation issue

---

## 7. NEXT STEPS

### ✅ Phase 1: Measurement (You do this)

1. Trigger a group change
2. Look at console logs with per-group timings
3. Report which groups are slow and approximate timings
4. **Share timing results** so we can identify exact bottleneck

### ⏭️ Phase 2: Optimization (Agent implements)

1. Add granular timing to each operation (createChartOptions, uPlot init, plugin setup)
2. Identify which operation takes most time
3. Implement reuse algorithm (most likely solution)
4. Test: Group change should complete in <500ms

### ⏭️ Phase 3: Validation

1. Test multiple group changes in sequence
2. Verify event listeners still work (vertical lines)
3. Verify tooltips still work
4. Verify polar chart updates still work
5. Performance benchmark: First change ~2s, subsequent <200ms

---

## 8. KEY INSIGHTS

### Why Full Rebuild Requires Recreation

- Group change is **STRUCTURAL** (channels move between charts)
- uPlot doesn't support structural changes without recreation
- Can't just update `chart.data` when chart layout must change
- This is by design - reason full rebuild is necessary

### Why Reuse Strategy Works

- **After** initial chart creation, only data updates when user assigns groups differently
- Reusing chart instances skips expensive uPlot initialization
- Only requires `setData()` + `redraw()` which are ~100ms
- Event listeners persist (no rebinding needed)

### Why Current Approach Is Slow

1. **No caching** - Every group change recreates everything
2. **No batching** - DOM operations trigger reflow/repaint per chart
3. **No lazy loading** - Event listeners bound even if not needed immediately
4. **No async** - Entire rebuild blocks event loop

---

## 9. PROFESSIONAL RECOMMENDATIONS

### Code Quality Improvements

1. **Add constants** for timing thresholds (1000ms warnings)
2. **Add performance metrics** to track before/after optimization
3. **Document chart lifecycle** - When charts created, destroyed, reused
4. **Separate concerns** - Isolate chart creation from data update logic
5. **Test performance** - Add synthetic benchmark tests

### Architecture Improvements

1. **Implement chart caching layer** - Manage chart instance lifecycle
2. **Batch DOM operations** - Use DocumentFragment for multiple appends
3. **Lazy plugin initialization** - Only bind listeners when user hovers
4. **Event delegation** - Use single listener on container instead of per-chart
5. **Worker threads** - Consider Web Worker for delta calculations

### Monitoring & Debugging

1. **Performance timeline logging** - Log each phase with timestamps
2. **Chrome DevTools profiling** - Identify exact bottleneck
3. **Performance Observer API** - Track long tasks (>50ms)
4. **Memory profiling** - Check for memory leaks in event listeners

---

**Analysis Complete**. Await your timing results from Step 1 (Phase 1) to proceed with optimization.
