# Integration Guide: Adding to Your COMTRADE Project

## Quick Summary for Your Boss

**Problem:** User wants to create calculated channels by writing equations (e.g., `VA + VB + VC`)

**Solution:**

1. Linear interpolation ensures uniform time spacing
2. Math.js evaluates equations sample-by-sample
3. Derived channels add to the charts automatically

**Timeline:** ~2-3 hours to integrate fully

---

## Step-by-Step Integration

### STEP 1: Add Math.js to Your HTML

**File:** `index.html`

```html
<!-- Add in <head> section -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.11.0/math.min.js"></script>
```

### STEP 2: Copy Core Functions to main.js

**File:** `src/main.js`

```javascript
// Add this function somewhere at the top after imports

/**
 * Validate equation to prevent injection
 */
function validateEquation(equation) {
  const dangerousPatterns = [
    /eval\s*\(/i,
    /function\s*\(/i,
    /import\s+/i,
    /require\s*\(/i,
  ];

  for (let pattern of dangerousPatterns) {
    if (pattern.test(equation)) {
      throw new Error(`Dangerous operation not allowed`);
    }
  }
}

/**
 * Evaluate a derived channel equation
 * @param {string} equationString - Formula like "VA + VB + VC"
 * @param {object} channelData - Channel data arrays {VA, VB, VC, IA, IB, IC}
 * @returns {object} {success: bool, data: array, error: string}
 */
function evaluateDerivedChannel(equationString, channelData) {
  try {
    validateEquation(equationString);

    // Compile expression for performance
    const compiled = math.compile(equationString);

    // Get number of samples from any channel
    const totalSamples = Object.values(channelData)[0].length;
    const result = [];

    // Evaluate sample-by-sample
    for (let i = 0; i < totalSamples; i++) {
      // Create scope with values at this sample index
      const scope = {};
      Object.keys(channelData).forEach((key) => {
        scope[key] = channelData[key][i];
      });

      // Evaluate compiled expression
      const value = compiled.evaluate(scope);
      result.push(value);
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Equation evaluation error:", error);
    return { success: false, error: error.message };
  }
}
```

### STEP 3: Add Message Handler in main.js

**File:** `src/main.js` - Add inside the main event listener for child window messages

```javascript
// Find the existing window.addEventListener('message') handler
// Add this case to the message routing:

window.addEventListener("message", (event) => {
  if (event.data.source !== "ChildWindow") return;

  const { type, payload } = event.data;
  const { channelID, newValue } = payload;

  // ... existing cases for COLOR, SCALE, etc ...

  // ADD THIS NEW CASE:
  if (type === "callback_derivedChannel") {
    const equation = payload.equation;
    const channelName = payload.channelName || "Derived Channel";

    try {
      // Get current channel data
      const channelData = {
        VA: dataState.analog[findChannelIndex("VA")] || null,
        VB: dataState.analog[findChannelIndex("VB")] || null,
        VC: dataState.analog[findChannelIndex("VC")] || null,
        IA: dataState.analog[findChannelIndex("IA")] || null,
        IB: dataState.analog[findChannelIndex("IB")] || null,
        IC: dataState.analog[findChannelIndex("IC")] || null,
      };

      // Filter out null channels
      Object.keys(channelData).forEach((k) => {
        if (!channelData[k]) delete channelData[k];
      });

      // Evaluate
      const result = evaluateDerivedChannel(equation, channelData);

      if (result.success) {
        // Add new derived channel to state
        channelState.analog.yLabels.push(`${channelName}: ${equation}`);
        channelState.analog.lineColors.push("#FF6B6B");
        channelState.analog.units.push("Derived");
        channelState.analog.scales.push(1);
        channelState.analog.groups.push("Derived");
        channelState.analog.inverts.push(false);
        channelState.analog.starts.push(0);
        channelState.analog.durations.push(null);

        // Add data to dataState
        // NOTE: Insert after time array at index 0
        dataState.analog.push(result.data);

        // Reactive system will automatically:
        // 1. Trigger subscribeChartUpdates
        // 2. Recreate charts with new series
        // 3. Display new channel

        console.log("✅ Derived channel added:", channelName);
      } else {
        console.error("❌ Equation evaluation failed:", result.error);
        // Optionally send error back to child
        event.source.postMessage(
          {
            source: "ParentWindow",
            type: "error_derivedChannel",
            payload: { error: result.error },
          },
          "*"
        );
      }
    } catch (error) {
      console.error("Error processing derived channel:", error);
    }
  }
});

// Helper function to find channel index by name
function findChannelIndex(channelName) {
  return channelState.analog.yLabels.indexOf(channelName);
}
```

### STEP 4: Add Equation Column to Tabulator (ChannelList.js)

**File:** `src/components/showChannelListWindow.js`

```javascript
// In the columns definition, add:

{
    title: 'Formula',
    field: 'formula',
    editor: 'input',
    width: 200,
    placeholder: 'VA + VB + VC',
    headerTooltip: 'Optional: Enter math equation to create derived channel'
},

// Also update the editable cell handler to catch formula changes:

table.on('cellEdited', (cell) => {
    const field = cell.getColumn().getField();
    const row = cell.getRow().getData();
    const newValue = cell.getValue();

    // ... existing code for COLOR, SCALE, etc ...

    // Add this case:
    if (field === 'formula' && newValue) {
        window.opener.postMessage({
            source: 'ChildWindow',
            type: 'callback_derivedChannel',
            payload: {
                equation: newValue,
                channelName: row.name || 'Calculated',
                channelType: row.type || 'Analog'
            }
        }, '*');
    }
});
```

### STEP 5: Add Linear Interpolation Support (Already in Your Code!)

**File:** `src/utils/timeInterpolation.js` - This is already there!

Your functions:

- `calculateTimeFromSampleNumber(sampleNumber, samplingRate)` ✅
- `generateUniformTimeArray(totalSamples, samplingRates)` ✅
- `findSamplingRateForSample(sampleNumber, samplingRates)` ✅

These ensure all channels have uniform time spacing, which is critical for:

- Accurate sample-by-sample evaluation
- Multi-rate COMTRADE file support
- Reliable mathematical operations

---

## Testing Your Integration

### Quick Test Sequence

1. **Load a COMTRADE file** (your existing flow)
2. **Open Edit Channels** (Tabulator popup)
3. **Click Add Row** to create new row
4. **In Formula column, type:** `VA + VB + VC`
5. **Press Enter**
6. **Check charts** - new channel should appear!

### Test Equations (Easy to Hard)

```javascript
// Test 1: Basic Addition (should get ~0 for balanced three-phase)
"VA + VB + VC";

// Test 2: Math Functions
"sqrt(VA^2 + VB^2)";

// Test 3: Division (might have div by zero, but math.js handles)
"VA / IA";

// Test 4: Complex
"sqrt(VA^2 + VB^2 + VC^2) / sqrt(3)";
```

### Expected Results

For test 1 with balanced three-phase:

```
Result should be close to zero for all samples
✅ Correct! Three phases sum to ~0
```

For test 4 (RMS voltage):

```
Result should be ~230V RMS (or whatever your peak is / sqrt(2))
✅ Correct! RMS = Peak / sqrt(2)
```

---

## Troubleshooting

### Problem: "Error: Unknown variable VA"

**Cause:** Channel not found in dataState

**Solution:**

```javascript
// Check channel naming
console.log("Available channels:", channelState.analog.yLabels);

// Ensure VA, VB, VC, IA, IB, IC exist
// Adjust the helper function to match your channel names
```

### Problem: "NaN" values in result

**Cause:** Usually division by zero (IA crosses zero in AC current)

**Solution:**

```javascript
// Modify equation to avoid division by zero:
// Instead of: "VA / IA"
// Use: "VA / (IA + 0.001)"  // Add small offset

// Or use conditionals if math.js supports them:
// "VA / max(abs(IA), 0.001)"
```

### Problem: Performance is slow

**Cause:** Too many samples and complex equation

**Solution:**

```javascript
// Math.js is already optimized (compiled expression)
// If still slow, consider:
// 1. Reduce sample count for demo
// 2. Cache compilation results
// 3. Use simpler equations
```

### Problem: Charts don't update with new channel

**Cause:** Subscriptions not triggered

**Solution:**

```javascript
// Make sure you're modifying state through the proxy:

// ✅ CORRECT:
channelState.analog.yLabels.push(name);
dataState.analog.push(result.data);

// ❌ WRONG:
channelState.analog.yLabels[index] = name; // Doesn't trigger proxy
```

---

## Architecture Integration

```
Your Existing Flow:
File → Parse → Interpolate → State → Charts

NEW Addition:
                        ┌─────────────────┐
                        │ User in Tabulator │
                        │ writes: equation  │
                        └────────┬──────────┘
                                 │
                        ┌────────▼─────────┐
                        │ postMessage to   │
                        │ parent (main.js) │
                        └────────┬─────────┘
                                 │
                        ┌────────▼──────────┐
                        │ evaluateDerived   │
                        │ Channel()         │
                        │ + math.js         │
                        └────────┬──────────┘
                                 │
                        ┌────────▼─────────┐
                        │ Add to state:    │
                        │ - yLabels        │
                        │ - dataState      │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │ subscribeChart   │
                        │ Updates triggers │
                        │ Chart recreates  │
                        └────────┬─────────┘
                                 │
                        ┌────────▼──────────┐
                        │ ✨ New channel   │
                        │ visible in charts │
                        └──────────────────┘
```

---

## Files to Modify/Create

| File                       | Action                          | Difficulty  |
| -------------------------- | ------------------------------- | ----------- |
| `index.html`               | Add math.js CDN                 | ⭐ Easy     |
| `main.js`                  | Add functions + message handler | ⭐⭐ Medium |
| `showChannelListWindow.js` | Add formula column              | ⭐⭐ Medium |
| (No new files needed!)     | -                               | -           |

**Total integration time:** 2-3 hours

---

## Demo Project Files

Your boss can review these to understand the concept:

- `demo-math-equation-evaluator/index.html` - Interactive demo
- `demo-math-equation-evaluator/demo.js` - Implementation reference
- `demo-math-equation-evaluator/README.md` - Usage guide
- `demo-math-equation-evaluator/ARCHITECTURE.md` - Technical details

---

## Next Phase (Future Enhancement)

Once working, consider:

1. **Equation templates** - common formulas as presets
2. **Equation validation UI** - preview before applying
3. **Units handling** - auto-calculate result units
4. **FFT support** - advanced harmonic analysis
5. **History** - save derived channel definitions

---

**Ready to implement? Start with STEP 1!**

Questions? Review the demo project for working examples.
