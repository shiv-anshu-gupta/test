# ⚡ Quick Start: Create Computed Channels from Popup

## 30-Second Summary

1. **Load** a COMTRADE file in the main application
2. **Click** "View Channels" button
3. **Click** any channel name in the table
4. **Build** your expression using buttons or typing LaTeX
5. **Click** "➕ Create Channel" button
6. **Done!** Your computed channel is created and saved

---

## Step-by-Step Example

### Goal: Create a Three-Phase Current Magnitude Channel

The magnitude of three-phase current is: $\sqrt{I_A^2 + I_B^2 + I_C^2}$

### Steps:

**1. Open Channel List**

```
Main App → View Channels button
└─ Popup window opens with channel table
```

**2. Click a Channel Name**

```
Click on any cell in "Channel Name (Unit)" column
└─ Edit Channel Expression modal opens
```

**3. Build the Expression**

Three ways to create it:

**Option A: Use Buttons (Easiest)**

- Click button labeled `Mag(I)`
- It inserts: `\left\lvert I \right\rvert`
- Result: `\sqrt{I_A^2 + I_B^2 + I_C^2}` is ready

**Option B: Type Manually**

- Click in the math editor
- Type: `\sqrt{I_A^2+I_B^2+I_C^2}`
- Math renders live as you type

**Option C: Mix Buttons & Typing**

- Click `IA` button → inserts `I_{A}`
- Type `^{2} + `
- Click `IB` button → inserts `I_{B}`
- Type `^{2} + `
- Continue building...

**4. Create the Channel**

```
Click: [➕ Create Channel] button
```

You'll see:

```
⏳ Evaluating expression...
↓
✅ Created channel "computed_0" with 4800 samples
```

**5. Verify**

```
Close dialog → Check channel list table
The new channel appears in the table with:
- ID: auto-assigned
- Name: I_A^2 + I_B^2 + I_C^2 (the LaTeX)
- Unit: Computed
```

---

## Common Expressions (Copy-Paste Ready)

### Symmetrical Components

```
Zero Sequence:  (I_A + I_B + I_C) / 3
Positive:       (I_A + \omega I_B + \omega^2 I_C) / 3
Negative:       (I_A + \omega^2 I_B + \omega I_C) / 3
```

### Voltage Analysis

```
Average Phase Voltage:      (V_A + V_B + V_C) / 3
Voltage Imbalance:          \sqrt{\frac{V_{-}^2}{V_{+}^2}}
Phase-to-Neutral Voltage:   (V_A + V_B + V_C) / \sqrt{3}
```

### Current Analysis

```
Total Three-Phase Current:  \sqrt{I_A^2 + I_B^2 + I_C^2}
Current Imbalance:          \sqrt{\frac{I_{-}^2}{I_{+}^2}}
Neutral Current (3-phase):  \sqrt{I_A^2 + I_B^2 + I_C^2}
```

### Power Calculations

```
Total Power:                V_A \cdot I_A + V_B \cdot I_B + V_C \cdot I_C
Average Power:              \frac{(V_A \cdot I_A + V_B \cdot I_B + V_C \cdot I_C)}{3}
Power Factor:               \cos(\angle(V_A, I_A))
```

### Fault Detection

```
Phase-A Fault Indicator:    \left\lvert I_A \right\rvert > 1.5 \cdot \operatorname{AVG}(I_A)
Over-Current Flag:          \operatorname{RMS}(I_A + I_B + I_C) > 100
Trip Threshold:             \operatorname{TRIP}(\sqrt{I_A^2 + I_B^2 + I_C^2})
```

---

## Predefined Buttons Guide

### 📊 Channels Section

```
[IA]  [IB]  [IC]  [IN]  [VA]  [VB]  [VC]  [Freq]
```

Insert channel names as subscripts

### 🔧 Operators Section

```
[+]  [-]  [×]  [÷]  [^]  [(]  [)]  [==]  [>]  [<]  [RMS()]  [ABS()]  [AVG()]
```

Basic math operations

### ⚙️ Functions Section

```
[Mag(I)]  [Ang(I)]  [d/dt]  [Trip()]  [Pickup()]
```

Advanced functions

---

## Status Messages & What They Mean

| Message                              | Meaning                   | Action                                |
| ------------------------------------ | ------------------------- | ------------------------------------- |
| `⏳ Evaluating expression...`        | Computing for all samples | Wait, it's working                    |
| `✅ Created channel "computed_0"...` | Success!                  | Channel is ready                      |
| `⚠️ Please enter an expression`      | Empty input               | Type or insert expression             |
| `❌ Error: Math.js not available`    | Library issue             | Reload the page                       |
| `❌ All computed values are NaN`     | Invalid math              | Check variable names (use IA not I_A) |
| `❌ No analog samples available`     | No data loaded            | Load a COMTRADE file first            |

---

## Troubleshooting

### "Expression doesn't work"

**Check:**

- Variable names: Use `IA` (not `I_A`) in math expressions
- Operators: Use `*` (not `×`) for multiplication in formulas
- Syntax: Parentheses balanced, no extra spaces

### "All values are NaN"

**Likely causes:**

- Wrong channel name (check cfg.analogChannels for valid IDs)
- Invalid math operation (like division by zero)
- Operator precedence (use parentheses for complex expressions)

**Fix:**

1. Test with simple expression: `I_A`
2. If that works, try: `I_A + I_B`
3. Build up gradually to complex expression

### "Channel didn't save"

**Check:**

1. Did you see the `✅ Created channel...` message?
2. Refresh the popup window (F5)
3. Check browser console for errors (F12)

### Expression is too complex

**Simplify:**

- Break into multiple channels
- Use `computed_0` in next expression: `computed_0 * 2`
- Reference intermediate results

---

## Tips for Success

✅ **DO:**

- Use clear, readable expressions
- Test simpler versions first
- Save meaningful channel names after creation
- Use color coding to highlight computed channels
- Document what each channel calculates

❌ **DON'T:**

- Create expressions with undefined variables
- Use channel IDs with underscores in math (convert to `IA` format)
- Forget to click "Create Channel" (Save button only updates cell name)
- Mix LaTeX and plain text in same expression

---

## Keyboard Shortcuts

| Key                      | Action              |
| ------------------------ | ------------------- |
| `Esc`                    | Close dialog        |
| `Click buttons`          | Insert notation     |
| `Type directly`          | Enter math directly |
| `Click [Create Channel]` | Evaluate and save   |
| `Click [Save]`           | Update cell name    |

---

## What Happens After Creation?

✅ Channel saved to `cfg.computedChannels`
✅ Data saved to `data.computedData`
✅ Appears in channel table with name `computed_0`
✅ Can be exported to COMTRADE files
✅ Can be rendered on charts
✅ Shares same format as Equation Evaluator channels

---

## Next Steps

After creating a computed channel:

1. **Edit Name** - Click channel name again, change to meaningful name, click Save

   ```
   I_A^2 + I_B^2 + I_C^2  ➜  I-magnitude
   ```

2. **Color It** - Click color swatch to highlight the channel

   ```
   Orange = Computed channels
   Blue = Physical channels
   ```

3. **Export** - Save project including computed channels

   ```
   File → Export → Includes computed channels in output
   ```

4. **Analyze** - View on charts or use for further analysis

---

## One More Thing...

You can create **as many channels as you want**!

**Workflow:**

```
Create Channel 1 (dialog closes)
  ↓
Click another channel name
  ↓
Create Channel 2
  ↓
Repeat...
```

Each gets auto-named: `computed_0`, `computed_1`, `computed_2`, etc.

---

**Ready to create your first computed channel? Open the popup and try it now!** 🚀
