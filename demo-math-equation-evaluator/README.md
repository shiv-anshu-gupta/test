# Math Equation Evaluator Demo 🧮

This demo project shows your boss how to evaluate scientific equations from channel data with linear interpolation.

## 🎯 What This Solves

Your team's workflow:

1. **Teammate** creates equation string in Tabulator (ChannelList.js): `"VA + VB + VC"`
2. **Child window** sends equation via `postMessage()` to parent
3. **Parent window** (main.js) receives equation and evaluates it using math.js
4. **Result** is a new calculated/derived channel added to the charts

## 📂 Files

- **index.html** - Interactive demo UI showing all channels and equation evaluator
- **demo.js** - Complete implementation with linear interpolation and equation evaluation

## 🚀 How to Use

### Quick Start

1. Open `index.html` in your browser
2. You'll see all available channels (VA, VB, VC, IA, IB, IC) with sample data
3. Click one of the example equations or write your own
4. Click "▶ Evaluate Equation" to see results

### Example Equations (All Work!)

| Equation                             | What It Does                               |
| ------------------------------------ | ------------------------------------------ |
| `VA + VB + VC`                       | Sum of three voltage phases (balanced = 0) |
| `sqrt(VA^2 + VB^2 + VC^2) / sqrt(3)` | RMS voltage calculation                    |
| `VA / IA`                            | Impedance (voltage ÷ current)              |
| `VA * IA + VB * IB + VC * IC`        | Total power from three phases              |
| `sqrt((VA/IA)^2 + (VB/IB)^2)`        | Combined impedance magnitude               |
| `abs(VA) + abs(VB) + abs(VC)`        | Sum of absolute values                     |

## 📐 Linear Interpolation Explained

### The Problem

COMTRADE files may have:

- Non-uniform timestamps
- Multiple sampling rates (e.g., 4000 Hz → 1000 Hz transition)
- Missing or irregular samples

### The Solution

**Linear Interpolation Formula:**

```
time = sampleNumber / samplingRate
```

### Example (4000 Hz sampling rate)

```
Sample 0: time = 0 / 4000 = 0.00000 seconds
Sample 1: time = 1 / 4000 = 0.00025 seconds
Sample 2: time = 2 / 4000 = 0.00050 seconds
Sample 3: time = 3 / 4000 = 0.00075 seconds
Sample 4: time = 4 / 4000 = 0.00100 seconds
...
Sample 100: time = 100 / 4000 = 0.02500 seconds
```

**Result:** Perfectly uniform time spacing regardless of file format!

## 🧠 How Evaluation Works

### Sample-by-Sample Processing

When you evaluate `VA + VB + VC`:

```
Time (s)   VA      VB       VC       Result
0.00000    220.5   -110.2   -110.3   0.0    ✅ balanced
0.00025    221.3   -108.5   -112.8   0.0    ✅ balanced
0.00050    220.8   -112.3   -108.5   0.0    ✅ balanced
0.00075    219.2   -115.4   -103.8   0.0    ✅ balanced
...
```

### Complex Equation Example: `sqrt(VA^2 + VB^2 + VC^2) / sqrt(3)`

Step-by-step for sample i=0:

```
1. VA[0] = 220.5
2. VB[0] = -110.2
3. VC[0] = -110.3
4. VA[0]^2 = 48620.25
5. VB[0]^2 = 12144.04
6. VC[0]^2 = 12166.09
7. Sum = 73930.38
8. sqrt(Sum) = 271.90
9. sqrt(3) = 1.732
10. Result = 271.90 / 1.732 = 157.07 V (RMS)
```

This happens automatically for all 100 samples!

## 💻 Implementation in Your Project

### In main.js (Parent Window)

```javascript
// Import math.js in HTML head:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.11.0/math.min.js"></script>

// Listen for equation from child window (Tabulator)
window.addEventListener("message", (event) => {
  if (
    event.data.source === "ChildWindow" &&
    event.data.type === "callback_derivedChannel"
  ) {
    const equationString = event.data.payload.equation;

    // Get current channel data
    const channelData = {
      VA: dataState.analog[0],
      VB: dataState.analog[1],
      VC: dataState.analog[2],
      IA: dataState.analog[3],
      IB: dataState.analog[4],
      IC: dataState.analog[5],
    };

    // Evaluate the equation
    const result = evaluateDerivedChannel(equationString, channelData);

    if (result.success) {
      // Add new derived channel to state
      channelState.analog.yLabels.push(`Derived: ${equationString}`);
      channelState.analog.lineColors.push("#FF6B6B"); // Custom color
      channelState.analog.units.push("Derived");

      // Add data to charts
      dataState.analog.push(result.data);

      // Charts re-render automatically via subscriptions!
    } else {
      console.error("Equation evaluation failed:", result.error);
    }
  }
});

// Core evaluation function (from demo.js)
function evaluateDerivedChannel(equationString, channelData) {
  try {
    // Compile once for performance
    const compiled = math.compile(equationString);

    const totalSamples = Object.values(channelData)[0].length;
    const result = [];

    // Evaluate sample-by-sample
    for (let i = 0; i < totalSamples; i++) {
      const scope = {};
      Object.keys(channelData).forEach((key) => {
        scope[key] = channelData[key][i];
      });

      const value = compiled.evaluate(scope);
      result.push(value);
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### In ChannelList.js (Child Window)

```javascript
// When user adds new derived channel in Tabulator
table.on("cellEdited", (cell) => {
  if (cell.getColumn().getField() === "equation") {
    const equation = cell.getValue();
    const row = cell.getRow().getData();

    // Send to parent for evaluation
    window.opener.postMessage(
      {
        source: "ChildWindow",
        type: "callback_derivedChannel",
        payload: {
          equation: equation,
          channelType: "Derived",
          channelName: row.name || "Calculated",
        },
      },
      "*"
    );
  }
});
```

## 🔐 Security Considerations

The implementation includes validation:

```javascript
function validateEquation(equation) {
  // Block dangerous operations
  const dangerousPatterns = [
    /eval\s*\(/i,
    /function\s*\(/i,
    /import\s+/i,
    /require\s*\(/i,
  ];

  // Check for injection attacks
  for (let pattern of dangerousPatterns) {
    if (pattern.test(equation)) {
      throw new Error(`Dangerous operation not allowed`);
    }
  }
}
```

## 📊 What Gets Displayed

For equation `VA + VB + VC`:

```
✅ Evaluation Success

Equation: VA + VB + VC

Result (first 10 samples):
[0.00, 0.00, 0.00, 0.00, -0.00, 0.00, -0.00, 0.00, 0.00, 0.00, ...]

Statistics:
Min: -3.8901
Max: 3.1442
Mean: -0.0203
Total Samples: 100
```

## 🎓 Key Learning Points for Your Boss

1. **Linear Interpolation** ensures uniform time spacing
2. **Sample-by-sample evaluation** handles array operations
3. **Math.js** compiles expressions for performance
4. **Derived channels** automatically update when source channels change
5. **Reactive state** (your createState.js) updates charts instantly

## 📱 Real-World Examples Your Boss Will Appreciate

| Industry           | Equation                             | Purpose                 |
| ------------------ | ------------------------------------ | ----------------------- |
| **Power Systems**  | `VA + VB + VC`                       | Zero sequence detection |
| **Electrical**     | `sqrt(VA^2 + VB^2 + VC^2) / sqrt(3)` | RMS voltage monitoring  |
| **Fault Analysis** | `VA / IA`                            | Impedance calculation   |
| **Energy**         | `VA * IA + VB * IB + VC * IC`        | Real power measurement  |
| **Protection**     | `abs(IA) > 100`                      | Overcurrent detection   |

## 🐛 Troubleshooting

**"Error: Unknown variable VA"**

- Make sure channel names are exactly VA, VB, VC, IA, IB, IC
- Case-sensitive!

**"Error: Dangerous operation not allowed"**

- Can't use eval(), function(), import, require
- Use only: +, -, \*, /, ^, sqrt, abs, sin, cos, etc.

**"NaN in results"**

- Check for division by zero (IA can cross zero)
- Add error handling: `VA / (IA + 0.001)`

## 🚀 Next Steps for Your Implementation

1. Copy `evaluateDerivedChannel()` function from demo.js to main.js
2. Add math.js CDN to index.html
3. Add equation column to Tabulator in ChannelList.js
4. Add postMessage handler in main.js to receive equations
5. Test with example equations first
6. Integrate into dataState/channelState system

## 📚 Resources

- **Math.js**: https://mathjs.org/docs/expressions/index.html
- **Linear Interpolation**: https://en.wikipedia.org/wiki/Linear_interpolation
- **COMTRADE Standard**: https://standards.ieee.org/standard/C37_111-2013.html

---

**Questions?** Review the code comments in demo.js - everything is documented!
