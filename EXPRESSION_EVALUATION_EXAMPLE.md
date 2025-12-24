# Quick Reference: Expression Evaluation Example

## Real-World Example with Actual Numbers

### Step 1: User Input (MathLive Editor)
```
\sqrt{I_{A}^2+I_{B}^2+I_{C}^2}
```

---

### Step 2: LaTeX → Math.js Conversion
```
Original:   \sqrt{I_{A}^2+I_{B}^2+I_{C}^2}
             ↓
Converted:  sqrt(IA^2+IB^2+IC^2)
```

**Transformation steps:**
1. `I_{A}` → `IA` (remove subscript notation)
2. `I_{B}` → `IB` (remove subscript notation)
3. `I_{C}` → `IC` (remove subscript notation)
4. `\sqrt{` → `sqrt(` (LaTeX function to JavaScript)
5. `^2` → `^2` (already compatible)
6. `}` removed (closing brace no longer needed)

---

### Step 3: Raw Data from COMTRADE File

```
Data Structure:
data.analogData[
  [1.5, 2.1, 1.8, 1.9, 2.3, ...],  // Channel 0: IA
  [1.4, 2.0, 1.9, 1.7, 2.1, ...],  // Channel 1: IB
  [1.6, 2.2, 1.7, 1.8, 2.4, ...]   // Channel 2: IC
]

Sample Count: 1920 samples
```

---

### Step 4: Channel Name Mapping

```
From Config (cfg.analog):
├── analog[0]: {ph: "IA", ...}  → data.analogData[0]
├── analog[1]: {ph: "IB", ...}  → data.analogData[1]
└── analog[2]: {ph: "IC", ...}  → data.analogData[2]

Scope for Sample 0:
{
  IA: 1.5,  // data.analogData[0][0]
  IB: 1.4,  // data.analogData[1][0]
  IC: 1.6   // data.analogData[2][0]
}

Scope for Sample 1:
{
  IA: 2.1,  // data.analogData[0][1]
  IB: 2.0,  // data.analogData[1][1]
  IC: 2.2   // data.analogData[2][1]
}

... (repeat for all 1920 samples)
```

---

### Step 5: Expression Evaluation

```
Expression: sqrt(IA^2+IB^2+IC^2)
Compiled:   AST (Abstract Syntax Tree)

Sample 0:
  Scope:       {IA: 1.5, IB: 1.4, IC: 1.6}
  Evaluate:    sqrt(1.5² + 1.4² + 1.6²)
               √(2.25 + 1.96 + 2.56)
               √6.77
  Result:      2.60

Sample 1:
  Scope:       {IA: 2.1, IB: 2.0, IC: 2.2}
  Evaluate:    sqrt(2.1² + 2.0² + 2.2²)
               √(4.41 + 4.00 + 4.84)
               √13.25
  Result:      3.64

Sample 2:
  Scope:       {IA: 1.8, IB: 1.9, IC: 1.7}
  Evaluate:    sqrt(1.8² + 1.9² + 1.7²)
               √(3.24 + 3.61 + 2.89)
               √9.74
  Result:      3.12

... (repeat for all 1920 samples)

Final Results Array:
[2.60, 3.64, 3.12, ..., 2.45]  // 1920 values
```

---

### Step 6: Console Logging Output

When you look at Browser DevTools Console, you'll see:

```
[main.js] 📝 Expression conversion: {
  original: "\sqrt{I_{A}^2+I_{B}^2+I_{C}^2}",
  converted: "sqrt(IA^2+IB^2+IC^2)",
  steps: [
    "I_{A} → IA (subscript removal)",
    "\sqrt{ → sqrt( (function conversion)",
    "^{2} → ^2 (power notation)"
  ]
}

[main.js] 📊 Data structure check: {
  hasData: true,
  hasAnalogData: true,
  analogChannelCount: 3,
  digitalChannelCount: 2,
  firstAnalogSampleCount: 1920
}

[main.js] ✅ Found 3 analog channels with 1920 samples

[main.js] 🔢 Channel value mapping (first sample): {
  mapping: {
    IA: 1.5,
    IB: 1.4,
    IC: 1.6,
    VA: 230.5,
    VB: 230.2,
    VC: 230.1
  },
  note: "Expression \"sqrt(IA^2+IB^2+IC^2)\" will use these channel names",
  usedChannels: ["IA", "IB", "IC"]
}

[main.js] ✅ Expression evaluation complete: {
  expression: "sqrt(IA^2+IB^2+IC^2)",
  samplesEvaluated: 1920,
  firstThreeSamples: [2.60, 3.64, 3.12],
  statistics: {
    min: 1.85,
    max: 4.92,
    mean: "3.28",
    nonZeroCount: 1920
  }
}
```

---

## How Channel Values Flow to Results

### Visual Flow for First 3 Samples:

```
Input Data:
┌─────────────────────────────────────────────────────────────┐
│         Sample 0    Sample 1    Sample 2   ...              │
├─────────────────────────────────────────────────────────────┤
│ IA        1.5        2.1         1.8       ...              │
│ IB        1.4        2.0         1.9       ...              │
│ IC        1.6        2.2         1.7       ...              │
└─────────────────────────────────────────────────────────────┘

Expression: sqrt(IA^2 + IB^2 + IC^2)

Evaluation:
Sample 0:  √((1.5)² + (1.4)² + (1.6)²) = √6.77 = 2.60
Sample 1:  √((2.1)² + (2.0)² + (2.2)²) = √13.25 = 3.64
Sample 2:  √((1.8)² + (1.9)² + (1.7)²) = √9.74 = 3.12

Output Results Array:
[2.60, 3.64, 3.12, ...]
 ↑     ↑     ↑
 │     │     └─ From sample 2: √(1.8² + 1.9² + 1.7²)
 │     └─ From sample 1: √(2.1² + 2.0² + 2.2²)
 └─ From sample 0: √(1.5² + 1.4² + 1.6²)
```

---

## Where Each Value Comes From

### Channel Name Resolution:

```
Expression text: "sqrt(IA^2+IB^2+IC^2)"
                      │    │    │
                      ↓    ↓    ↓
Config file specifies:
├── Analog Channel 0: name="IA"  → Get values from analogData[0]
├── Analog Channel 1: name="IB"  → Get values from analogData[1]
└── Analog Channel 2: name="IC"  → Get values from analogData[2]

For sample index i:
├── IA value for sample i = analogData[0][i]
├── IB value for sample i = analogData[1][i]
└── IC value for sample i = analogData[2][i]

Substitute into expression and evaluate.
```

---

## Summary

**The pipeline does 3 key transformations:**

1. **LaTeX → Math.js** (Format conversion)
   - Input: `\sqrt{I_{A}^2+I_{B}^2+I_{C}^2}`
   - Output: `sqrt(IA^2+IB^2+IC^2)`

2. **Lookup channel values** (Data retrieval)
   - IA → analogData[0]
   - IB → analogData[1]
   - IC → analogData[2]

3. **Evaluate for all samples** (Computation)
   - For each of 1920 samples
   - Substitute current sample values
   - Calculate result
   - Store in results array

**Result: 1920 computed values that can be plotted on charts**
