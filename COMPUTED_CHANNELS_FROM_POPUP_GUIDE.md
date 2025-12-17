# Create Computed Channels from Edit Channel Expression Popup

## Overview

You can now create new computed channels directly from the **Edit Channel Expression** popup window without needing to use the Equation Evaluator. Simply build your LaTeX expression using the MathLive editor and click the **"➕ Create Channel"** button to:

1. ✅ Evaluate the expression across all samples
2. ✅ Calculate statistics (min, max, avg)
3. ✅ Save as a computed channel in cfg/data
4. ✅ Automatically update the table view

## How to Use

### Step 1: Open Channel List Popup

Click the **"View Channels"** button in the main application to open the channel list popup window.

### Step 2: Click on a Channel Name

Click on any channel name in the table. The **Edit Channel Expression** dialog will open.

![Edit Channel Expression Popup](./docs/images/edit-expression-popup.png)

### Step 3: Build Your Expression

You have three ways to create an expression:

#### Option A: Use Predefined Buttons

Click buttons to insert pre-formatted math notation:

**Channels:**

- `IA`, `IB`, `IC` (phase currents)
- `IN` (neutral current)
- `VA`, `VB`, `VC` (phase voltages)
- `Freq` (frequency)

**Operators:**

- `+`, `-`, `×`, `÷` (arithmetic)
- `^` (power)
- `(`, `)` (grouping)
- `==`, `>`, `<` (comparison)

**Functions:**

- `RMS()` - Root Mean Square
- `ABS()` - Absolute value
- `AVG()` - Average
- `Mag(I)` - Magnitude
- `Ang(I)` - Angle
- `d/dt()` - Derivative
- `Trip()`, `Pickup()` - Protection functions

#### Option B: Type Directly

Type LaTeX expressions directly in the math editor:

```latex
I_{A} + I_{B} + I_{C}
\frac{V_A + V_B + V_C}{3}
\sqrt{I_A^2 + I_B^2 + I_C^2}
```

#### Option C: Mix Both

Use buttons to insert complex functions, then type operators to combine them.

### Step 4: Create as Computed Channel

Click the **"➕ Create Channel"** button:

```
[Cancel]  [➕ Create Channel]  [Save]
```

**What happens:**

1. **Validation** - Expression syntax is checked
2. **Conversion** - LaTeX is converted to math.js format (e.g., `I_{A}` → `IA`)
3. **Evaluation** - Expression is evaluated for each sample in the data
4. **Statistics** - Min, max, average values are calculated
5. **Storage** - Channel is saved to `cfg.computedChannels` and `data.computedData`
6. **Display** - A success message shows: `✅ Created channel "computed_0" with 4800 samples`

### Step 5: Optional - Update Channel Name

If you also want to update the cell's display value with the expression, click **"Save"** after creating the channel.

## Examples

### Example 1: Three-Phase Current Magnitude

**Expression:**

```latex
\sqrt{I_A^2 + I_B^2 + I_C^2}
```

**Result:** Computes magnitude of three-phase current vector for each sample

### Example 2: Average Line Voltage

**Expression:**

```latex
\frac{V_A + V_B + V_C}{3}
```

**Result:** Calculates average of three phase voltages

### Example 3: Negative Sequence Current

**Expression:**

```latex
I_A + \omega I_B + \omega^2 I_C
```

**Where ω = e^(j120°)** - Use operator buttons to build this

### Example 4: RMS of Difference

**Expression:**

```latex
\operatorname{RMS}\left( I_A - I_B \right)
```

**Result:** RMS value of the difference between two currents

## Technical Details

### LaTeX to Math.js Conversion

The editor automatically converts LaTeX notation to math.js format:

| LaTeX Notation          | Math.js Format | Example              |
| ----------------------- | -------------- | -------------------- |
| `I_{A}`                 | `IA`           | Subscript removal    |
| `\frac{a}{b}`           | `(a)/(b)`      | Fraction to division |
| `\sqrt{x}`              | `sqrt(x)`      | Square root          |
| `x^{2}`                 | `x^2`          | Exponent             |
| `\operatorname{RMS}(x)` | `rms(x)`       | Function names       |
| `\cdot`                 | `*`            | Multiplication       |

### Available Variables

When evaluating expressions, you can use:

**Analog Channels:**

- `a0`, `a1`, `a2`, ... (by index)
- Channel ID names (e.g., `IA`, `VB` if configured)

**Digital Channels:**

- `d0`, `d1`, `d2`, ... (by index)
- Channel ID names (if configured)

**Example in Config:**

```javascript
cfg.analogChannels = [
  { id: "I_A", unit: "A" }, // Access as IA or a0
  { id: "I_B", unit: "A" }, // Access as IB or a1
  { id: "V_A", unit: "V" }, // Access as VA or a2
];
```

### Channel Data Structure

Created channels are saved with this structure:

```javascript
{
  id: "computed_0",                          // Unique identifier
  equation: "I_{A} + I_{B} + I_{C}",        // Original LaTeX expression
  mathJsExpression: "IA+IB+IC",             // Converted math.js format
  data: [sample1, sample2, ...],            // Computed values for each sample
  stats: {
    count: 4800,                            // Total samples
    validCount: 4800,                       // Non-NaN samples
    min: -1500.2,                           // Minimum value
    max: 2100.5,                            // Maximum value
    avg: 50.3                               // Average value
  },
  scaledStats: {
    min: -7.5,                              // Min / scaling factor
    max: 10.5,                              // Max / scaling factor
    avg: 0.25                               // Avg / scaling factor
  },
  scalingFactor: 200,                       // Auto-detected scaling
  index: 0,                                 // Index in data.computedData
  timestamp: "2025-12-09T15:30:00.000Z"    // Creation time
}
```

## Status Messages

The editor provides real-time feedback:

| Message                              | Meaning                | Action                    |
| ------------------------------------ | ---------------------- | ------------------------- |
| `⏳ Evaluating expression...`        | Processing computation | Wait for completion       |
| `✅ Created channel "computed_0"...` | Success                | Channel is ready to use   |
| `⚠️ Please enter an expression`      | Empty expression       | Type or insert expression |
| `❌ Error: Math.js not available`    | Library issue          | Reload page               |
| `❌ All computed values are NaN`     | Invalid calculation    | Check expression syntax   |

## Error Handling

### Common Errors and Solutions

**Error: "Math.js not available"**

- Solution: Ensure the popup window has loaded the math.js CDN
- The page automatically includes: `https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.11.0/math.min.js`

**Error: "No analog samples available"**

- Solution: Ensure you've loaded a COMTRADE file before creating the popup
- The CFG and data must be properly initialized

**Error: "All computed values are NaN"**

- Solution: Check your expression for:
  - Invalid channel names (use `IA`, not `I_A` in expressions)
  - Wrong operators (use `*` for multiplication, not `×`)
  - Division by zero or invalid math operations

**Warning: "Could not dispatch to parent"**

- Solution: This is non-fatal. The channel is still saved locally in the popup.
- The parent window may not receive the event, but the data persists.

## Advanced Usage

### Chaining Computations

You can reference previously computed channels in new expressions:

```
Step 1: Create computed_0 = I_A + I_B
Step 2: In a new popup, reference computed_0 in your expression
Step 3: Create computed_1 = computed_0 * 2
```

(Requires channel name to be registered in cfg)

### Batch Channel Creation

1. Open popup
2. Click "View Channels"
3. Create multiple channels by:
   - Click on channel name
   - Enter expression
   - Click "Create Channel"
   - Close dialog
   - Repeat for next channel

### Integration with Equation Evaluator

The computed channels created here work identically to those created in the **Equation Evaluator** section:

**Same Features:**

- ✅ Stored in cfg.computedChannels
- ✅ Data in data.computedData
- ✅ Can be exported to COMTRADE
- ✅ Can be rendered in charts
- ✅ Have full statistics

**Different Access:**

- **Equation Evaluator**: Execute expressions, preview results, then save
- **Edit Channel Expression**: Quick creation with instant feedback

## Tips & Tricks

1. **Use descriptive channel names** - After creating a channel, edit the cell and save a meaningful name

   ```latex
   \operatorname{I}_{3\phi}  % Three-phase current
   ```

2. **Combine with color coding** - Use the color column to highlight computed channels

   - Computed channels: Orange or Yellow
   - Physical channels: Blue or Green

3. **Test expressions first** - Use the Equation Evaluator to test complex expressions before creating channels

4. **Check statistics** - Look at min/max/avg to verify the computed values are reasonable

5. **Save for reproducibility** - Record the LaTeX expression in your analysis notes

## Keyboard Shortcuts

| Shortcut      | Action                       |
| ------------- | ---------------------------- |
| `Esc`         | Close dialog without saving  |
| `Enter`       | (in text fields) Submit      |
| `Tab`         | Move between fields          |
| Click buttons | Insert mathematical notation |

## Troubleshooting

### Channel not appearing in table

1. Check browser console for errors (F12)
2. Verify math.js is loaded: `console.log(window.math)`
3. Ensure cfg/data are available: `console.log(window.globalCfg, window.globalData)`
4. Try reloading the popup window

### Expression evaluates but shows wrong values

1. **Check variable names:**

   ```javascript
   // Right: IA, IB, IC
   // Wrong: I_A, I_{A}, I.A
   ```

2. **Verify scaling:**

   - Physical channels have multipliers/offsets
   - Check if values need unit conversion

3. **Test with simpler expression:**
   ```latex
   I_A  % Should match channel value
   ```

### Performance issues with large files

- Large files (100k+ samples) may take longer to evaluate
- This is normal - complex expressions are computed for each sample
- Create indexes or filters if needed

## See Also

- [MathLive Integration Guide](./MATHLIVE_QUICK_START.md)
- [Equation Evaluator Documentation](./EQUATION_EVALUATOR_INTEGRATION_COMPLETE.md)
- [COMTRADE Export Format](./EXPORT_FORMAT_FIXED.md)
