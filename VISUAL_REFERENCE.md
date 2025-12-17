# Channel Grouping & Rendering - Visual Reference

## 🎨 Channel Grouping Patterns

### Analog Channels - Pattern Matching

```
INPUT: cfg.analogChannels
┌─────────────────────────────────────┐
│ ID    | Unit | Description         │
├─────────────────────────────────────┤
│ IA    | A    | Phase A Current     │
│ IB    | A    | Phase B Current     │
│ IC    | A    | Phase C Current     │
│ VA    | V    | Phase A Voltage     │
│ VB    | V    | Phase B Voltage     │
│ VC    | V    | Phase C Voltage     │
│ VAB   | V    | Line Voltage A-B    │
│ VBC   | V    | Line Voltage B-C    │
│ VCA   | V    | Line Voltage C-A    │
│ PF    | -    | Power Factor        │
└─────────────────────────────────────┘

PATTERN MATCHING (autoGroupChannels)
┌──────────────────────────────────────────┐
│ Regex 1: /^I[ABC]$/i                     │
│ ├─ Match: IA, IB, IC                     │
│ └─ Group: "Currents"                     │
├──────────────────────────────────────────┤
│ Regex 2: /^V[ABC]$/i                     │
│ ├─ Match: VA, VB, VC                     │
│ └─ Group: "Voltages"                     │
├──────────────────────────────────────────┤
│ Regex 3: /^V(AB|BC|CA)$/i                │
│ ├─ Match: VAB, VBC, VCA                  │
│ └─ Group: "Line Voltages"                │
├──────────────────────────────────────────┤
│ Unmatch: PF                              │
│ └─ Group: "Other"                        │
└──────────────────────────────────────────┘

OUTPUT: Multiple Charts (One per Group)
┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  ┌───────────┐
│ Currents Chart  │  │ Voltages Chart   │  │ Line Voltages  │  │ Other     │
├─────────────────┤  ├──────────────────┤  ├────────────────┤  ├───────────┤
│ IA (red)        │  │ VA (purple)      │  │ VAB (brown)    │  │ PF (gray) │
│ IB (blue)       │  │ VB (orange)      │  │ VBC (pink)     │  │           │
│ IC (green)      │  │ VC (yellow)      │  │ VCA (gray)     │  │           │
└─────────────────┘  └──────────────────┘  └────────────────┘  └───────────┘
```

---

## 📊 Rendering Architecture Flow

### Master Orchestration (renderComtradeCharts)

```
renderComtradeCharts() called
    │
    ├─ Clear all previous charts
    │   └─ charts.length = 0
    │   └─ chartsContainer.innerHTML = ""
    │
    ├─ renderAnalogCharts()
    │   ├─ autoGroupChannels() → Groups with patterns
    │   ├─ For each group:
    │   │   ├─ createDragBar()
    │   │   ├─ createChartContainer()
    │   │   ├─ initUPlotChart()
    │   │   └─ charts.push(chart)
    │   └─ Result: charts[0], charts[1], ...
    │
    ├─ renderDigitalCharts()
    │   ├─ findChangedDigitalChannelIndices()
    │   ├─ createDragBar()
    │   ├─ createChartContainer()
    │   ├─ initUPlotChart()
    │   └─ charts.push(chart)
    │
    └─ (Later) renderComputedChannels() when user creates channels
        ├─ Get data.computedData array
        ├─ createDragBar()
        ├─ createChartContainer()
        ├─ initUPlotChart()
        └─ charts.push(chart)
```

---

## 🎯 Computed Channels Flow

### User Journey: LaTeX Editor → Chart Rendering

```
USER ACTION 1: Click Channel Name in Table
┌──────────────────────────────────────────┐
│ ChannelList.js                           │
│ openMathLiveEditor(cell, doc, win)       │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ MathLive Modal Opens                     │
│ ┌──────────────────────────────────────┐ │
│ │ Math-field Input                     │ │
│ │ [Predefined Buttons: IA, IB, ..., +, -, *] │
│ │ User enters: \sqrt{IA^2+IB^2+IC^2}   │ │
│ │ [Save] [Cancel]                      │ │
│ └──────────────────────────────────────┘ │
└────────────────┬─────────────────────────┘
                 │
USER ACTION 2: Click Save
                 │
                 ▼
┌──────────────────────────────────────────┐
│ ChannelList.js                           │
│ evaluateAndSaveComputedChannel()         │
│ ├─ convertLatexToMathJs()                │
│ │  └─ \sqrt{IA^2+IB^2+IC^2} → sqrt(...) │
│ └─ math.evaluate() with data samples     │
│    └─ 62,464 samples processed           │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ ChannelList.js                           │
│ saveComputedChannelToGlobals()           │
│ ├─ cfg.computedChannels.push(ch)         │
│ ├─ data.computedData.push(ch)            │
│ └─ Dispatch CustomEvent("computed...")   │
└────────────────┬─────────────────────────┘
                 │
       (Event crosses window boundary)
                 │
                 ▼
┌──────────────────────────────────────────┐
│ main.js (Parent Window)                  │
│ addEventListener("computedChannelSaved") │
│ ├─ Remove old computed chart (if exists) │
│ ├─ Remove from charts[] array            │
│ └─ Call renderComputedChannels()         │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ renderComputedChannels.js (OPTIMIZED)    │
│ ├─ Extract computed channels             │
│ ├─ Generate colors (5-color palette)     │
│ ├─ Build chart data [time, ch1, ch2...] │
│ ├─ Create uPlot chart                    │
│ ├─ Add plugins (vertical, delta)         │
│ ├─ Attach tooltip listener               │
│ └─ Append to chartsContainer             │
└────────────────┬─────────────────────────┘
                 │
                 ▼
         CHART VISIBLE IN DOM
    ┌──────────────────────────────┐
    │ Computed Channels Chart      │
    ├──────────────────────────────┤
    │ ─ sqrt(IA²+IB²+IC²) [#FF6B6B]│
    │ ─ IA+IB+IC         [#4ECDC4]│
    │ ─ Other Expression [#45B7D1]│
    │                              │
    │ (User can hover for tooltip) │
    └──────────────────────────────┘
```

---

## 🎨 Color Palette System

### Analog Channels (Pattern-Based Colors)

```
GROUP 1: Currents
┌────────────┬─────────┬──────────────────────┐
│ Channel    │ Color   │ Visual               │
├────────────┼─────────┼──────────────────────┤
│ IA         │ #e41a1c │ ▮▮▮ (Red)            │
│ IB         │ #377eb8 │ ▮▮▮ (Blue)           │
│ IC         │ #4daf4a │ ▮▮▮ (Green)          │
└────────────┴─────────┴──────────────────────┘

GROUP 2: Voltages
┌────────────┬─────────┬──────────────────────┐
│ Channel    │ Color   │ Visual               │
├────────────┼─────────┼──────────────────────┤
│ VA         │ #984ea3 │ ▮▮▮ (Purple)         │
│ VB         │ #ff7f00 │ ▮▮▮ (Orange)         │
│ VC         │ #ffff33 │ ▮▮▮ (Yellow)         │
└────────────┴─────────┴──────────────────────┘

GROUP 3: Line Voltages
┌────────────┬─────────┬──────────────────────┐
│ Channel    │ Color   │ Visual               │
├────────────┼─────────┼──────────────────────┤
│ VAB        │ #a65628 │ ▮▮▮ (Brown)          │
│ VBC        │ #f781bf │ ▮▮▮ (Pink)           │
│ VCA        │ #999999 │ ▮▮▮ (Gray)           │
└────────────┴─────────┴──────────────────────┘

GROUP 4: Other
┌────────────┬─────────┬──────────────────────┐
│ Channel    │ Color   │ Visual               │
├────────────┼─────────┼──────────────────────┤
│ (Any)      │ #888    │ ▮▮▮ (Dark Gray)      │
└────────────┴─────────┴──────────────────────┘
```

### Computed Channels (Fixed Palette with Cycling)

```
PALETTE: 5 colors
┌──────┬──────────┬──────────────────────┐
│ Idx  │ Color    │ Visual               │
├──────┼──────────┼──────────────────────┤
│ 0    │ #FF6B6B  │ ▮▮▮ (Coral Red)      │
│ 1    │ #4ECDC4  │ ▮▮▮ (Turquoise)      │
│ 2    │ #45B7D1  │ ▮▮▮ (Sky Blue)       │
│ 3    │ #FFA07A  │ ▮▮▮ (Light Salmon)   │
│ 4    │ #98D8C8  │ ▮▮▮ (Mint Green)     │
│ 0    │ #FF6B6B  │ ▮▮▮ (Coral Red)      │ ← Cycles
│ 1    │ #4ECDC4  │ ▮▮▮ (Turquoise)      │
└──────┴──────────┴──────────────────────┘

CYCLING LOGIC:
  colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"]
  color = colors[idx % colors.length]

  Ch 1: idx=0 → 0 % 5 = 0 → #FF6B6B
  Ch 2: idx=1 → 1 % 5 = 1 → #4ECDC4
  Ch 3: idx=2 → 2 % 5 = 2 → #45B7D1
  Ch 4: idx=3 → 3 % 5 = 3 → #FFA07A
  Ch 5: idx=4 → 4 % 5 = 4 → #98D8C8
  Ch 6: idx=5 → 5 % 5 = 0 → #FF6B6B (cycle back)
```

---

## 📈 Chart Data Structure

### Analog Chart Data

```
chartData = [
  [t0, t1, t2, ..., t62463],        // Time array
  [IA0, IA1, IA2, ..., IA62463],    // Current A
  [IB0, IB1, IB2, ..., IB62463],    // Current B
  [IC0, IC1, IC2, ..., IC62463],    // Current C
]

Each group has separate chart with its own data
```

### Digital Chart Data

```
chartData = [
  [t0, t1, t2, ..., t62463],        // Time array
  [d0, d1, d2, ..., d62463],        // Digital channel (0 or 1)
  [d0, d1, d2, ..., d62463],        // Digital channel (0 or 1)
  ...
]

Single chart with all changed digital channels
```

### Computed Chart Data

```
chartData = [
  [t0, t1, t2, ..., t62463],        // Time array (62,464 samples)
  [c1_0, c1_1, ..., c1_62463],      // Computed channel 1
  [c2_0, c2_1, ..., c2_62463],      // Computed channel 2
  [c3_0, c3_1, ..., c3_62463],      // Computed channel 3
  ...
]

Single chart with all computed channels accumulated
```

---

## 🔄 State Management

### Global State (main.js)

```javascript
cfg = {
  analogChannels: [...],
  digitalChannels: [...],
  computedChannels: [          // ← USER CREATED
    {
      id: "sqrt(IA^2+IB^2+IC^2)",
      unit: "",
      color: "#FF6B6B",
      scale: 1,
      start: 0,
      duration: ""
    },
    {
      id: "IA+IB+IC",
      unit: "",
      color: "#4ECDC4",
      ...
    }
  ]
}

data = {
  time: [...],                  // Time array
  analogData: [[...], ...],     // Analog values
  digitalData: [[...], ...],    // Digital values
  computedData: [               // ← USER CREATED
    {
      id: "sqrt(...)",
      data: [c1_0, c1_1, ..., c1_62463],  // 62,464 samples
      scalingFactor: 1,
      min: 0,
      max: 500,
      avg: 250
    },
    {
      id: "IA+IB+IC",
      data: [c2_0, c2_1, ..., c2_62463],
      scalingFactor: 1,
      ...
    }
  ]
}

channelState = {
  analog: {
    yLabels: ["IA", "IB", "IC", "VA", "VB", "VC", ...],
    lineColors: ["#e41a1c", "#377eb8", "#4daf4a", ...],
    yUnits: ["A", "A", "A", "V", "V", "V", ...],
    channelIDs: ["analog-0-xxx", "analog-1-yyy", ...],
    groups: [undefined, undefined, ..., "Currents", "Currents", ...],
    scales: [1, 1, 1, 1, 1, 1, ...],
    starts: [0, 0, 0, 0, 0, 0, ...],
    durations: [undefined, undefined, ...]
  },
  digital: {...}
}

charts = [
  chart0,        // Analog Group 1 (or first chart)
  chart1,        // Analog Group 2 or Digital
  chart2,        // Analog Group 3 or Computed ← DYNAMIC
  chart3,        // Additional computed
  ...
]
```

---

## 🎬 Timeline: Multiple Channel Creation

```
TIME 1: User creates Channel 1
─────────────────────────────────────
Before: charts = [analogChart, digitalChart]
Action: User saves \sqrt{IA^2+IB^2+IC^2}
After:  charts = [analogChart, digitalChart, computedChart]
        Computed chart shows 1 line (coral red)
        Table has 1 row in "Computed Channels"

TIME 2: User creates Channel 2
─────────────────────────────────────
Before: charts = [analogChart, digitalChart, computedChart(1 line)]
Action: User saves IA+IB+IC
        Old computedChart removed
        renderComputedChannels() called with 2 channels
After:  charts = [analogChart, digitalChart, computedChart(2 lines)]
        Computed chart shows 2 lines (coral + turquoise)
        Table has 2 rows in "Computed Channels"

TIME 3: User creates Channel 3
─────────────────────────────────────
Before: charts = [analogChart, digitalChart, computedChart(2 lines)]
Action: User saves \sqrt{VA^2+VB^2+VC^2}
        Old computedChart removed
        renderComputedChannels() called with 3 channels
After:  charts = [analogChart, digitalChart, computedChart(3 lines)]
        Computed chart shows 3 lines (coral + turquoise + sky blue)
        Table has 3 rows in "Computed Channels"
```

---

## 🎯 Key Differences: Analog vs Computed

```
ASPECT              ANALOG                    COMPUTED
────────────────────────────────────────────────────────────────
Grouping            Pattern-based regex       All together
Charts              Multiple (one per group)  Single
Colors              Predefined per pattern    Fixed palette (5 colors)
Data Source         cfg.analogChannels        User expression
Rendering           Once at load              On-demand (when created)
Accumulation        N/A (static)              Dynamic accumulation
User Interaction    Read-only (color, scale) Creation via LaTeX editor
Scaling             From config               Auto-calculated
Visibility          All visible               All visible together
```

---

## 📌 Important Coordinates & Selectors

```javascript
// Computed chart detection
document.querySelector('[data-chart-type="computed"]')

// Chart array index (varies based on analog/digital grouping)
charts.findIndex(c => c._type === "computed")

// Computed channel data
data.computedData.map(ch => ch.id)

// Global access
cfg.computedChannels
data.computedData
channelState (no specific computed section)
```

---

## ✅ Professional Quality Checklist

```
CODE QUALITY
┌─────────────────────────────────────────────┐
│ ☑ No diagnostic console.log statements     │
│ ☑ Only error/warning for failures           │
│ ☑ Clear variable names                      │
│ ☑ Consistent indentation (2 spaces)         │
│ ☑ DRY principle applied                      │
│ ☑ Single responsibility per function        │
│ ☑ Defensive programming (null checks)       │
│ ☑ No emoji in comments                      │
│ ☑ Matches style of renderAnalogCharts.js    │
│ ☑ Optimized for performance                 │
└─────────────────────────────────────────────┘

FUNCTIONALITY
┌─────────────────────────────────────────────┐
│ ☑ MathLive editor works                     │
│ ☑ LaTeX input functional                    │
│ ☑ Expression evaluation correct              │
│ ☑ Multiple channels accumulate              │
│ ☑ Colors cycle through palette              │
│ ☑ Chart updates properly                    │
│ ☑ Tooltip shows all channels                │
│ ☑ Vertical lines visible                    │
│ ☑ Delta box measurements work               │
│ ☑ Export generates correct files            │
└─────────────────────────────────────────────┘

TESTING
┌─────────────────────────────────────────────┐
│ ☑ Load file: analog + digital charts        │
│ ☑ Create 1st channel: chart appears         │
│ ☑ Create 2nd channel: 2 lines visible       │
│ ☑ Create 3rd channel: 3 lines visible       │
│ ☑ Tooltip functional on all channels        │
│ ☑ No console errors                         │
│ ☑ Performance acceptable                    │
│ ☑ Memory usage reasonable                   │
│ ☑ Code passes node --check                  │
│ ☑ Matches professional standards            │
└─────────────────────────────────────────────┘
```
