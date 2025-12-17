# 🚀 MathLive Editor - Quick Start Guide

## Step-by-Step Usage

### Step 1: Open Channel List

```
Click: "View Channels" button in main UI
Result: Popup window opens with channel table
```

### Step 2: Click on a Channel Name

```
Target: Any cell in "Channel Name (Unit)" column
Result: MathLive editor popup appears
```

### Step 3: Build Your Equation

#### Option A: Use Predefined Buttons

```
Channels: IA, IB, IC, IN, VA, VB, VC, Freq
Operators: +, -, ×, ÷, ^, (, ), ==, >, <
Functions: RMS(), ABS(), AVG(), Mag(), Ang(), d/dt, Trip(), Pickup()

Click buttons to insert them into the equation
```

#### Option B: Type LaTeX Directly

```
Type LaTeX in the math-field:
- I_{A} for subscripts
- \frac{a}{b} for fractions
- \operatorname{RMS} for functions
- \left\lvert x \right\rvert for absolute value
```

### Step 4: See Live Preview

```
As you type or click buttons, the LaTeX preview updates
Plain text preview shows how it will display in the table
```

### Step 5: Save Your Equation

```
Click: "Save" button
Result:
- Editor closes
- Channel name updated with LaTeX
- Display shows plain text version
```

---

## 📋 Predefined Equations

### Electrical Quantities

#### Three-Phase Current Average

```LaTeX
\frac{I_A + I_B + I_C}{3}
```

Display: `(IA+IB+IC)/3`

#### RMS of Phase Current

```LaTeX
\operatorname{RMS}\left(I_A\right)
```

Display: `RMS(IA)`

#### Current Magnitude

```LaTeX
\left\lvert I_A \right\rvert
```

Display: `|IA|`

#### Phase Angle of Voltage

```LaTeX
\angle V_A
```

Display: `∠VA`

#### Complex Calculation

```LaTeX
\frac{\operatorname{RMS}\left(I_A\right) \times \left\lvert V_A \right\rvert}{3}
```

Display: `RMS(IA) × |VA|/3`

---

## 🎮 Keyboard Shortcuts

| Key           | Action                           |
| ------------- | -------------------------------- |
| ESC           | Close editor without saving      |
| ENTER         | (In text field) - Add line break |
| Click buttons | Insert LaTeX at cursor           |
| Click Save    | Save and close                   |
| Click Cancel  | Close without saving             |

---

## ⚙️ Technical Features

### Math Expression Support

- ✅ Variables: `I_A`, `V_B`, `F_c`, etc.
- ✅ Fractions: `\frac{a}{b}`
- ✅ Functions: `\sin`, `\cos`, `\operatorname{RMS}`
- ✅ Operators: `+`, `-`, `\cdot`, `\times`, `\div`
- ✅ Special: `\angle`, `\sqrt`, `^` (power)

### Display Conversion

LaTeX → Plain Text conversion:

- `I_{A}` → `IA`
- `V_B` → `VB`
- `\frac{x}{y}` → `(x)/(y)`
- `\cdot` → `×`
- Removes all backslashes and braces for readability

---

## 💡 Tips & Tricks

### 1. Quick Channel Selection

```
Instead of typing "I_{A}", click the "IA" button
Much faster for common variables
```

### 2. Build Complex Equations Incrementally

```
Start with: I_{A}
Add: + I_{B} (click + button, then IB button)
Wrap in: \frac{...}{2} to get average
```

### 3. Use Function Buttons

```
Click "RMS()" to insert: \operatorname{RMS}\left(#0\right)
The #0 is placeholder - your cursor position
```

### 4. Operators First, Variables Second

```
For: I_A + I_B
Click: + button (adds \cdot)
Click: IA button
Click: + button again
Click: IB button
```

---

## ❌ Common Issues & Solutions

### Issue: Editor doesn't open

**Solution:**

- Ensure MathLive is loaded (check browser console)
- Click directly on channel name cell
- Try double-clicking if single-click doesn't work

### Issue: LaTeX not displaying correctly

**Solution:**

- Check LaTeX syntax is valid
- Use `_{}` for subscripts (not just `_`)
- Use `\frac{}{}` for fractions (both braces required)

### Issue: Preview showing raw LaTeX

**Solution:**

- Preview shows both LaTeX and plain text
- Plain text is what appears in the table
- LaTeX is stored internally

### Issue: Buttons not responding

**Solution:**

- Click inside the math-field first
- Ensure MathLive library loaded
- Try keyboard shortcut instead

---

## 📚 LaTeX Reference

### Subscripts & Superscripts

```LaTeX
x_{n}           % subscript
x^{2}           % superscript
x_{i}^{2}       % both
```

### Greek Letters

```LaTeX
\pi             % pi
\omega          % omega
\phi            % phi
\alpha, \beta   % alpha, beta
```

### Functions

```LaTeX
\sin, \cos, \tan, \log, \ln
\sqrt{x}        % square root
\operatorname{NAME}  % custom function
```

### Fractions & Division

```LaTeX
\frac{a}{b}     % fraction a/b
\frac{x+y}{2}   % complex numerator
```

### Special Symbols

```LaTeX
\angle          % angle
\left\lvert x \right\rvert  % absolute value
\pm             % plus-minus
\approx         % approximately equal
```

---

## 🔄 Data Flow

```
Channel List Table
        ↓
User clicks channel name
        ↓
MathLive Editor Opens
User enters: I_{A} + I_{B}
        ↓
Click Save
        ↓
Stored as: "I_{A} + I_{B}" (LaTeX)
        ↓
Displayed as: "(IA)+(IB)" (Plain text)
        ↓
Table shows readable format
```

---

## ✅ Ready to Use!

The MathLive integration is **production-ready**:

- ✅ Integrated into src/components/ChannelList.js
- ✅ MathLive loaded via CDN in showChannelListWindow.js
- ✅ LaTeX to plain text conversion working
- ✅ No breaking changes to existing code
- ✅ Backward compatible with existing channel names

Start creating equations now! 🎓
