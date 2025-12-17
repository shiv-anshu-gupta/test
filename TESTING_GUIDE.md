# Computed Channels - Complete Testing Guide

## 🎯 Overview

This guide validates the end-to-end flow from creating computed channels via the MathLive editor through rendering on uPlot charts.

---

## 📋 System Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  Main Window (index.html)                               │
│  - Charts Container (uPlot instances)                   │
│  - File Input & Load Button                             │
│  - Channel List Button (opens popup)                    │
└──────────────────┬──────────────────────────────────────┘
                   │ window.postMessage()
                   │ (Popup Window Communication)
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Popup Window (showChannelListWindow)                   │
│  - Tabulator Table (Channel List)                       │
│  - Click Channel Name → MathLive Editor Modal           │
│  - Save → Evaluate → Dispatch Event                     │
└─────────────────────────────────────────────────────────┘
```

### File Relationships

```
[COMTRADE Files] (HR_85429.cfg, HR_85429.dat)
        ↓
[parseCFG/parseDAT] → cfg + data objects
        ↓
[renderComtradeCharts]
    ├─ renderAnalogCharts() → Multiple charts by pattern
    ├─ renderDigitalCharts() → Single digital chart
    └─ renderComputedChannels() ← User-created channels
        ↓
[uPlot Charts in DOM]
```

---

## 🧪 Test Phase 1: Loading & Initial State

### Test 1.1: Load COMTRADE File

**File:** HR_85429_ASCII.CFG / HR_85429_ASCII.DAT

**Steps:**

1. Open index.html in browser
2. Click "Choose File"
3. Select HR_85429_ASCII.CFG
4. Click "Load COMTRADE"

**Expected Results:**

- ✅ Two charts render (Analog, Digital)
- ✅ Analog chart shows 3 groups: "Currents" (IA, IB, IC), "Voltages" (VA, VB, VC), "Line Voltages" (VAB, VBC, VCA)
- ✅ Digital chart shows changed digital signals
- ✅ No console errors
- ✅ Vertical lines visible
- ✅ Time axis shows milliseconds

**Verification Points:**

```javascript
// Open DevTools Console
// Should see NO red errors, only normal rendering logs
// Check: charts[0] and charts[1] exist
// Check: data.computedData = undefined (no computed channels yet)
```

---

## 🧪 Test Phase 2: Channel List Popup

### Test 2.1: Open Channel List Popup

**Steps:**

1. Click "Channel List" button (top right)

**Expected Results:**

- ✅ Popup window opens (900×700)
- ✅ Tabulator table displays all channels
- ✅ Three sections visible: "Analog", "Digital", "Computed Channels" (empty initially)
- ✅ Each row has: ID, Channel Name, Unit, Type, Color, Scale

**Verification Points:**

```
Analog section:
  ID  | Name  | Unit | Type   | Color
  1   | IA    | A    | Analog | #e41a1c
  2   | IB    | A    | Analog | #377eb8
  ...

Digital section:
  (should show changed digital channels)

Computed Channels section:
  (should be empty)
```

---

## 🧪 Test Phase 3: MathLive Editor - First Channel

### Test 3.1: Open MathLive Editor

**Steps:**

1. In popup, click on first channel name "IA"
2. Modal window appears with MathLive editor

**Expected Results:**

- ✅ Modal shows with title "Edit Expression"
- ✅ Math-field element ready for input
- ✅ Predefined buttons visible: IA, IB, IC, VA, VB, VC, and operators
- ✅ No error messages

### Test 3.2: Enter Square Root Expression

**Steps:**

1. Clear any existing content in math-field
2. Enter: `\sqrt{IA^2 + IB^2 + IC^2}`
   - Option A: Type directly
   - Option B: Click IA button, then ^, then 2, then +, etc.

**Expected Results:**

- ✅ LaTeX rendered as visual math expression
- ✅ Plain text shows in console: `sqrt(IA^2+IB^2+IC^2)` or similar

### Test 3.3: Save First Computed Channel

**Steps:**

1. Click "Save" button

**Expected Results:**

- ✅ Modal closes
- ✅ New row appears in "Computed Channels" section
- ✅ Row shows: ID=4, Name=(expression), Type="Computed", Color="#FF6B6B"
- ✅ Back in main window: New chart appears with 1 line
- ✅ Chart title: "Computed Channels"
- ✅ One Y-axis series in legend
- ✅ Line color: #FF6B6B (coral red)

**Console Check:**

```javascript
// No error logs
// Check main window console: should show chart was rendered
// Check data.computedData[0] has: id, data (62464 samples), unit
```

---

## 🧪 Test Phase 4: Create Second Channel

### Test 4.1: Open MathLive Editor Again

**Steps:**

1. In popup, click on channel name "IB"
2. Modal opens again

### Test 4.2: Enter Addition Expression

**Steps:**

1. Enter: `IA + IB + IC`
   - Or use buttons: IA + IB + IC

**Expected Results:**

- ✅ Math-field shows: IA + IB + IC
- ✅ LaTeX converted to plain text

### Test 4.3: Save Second Computed Channel

**Steps:**

1. Click "Save"

**Expected Results:**

- ✅ Second row in "Computed Channels" (ID=5)
- ✅ Back in main window: Chart **UPDATED** (not replaced)
- ✅ Chart now shows **2 lines**:
  - Line 1: #FF6B6B (first channel, sqrt expression)
  - Line 2: #4ECDC4 (second channel, sum expression)
- ✅ Legend shows both channel names
- ✅ Both channels tracked in Y-axis

**Verification Points:**

```javascript
// charts[2]._computedIds should be ["...", "..."] (2 channels)
// data.computedData.length === 2
// First chart still on screen (not removed)
```

---

## 🧪 Test Phase 5: Create Third Channel

### Test 5.1: Create Third Expression

**Steps:**

1. Click on channel name in popup
2. Enter: `\sqrt{VA^2 + VB^2 + VC^2}`
3. Save

**Expected Results:**

- ✅ Third row in "Computed Channels" (ID=6)
- ✅ Chart shows **3 lines**:
  - Line 1: #FF6B6B (sqrt current magnitude)
  - Line 2: #4ECDC4 (current sum)
  - Line 3: #45B7D1 (sqrt voltage magnitude)
- ✅ All three channels visible and labeled
- ✅ Legend complete

---

## 🧪 Test Phase 6: Interactions

### Test 6.1: Hover Over Chart (Tooltip)

**Steps:**

1. Move mouse over the computed chart area
2. Hover at different time positions

**Expected Results:**

- ✅ Tooltip appears near cursor
- ✅ Shows: time (milliseconds) and values for each channel
- ✅ Channel names match table
- ✅ Colors match lines
- ✅ Values change as you move cursor

**Example Tooltip:**

```
t: 125.50
√(IA²+IB²+IC²): 125.43
IA+IB+IC: 148.25
√(VA²+VB²+VC²): 231.47
```

### Test 6.2: Vertical Lines

**Steps:**

1. Use keyboard shortcut (if supported) or drag to position vertical lines
2. Verify they appear on computed chart

**Expected Results:**

- ✅ Vertical lines render on computed chart
- ✅ Lines synchronized with analog/digital charts

### Test 6.3: Delta Box

**Steps:**

1. Enable delta measurement between two vertical lines

**Expected Results:**

- ✅ Delta box shows differences for each channel
- ✅ Works same as analog/digital channels

---

## 🧪 Test Phase 7: Data Validation

### Test 7.1: Verify Computed Data Structure

**Steps (DevTools Console):**

```javascript
// Check computed channels exist
console.log(cfg.computedChannels);
// Expected output:
// [
//   { id: "sqrt(IA^2+IB^2+IC^2)", unit: "", data: [...62464 samples], scalingFactor: 1 },
//   { id: "IA+IB+IC", unit: "", data: [...62464 samples], scalingFactor: 1 },
//   { id: "sqrt(VA^2+VB^2+VC^2)", unit: "", data: [...62464 samples], scalingFactor: 1 }
// ]

// Check data arrays
console.log(data.computedData.length); // Should be 3
console.log(data.computedData[0].data.length); // Should be 62464
```

### Test 7.2: Verify Chart Arrays

**Steps (DevTools Console):**

```javascript
// Check charts array
console.log(charts.length); // Should be 3 (analog, digital, computed)
console.log(charts[2]._type); // Should be "computed"
console.log(charts[2]._computedIds); // Should be array of 3 IDs
console.log(charts[2].data.length); // Should be 4 (time + 3 channels)
```

### Test 7.3: Verify Scaling Applied

**Steps (DevTools Console):**

```javascript
// Get first computed channel data
const ch1Data = data.computedData[0].data;
console.log(ch1Data.slice(0, 5)); // First 5 samples
// Should show reasonable magnitudes (e.g., 100-150 range for current)

// If scaling factor > 1, verify it was applied
console.log(data.computedData[0].scalingFactor); // e.g., 1.5
```

---

## 🧪 Test Phase 8: Performance & Console

### Test 8.1: Console Cleanliness

**Steps:**

1. Open DevTools Console (F12)
2. Clear any existing messages
3. Create a new computed channel
4. Check console output

**Expected Results:**

- ✅ NO console.log messages (diagnostic logs removed)
- ✅ ONLY if error: console.warn or console.error
- ✅ Clean development experience

**Bad Scenario (Before Optimization):**

```
[renderComputedChannels] Found 1 computed channels
[renderComputedChannels] Getting data for channel 0: sqrt(...)
[renderComputedChannels] Channel sqrt(...) data: 62464 samples
[renderComputedChannels] Chart created successfully, total charts: 3
```

**Good Scenario (After Optimization):**

```
(No messages - silent success)
```

### Test 8.2: Memory Usage

**Steps:**

1. Open DevTools → Memory tab
2. Take heap snapshot
3. Create 5 computed channels
4. Take another heap snapshot
5. Compare growth

**Expected Results:**

- ✅ Reasonable memory growth
- ✅ ~8-12 MB per channel (time array + data + chart)
- ✅ No memory leaks (cleanup when replacing)

---

## 🧪 Test Phase 9: Export Computed Channels

### Test 9.1: Export as ASCII

**Steps:**

1. In popup, right-click computed channel row
2. Select "Export as ASCII"

**Expected Results:**

- ✅ CFG and DAT files generated
- ✅ Downloaded to system
- ✅ Files named: `computed_channel_*.cfg`, `computed_channel_*.dat`

### Test 9.2: Verify Export Format

**Steps:**

1. Open downloaded CFG file
2. Check format

**Expected Results:**

- ✅ CFG header correct
- ✅ Multiplier/Offset applied correctly
- ✅ DAT has millisecond timestamps
- ✅ Data scaled to integers (16-bit or 32-bit)

---

## 🧪 Test Phase 10: Edge Cases

### Test 10.1: Empty Expression

**Steps:**

1. Open MathLive editor
2. Try to save with empty field

**Expected Results:**

- ✅ Error message or validation prevents save
- ✅ No channel created

### Test 10.2: Invalid Expression

**Steps:**

1. Enter: `1 / 0` (division by zero)
2. Save

**Expected Results:**

- ✅ Error handled gracefully
- ✅ Chart shows NaN or Infinity (visible as broken line)
- ✅ No crash

### Test 10.3: Very Large Values

**Steps:**

1. Enter: `IA * IB * IC` (multiplication grows values)
2. Save

**Expected Results:**

- ✅ Chart still renders
- ✅ Y-axis scales to accommodate large values
- ✅ Tooltip shows values correctly

### Test 10.4: Create 10 Channels

**Steps:**

1. Create 10 different expressions

**Expected Results:**

- ✅ All visible on single chart
- ✅ Colors cycle through 5 palette repeatedly
- ✅ Channels 6-10 get colors: #FF6B6B (again), #4ECDC4 (again), etc.
- ✅ Legend distinguishes by channel name
- ✅ No performance degradation

---

## ✅ Validation Checklist

### Functionality

- [ ] First channel creates chart with 1 line
- [ ] Second channel adds line (no replacement)
- [ ] Third channel adds line
- [ ] Tooltip shows all channels
- [ ] Vertical lines work
- [ ] Delta box works
- [ ] Colors cycle correctly
- [ ] Data has 62,464 samples per channel

### Code Quality

- [ ] No console.log statements in console
- [ ] Only error/warning if data issues
- [ ] No console errors
- [ ] renderComputedChannels.js is 127 lines (optimized)
- [ ] Code matches renderAnalogCharts.js style

### Performance

- [ ] Chart renders in < 500ms
- [ ] No memory leaks
- [ ] Tooltip updates smoothly
- [ ] No lag when hovering

### Professional Standards

- [ ] Code is concise and readable
- [ ] No emoji comments
- [ ] Proper error handling
- [ ] Consistent naming
- [ ] Clean architecture

---

## 🐛 Troubleshooting

### Issue: Chart doesn't appear after saving

**Check:**

1. Console for errors
2. `data.computedData` has data
3. Time array exists: `data.time && Array.isArray(data.time)`
4. renderComputedChannels called

### Issue: Wrong colors

**Check:**

1. Color palette: 5 colors defined
2. Color index: `idx % colors.length`
3. Charts are recreated (not just updated)

### Issue: Tooltip doesn't appear

**Check:**

1. Chart event listeners attached
2. `chart.over` element exists
3. `createTooltip()` initialized
4. Mouse over chart area

### Issue: Console full of logs

**Check:**

1. renderComputedChannels.js has all console.log removed
2. Verify file saved with changes
3. Hard refresh browser (Ctrl+Shift+R)

---

## 📊 Success Criteria

| Criterion                    | Status |
| ---------------------------- | ------ |
| File loads without errors    | ✅     |
| Analog/Digital charts render | ✅     |
| Popup opens correctly        | ✅     |
| MathLive editor modal works  | ✅     |
| First channel creates chart  | ✅     |
| Multiple channels accumulate | ✅     |
| Colors cycle (5 palette)     | ✅     |
| Tooltip functional           | ✅     |
| Console clean (no logs)      | ✅     |
| Code follows standards       | ✅     |
| Performance acceptable       | ✅     |

---

## 📝 Test Report Template

Use this to document your testing:

```
Date: [Date]
Tester: [Name]

Phase 1: Load COMTRADE
- [ ] File loaded
- [ ] Charts rendered
- [ ] No errors

Phase 2: Popup
- [ ] Popup opened
- [ ] Table visible
- [ ] Groups correct

Phase 3: First Channel
- [ ] Editor opened
- [ ] Expression entered
- [ ] Chart created
- [ ] 1 line visible

Phase 4: Second Channel
- [ ] Editor opened
- [ ] Expression entered
- [ ] 2 lines visible
- [ ] No replacement

Phase 5-10: Additional Tests
- [ ] All passed

Issues Found:
- (List any problems)

Notes:
- (Additional observations)
```
