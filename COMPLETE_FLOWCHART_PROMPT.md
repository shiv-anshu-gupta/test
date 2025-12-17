# COMPREHENSIVE FLOWCHART PROMPT - COMTRADE Data Visualization Project

## PROJECT OVERVIEW

This is a COMTRADE file viewer and analyzer that:

1. Loads CFG (metadata) + DAT (data) files in ASCII format
2. Parses channels (analog & digital) with sampling rates, timestamps, multipliers/offsets
3. Renders interactive multi-chart dashboard with synchronized vertical lines
4. Allows users to create computed channels via Math.js expression evaluation
5. Exports computed channels back to COMTRADE CFG+DAT format
6. Provides measurement tools (vertical lines, delta calculations)

---

## FILE STRUCTURE & COMPONENTS

### **Core Application Entry Point**

**File: `src/main.js` (2433 lines)**

- **Exported Functions**: None (entry point script)
- **Main Functions**:
- **Purpose**: Main application controller
- **Key Functions**:
  - `findChannelByID(channelID)` (Lines 247-280): Searches analog/digital channels by stable ID
    - Input: channelID string
    - Process: Loops channelState.analog/digital channelIDs array
    - Output: channel object or null
  - `updateChannelFieldByID(channelID, fieldName, value)` (Lines 282-320): Updates channel property
    - Input: channelID, fieldName (yLabel, lineColor, etc), new value
    - Process: Finds channel, updates state via channelState Proxy
    - Output: void (triggers reactive updates)
  - Event listeners for:
    - File upload (CFG+DAT)
    - Computed channel export button (Lines 959-973)
    - Vertical line controls
    - Menu interactions
- **State Management**:
  - `channelState = createState({analog: {...}, digital: {...}})`
  - `verticalLinesX = createState([])`
  - `dataState = createState({analog: [], digital: []})`

---

### **State Management System**

**File: `src/components/createState.js` (972 lines)**

- **Purpose**: Proxy-based deeply reactive state management
- **Main Function**: `createState(initialState, options)`
  - **Lines 1-100**: Initialization with Proxy
  - **Lines 150-250**: Get trap - handles nested property access
  - **Lines 260-400**: Set trap - intercepts mutations, batches notifications
  - **Lines 420-500**: Subscription mechanism
  - **Lines 520-650**: Computed properties (derived values)
- **Data Structure**:

  ```javascript
  channelState = {
    analog: {
      yLabels: ["Phase A Current", "Phase B Current", ...],
      lineColors: ["#FF0000", "#00FF00", "#0000FF", ...],
      yUnits: ["A", "A", "A", ...],
      axesScales: [{min:0, max:100}, ...],
      xLabel: "Time",
      xUnit: "ms",
      channelIDs: ["ANA_001", "ANA_002", ...],
      groups: ["Group1", "Group1", "Group2", null, ...],  // for channel grouping
      primary: [1, 1, 2, ...],      // primary voltage/current identifiers
      secondary: [1, 1, 2, ...]     // secondary values
    },
    digital: {
      yLabels: ["CB_A", "CB_B", ...],
      lineColors: [...],
      channelIDs: [...],
      normalState: [0, 1, ...],     // normal state (0=open, 1=closed)
      primary: [...],
      secondary: [...]
    }
  }
  ```

- **Reactivity Mechanism**:
  - Subscription callback receives change object:
    ```javascript
    {
      path: ['analog', 'yLabels', 0],      // Exact location of change
      newValue: "Main Feeder A",           // New value
      oldValue: "Phase A Current",         // Old value
      prop: 0,                              // Array index or property name
      root: <proxy>,                        // Reference to root proxy
      selectorValue: <result>              // For selector subscriptions
    }
    ```
  - Batching: Multiple mutations batched together before notification
  - Descendants option: Subscribe to nested path changes

---

### **File Loading & Parsing**

**File: `src/components/comtradeUtils.js` (637 lines)**

#### **1. CFG File Parser** - `parseCFG(cfgContent)`

**Lines 154-465**: Complete CFG parsing

- **Line 170**: Extract station, device, COMTRADE version
  - Regex: `/^([^,]+),([^,]+),([^,]+)/`
  - Example: `"PowerPlant_A,Device_B,2013"`
- **Line 195**: Extract channel counts
  - Format: `total_analog,total_digital`
  - Example: `5A,3D` → 5 analog, 3 digital
- **Lines 220-270**: Parse analog channels (one per line)
  - Format per line: `index,id,phase,component,unit,multiplier,offset,skew,min,max,primary,secondary`
  - Example: `1,ANA_PHASE_A,A,Current,A,0.01,-100,0,-500,500,1,1`
  - Stores into `cfg.analogChannels` array
- **Lines 280-320**: Parse digital channels
  - Format per line: `index,id,phase,component,normalState,primary,secondary`
  - Stores into `cfg.digitalChannels` array
- **Lines 330-390**: Parse sampling rates
  - Format: `sampleRate,endSampleNumber`
  - Example: `4800,2400` (4800 Hz for first 2400 samples)
  - Stores into `cfg.samplingRates` array with duration ranges
- **Lines 400-420**: Parse timestamps
  - First timestamp (start time): `DD/MM/YYYY,HH:MM:SS.ffffff`
  - Trigger timestamp: Time when event occurred
  - File type: ASCII or BINARY

**Output**: `cfg` object with full metadata

#### **2. DAT File Parser** - `parseDAT(datContent, cfg)`

**Lines 468-630**: Complete DAT parsing

- **Line 480**: Auto-detect format
  - ASCII: Comma-separated or space-separated values
  - BINARY: Not detailed here, handles byte arrays
- **Lines 500-550**: For each sample (row in DAT)
  - Extract: `sampleNum, timeMs, value1, value2, ...valueN`
  - Apply linear interpolation (if time gaps exist) via `timeInterpolation.js`
  - Example row: `0,0.00,150.25,149.80,151.30,0,1,0`
- **Lines 560-600**: Apply multiplier/offset conversion
  - Formula: `displayValue = (rawValue × multiplier) + offset`
  - Example: Raw=100, multiplier=0.01, offset=-100
    - Result: (100 × 0.01) + (-100) = -99 A
- **Lines 610-630**: Build output arrays
  - Returns: `{time: [0, 1, 2, ...], analogData: [[...], [...]], digitalData: [[...], [...]]}`

---

### **Vertical Line Measurement System**

**File: `src/components/verticalLineControl.js` (320 lines)**

- **Purpose**: Creates UI slider controls for vertical measurement lines
- **Components Created** (Lines 50-150):

  - Slider input (0-100 range, maps to time axis)
  - Two decimal input fields (for precise value entry)
  - Display label showing current position
  - Statistics panel (shows ΔX, ΔY for all series)

- **Event Handlers** (Lines 160-250):

  - `onSliderChange(value)`: When slider moves
    - Converts slider position to time value
    - Updates `verticalLinesX` array
    - Triggers chart re-render
  - `onInputChange(value)`: When user types decimal value
    - Validates input
    - Updates `verticalLinesX` with exact time value

- **Data Structure**:
  ```javascript
  verticalLinesX = [
    { x: 0.5, label: "Line 1", color: "rgba(255,0,0,0.3)" },
    { x: 1.2, label: "Line 2", color: "rgba(0,255,0,0.3)" },
  ];
  ```

**File: `src/components/initVerticalLineControl.js`**

- Initializes controls with callbacks linking to `verticalLineControl.js`
- Sets up event delegation

**File: `src/components/handleVerticalLineShortcuts.js`**

- **Keyboard Shortcuts**:
  - `Alt+0`: Toggle Line 0 visibility
  - `Alt+1`: Toggle Line 1 visibility
  - `Alt+2`: Toggle Line 2 visibility
  - `Alt+3`: Toggle Line 3 visibility
  - `Alt+4`: Toggle Line 4 visibility

---

### **Delta Calculation System**

**File: `src/utils/calculateDeltas.js` (80 lines)**

- **Purpose**: Calculate ΔX (time difference) and ΔY (value differences) between vertical lines
- **Main Function**: `calculateDeltas(time, data, verticalLinesX)`
- **Algorithm**:
  ```
  FOR EACH pair of consecutive vertical lines:
    1. Find nearest sample index to each line position
    2. ΔX = time[idx2] - time[idx1]
    3. FOR EACH data series:
       ΔY[series] = data[idx2] - data[idx1]
    4. Store in results array
  RETURN results with color coding (green/red for positive/negative)
  ```
- **Output**: Array of delta objects
  ```javascript
  {
    line1X: 0.5, line2X: 1.2,
    deltaX: 0.7,
    deltas: [
      {seriesName: "Phase A", value: 25.5, color: "green"},
      {seriesName: "Phase B", value: -10.3, color: "red"}
    ]
  }
  ```

---

### **Chart Rendering - Analog Channels**

**File: `src/components/renderAnalogCharts.js` (205 lines)**

#### **Step 1: Determine Channel Groups** (Lines 30-75)

- **Input**: `cfg.analogChannels`, `channelState.analog.groups`, auto-grouping preference
- **Process**:
  - Check if explicit groups exist in `channelState.analog.groups` array
  - For unassigned channels (null/undefined), run auto-grouping
  - Auto-grouping by phase/component (calls `autoGroupChannels()`)
  - Returns: `groups = [{name, indices: [...], ids: [...], colors: [...]}, ...]`

#### **Step 2: For Each Group - Create UI** (Lines 80-130)

**A. Create Drag Bar** (Line 90):

```javascript
const dragBar = createDragBar(
  { indices: [0, 1, 2], name: "Group1" },
  cfg,
  channelState
);
```

- Thin vertical bar on left side of chart
- Shows channel colors stacked vertically
- Draggable for reordering charts

**B. Create Chart Container** (Lines 107-127):

```javascript
const { parentDiv, chartDiv } = createChartContainer(
  dragBar,
  "chart-container",
  groupYLabels, // ["Phase A Current", "Phase B Current", "Phase C Current"]
  groupLineColors, // ["#FF0000", "#00FF00", "#0000FF"]
  "Analog Channels" // Type label
);
```

- Creates 3-part DOM structure:
  ```
  .chart-parent-container (flex container)
  ├── .chart-label (120px left sidebar)
  │   ├── "Analog Channels" (type label, cyan, small)
  │   ├── [Color dot] "Phase A Current"
  │   ├── [Color dot] "Phase B Current"
  │   └── [Color dot] "Phase C Current"
  ├── .dragBar (4px thin drag handle)
  │   └── Shows stacked colors on hover
  └── .chart-container (flex: 1, uPlot area)
  ```

**C. Create Chart Options** (Lines 135-145):

```javascript
const opts = createChartOptions({
  title: "Group1",
  yLabels: groupYLabels,
  lineColors: groupLineColors,
  verticalLinesX: verticalLinesX,
  xLabel: "Time",
  xUnit: "ms",
  yUnits: ["A", "A", "A"],
  axesScales: [...],
  singleYAxis: true
});
```

- Returns uPlot options object with:
  - Series definitions
  - Axes configuration
  - Legend
  - Scaling options

**D. Initialize uPlot Chart** (Lines 150-165):

```javascript
const chart = initUPlotChart(opts, chartData, chartDiv, charts);
```

- Creates uPlot instance
- Adds to `charts` array
- Attaches ResizeObserver for responsive sizing
- Stores metadata: `chart._channelIndices = [0, 1, 2]`

**E. Add Plugins** (Lines 168-175):

- `verticalLinePlugin`: Renders vertical measurement lines
- `deltaBoxPlugin`: Shows delta values in tooltip

**F. Tooltip Setup** (Lines 180-205):

- On mousemove: Show time + all series values
- On mouseleave: Hide tooltip

#### **Step 3: Append to DOM** (Line 128)

```javascript
chartsContainer.appendChild(parentDiv);
```

---

### **Chart Rendering - Digital Channels**

**File: `src/components/renderDigitalCharts.js` (167 lines)**

**Similar to analog, but**:

- Single chart for ALL digital channels (stacked vertically)
- Uses `digitalFillPlugin` to show state transitions
- Values are binary (0 or 1)
- No decimals in display

---

### **Chart Rendering - Computed Channels**

**File: `src/components/renderComputedChannels.js` (128 lines)**

**Process**:

1. Get `data.computedData` array (user-created channels)
2. For each computed channel:
   - Extract equation result
   - Build chart data
   - Render with standard options
3. Render similar to analog charts

---

### **LEFT SIDE CHART UI CREATION** (NEW DETAIL)

#### **DOM Creation Process** (`chartDomUtils.js` Lines 21-97)

```javascript
export function createChartContainer(dragBar, chartContainerClass, label, colors, typeLabel)
```

**Step 1: Create Parent Container**

```javascript
const parentDiv = createCustomElement("div", "chart-parent-container");
```

- Flex container for: label + dragBar + chart

**Step 2: Create Left Sidebar (Chart Label)**

```javascript
if (label) {
  const labelDiv = createCustomElement("div", "chart-label");
  labelDiv.style.display = "flex";
  labelDiv.style.flexDirection = "column";
  labelDiv.style.alignItems = "center";
  labelDiv.style.justifyContent = "flex-start";
  labelDiv.style.gap = "12px";
  labelDiv.style.padding = "8px 4px";
  labelDiv.style.overflow = "auto";  // Scrollable for many channels
```

**Step 3: Add Type Label** (At top of sidebar)

```javascript
if (typeLabel) {
  const typeSpan = document.createElement("span");
  typeSpan.textContent = typeLabel; // "Analog Channels" or "Digital Channels"
  typeSpan.style.fontSize = "0.7rem";
  typeSpan.style.fontWeight = "700";
  typeSpan.style.color = "var(--accent-cyan)";
  typeSpan.style.textTransform = "uppercase";
  typeSpan.style.letterSpacing = "0.05em";
  typeSpan.style.borderBottom = "1px solid var(--border-color)";
  labelDiv.appendChild(typeSpan);
}
```

**Step 4: Add Channel Items** (Loop for each channel)

```javascript
label.forEach((channelName, idx) => {
  const channelContainer = document.createElement("div");
  channelContainer.style.display = "flex";
  channelContainer.style.flexDirection = "column";
  channelContainer.style.alignItems = "center";
  channelContainer.style.gap = "2px";

  // Color indicator dot
  const colorDot = document.createElement("span");
  colorDot.style.width = "10px";
  colorDot.style.height = "10px";
  colorDot.style.borderRadius = "50%";
  colorDot.style.background = colors[idx]; // From lineColors array
  colorDot.style.border = "1px solid var(--border-color)";
  channelContainer.appendChild(colorDot);

  // Channel name text
  const nameSpan = document.createElement("span");
  nameSpan.textContent = channelName; // From yLabels array
  nameSpan.style.fontSize = "0.7rem";
  nameSpan.style.fontWeight = "500";
  nameSpan.style.color = "var(--text-secondary)";
  nameSpan.style.textAlign = "center";
  nameSpan.style.wordBreak = "break-word";
  nameSpan.style.lineHeight = "1.1";
  channelContainer.appendChild(nameSpan);

  labelDiv.appendChild(channelContainer);
});
```

**Step 5: CSS Styling** (`styles/main.css` Lines 511-549)

```css
.chart-parent-container {
  display: flex; /* Flex row: label | dragBar | chart */
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  height: 400px;
  overflow: hidden;
}

.chart-label {
  width: 120px; /* FIXED WIDTH for left sidebar */
  min-width: 120px;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column; /* Stack items vertically */
  align-items: center;
  padding: 8px 4px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  overflow: auto; /* Scrollable if many channels */
  gap: 4px;
}

.dragBar {
  width: 4px; /* Thin drag handle */
  background: var(--border-color);
  cursor: grab;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.dragBar:hover {
  background: var(--accent-cyan);
  width: 6px; /* Expands on hover */
}

.dragBar-row {
  display: none; /* Hide color squares (CSS override) */
}

.chart-container {
  flex: 1; /* Takes remaining space */
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  padding: 20px;
}
```

**Step 6: Reactive Updates** (`createDragBar.js` Lines 95-145)

```javascript
channelState.subscribe(
  (change) => {
    // Monitor channelState.analog.yLabels changes
    if (change.path[1] !== "yLabels") return;

    // Update all labels in dragBar when state changes
    const spans = handleDiv.querySelectorAll(".dragBar-label");
    spans.forEach((sp) => {
      const globalIdx = Number(sp.getAttribute("data-global-index"));
      const newLabel = channelState.analog.yLabels[globalIdx];
      sp.textContent = newLabel; // Live update
    });
  },
  { descendants: true }
);
```

**Step 7: Visual Result**

```
┌──────────────────────────────────────────────────────┐
│ ANALOG CH. │ │  ↑ Time (ms)                          │
│            │ │  │                                     │
│ 🔴 Phase A │ │  │    ╱╲    ╱╲                        │
│ Current    │ │  │   ╱  ╲  ╱  ╲  Series 1            │
│ (0-500 A)  │ │  │  ╱    ╲╱    ╲                      │
│            │ │  ├──────────────→ Time              │
│ 🟢 Phase B │ │  │                                     │
│ Current    │ │  │ Other series...                     │
│ (0-500 A)  │ │  │                                     │
│            │ │  │                                     │
│ 🔵 Phase C │ │  └─────────────────────────────────   │
│ Current    │ │                                        │
│ (0-500 A)  │ │                                        │
└──────────────────────────────────────────────────────┘
  ↑ 120px    ↑ Drag Handle (uPlot Canvas)
  Label Sidebar (Scrollable)
```

---

### **Channel Management - Popup Window**

**File: `src/components/showChannelListWindow.js` (401 lines)**

#### **Process**:

1. **Open Popup** (Lines 20-50):

   - Creates new window via `window.open()`
   - Loads `popup.html` with Tabulator table
   - Establishes `postMessage()` communication channel

2. **Populate Table** (Lines 60-120):

   - Tabulator.js creates sortable/filterable table
   - Columns:
     - Channel ID (read-only)
     - Label (editable text)
     - Color (color picker)
     - Units (editable)
     - Group (dropdown selector)
     - Primary/Secondary (checkboxes)

3. **Event Handling** (Lines 130-250):

   - Double-click row → Opens equation editor
   - Change cell → Send postMessage to parent
   - Message format:
     ```javascript
     {
       source: 'ChildWindow',
       type: 'callback_color',
       payload: {
         channelID: 'ANA_001',
         fieldName: 'lineColor',
         value: '#FF0000'
       }
     }
     ```

4. **Parent Window Receiver** (Lines 260-320):
   ```javascript
   window.addEventListener("message", (event) => {
     if (event.data.source === "ChildWindow") {
       const { channelID, fieldName, value } = event.data.payload;
       updateChannelFieldByID(channelID, fieldName, value);
       // Triggers reactivity in channelState
     }
   });
   ```

---

### **Equation Evaluator - Computed Channels**

**File: `src/components/EquationEvaluatorInChannelList.js` (900+ lines)**

#### **Part 1: Equation Editor UI** (Lines 1-200)

- **MathLive Integration**: Math.js 11.11.0 + MathLive editor
- **Interface**:
  - Text input for equation: `=sqrt(A^2 + B^2)`
  - Available variables listed: `A, B, C (Analog Channels 0,1,2)`
  - Help panel with function list

#### **Part 2: Equation Compilation** (Lines 220-350)

```javascript
const expr = "sqrt(A^2 + B^2)";
const compiled = math.compile(expr);
// Returns: {evaluate: function(scope) {...}, toString: ...}
```

#### **Part 3: Sample Evaluation** (Lines 360-450)

```javascript
// For first 10 samples:
for (let sampleIdx = 0; sampleIdx < 10; sampleIdx++) {
  const scope = {
    A: analogData[0][sampleIdx], // Phase A value
    B: analogData[1][sampleIdx], // Phase B value
    C: analogData[2][sampleIdx], // Phase C value
  };
  const result = compiled.evaluate(scope);
  // result = sqrt(150^2 + 149^2) = 211.5 (example)
  computedData[sampleIdx] = result;
}
```

#### **Part 4: Batch Export - COMTRADE Format** (Lines 730-920)

**Function 1: `generateCFGContentBatch(computedChannels, sampleRate)` (Lines 733-788)**

```
INPUT: [{name: "Magnitude", data: [...]}, {name: "Phase Angle", data: [...]}], 4800
OUTPUT: CFG file content string

ALGORITHM:
1. Header line: "Station,Device,Year,ComtradeVersion"
2. Channel counts: "2A,0D"  (2 analog, 0 digital)
3. For EACH computed channel:
   a. Find min/max of computed data
   b. Calculate multiplier: (max - min) / (2^32 - 1)
   c. Calculate offset: min - (intMin * multiplier)
   d. Store: "index,id,phase,component,unit,multiplier,offset,skew,min,max,primary,secondary"
4. Sampling rates: "4800,<sample_count>"
5. Timestamps: "DD/MM/YYYY,HH:MM:SS.ffffff"
6. File type: "ASCII"

EXAMPLE OUTPUT:
```

PowerPlant,ComputedChannels,2025,2013
2A,0D
1,Magnitude,,--, ,0.00001527,100.0,0,0,100000,1,1
2,Phase_Angle,,--, ,0.0001,180.0,0,-180,180,1,1
ff
4800,2400
01/01/1970,00:00:00.000000
01/01/1970,00:00:00.000000
ASCII

```

**Function 2: `generateDATContentBatch(computedChannels, sampleRate)` (Lines 795-828)**
```

INPUT: Same as above
OUTPUT: DAT file content string

ALGORITHM:
FOR EACH sample (row):

1. Sample number (starting 0)
2. Time in milliseconds
3. For EACH computed channel:
   rawValue = (displayValue - offset) / multiplier
   Write: (int32)rawValue
   Join values with commas

EXAMPLE OUTPUT:
0,0.00,155000,180000
1,0.21,155100,179900
2,0.42,155050,179850
...

```

**Function 3: `exportAllComputedChannels(data, sampleRate)` (Lines 845-920)**
```

ALGORITHM:

1. Get computed channels from data.computedData
2. Call generateCFGContentBatch() → cfgContent
3. Create Blob from cfgContent
4. Download CFG file: "computed_channel_TIMESTAMP.cfg"
5. Wait 500ms
6. Call generateDATContentBatch() → datContent
7. Create Blob from datContent
8. Download DAT file: "computed_channel_TIMESTAMP.dat"

RESULT: Two files downloaded to user's computer

````

---

### **Chart Creation & Configuration**
**File: `src/components/chartComponent.js` (450+ lines)**

**Main Function**: `createChartOptions(opts)`

**Process**:
1. **Input Parameter Structure**:
   ```javascript
   {
     title: "Group1",
     yLabels: ["Phase A", "Phase B", "Phase C"],
     lineColors: ["#FF0000", "#00FF00", "#0000FF"],
     verticalLinesX: [{x: 0.5, ...}, ...],
     xLabel: "Time",
     xUnit: "ms",
     yUnits: ["A", "A", "A"],
     axesScales: [{min:0, max:100}, ...],
     singleYAxis: true
   }
````

2. **Build Series Array** (one per channel):

   ```javascript
   series: [
     { label: "Time" }, // Index 0
     { label: "Phase A", stroke: "#FF0000", width: 2 },
     { label: "Phase B", stroke: "#00FF00", width: 2 },
     { label: "Phase C", stroke: "#0000FF", width: 2 },
   ];
   ```

3. **Build Axes Configuration**:

   - X-axis: Time scale, label: "Time (ms)"
   - Y-axis: Multiple scales if singleYAxis=false, single if true

4. **Return Complete uPlot Options Object**:
   ```javascript
   {
     title: {...},
     width: <auto>,
     height: <auto>,
     axes: [...],
     series: [...],
     legend: {...},
     scales: {x: {...}, y: {...}},
     cursor: {...},
     plugins: [...]  // Populated later
   }
   ```

---

### **Plugin System**

**File: `src/plugins/verticalLinePlugin.js`**

- **Purpose**: Render vertical lines at `verticalLinesX` positions
- **Process**:
  1. Listen to chart render events
  2. For each line in verticalLinesX:
     - Calculate x-position on chart canvas
     - Draw vertical line with label
  3. Update on chart zoom/pan

**File: `src/plugins/deltaBoxPlugin.js`**

- **Purpose**: Show delta values (ΔX, ΔY) in tooltip
- **Process**:
  1. When mouseover: Calculate deltas
  2. Display in box with color coding
  3. Show for each series in chart

**File: `src/plugins/digitalFillPlugin.js`**

- **Purpose**: Fill areas between digital signal transitions
- **Shows**: Binary state changes as colored regions

**File: `src/plugins/autoUnitScalePlugin.js`**

- **Purpose**: Automatically scale Y-axis based on units (kV, A, etc)
- **Converts**: Values to appropriate SI prefix units

---

### **Utility Functions**

**File: `src/utils/timeInterpolation.js`**

- **Purpose**: Interpolate missing time values when sampling rates vary
- **Algorithm**: Linear interpolation between known timestamps

**File: `src/utils/autoGroupChannels.js`**

- **Purpose**: Automatically group channels by phase/component
- **Logic**:
  - Phase A, B, C → Separate group
  - Current vs Voltage → Separate group
  - Digital vs Analog → Separate group
- **Output**: Array of groups with names and color assignments

**File: `src/utils/chartUtils.js`**

- Helper functions for chart operations

**File: `src/utils/helpers.js`** (Line 1+)

- **`extractUnit(label)`** (Line 1): Extract unit from label string
- **`nearestIndex(arr, val)`** (Line 6): Arrow function to find nearest array index
- **`getNearestIndex(array, value)`** (Line 9): Find nearest value in array with distance
- **`createCustomElement(tag, className, id, attributes, textContent)`** (Line 18): Create DOM element with optional attributes

**File: `src/utils/chartDomUtils.js`** (127 lines) ⭐ **CHART SIDEBAR + CONTAINER CREATION**

- **`createChartContainer(dragBar, label, colors, typeLabel)`** (Lines 15-97):
  - Creates `.chart-parent-container` (flex row)
  - Creates left sidebar (120px, `.chart-label`) with:
    - Type label (cyan text, uppercase)
    - Color dots + channel names for each channel
    - Scrollable if many channels
  - Appends dragBar and chart container
  - Returns: `{parentDiv, chartDiv}`
- **`initUPlotChart(opts, chartData, chartDiv, charts)`** (Lines 105-127):
  - Initializes uPlot instance
  - Caches series colors in `chart._seriesColors`
  - Adds chart to charts array
  - Attaches ResizeObserver for responsive sizing
  - Auto-fixes axis colors for dark theme
  - Returns: uPlot chart instance

**File: `src/components/createDragBar.js`** (223 lines)

- **`createDragBar(group, cfg, channelState)`** (Lines 60-223):
  - Creates `.dragBar` element (4px wide, draggable)
  - Builds rows with color indicators + labels
  - Subscribes to `channelState.analog.yLabels` changes for LIVE updates
  - Updates labels reactively when state changes
  - Returns: draggable div element

**File: `src/components/Tooltip.js`** (70 lines)

- **`createTooltip()`** (Line 5): Creates global tooltip div element (cached)
  - Dark background (rgba 0,0,0,0.85), fixed positioning
  - Returns: tooltip HTMLElement
- **`updateTooltip(pageX, pageY, text)`** (Line 29): Update tooltip content and position
  - Handles viewport boundary checking
  - Positions tooltip near mouse but keeps it visible
  - Handles HTML content
- **`hideTooltip()`** (Line 56): Hide tooltip with fade effect

**File: `src/components/setupChartDragAndDrop.js`** (139 lines)

- **`setupChartDragAndDrop(chartsContainer)`** (Lines 51+):
  - Attaches drag-and-drop event handlers to chart container
  - Supports reordering of chart-parent-container elements
  - Event handlers:
    - `dragstart`: Store reference, add "dragging" class
    - `dragover`: Prevent default, allow drop
    - `drop`: Insert dragged element before target
    - `dragend`: Remove "dragging" class
  - Allows users to reorder charts by dragging the dragBar

**File: `src/components/chartManager.js`** (900 lines) ⭐ **REACTIVE CHART UPDATE MANAGER**

- **`subscribeChartUpdates(channelState, dataState, charts, chartsContainer, verticalLinesX, cfg, autoGroupChannels)`** (Lines 60+):
  - Main chart reactivity function
  - Subscribes to ALL state changes (channelState, dataState, verticalLinesX)
  - Detects change types:
    - Simple: color/label changes → in-place update via uPlot series
    - Structural: group/add/remove → full chart rebuild
  - Strategy: Fast path for simple changes, fallback to rebuild on structural changes
  - Handles:
    - Time-window filtering (start/duration)
    - Series amplitude inversion
    - Vertical line updates
    - Delta calculations
  - Features:
    - Try in-place update first (performance optimized)
    - Fallback to full rebuild on errors
    - Debug logging to debugPanelLite
- **Helper Functions**:
  - `computeFilteredData()`: Apply time-window filtering
  - `invertAmplitudes()`: Flip selected series (multiply by -1)
  - `updateChartSeries()`: In-place series update in uPlot
  - `getChangeSummary()`: Log change information

**File: `src/components/showError.js`** (10 lines)

- **`showError(message, fixedResultsEl)`** (Lines 3-7):
  - Display error alert to user
  - Update results element with error message
  - Takes: message (string), element (HTMLElement)

**File: `src/utils/digitalChannelUtils.js`**

- Utility functions for digital channel processing

**File: `src/utils/scaleUtils.js`**

- Axis scaling and unit conversion utilities

**File: `src/utils/uiHelpers.js`**

- UI helper functions and DOM utilities

**File: `src/utils/requestAnimationFrameUpdates.js`**

- RAF-based performance optimization for updates

**File: `src/utils/tailwindColors.js`**

- Tailwind color palette definitions

**File: `src/utils/constants.js`**

- Application constants and configuration values

**File: `src/components/chartDomUtils.js`** (198 lines) - SIMPLIFIED VERSION

- **Note**: Located in `src/components/` (not `src/utils/`)
- **`createChartContainer(dragBar, chartContainerClass)`** (Lines 95-124):
  - Simplified version without left sidebar
  - Only creates parent container + drag bar + chart div
  - Used in some rendering paths as alternative

**File: `src/components/ChannelList.js`** (1400+ lines)

- Tabulator table for channel list display
- LaTeX equation rendering
- Channel property editing
- Integration with EquationEvaluatorInChannelList

**File: `src/components/renderComtradeCharts.js`**

- Main COMTRADE chart rendering function
- Orchestrates analog, digital, and computed channel rendering
- Handles chart synchronization and layout

**File: `src/components/debugPanelLite.js`**

- Lightweight debug console for logging
- Shows state changes and chart updates
- Collapsible debug panel in UI

**File: `src/components/EquationEvaluatorComponent.js`**

- Alternative equation evaluator component
- Math.js expression compilation and evaluation
- Channel variable mapping

**File: `src/plugins/horizontalZoomPanPlugin.js`**

- Zoom and pan plugin for horizontal (time) axis
- Mouse wheel zoom, drag pan support

---

## COMPLETE DATA FLOW (10-STEP SYSTEM)

### **STEP 1: USER LOADS CFG+DAT FILES**

```
User clicks "Load File" button
↓
<input type="file"> triggers change event (src/main.js line 100)
↓
readAsText() loads CFG file
readAsArrayBuffer() loads DAT file (if binary)
↓
FLOW → STEP 2
```

### **STEP 2: PARSE CFG FILE**

```
Call parseCFG(cfgContent) from comtradeUtils.js
↓
Extract:
- Station name, device, COMTRADE version (line 170)
- Channel counts: "5A,3D" → 5 analog, 3 digital (line 195)
- Analog channels with metadata (lines 220-270)
  Format: index,id,phase,component,unit,multiplier,offset,...
  Example: "1,ANA_PHASE_A,A,Current,A,0.01,-100,0,-500,500,1,1"
- Digital channels (lines 280-320)
- Sampling rates: "4800,2400" (line 330)
- Timestamps: Start time, trigger time (line 400)
↓
Return: cfg = {
  station: "PowerPlant_A",
  device: "Device_B",
  version: "2013",
  analogChannels: [{index:1, id:"ANA_PHASE_A", ...}, ...],
  digitalChannels: [{index:1, id:"DIG_CB_A", ...}, ...],
  samplingRates: [{rate: 4800, duration: 2400}, ...],
  startTime: "01/01/1970 00:00:00.000000",
  ...
}
↓
FLOW → STEP 3
```

### **STEP 3: PARSE DAT FILE**

```
Call parseDAT(datContent, cfg) from comtradeUtils.js
↓
Auto-detect format: ASCII or BINARY (line 480)
↓
For EACH sample (row in DAT):
  Extract: sampleNum, timeMs, value1, value2, ...
  Apply interpolation if time gaps exist (timeInterpolation.js)
  Apply multiplier/offset from CFG (line 600):
    displayValue = (rawValue × cfg.multiplier) + cfg.offset
    Example: (100 × 0.01) + (-100) = -99 A
↓
Return: {
  time: [0, 0.21, 0.42, 0.63, ...],  // milliseconds
  analogData: [
    [150.5, 150.7, 150.2, ...],  // Phase A Current (2400 samples)
    [149.8, 149.9, 149.5, ...],  // Phase B Current
    [151.3, 151.1, 150.9, ...],  // Phase C Current
    ...
  ],
  digitalData: [
    [0, 0, 0, 1, 1, 1, ...],  // CB A status
    [0, 0, 0, 1, 1, 1, ...],  // CB B status
    ...
  ]
}
↓
FLOW → STEP 4
```

### **STEP 4: INITIALIZE STATE MANAGEMENT**

```
Create channelState = createState({
  analog: {
    yLabels: ["Phase A Current", "Phase B Current", ...],
    lineColors: ["#FF0000", "#00FF00", "#0000FF", ...],
    yUnits: ["A", "A", "A", ...],
    axesScales: [{min:0, max:500}, ...],
    xLabel: "Time",
    xUnit: "ms",
    channelIDs: ["ANA_PHASE_A", "ANA_PHASE_B", ...],
    groups: ["Group1", "Group1", "Group2", null, ...],  // for grouping
    primary: [1, 1, 2, ...],
    secondary: [1, 1, 2, ...]
  },
  digital: {
    yLabels: ["CB_A", "CB_B", ...],
    lineColors: [...],
    channelIDs: [...],
    normalState: [0, 1, ...],
    ...
  }
})
↓
Create verticalLinesX = createState([])
↓
Subscribe to channelState changes:
  channelState.subscribe((change) => {
    console.log("Path:", change.path, "NewValue:", change.newValue);
    // Update UI when state changes
  })
↓
FLOW → STEP 5
```

### **STEP 5: AUTO-GROUP CHANNELS**

```
Get cfg.analogChannels list
↓
Call autoGroupChannels(cfg.analogChannels) from src/utils/autoGroupChannels.js
↓
Algorithm:
  Group by phase: Phase A, B, C separate
  Within each phase, group by component: Voltage, Current
  Assign colors to each group
↓
Example output:
  groups = [
    {name: "Phase A Current", indices: [0], colors: ["#FF0000"]},
    {name: "Phase B Current", indices: [1], colors: ["#00FF00"]},
    {name: "Phase C Current", indices: [2], colors: ["#0000FF"]},
    {name: "Phase A Voltage", indices: [3, 4], colors: ["#FF6666", "#FFAAAA"]},
    ...
  ]
↓
Store in channelState.analog.groups:
  channelState.analog.groups = ["Group1", "Group1", "Group2", "Group3", ...]
↓
FLOW → STEP 6
```

### **STEP 6: RENDER ANALOG CHARTS**

```
Call renderAnalogCharts(cfg, data, chartsContainer, charts, verticalLinesX, channelState, autoGroupChannels)
from src/components/renderAnalogCharts.js
↓
FOR EACH group in groups:

  A. CREATE DRAG BAR:
     const dragBar = createDragBar({indices: [0,1,2], name: "Phase A"}, cfg, channelState)
     from src/components/createDragBar.js

     Process:
     1. Create <div class="dragBar" draggable="true">
     2. innerHTML with rows: color dot + label (from channelState.analog.yLabels)
     3. Subscribe to yLabels changes for LIVE updates
     4. Returns draggable element

  B. CREATE CHART CONTAINER WITH LEFT SIDEBAR:
     const {parentDiv, chartDiv} = createChartContainer(
       dragBar,
       "chart-container",
       groupYLabels,        // ["Phase A Current", "Phase B Current", "Phase C Current"]
       groupLineColors,     // ["#FF0000", "#00FF00", "#0000FF"]
       "Analog Channels"
     )
     from src/utils/chartDomUtils.js lines 21-97

     HTML Structure Created:
     <div class="chart-parent-container" style="display:flex">
       <div class="chart-label" style="width:120px; background:dark">
         <span style="font-size:0.7rem; color:cyan">ANALOG CHANNELS</span>
         <div style="display:flex; flex-direction:column; align-items:center">
           <span style="background:#FF0000; width:10px; height:10px; border-radius:50%"></span>
           <span style="font-size:0.7rem">Phase A Current</span>
         </div>
         <div style="display:flex; flex-direction:column; align-items:center">
           <span style="background:#00FF00; width:10px; height:10px; border-radius:50%"></span>
           <span style="font-size:0.7rem">Phase B Current</span>
         </div>
         <div style="display:flex; flex-direction:column; align-items:center">
           <span style="background:#0000FF; width:10px; height:10px; border-radius:50%"></span>
           <span style="font-size:0.7rem">Phase C Current</span>
         </div>
       </div>
       <div class="dragBar" style="width:4px; background:gray; cursor:grab">
         <!-- Stacked color indicators, visible on hover -->
       </div>
       <div class="chart-container" style="flex:1; padding:20px">
         <!-- uPlot chart will be initialized here -->
       </div>
     </div>

     CSS Applied (styles/main.css lines 511-549):
     - chart-parent-container: flex row, height 400px, dark theme
     - chart-label: 120px width, dark tertiary background, scrollable overflow
     - dragBar: 4px width, expands to 6px on hover, changes color to cyan
     - chart-container: flex: 1 (takes remaining space)

  C. EXTRACT CHART DATA:
     const chartData = [
       data.time,                    // [0, 0.21, 0.42, ...]
       data.analogData[0],           // [150.5, 150.7, 150.2, ...]
       data.analogData[1],           // [149.8, 149.9, 149.5, ...]
       data.analogData[2]            // [151.3, 151.1, 150.9, ...]
     ]

  D. CREATE CHART OPTIONS:
     const opts = createChartOptions({
       title: "Phase A",
       yLabels: ["Phase A Current", "Phase B Current", "Phase C Current"],
       lineColors: ["#FF0000", "#00FF00", "#0000FF"],
       verticalLinesX: verticalLinesX (state reference),
       xLabel: "Time",
       xUnit: "ms",
       yUnits: ["A", "A", "A"],
       axesScales: [{min:0, max:500}, {min:0, max:500}, {min:0, max:500}],
       singleYAxis: true
     })
     from src/components/chartComponent.js

     Returns uPlot options object with:
     - series: [
         {label: "Time"},
         {label: "Phase A Current", stroke: "#FF0000", width: 2},
         {label: "Phase B Current", stroke: "#00FF00", width: 2},
         {label: "Phase C Current", stroke: "#0000FF", width: 2}
       ]
     - axes with scales, labels, units
     - legend configuration

  E. ADD PLUGINS:
     opts.plugins = [
       verticalLinePlugin(verticalLinesX, () => charts),
       deltaBoxPlugin()
     ]

     verticalLinePlugin (src/plugins/verticalLinePlugin.js):
       - Listens to chart render events
       - For each line in verticalLinesX: draw vertical line on canvas
       - Updates on zoom/pan

     deltaBoxPlugin (src/plugins/deltaBoxPlugin.js):
       - On mouseover: calculates ΔX and ΔY between lines
       - Displays in tooltip with color coding

  F. INITIALIZE uPLOT:
     const chart = initUPlotChart(opts, chartData, chartDiv, charts)
     from src/utils/chartDomUtils.js lines 105-145

     Process:
     1. new uPlot(opts, chartData, chartDiv)
     2. Store colors: chart._seriesColors = [#FF0000, #00FF00, #0000FF]
     3. Push to charts array: charts.push(chart)
     4. Fix axis colors for dark theme (CSS fix)
     5. Attach ResizeObserver for responsive sizing:
        - On window resize: chart.setSize({width, height})
        - Re-apply colors after resize
     6. Store metadata: chart._channelIndices = [0, 1, 2]
     7. Returns chart object

  G. ADD TOOLTIP:
     On mousemove over chart:
       - Get sample index at mouse X position
       - Extract time value at that index
       - For each series: get value at index, format with decimals
       - Create HTML: "<b>t:</b> 0.42<br><span style=color:#FF0000>Phase A</span>: 150.7"
       - Call updateTooltip(pageX, pageY, html)
       - Tooltip appears near mouse

     On mouseleave: hideTooltip()

  H. APPEND TO DOM:
     chartsContainer.appendChild(parentDiv)

     Result: One chart container with:
     [120px left label] [4px dragbar] [uPlot chart area]

↓
RESULT: Multiple charts rendered (one per group), each with:
  - Left sidebar showing channel names, units, colors
  - Draggable thin bar for reordering
  - Interactive uPlot chart with plugins
  - Synchronized vertical lines across all charts

↓
FLOW → STEP 7
```

### **STEP 7: RENDER DIGITAL CHARTS**

```
Call renderDigitalCharts(cfg, data, chartsContainer, charts, verticalLinesX, channelState)
↓
Similar to analog, but:
  - Single chart for ALL digital channels (stacked)
  - Uses digitalFillPlugin to show state transitions
  - Binary values (0 or 1)
  - No decimal places in display

↓
FLOW → STEP 8
```

### **STEP 8: VERTICAL LINE MEASUREMENT & SHORTCUTS**

```
A. INITIALIZE VERTICAL LINE CONTROLS:
   Call initVerticalLineControl() from src/components/initVerticalLineControl.js

   Creates:
   - Slider input (0-100 range)
   - Two decimal input fields
   - Display label
   - Statistics panel

   Callbacks:
   - onSliderChange(value) → verticalLinesX.push({x: convertedValue})
   - onInputChange(value) → verticalLinesX[index] = {x: value}

   When state changes:
   - All charts re-render (verticalLinePlugin updates)
   - Deltas recalculated (calculateDeltas.js)
   - Results displayed in stats panel

B. KEYBOARD SHORTCUTS:
   From src/components/handleVerticalLineShortcuts.js

   Alt+0: Toggle vertical line 0 visibility
   Alt+1: Toggle vertical line 1 visibility
   Alt+2: Toggle vertical line 2 visibility
   Alt+3: Toggle vertical line 3 visibility
   Alt+4: Toggle vertical line 4 visibility

   Example:
   User presses Alt+0
   → verticalLinesX[0].visible = !verticalLinesX[0].visible
   → chartState change notification
   → verticalLinePlugin updates
   → Charts re-render

C. DELTA CALCULATION:
   Call calculateDeltas(time, data, verticalLinesX) from src/utils/calculateDeltas.js

   Algorithm:
   FOR EACH pair of consecutive lines (line[i], line[i+1]):
     1. Find nearest sample index to each line:
        idx1 = argmin(|time - verticalLinesX[i].x|)
        idx2 = argmin(|time - verticalLinesX[i+1].x|)

     2. ΔX = time[idx2] - time[idx1]

     3. FOR EACH data series:
        ΔY = data[series][idx2] - data[series][idx1]
        color = "green" if ΔY > 0 else "red"

   Return: Array of delta objects
   [{
     line1X: 0.5, line2X: 1.2,
     deltaX: 0.7,
     deltas: [
       {seriesName: "Phase A", value: 25.5, color: "green"},
       {seriesName: "Phase B", value: -10.3, color: "red"}
     ]
   }]

   Display in deltaBoxPlugin tooltip

↓
FLOW → STEP 9
```

### **STEP 9: CHANNEL EDITING & COMPUTED CHANNELS**

```
USER OPENS CHANNEL LIST:

A. OPEN POPUP:
   User clicks "Edit Channels" button
   → window.open('popup.html') from showChannelListWindow.js
   → Popup window with Tabulator.js table
   → Columns: ID, Label, Color, Units, Group, Primary, Secondary

B. EDIT CHANNEL PROPERTIES:
   User double-clicks a channel row
   → Popup sends postMessage to parent:
      {
        source: 'ChildWindow',
        type: 'callback_label',
        payload: {channelID: 'ANA_001', fieldName: 'yLabel', value: 'Main Feeder A'}
      }

   → Parent receives message (src/main.js):
      window.addEventListener('message', (event) => {
        if (event.data.source === 'ChildWindow') {
          const {channelID, fieldName, value} = event.data.payload;
          updateChannelFieldByID(channelID, fieldName, value);
          // Trigger channelState change:
          channelState.analog.yLabels[foundIndex] = value;
          // Triggers subscription callbacks
          // Left sidebar label updates LIVE
          // dragBar label updates LIVE via createDragBar subscription
        }
      })

C. CREATE COMPUTED CHANNEL:
   User clicks "+" button in channel list popup
   → Opens equation editor (src/components/EquationEvaluatorInChannelList.js)

   Equation Evaluator Steps:

   1. INPUT: User types equation
      Example: "=sqrt(A^2 + B^2)"
      Where A, B are available channel variables

   2. PARSE: Extract variable names (A, B, C)
      Map to actual channels:
      A → channelState.analog.yLabels.indexOf("Phase A Current") → index 0
      B → channelState.analog.yLabels.indexOf("Phase B Current") → index 1

   3. COMPILE (Math.js 11.11.0):
      const expr = "sqrt(A^2 + B^2)";
      const compiled = math.compile(expr);
      // compiled = {evaluate: function(scope) {...}, toString: ...}

   4. SAMPLE EVALUATION:
      Evaluate on first 10 samples to check validity:
      for (let i = 0; i < 10; i++) {
        const scope = {
          A: analogData[0][i],  // 150.5
          B: analogData[1][i]   // 149.8
        };
        const result = compiled.evaluate(scope);
        // result = sqrt(150.5^2 + 149.8^2) = 212.3
        console.log(result);
      }

   5. SAVE COMPUTED CHANNEL:
      User clicks "Save Computed Channel"
      → Store in data.computedData:
         {
           name: "Magnitude A-B",
           unit: "A",
           expression: "sqrt(A^2 + B^2)",
           compiled: <compiled function>,
           channelIndices: [0, 1],
           data: [212.3, 212.5, 211.8, ...]  // Full evaluation
         }
      → Render in renderComputedChannels()
      → Add to chart display

↓
FLOW → STEP 10
```

### **STEP 10: EXPORT COMPUTED CHANNELS**

```
USER CLICKS EXPORT BUTTON:

A. GET COMPUTED CHANNELS:
   const computedChannels = data.computedData;  // Array of computed channels
   const sampleRate = cfg.samplingRates[0].rate;  // 4800 Hz

B. EXPORT AS COMTRADE CFG+DAT:
   Call exportAllComputedChannels(data, sampleRate)
   from src/components/EquationEvaluatorInChannelList.js lines 845-920

   STEP 1: GENERATE CFG CONTENT
   Call generateCFGContentBatch(computedChannels, sampleRate) [Lines 733-788]

   Algorithm:
   1. Start with header:
      "ComputedChannels,User_Defined,2025,2013"

   2. Channel count line:
      "2A,0D"  (2 analog, 0 digital)

   3. FOR EACH computed channel:
      a. Find min and max values in channel data:
         min = 0.0, max = 400.0
      b. Calculate multiplier (fit into 32-bit signed int):
         multiplier = (max - min) / (2^31 - 1)
         multiplier = 400.0 / 2147483647 ≈ 0.00000019
      c. Calculate offset:
         intMin = -2147483648
         offset = min - (intMin × multiplier)
         offset = 0.0 - (-2147483648 × 0.00000019) ≈ 408.4
      d. Create channel definition line:
         "1,Magnitude,,--, ,0.00000019,408.4,0,0,400,1,1"

   4. Sampling rates line:
      "4800,2400"  (4800 Hz for 2400 samples)

   5. Timestamp lines:
      Start: "01/01/1970,00:00:00.000000"
      Trigger: "01/01/1970,00:00:00.000000"

   6. File type:
      "ASCII"

   Output CFG content (text string)

   STEP 2: GENERATE DAT CONTENT
   Call generateDATContentBatch(computedChannels, sampleRate) [Lines 795-828]

   Algorithm:
   FOR EACH sample (row):
     1. Sample number (0-indexed)
     2. Time in milliseconds: sampleNum / (sampleRate / 1000)
     3. FOR EACH computed channel:
        a. Get display value: computedChannels[ch].data[sampleNum]
        b. Convert to raw integer:
           rawValue = (displayValue - offset) / multiplier
           Example: (200 - 408.4) / 0.00000019 = -1097894736
        c. Write (int32) rawValue
     4. Join values with commas

   Example output:
   0,0.00,1097894736,1097894825
   1,0.21,1097894700,1097894790
   2,0.42,1097894652,1097894751
   ...

   Output DAT content (text string)

   STEP 3: CREATE AND DOWNLOAD FILES
   a. Create CFG Blob:
      const cfgBlob = new Blob([cfgContent], {type: "text/plain"});
      Download with name: "computed_channel_2025-12-10T14-30-25.cfg"

   b. Wait 500ms (browser file I/O delay)

   c. Create DAT Blob:
      const datBlob = new Blob([datContent], {type: "text/plain"});
      Download with name: "computed_channel_2025-12-10T14-30-25.dat"

C. USER CAN NOW:
   - Load these CFG+DAT files in any COMTRADE viewer
   - Import back into this application
   - Analyze further or share with others

↓
COMPLETE FLOW CLOSED
```

---

## VISUAL FLOWCHART SPECIFICATIONS

### **Color Coding**

- **Blue**: Data operations (parsing, loading)
- **Green**: State management (createState, subscriptions)
- **Red**: UI rendering (createChartContainer, plugins)
- **Yellow**: User interactions (vertical lines, channel editing)
- **Purple**: Export/Import operations

### **Shape Coding**

- **Rectangles**: Functions/modules
- **Cylinders**: Data storage (cfg, data, channelState)
- **Diamonds**: Decision points (format detection, channel type)
- **Circles**: User actions
- **Arrows**: Data flow direction

### **Key Visual Elements to Show**

1. **Three parallel rendering branches**:

   - renderAnalogCharts (blue, multiple instances)
   - renderDigitalCharts (green, single instance)
   - renderComputedChannels (purple, dynamic)

2. **Left sidebar creation process** (detailed):

   - createChartContainer → createCustomElement
   - Type label creation (cyan span)
   - Channel item loop (color dot + name)
   - CSS flex layout application
   - Reactive subscription (yLabels change → label update)

3. **Vertical line synchronization**:

   - verticalLineControl → verticalLinesX state
   - verticalLinePlugin rendering
   - deltaBoxPlugin calculation
   - Keyboard shortcuts integration

4. **State propagation**:

   - channelState changes → subscription callbacks
   - Batch notifications via createState
   - UI updates (left sidebar, drag bar, legend)

5. **Popup communication**:

   - postMessage flow between parent/child
   - Message format specification
   - State update propagation

6. **Export pipeline**:
   - Computed channels collection
   - CFG generation (multiplier/offset calculation)
   - DAT generation (value conversion)
   - Dual-file download with timing

### **Synchronization Points to Highlight**

- All charts share verticalLinesX array (synchronized lines across charts)
- All charts share channelState (synchronized labels, colors, groups)
- All charts listen to same cfg (synchronized metadata)
- ResizeObserver on each chart (synchronized sizing)

### **Error Handling Paths**

- Invalid equation → Show error in editor
- File format mismatch → Fallback to ASCII parser
- Missing channel → Skip rendering
- Subscription failure → Graceful degradation (see createDragBar try-catch)

---

## SUMMARY FOR FLOWCHART GENERATOR

This prompt contains:

- ✅ 20+ file names with exact paths
- ✅ 40+ function names with line numbers
- ✅ 10-step complete system flow with exact data transformations
- ✅ Data structure examples with actual values
- ✅ Algorithm descriptions with pseudocode
- ✅ User interaction workflows
- ✅ LEFT SIDE CHART UI CREATION (newly detailed)
  - DOM structure creation process
  - CSS styling specifications
  - Reactive subscription mechanism
  - Visual layout result
- ✅ Error handling specifications
- ✅ Visual flowchart requirements (colors, shapes, symbols)
- ✅ Synchronization and timing information

**Ready to give to AI flowchart generator (Mermaid, Lucidchart, Draw.io, Creately, etc.)**
