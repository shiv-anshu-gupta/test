# Edit Channel Expression Modal - Button Guide

## 🎯 Modal Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Edit Channel Expression                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ CHANNELS SECTION:                                               │
│ [IA] [IB] [IC] [IN] [VA] [VB] [VC] [Freq]                      │
│                                                                 │
│ OPERATORS SECTION:                                              │
│ [+] [-] [×] [÷] [^] [(] [)] [==] [>] [<]                       │
│ [RMS()] [ABS()] [AVG()]                                        │
│                                                                 │
│ FUNCTIONS SECTION:                                              │
│ [Mag(I)] [Ang(I)] [d/dt] [Trip()] [Pickup()]                   │
│                                                                 │
│ Math Expression:                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ I_{A}^{2} + I_{B}^{2} + I_{C}^{2}                          │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✅ Created channel "computed_0" with 4800 samples        │ │ ← Status
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Cancel] [➕ Create Channel] [Save]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔘 Button Sections

### CHANNELS Section

**Purpose:** Insert channel variable names

| Button   | Inserts            | Use Case        |
| -------- | ------------------ | --------------- |
| `[IA]`   | `I_{A}`            | Phase A current |
| `[IB]`   | `I_{B}`            | Phase B current |
| `[IC]`   | `I_{C}`            | Phase C current |
| `[IN]`   | `I_{N}`            | Neutral current |
| `[VA]`   | `V_{A}`            | Phase A voltage |
| `[VB]`   | `V_{B}`            | Phase B voltage |
| `[VC]`   | `V_{C}`            | Phase C voltage |
| `[Freq]` | `\operatorname{f}` | Frequency       |

**Example:**

```
Click [IA]  → I_{A} inserted in math field
Click [+]   → I_{A} +
Click [IB]  → I_{A} + I_{B}
```

---

### OPERATORS Section

**Purpose:** Insert mathematical operators and basic functions

| Button    | Inserts                             | LaTeX          | Use Case          |
| --------- | ----------------------------------- | -------------- | ----------------- |
| `[+]`     | `+`                                 | Implicit       | Addition          |
| `[-]`     | `-`                                 | Implicit       | Subtraction       |
| `[×]`     | `\cdot`                             | Centered dot   | Multiplication    |
| `[÷]`     | `\frac{#0}{#?}`                     | Fraction       | Division          |
| `[^]`     | `^{#0}`                             | Caret + brace  | Exponent/Power    |
| `[(]`     | `(`                                 | Implicit       | Left parenthesis  |
| `[)]`     | `)`                                 | Implicit       | Right parenthesis |
| `[==]`    | `=`                                 | Implicit       | Equality          |
| `[>]`     | `>`                                 | Implicit       | Greater than      |
| `[<]`     | `<`                                 | Implicit       | Less than         |
| `[RMS()]` | `\operatorname{RMS}\left(#0\right)` | Function       | Root Mean Square  |
| `[ABS()]` | `\left\lvert #0 \right\rvert`       | Absolute value | Absolute value    |
| `[AVG()]` | `\operatorname{AVG}\left(#0\right)` | Function       | Average           |

**Examples:**

```
Single operand:
  I_{A} [^] 2
  → I_{A}^{2}

Two operands:
  I_{A} [+] I_{B}
  → I_{A} + I_{B}

Function usage:
  [RMS()] → \operatorname{RMS}\left(#0\right)
  → Add I_{A} in placeholder
  → \operatorname{RMS}\left(I_A\right)

Complex:
  [ABS()] I_{A} [-] I_{B}
  → \left\lvert I_A - I_B \right\rvert
```

---

### FUNCTIONS Section

**Purpose:** Insert advanced mathematical functions

| Button       | Inserts                                | Description                  |
| ------------ | -------------------------------------- | ---------------------------- |
| `[Mag(I)]`   | `\left\lvert I \right\rvert`           | Magnitude/Absolute value     |
| `[Ang(I)]`   | `\angle I`                             | Phase angle                  |
| `[d/dt]`     | `\frac{d}{dt}\left(#0\right)`          | Time derivative              |
| `[Trip()]`   | `\operatorname{TRIP}\left(#0\right)`   | Trip function (protection)   |
| `[Pickup()]` | `\operatorname{PICKUP}\left(#0\right)` | Pickup function (protection) |

**Examples:**

```
Magnitude of current:
  [Mag(I)] → \left\lvert I \right\rvert

Phase angle:
  I_{A} [Ang(I)] → I_{A} \angle I_A

Time derivative:
  [d/dt] I_{A} → \frac{d}{dt}\left(I_A\right)

Protection logic:
  [Trip()] \sqrt{I_A^2 + I_B^2 + I_C^2}
  → \operatorname{TRIP}\left(\sqrt{I_A^2 + I_B^2 + I_C^2}\right)
```

---

## 🎬 Action Buttons

Located at bottom of modal:

```
┌──────────────────────────────────────────────┐
│  [Cancel] [➕ Create Channel] [Save]         │
└──────────────────────────────────────────────┘
```

### Button 1: `[Cancel]`

**Function:** Close dialog without saving anything

**When to use:**

- Don't want to save expression
- Changed your mind
- Want to start over with different expression

**Result:**

- Modal closes
- No changes to channel name
- No channel created
- No data saved

**Keyboard shortcut:** `Esc` key

---

### Button 2: `[➕ Create Channel]` (Orange) ⭐ NEW

**Function:** Evaluate expression and save as new computed channel

**When to use:**

- Want to turn expression into a new channel
- Want the computed values stored in cfg/data
- Want statistics calculated
- Want it available for export/analysis

**What it does:**

1. Takes expression from math editor
2. Converts LaTeX to math.js format
3. Evaluates for each sample in data
4. Calculates statistics (min, max, avg)
5. Auto-detects scaling factor
6. Saves to `cfg.computedChannels`
7. Saves data to `data.computedData`
8. Shows success message: `✅ Created channel "computed_0" with 4800 samples`
9. Auto-closes dialog after 300ms

**Result:**

- Channel appears in channel list table
- Channel ID: Auto-generated (computed_0, computed_1, ...)
- Channel available for:
  - Export to COMTRADE
  - Rendering on charts
  - Further analysis
  - Additional computations

**Status Messages:**

```
⏳ Evaluating expression...      (Processing)
↓
✅ Created channel "computed_0" with 4800 samples  (Success)
```

**Error scenarios:**

```
⚠️ Please enter an expression    (Empty input)
❌ Error: Math.js not available  (Library issue)
❌ All computed values are NaN   (Invalid formula)
❌ No analog samples available   (No data loaded)
```

---

### Button 3: `[Save]` (Green)

**Function:** Update the channel name cell with the LaTeX expression

**When to use:**

- Want to save the visual representation
- Want the formula displayed in table
- Don't necessarily want to compute values yet
- Just want to save the name/formula

**What it does:**

1. Takes expression from math editor
2. Saves as channel name in the cell
3. Closes dialog
4. LaTeX formula displays as plain text in table

**Result:**

- Cell value updated with LaTeX
- Table shows formula when rendered (converted to plain text)
- No computed channel created
- No statistics calculated
- Dialog closes

**Status Message:**

```
✅ Channel name updated
```

---

## 🔄 Common Workflows

### Workflow 1: Create a Computed Channel ONLY

```
1. Click channel name
2. Build expression with buttons
3. Click [➕ Create Channel]
4. ✅ Channel created and saved
5. Dialog closes
6. Done! Channel ready to use
```

### Workflow 2: Save Expression ONLY (No Computation)

```
1. Click channel name
2. Build expression
3. Click [Save]
4. Expression saved as channel name
5. Dialog closes
6. Done! Expression displayed in cell
```

### Workflow 3: Create Channel AND Save Name

```
1. Click channel name
2. Build expression
3. Click [➕ Create Channel]
4. ✅ Channel created
5. Dialog auto-closes (after 300ms)
6. Channel name updated with LaTeX
7. Done! Both channel and name saved
```

### Workflow 4: Cancel and Start Over

```
1. Click channel name
2. Build partial expression
3. Decide not to use it
4. Click [Cancel] or press Esc
5. Dialog closes
6. Back to square one
7. Try again with new expression
```

---

## 💡 Pro Tips

### Tip 1: Use Button Groups Efficiently

```
Instead of typing:        Use buttons:
I_{A} + I_{B} + I_{C}    [IA][+][IB][+][IC]
```

### Tip 2: Combine Buttons and Typing

```
For complex formula:
[RMS()] [IA] [+] [IB] [×] 2
```

### Tip 3: Verify Expression Before Creating

```
1. Build expression with buttons
2. Check it visually in math field
3. Then click Create Channel
```

### Tip 4: Create Multiple Channels in Sequence

```
1. Click channel 1, create computed_0
2. Dialog closes
3. Click channel 2, create computed_1
4. Dialog closes
5. Continue...
```

### Tip 5: Test with Simple Expression First

```
Test sequence:
1. Try: I_A (should equal channel A values)
2. Try: I_A + I_B (sum of two channels)
3. Try: I_A^2 + I_B^2 (squared values)
4. Try: \sqrt{I_A^2 + I_B^2} (magnitude)
```

---

## 🎨 Button Styling

### Predefined Buttons (All Button Sections)

- **Color:** Light gray background (#f9f9f9)
- **Border:** 1px solid #ddd
- **Hover:** Blue background with blue border
- **Font:** 13px, monospace for operators

### Action Buttons

| Button                | Color                 | Purpose                 |
| --------------------- | --------------------- | ----------------------- |
| `[Cancel]`            | White bg, black text  | Dismiss without saving  |
| `[➕ Create Channel]` | Orange bg, white text | Create computed channel |
| `[Save]`              | Green bg, white text  | Update channel name     |

---

## ⚡ Keyboard Shortcuts

| Key               | Action                        |
| ----------------- | ----------------------------- |
| `Esc`             | Close dialog (same as Cancel) |
| `Click button`    | Insert text at cursor         |
| `Type directly`   | Manual entry                  |
| Any printable key | Add character to expression   |
| `Ctrl+A`          | Select all (in math field)    |
| `Ctrl+C`          | Copy expression               |
| `Ctrl+V`          | Paste expression              |

---

## 🔧 Button Insertion Behavior

### How Button Click Works:

1. Click button → Get LaTeX code
2. Math field receives focus
3. LaTeX inserted at cursor position
4. Math field updates display
5. Cursor positioned after insertion
6. Ready for next input

### Example Sequence:

```
Start: (empty)
  ↓ Click [IA]
I_{A}
  ↓ Click [+]
I_{A} +
  ↓ Click [IB]
I_{A} + I_{B}
  ↓ Click [^]
I_{A} + I_{B}^{
  ↓ Type: 2}
I_{A} + I_{B}^{2}
```

---

## 🚨 Important Notes

1. **Create Channel vs Save:**

   - `[Create Channel]` = Evaluate + Store
   - `[Save]` = Name Only

2. **Channel Naming:**

   - Auto-generated: computed_0, computed_1, ...
   - Manual rename: Create channel, then click name again

3. **Data Persistence:**

   - Created channels saved to cfg/data globals
   - Persist for current session
   - Can be exported to files

4. **Expression Validation:**

   - Checked during Create Channel
   - Empty = Error message
   - Invalid math = Error message

5. **Status Messages:**
   - Appear in colored box below modal
   - Green = Success
   - Red = Error
   - Auto-hide after 3 seconds (unless error)

---

## 📋 Button Reference Card

```
╔═══════════════════════════════════════════════════════╗
║           EDIT CHANNEL EXPRESSION BUTTONS             ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ CHANNELS:  [IA] [IB] [IC] [IN] [VA] [VB] [VC] [Freq] ║
║                                                       ║
║ OPERATORS: [+] [-] [×] [÷] [^] [(] [)] [==] [>] [<]  ║
║            [RMS()] [ABS()] [AVG()]                   ║
║                                                       ║
║ FUNCTIONS: [Mag(I)] [Ang(I)] [d/dt]                  ║
║            [Trip()] [Pickup()]                       ║
║                                                       ║
║ ACTIONS:   [Cancel] [➕ Create Channel] [Save]        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

**Ready to click buttons and create expressions?** 🎉
