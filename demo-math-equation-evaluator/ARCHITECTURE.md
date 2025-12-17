# Math Equation Evaluator - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMTRADE FILE LOADED                        │
│  CFG + DAT with multiple sampling rates or non-uniform times   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  PARSE & INTERPOLATION  │
                    │  Linear Interpolation:  │
                    │  time = sample/rate     │
                    │  ✅ Uniform spacing     │
                    │  ✅ Multi-rate support  │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────▼────────────────────────┐
        │         REACTIVE STATE INITIALIZATION           │
        │                                                  │
        │  dataState = {                                   │
        │    analog: [                                     │
        │      [t0, t1, t2, ...],    // Time array        │
        │      [VA samples],         // Voltage Phase A   │
        │      [VB samples],         // Voltage Phase B   │
        │      [VC samples],         // Voltage Phase C   │
        │      [IA samples],         // Current Phase A   │
        │      [IB samples],         // Current Phase B   │
        │      [IC samples]          // Current Phase C   │
        │    ]                                             │
        │  }                                               │
        │                                                  │
        │  channelState = {                                │
        │    analog: {                                     │
        │      yLabels: ['VA', 'VB', 'VC', 'IA', 'IB', 'IC'],
        │      lineColors: [...],                         │
        │      units: ['V', 'V', 'V', 'A', 'A', 'A'],    │
        │      ...                                         │
        │    }                                             │
        │  }                                               │
        └────────────────────┬─────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  CHARTS READY   │
                    │  Display all    │
                    │  6 channels     │
                    └────────┬────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        │  USER OPENS TABULATOR                  │
        │  (ChannelList.js popup window)         │
        │                                         │
        │  ┌──────────────────────────────┐      │
        │  │ Tabulator Table              │      │
        │  ├──────────────────────────────┤      │
        │  │ Column 1: Name (VA, VB...)   │      │
        │  │ Column 2: Unit               │      │
        │  │ Column 3: Scale              │      │
        │  │ Column 4: Color              │      │
        │  │ Column 5: Equation (NEW!)    │◄─────┼─── User enters: "VA + VB + VC"
        │  │ Column 6: Delete button      │      │    or "sqrt(VA^2 + VB^2)"
        │  └──────────────────────────────┘      │
        │                                         │
        │  postMessage sends equation to parent   │
        └────────────────┬───────────────────────┘
                         │
                    ┌────▼────────────────────────┐
                    │  PARENT RECEIVES MESSAGE    │
                    │  from ChildWindow (popup)   │
                    │                             │
                    │  event.data = {             │
                    │    source: 'ChildWindow',   │
                    │    type: 'callback_equation'│
                    │    payload: {               │
                    │      equation: "VA + VB"    │
                    │    }                        │
                    │  }                          │
                    └────┬───────────────────────┘
                         │
            ┌────────────▼────────────────┐
            │  MATH.JS EVALUATION BEGINS  │
            │                             │
            │  1. Compile equation        │
            │  2. Loop through samples    │
            │  3. For each sample i:      │
            │     - Get VA[i]             │
            │     - Get VB[i]             │
            │     - Evaluate: VA[i] + VB[i]
            │  4. Build result array      │
            │                             │
            │  result = [r0, r1, r2, ...] │
            └────┬───────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │  SUCCESS: NEW CHANNEL CREATED │
        │                               │
        │  channelState.analog:         │
        │    yLabels.push('VA + VB')    │
        │    lineColors.push('#FF6B6B')│
        │                               │
        │  dataState.analog:            │
        │    push([result array])       │
        │                               │
        │  ✅ Subscriptions trigger     │
        │  ✅ Charts re-render          │
        │  ✅ New channel visible!      │
        └────┬──────────────────────────┘
             │
        ┌────▼────────────────────┐
        │  REACTIVE SYSTEM UPDATES│
        │                         │
        │  Chart Manager sees:    │
        │  "dataState changed"    │
        │                         │
        │  Actions:               │
        │  - Detect new series    │
        │  - Full chart recreate  │
        │  - Add to visualization │
        │                         │
        │  Result: User sees new  │
        │  calculated channel in  │
        │  the charts!            │
        └────────────────────────┘
```

## Data Flow: Sample-by-Sample Evaluation

```
INPUT: Equation "VA + VB + VC"

Time    VA        VB         VC        Result
──────────────────────────────────────────────────
0.00ms  220.50   -110.25   -110.25    0.00 ✅ balanced
0.25ms  221.30   -108.50   -112.80    0.00 ✅ balanced
0.50ms  220.80   -112.30   -108.50    0.00 ✅ balanced
0.75ms  219.20   -115.40   -103.80    0.00 ✅ balanced
1.00ms  218.50   -118.20   -100.30    0.00 ✅ balanced

       ▲
       │ All samples evaluated independently
       │ With uniform time spacing from linear interpolation
       │ Results in perfectly aligned derived channel
```

## Complex Equation: RMS Voltage

```
INPUT: "sqrt(VA^2 + VB^2 + VC^2) / sqrt(3)"

For each sample i:
┌─────────────────────────────────────────────┐
│ 1. Square individual phases:                 │
│    VA²[i] = (220.50)² = 48,620.25           │
│    VB²[i] = (-110.25)² = 12,155.06          │
│    VC²[i] = (-110.25)² = 12,155.06          │
│                                              │
│ 2. Sum the squares:                          │
│    Sum = 48,620.25 + 12,155.06 + 12,155.06  │
│    Sum = 72,930.37                           │
│                                              │
│ 3. Take square root:                         │
│    sqrt(72,930.37) = 270.06 V                │
│                                              │
│ 4. Divide by √3:                             │
│    270.06 / 1.732 = 155.88 V (RMS)           │
│                                              │
│ Result[i] = 155.88 V                         │
└─────────────────────────────────────────────┘

This happens for all 1000+ samples → new derived channel!
```

## Interpolation: Why It Matters

```
SCENARIO 1: Non-uniform timestamps from DAT file
┌────────────────────────────────────────────────┐
│ Sample 0: 0.00000 s                            │
│ Sample 1: 0.00030 s (longer gap)               │
│ Sample 2: 0.00040 s (shorter gap)              │
│ Sample 3: 0.00070 s (longer gap)               │
│ ...                                            │
│ ❌ Problem: Can't easily calculate RMS or     │
│    compare phases - time spacing is irregular │
└────────────────────────────────────────────────┘

SOLUTION: Linear Interpolation Applied
┌────────────────────────────────────────────────┐
│ Sampling Rate: 4000 Hz (from CFG file)        │
│                                                 │
│ Sample 0: time = 0 / 4000 = 0.00000 s        │
│ Sample 1: time = 1 / 4000 = 0.00025 s        │
│ Sample 2: time = 2 / 4000 = 0.00050 s        │
│ Sample 3: time = 3 / 4000 = 0.00075 s        │
│ ...                                            │
│ ✅ Perfect uniform spacing!                    │
│ ✅ Can calculate RMS confidently              │
│ ✅ Phases align correctly                      │
└────────────────────────────────────────────────┘

SCENARIO 2: Multiple sampling rates in DAT file
┌────────────────────────────────────────────────┐
│ Samples 0-10000:   4000 Hz (event)             │
│ Samples 10000+:    1000 Hz (steady state)      │
│                                                 │
│ CFG file specifies:                            │
│ samplingRates = [                              │
│   { rate: 4000, endSample: 10000 },           │
│   { rate: 1000, endSample: 20000 }            │
│ ]                                              │
│                                                 │
│ Interpolation handles this:                    │
│ - Use 4000 Hz for samples 0-10000             │
│ - Switch to 1000 Hz for samples 10000+        │
│ ✅ Seamless transition                         │
│ ✅ Continuous time array                       │
└────────────────────────────────────────────────┘
```

## Code Integration Points

```javascript
// 1. PARSE PHASE (comtradeUtils.js)
parseCFG(cfgText)           // Extract sampling rates
  → samplingRates = [{rate: 4000, endSample: 99999}]

parseDAT(datText, cfg)      // Parse samples
  → calls generateUniformTimeArray()
  → timeArray = [0, 0.00025, 0.0005, ...]

// 2. STATE INITIALIZATION (createState.js)
dataState = createState({
  analog: [timeArray, VA[], VB[], VC[], IA[], IB[], IC[]]
})

// 3. EQUATION EVALUATION (main.js + math.js)
window.addEventListener('message', (e) => {
  if (e.data.type === 'callback_equation') {
    equation = e.data.payload.equation  // "VA + VB + VC"

    result = evaluateDerivedChannel(equation, {
      VA: dataState.analog[1],
      VB: dataState.analog[2],
      VC: dataState.analog[3],
      IA: dataState.analog[4],
      IB: dataState.analog[5],
      IC: dataState.analog[6]
    })

    // Add to state
    dataState.analog.push(result.data)
    channelState.analog.yLabels.push(`Derived: ${equation}`)
  }
})

// 4. REACTIVE UPDATE (chartManager.js)
subscribeChartUpdates(channelState, dataState, ...)
  → Detects new series in dataState
  → Full chart recreate
  → New channel visible in charts!
```

## Key Advantages of This Approach

```
✅ UNIFORM TIME SPACING
   - All samples have same time delta
   - Enables accurate RMS, FFT, filtering

✅ SAMPLE-BY-SAMPLE EVALUATION
   - Math.js operates on arrays element-wise
   - Complex equations work like simple ones
   - No special handling needed

✅ REACTIVE INTEGRATION
   - New derived channels trigger subscriptions
   - Charts update automatically
   - No manual refresh needed

✅ MULTI-RATE SUPPORT
   - Handles COMTRADE files with rate changes
   - Seamless transitions
   - Continuous time array

✅ PERFORMANCE
   - Math.js compiles expressions once
   - Loop is optimized for speed
   - Can handle 10,000+ samples easily

✅ SECURITY
   - Validates equations before evaluation
   - Blocks injection attempts
   - Only allows mathematical operations
```

## What Your Boss Sees

```
BEFORE: 6 channels from COMTRADE file
        VA, VB, VC (voltages)
        IA, IB, IC (currents)

AFTER: 6 original + N derived channels
       + VA + VB + VC (sum)
       + sqrt(VA^2 + VB^2 + VC^2) / sqrt(3) (RMS)
       + VA / IA (impedance phase A)
       + VA * IA + VB * IB + VC * IC (total power)
       + ... (any other equation!)

✨ All calculated in real-time with math.js
✨ All displayed in the interactive charts
✨ All synchronized with uniform time spacing
✨ All reactive - update when source channels change
```

---

This architecture ensures:

- **Correctness**: Linear interpolation handles all COMTRADE formats
- **Performance**: Math.js is optimized, sample-by-sample is efficient
- **Usability**: User types equations, system handles the rest
- **Reliability**: Reactive system keeps everything in sync
- **Scalability**: Works with 100s or 1000s of samples
