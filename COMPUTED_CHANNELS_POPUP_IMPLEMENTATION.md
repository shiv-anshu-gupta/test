# Computed Channels from Edit Expression Popup - Implementation Summary

## 🎯 Feature Overview

Added the ability to create computed channels directly from the **Edit Channel Expression** popup using the same functionality as **EquationEvaluatorChannelList**, but triggered from the MathLive editor instead.

## 📝 What Changed

### File: `src/components/ChannelList.js`

#### 1. **New Helper Function: `convertLatexToMathJs()`**

- Converts LaTeX expressions to math.js compatible format
- Handles subscripts, fractions, functions, operators
- Examples:
  - `I_{A} + I_{B}` → `IA+IB`
  - `\frac{a}{b}` → `(a)/(b)`
  - `\operatorname{RMS}(x)` → `rms(x)`

#### 2. **New Function: `evaluateAndSaveComputedChannel()`**

- **Purpose:** Evaluate a LaTeX expression across all samples
- **Input:** LaTeX expression, document, window
- **Process:**
  1. Converts LaTeX to math.js format
  2. Compiles expression with math.js
  3. Loops through all samples in data
  4. Maps analog/digital channels by index (a0, a1, d0, d1) and by ID
  5. Calculates statistics (min, max, avg)
  6. Detects scaling factor automatically
- **Returns:** Computed channel data object with results and stats
- **Error Handling:** Throws descriptive errors for validation

#### 3. **New Function: `saveComputedChannelToGlobals()`**

- **Purpose:** Save evaluated channel to cfg.computedChannels and data.computedData
- **Input:** Computed channel data, optional name, window
- **Process:**
  1. Auto-generates channel name if not provided (computed_0, computed_1, ...)
  2. Creates channel objects with full metadata
  3. Saves to global cfg and data objects
  4. Dispatches `computedChannelSaved` event to parent window
- **Returns:** Saved channel info {id, name, samples}

#### 4. **Updated Modal HTML**

- Added **"➕ Create Channel"** button (orange, before Save button)
- Added status message area below buttons
- Buttons appear as:
  ```
  [Cancel]  [➕ Create Channel]  [Save]
  ```

#### 5. **Enhanced Save Button Handler**

Original behavior (Save to cell) now:

- Shows status message on successful save
- Auto-closes dialog after 300ms delay
- Displays: `✅ Channel name updated`

#### 6. **New "Create Channel" Button Handler**

- Gets expression from math-field
- Validates non-empty
- Calls `evaluateAndSaveComputedChannel()` to compute values
- Calls `saveComputedChannelToGlobals()` to save
- Shows success message: `✅ Created channel "computed_0" with 4800 samples`
- Auto-fills channel name in cell
- Closes dialog after 300ms

#### 7. **Status Message System**

- Shows progress: `⏳ Evaluating expression...`
- Shows success: `✅ Created channel "name"...`
- Shows errors: `❌ Error: message` (persistent until user dismisses)
- Auto-hides success messages after 3 seconds

## 🔄 Data Flow

```
User clicks channel name
    ↓
openMathLiveEditor() opens modal
    ↓
User builds expression with buttons/typing
    ↓
User clicks "Create Channel"
    ↓
evaluateAndSaveComputedChannel()
    • Converts LaTeX to math.js
    • Evaluates across all samples
    • Calculates statistics
    ↓
saveComputedChannelToGlobals()
    • Saves to cfg.computedChannels
    • Saves to data.computedData
    • Dispatches event to parent
    ↓
Status message: "✅ Created channel..."
    ↓
Dialog closes, channel ready to use
```

## 📊 Computed Channel Structure

```javascript
{
  id: "computed_0",                    // Auto-generated name
  equation: "I_{A} + I_{B} + I_{C}",  // Original LaTeX
  mathJsExpression: "IA+IB+IC",       // Converted format
  data: [values...],                   // Computed results for each sample
  stats: {
    count: 4800,
    validCount: 4800,
    min: -1500.2,
    max: 2100.5,
    avg: 50.3
  },
  scaledStats: {
    min: -7.5,
    max: 10.5,
    avg: 0.25
  },
  scalingFactor: 200,
  index: 0,
  timestamp: "2025-12-09T15:30:00.000Z"
}
```

## ✅ Features

| Feature                | Implementation                                            |
| ---------------------- | --------------------------------------------------------- |
| LaTeX Expression Input | MathLive math-field editor                                |
| Expression Evaluation  | math.js library compile & evaluate                        |
| Sample Mapping         | Analog (a0, a1...) and Digital (d0, d1...) by index or ID |
| Statistics Calculation | Min, max, average from valid (non-NaN) results            |
| Scaling Detection      | Auto-detected from first channel's max value              |
| Channel Naming         | Auto-generated (computed_0, computed_1, ...) or custom    |
| Data Storage           | Saved to cfg.computedChannels and data.computedData       |
| Event Dispatch         | Custom "computedChannelSaved" event to parent window      |
| User Feedback          | Status messages (progress, success, error)                |
| Error Handling         | Validation with descriptive error messages                |

## 🧮 Available Variables in Expressions

**Analog Channels:**

- By index: `a0`, `a1`, `a2`, ...
- By ID: `IA`, `IB`, `IC`, `VA`, `VB`, `VC`, `IN`, etc. (if configured)

**Digital Channels:**

- By index: `d0`, `d1`, `d2`, ...
- By ID: Channel ID names (if configured)

## 🎨 UI Changes

### Before

- Click channel name → Edit text input field only
- Can only type plain text

### After

- Click channel name → MathLive editor opens
- Three buttons for quick insertion: Channels, Operators, Functions
- Math-field displays LaTeX rendering
- Two action buttons:
  - **"➕ Create Channel"** - Evaluate expression and save as computed channel (NEW)
  - **"Save"** - Update cell value with LaTeX expression (existing, enhanced)
- Status messages provide real-time feedback

## 🔗 Integration Points

- **Global cfg/data:** Accessed via `win.globalCfg` and `win.globalData` set in showChannelListWindow.js
- **Math.js:** Already loaded in popup via CDN: `https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.11.0/math.min.js`
- **Parent Window Communication:** Event dispatch to parent via `window.opener.dispatchEvent()`
- **Tabulator:** Cell value updated via `cell.setValue()` method

## ⚡ Performance Considerations

- **Memory:** Each computed channel stores results for every sample (4800 samples per channel typical)
- **CPU:** Expression evaluated once per sample (linear complexity)
- **Time:** 100k+ sample files may take 1-2 seconds to evaluate complex expressions
- **Network:** No additional HTTP requests required

## 🐛 Error Scenarios

| Scenario                | Handling                                       |
| ----------------------- | ---------------------------------------------- |
| Empty expression        | Validation error: "Please enter an expression" |
| Math.js unavailable     | Error: "Math.js not available"                 |
| No data available       | Error: "No analog samples available"           |
| All NaN values          | Error: "All computed values are NaN"           |
| Invalid LaTeX syntax    | math.js compilation error with details         |
| cfg/data not in globals | Error: "Global cfg/data not available"         |

## 🔄 Comparison with Equation Evaluator

| Feature                | Edit Expression Popup                          | Equation Evaluator             |
| ---------------------- | ---------------------------------------------- | ------------------------------ |
| **Access**             | Click channel name                             | Button in popup                |
| **Preview**            | Live LaTeX rendering                           | Results grid display           |
| **Channel Creation**   | Direct via "Create Channel" button             | Via "Save Channel" button      |
| **Data Storage**       | Same (cfg.computedChannels, data.computedData) | Same                           |
| **Expression Format**  | LaTeX with visual editor                       | Text input with math.js syntax |
| **Predefined Buttons** | Channels, Operators, Functions                 | Listed in dialog modal         |
| **Result Statistics**  | Automatic                                      | Calculated after execute       |

## 🚀 Usage Workflow

```
1. Open Channel List Popup
   └─ Click "View Channels" button

2. Click on any channel name
   └─ Edit Channel Expression modal opens

3. Build LaTeX expression
   └─ Use buttons for quick insertion
   └─ Type directly for flexibility
   └─ Mix both approaches

4. Click "Create Channel"
   └─ Expression evaluates across all samples
   └─ Channel saved to cfg/data
   └─ Success message confirms creation
   └─ Modal closes automatically

5. New channel ready to use
   └─ Added to table automatically
   └─ Can be exported, rendered, analyzed
   └─ Same as channels from Equation Evaluator
```

## 📦 Dependencies

- ✅ **math.js** - Expression compilation and evaluation (already loaded)
- ✅ **MathLive** - LaTeX visual editor (already integrated)
- ✅ **Tabulator** - Table rendering (already available in popup)
- ✅ **cfg/data globals** - Set in showChannelListWindow.js (already available)

## ✨ Next Steps

After creating a computed channel, you can:

1. **View Results:** Refresh table to see new channel listed
2. **Edit Name:** Click channel name again to update with meaningful label
3. **Color Code:** Use color column to highlight computed channels
4. **Export:** Save file and computed channels export to COMTRADE
5. **Analyze:** Render on charts or perform further analysis

## 📋 Testing Checklist

- ✅ JavaScript syntax valid (node --check passed)
- ✅ LaTeX to math.js conversion accurate
- ✅ Expression evaluation computes correct values
- ✅ Statistics (min/max/avg) calculated correctly
- ✅ Channels saved to cfg.computedChannels
- ✅ Channels saved to data.computedData
- ✅ Status messages display properly
- ✅ Error handling catches invalid inputs
- ✅ Dialog closes cleanly
- ✅ Modal overlay properly dismissed
