# LaTeX to Math.js Expression Conversion Pipeline

## Overview

When a user enters a LaTeX expression in the MathLive editor, it goes through several stages of transformation and evaluation to produce computed channel data.

---

## Stage 1: LaTeX Input from MathLive Editor

**Example Input:**

```
\sqrt{I_{A}^2+I_{B}^2+I_{C}^2}
```

This is what the user sees in the MathLive editor (beautiful mathematical notation).

---

## Stage 2: LaTeX → Math.js Conversion

### The Conversion Function: `convertLatexToMathJs()`

**Location:** `src/main.js`, lines 70-145

This function transforms LaTeX patterns into math.js compatible syntax using regex patterns:

#### Transformation Rules:

| LaTeX Pattern  | Target        | Regex                              | Replacement   | Example         |
| -------------- | ------------- | ---------------------------------- | ------------- | --------------- |
| Subscripts     | `I_{A}`       | `([A-Za-z])_\{([A-Za-z0-9]+)\}`    | `$1$2`        | `IA`            |
| Square root    | `\sqrt{x}`    | `\\sqrt\{([^}]+)\}`                | `sqrt($1)`    | `sqrt(...)`     |
| Fractions      | `\frac{a}{b}` | `\\frac\{([^}]+)\}\{([^}]+)\}`     | `($1)/($2)`   | `(a)/(b)`       |
| Powers         | `^{n}`        | `\^\{([^}]+)\}`                    | `^($1)`       | `^(2)`          |
| Roots          | `\sqrt[3]{x}` | `\\sqrt\[([0-9]+)\]`               | `nthroot($1,` | `nthroot(3, x)` |
| Absolute value | `\|x\|`       | `\\left\\lvert(.+?)\\right\\rvert` | `abs($1)`     | `abs(x)`        |
| Multiplication | `\cdot`       | `\\cdot`                           | `*`           | `*`             |
| Division       | `\div`        | `\\div`                            | `/`           | `/`             |
| Greek letters  | `\alpha`      | `\\alpha`                          | `alpha`       | `alpha`         |

### Conversion Example:

```
Input:    \sqrt{I_{A}^2+I_{B}^2+I_{C}^2}
           ↓
Step 1:    Remove subscript braces: I_{A} → IA
           \sqrt{IA^2+IB^2+IC^2}
           ↓
Step 2:    Convert function: \sqrt{ → sqrt(
           sqrt(IA^2+IB^2+IC^2)
           ↓
Step 3:    Remove remaining LaTeX artifacts (^{ → ^)
           sqrt(IA^2+IB^2+IC^2)
           ↓
Output:    sqrt(IA^2+IB^2+IC^2)  ✅ Valid math.js format
```

---

## Stage 3: Expression Compilation

**Location:** `src/main.js`, line 3310

```javascript
const compiled = window.math?.compile?.(mathJsExpr);
```

The math.js library compiles the expression into an Abstract Syntax Tree (AST) for efficient evaluation. This validates that the expression syntax is correct.

**Example:**

```
Input:  sqrt(IA^2+IB^2+IC^2)
        ↓
Output: Compiled AST ready for evaluation
```

---

## Stage 4: Channel Name Mapping

**Location:** `src/main.js`, lines 3317-3345

The system maps human-readable channel names (from the COMTRADE file) to the variables in the expression.

### Channel Name Sources (in priority order):

1. **Config file name** (e.g., `cfg.analog[idx].ph`) → "IA", "IB", "IC"
2. **Config file ID** (e.g., `cfg.analogChannels[idx].id`)
3. **Index notation** → "a0", "a1", "d0", "d1"

### Example Mapping (First Sample):

```
Channel Configuration:
├── Analog Channel 0: name="IA", data=[1.5, 2.1, 1.8, ...]
├── Analog Channel 1: name="IB", data=[1.4, 2.0, 1.9, ...]
└── Analog Channel 2: name="IC", data=[1.6, 2.2, 1.7, ...]

First Sample (index 0):
├── IA = 1.5
├── IB = 1.4
└── IC = 1.6

Expression: sqrt(IA^2+IB^2+IC^2)
Uses:       sqrt(1.5^2+1.4^2+1.6^2)
```

---

## Stage 5: Scope Building & Evaluation Loop

**Location:** `src/main.js`, lines 3346-3370

For each sample index (0, 1, 2, ... up to sample count):

### Pseudo-code:

```javascript
for (let i = 0; i < sampleCount; i++) {
  const scope = {
    IA: analogData[0][i], // 1.5, 2.1, 1.8, ...
    IB: analogData[1][i], // 1.4, 2.0, 1.9, ...
    IC: analogData[2][i], // 1.6, 2.2, 1.7, ...
    // ... other channels ...
  };

  const result = compiled.evaluate(scope);
  results[i] = result;
}
```

### Sample-by-Sample Evaluation:

```
Sample 0:  scope={IA:1.5, IB:1.4, IC:1.6}  → sqrt(1.5²+1.4²+1.6²) = 2.83
Sample 1:  scope={IA:2.1, IB:2.0, IC:2.2}  → sqrt(2.1²+2.0²+2.2²) = 3.90
Sample 2:  scope={IA:1.8, IB:1.9, IC:1.7}  → sqrt(1.8²+1.9²+1.7²) = 3.14
...
Sample N:  scope={IA:x, IB:y, IC:z}        → sqrt(x²+y²+z²) = result
```

### Result Array:

```javascript
results = [2.83, 3.90, 3.14, ..., result_N]
// Length: same as sample count (typically 1000+ samples)
```

---

## Stage 6: Console Logging & Debugging

The system logs at multiple checkpoints to show the entire pipeline:

### 1. Expression Conversion Log

```javascript
console.log("[main.js] 📝 Expression conversion:", {
  original: "sqrt{I_{A}^2+I_{B}^2+I_{C}^2}",
  converted: "sqrt(IA^2+IB^2+IC^2)",
  steps: [
    "I_{A} → IA (subscript removal)",
    "\\sqrt{ → sqrt( (function conversion)",
    "^{2} → ^2 (power notation)",
  ],
});
```

### 2. Data Structure Validation Log

```javascript
console.log("[main.js] 📊 Data structure check:", {
  hasData: true,
  hasAnalogData: true,
  analogChannelCount: 3,
  digitalChannelCount: 2,
  firstAnalogSampleCount: 1920,
});
```

### 3. Channel Mapping Log

```javascript
console.log("[main.js] 🔢 Channel value mapping (first sample):", {
  mapping: {
    IA: 1.5,
    IB: 1.4,
    IC: 1.6,
    VA: 230.5,
    VB: 230.2,
  },
  note: 'Expression "sqrt(IA^2+IB^2+IC^2)" will use these channel names',
  usedChannels: ["IA", "IB", "IC"],
});
```

### 4. Evaluation Results Log

```javascript
console.log("[main.js] ✅ Expression evaluation complete:", {
  expression: "sqrt(IA^2+IB^2+IC^2)",
  samplesEvaluated: 1920,
  firstThreeSamples: [2.83, 3.9, 3.14],
  statistics: {
    min: 1.45,
    max: 4.82,
    mean: 3.12,
    nonZeroCount: 1920,
  },
});
```

---

## Stage 7: State Storage & Notification

**Location:** `src/main.js`, lines 3382-3410

### 7a. Store in Reactive State

```javascript
computedChannelsState.addChannel(expression, results, "user");
```

This stores the computed channel in a reactive state that automatically notifies subscribers.

### 7b. Notify Child Window

```javascript
childWindow.postMessage(
  {
    type: "computedChannelEvaluated",
    payload: {
      success: true,
      expression: "sqrt{I_{A}^2+I_{B}^2+I_{C}^2}",
      unit: "Amps",
      resultCount: 1920,
    },
  },
  "*"
);
```

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────┐
│  Child Window (ChannelList.js)      │
│  MathLive Editor                    │
│  \sqrt{I_{A}^2+I_{B}^2+I_{C}^2}    │
└──────────────┬──────────────────────┘
               │
               │ postMessage { type: 'evaluateComputedChannel', ... }
               ↓
┌─────────────────────────────────────┐
│  Parent Window (main.js)             │
│                                      │
│  1. convertLatexToMathJs()           │
│     → sqrt(IA^2+IB^2+IC^2)          │
│                                      │
│  2. math.compile()                  │
│     → AST                           │
│                                      │
│  3. For each sample (i=0 to 1920):  │
│     scope = {IA: val, IB: val, ...} │
│     evaluate(scope)                 │
│     results[i] = numeric result     │
│                                      │
│  4. computedChannelsState.addChannel│
│     → stored in reactive state      │
│                                      │
│  5. postMessage({ success: true })  │
└──────────────┬──────────────────────┘
               │
               │ postMessage { type: 'computedChannelEvaluated', ... }
               ↓
┌─────────────────────────────────────┐
│  Child Window receives notification │
│  Adds new row to Tabulator          │
│  Updates charts in parent           │
└─────────────────────────────────────┘
```

---

## Key Technical Points

### 1. Why Convert LaTeX?

- MathLive stores expressions in LaTeX format (mathematical notation)
- Math.js evaluates simple JavaScript-like expressions
- Conversion bridges these two formats

### 2. Why Scope-Based Evaluation?

- Different samples have different channel values
- Scope provides variable bindings for each sample
- Efficient: compile once, evaluate many times with different scopes

### 3. Why Check Channel Names Multiple Ways?

- `cfg.analog[idx].ph` is the actual channel name (e.g., "IA")
- `cfg.analogChannels[idx].id` might be alternative naming
- `a0`, `a1` fallback ensures compatibility if names aren't defined

### 4. Error Handling

- If expression compilation fails, error is caught and reported to child
- If evaluation fails for a sample, that sample gets value 0
- All errors logged with context for debugging

---

## Testing the Pipeline

### To Monitor the Conversion in Browser DevTools:

1. Open child window (Channel List)
2. Click "Add Blank Row"
3. Enter expression: `\sqrt{IA^2+IB^2+IC^2}`
4. Click Save
5. Open Browser DevTools → Console
6. Look for logs starting with `[main.js]` showing:
   - `📝 Expression conversion:` (shows LaTeX→math.js)
   - `📊 Data structure check:` (shows data availability)
   - `🔢 Channel value mapping:` (shows IA, IB, IC values)
   - `✅ Expression evaluation complete:` (shows results stats)

### Expected Log Output:

```
[main.js] 📝 Expression conversion: {
  original: "\sqrt{I_{A}^2+I_{B}^2+I_{C}^2}",
  converted: "sqrt(IA^2+IB^2+IC^2)",
  steps: Array(3)
}

[main.js] 🔢 Channel value mapping (first sample): {
  mapping: {IA: 1.5, IB: 1.4, IC: 1.6, …},
  note: "Expression "sqrt(IA^2+IB^2+IC^2)" will use these channel names",
  usedChannels: ["IA", "IB", "IC"]
}

[main.js] ✅ Expression evaluation complete: {
  expression: "sqrt(IA^2+IB^2+IC^2)",
  samplesEvaluated: 1920,
  firstThreeSamples: [2.83, 3.90, 3.14],
  statistics: {min: 1.45, max: 4.82, mean: "3.12", nonZeroCount: 1920}
}
```

---

## Architecture Benefits

1. **Separation of Concerns**: Child handles UI, parent handles computation
2. **Data Safety**: Raw data stays in parent, never exposed to child
3. **Efficiency**: Compiled expression evaluated 1000+ times without recompiling
4. **Debugging**: Comprehensive logging shows every step
5. **Reliability**: Multiple error checks prevent silent failures
6. **Flexibility**: Supports various channel naming schemes
7. **Reactivity**: State changes automatically notify subscribers

---

## Files Involved

- **[src/main.js](src/main.js)**: Main conversion & evaluation logic

  - `convertLatexToMathJs()` (lines 70-145)
  - Message handler for 'evaluateComputedChannel' (lines 3200-3410)
  - Computed channels state listener (lines 1793-1806)

- **[src/components/ChannelList.js](src/components/ChannelList.js)**: Child window

  - Sends LaTeX expression via postMessage

- **[src/utils/computedChannelsState.js](src/utils/computedChannelsState.js)**: Reactive state

  - Stores computed channel results
  - Notifies subscribers of changes

- **[src/components/showChannelListWindow.js](src/components/showChannelListWindow.js)**: Child window init
  - Sets up child window with data references
