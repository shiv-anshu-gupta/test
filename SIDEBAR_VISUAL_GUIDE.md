# Visual Guide - Three-State Sidebar Toggle

## Button Location
The toggle button is in the Analysis sidebar header, next to the close button (X)

```
┌─ ANALYSIS ─────────────────────┐
│                     [⊞] [✕]    │  ← Button is here
├────────────────────────────────┤
│                                 │
│  Phasor Diagram                 │
│  (in sidebar mode)              │
│                                 │
│                                 │
└────────────────────────────────┘
```

---

## Visual State Changes

### STATE 1️⃣ : SIDEBAR MODE (⊞)
**Appearance**: Default layout with sidebar on right

```
┌──────────────────────────────────────────────┐
│          MAIN CONTENT (Charts)      │SIDEBAR │
│                                     │        │
│    [Chart 1]    [Chart 2]           │ ⊞  ✕  │
│                                     │        │
│                                     │ Phasor │
│    [Chart 3]    [Chart 4]           │ Diag   │
│                                     │        │
└──────────────────────────────────────────────┘
```

**Button**: Shows ⊞ (box outline)
**Tooltip**: "Move to charts container"
**Status**: Normal working mode

---

### STATE 2️⃣ : FLOATING MODE (▦)
**Appearance**: Sidebar hides, phasor floats as independent window

```
┌──────────────────────────────────────────────┐
│           MAIN CONTENT (Full Width)          │
│                                              │
│    [Chart 1]    [Chart 2]   ┌─ PHASOR ─┐    │
│                              │          │    │
│    [Chart 3]    [Chart 4]   │  ▦   ✕   │    │
│                              │ (Floats) │    │
│                              │ (Dragg)  │    │
│                              └──────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

**Button**: Shows ▦ (grid/distribution symbol)
**Tooltip**: "Move to sidebar"
**Status**: Floating window mode
**Features**: Window is draggable, repositionable

---

### STATE 3️⃣ : CHARTS INLINE MODE (⬅) ⭐ NEW
**Appearance**: Phasor moves INSIDE charts container in 2-column layout

```
┌──────────────────────────────────────────────┐
│           MAIN CONTENT (Full Width)          │
│                                              │
│ ┌─ PHASOR ──────┐  ┌─ CHARTS ────────────┐  │
│ │      ⬅  ✕     │  │ [Chart 1] [Chart 2] │  │
│ │               │  │                      │  │
│ │  (Phasor)     │  │ [Chart 3] [Chart 4] │  │
│ │   Diagram     │  │                      │  │
│ │               │  │                      │  │
│ └───────────────┘  └──────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

**Button**: Shows ⬅ (left arrow)
**Tooltip**: "Return to sidebar"
**Status**: Charts inline mode (BOSS'S REQUIREMENT)
**Features**: Side-by-side viewing, professional layout

---

## State Transition Flow Diagram

```
                     USER CLICKS BUTTON
                            ↓
                            ↓
    ┌───────────────────────┼───────────────────────┐
    ↓                       ↓                       ↓
SIDEBAR ────→         FLOATING ────→         CHARTS-INLINE
  MODE                   MODE                   MODE
  (⊞)                    (▦)                     (⬅)
    ↓                       ↓                       ↓
Phasor in          Phasor floats       Phasor in charts
right sidebar      as window           with other charts
    ↑                       ↑                       ↑
    └───────────────────────┴───────────────────────┘
                   (cycles indefinitely)
```

---

## Icon Meaning Guide

| Icon | Reads As | Represents | Next Action |
|------|----------|----------|------------|
| **⊞** | BOX | Container/Container Mode | Click to open/float |
| **▦** | GRID/DISTRIBUTE | Spread/Separate | Click to consolidate |
| **⬅** | LEFT ARROW | Return/Back | Click to restore |

---

## User Interaction Sequences

### Scenario 1: Normal Daily Use
```
1. Start application
   → State: SIDEBAR (⊞)
   
2. Load COMTRADE file with charts
   → View charts + phasor in sidebar
   
3. Need more space for charts
   → Click button
   → State: FLOATING (▦)
   
4. Done analyzing floating phasor
   → Click button
   → State: CHARTS-INLINE (⬅)
   → View phasor and charts together
   
5. Close phasor to focus on charts
   → Click button
   → State: SIDEBAR (⊞)
```

### Scenario 2: Quick Analysis
```
1. Application open with sidebar mode (⊞)
   
2. Click once → FLOATING (▦)
   → Move window to side
   
3. Click again → CHARTS-INLINE (⬅)
   → See everything together
   
4. Done, click again → SIDEBAR (⊞)
   → Back to normal
```

### Scenario 3: Presentation Mode (Boss's Use Case)
```
1. Load data
   
2. Click button twice to reach CHARTS-INLINE (⬅)
   
3. Show boss:
   - Phasor diagram on left
   - All charts on right
   - Professional 2-column layout
   - Everything visible at once
   
4. Perfect for explaining phase relationships
   and waveform patterns simultaneously!
```

---

## Button Close-Up

### Standard Position (Sidebar Mode)
```
┌─ ANALYSIS ─────────────────────┐
│                                 │
│      [⊞]  [✕]                   │
│   Toggle  Close                 │
│  Button   Button                │
│                                 │
└─────────────────────────────────┘
```

### How Tooltips Work
- **Hover over ⊞**: See "Move to charts container"
- **Hover over ▦**: See "Move to sidebar"
- **Hover over ⬅**: See "Return to sidebar"
- **Hover over ✕**: Still shows "Close"

---

## Screen Size Considerations

### Large Screens (1920px+)
```
State 1: ┌────────────────────────────────┬──────┐
         │ Charts area                     │ Phasor│
         │ (plenty of space)              │ Sidebar│
         └────────────────────────────────┴──────┘

State 3: ┌─────────────────┬───────────────────────┐
         │ Phasor (50%)    │ Charts (50%)          │
         │ Nice layout     │ Nice layout           │
         └─────────────────┴───────────────────────┘
```

### Medium Screens (1400px)
```
State 3: ┌──────────────┬──────────────────────┐
         │ Phasor (40%) │ Charts (60%)         │
         │ (auto-adjust)│ (auto-adjust)        │
         └──────────────┴──────────────────────┘
```

### Small Screens (768px)
```
State 3: May stack vertically with CSS media queries
         (implementation can adjust if needed)
```

---

## Before/After Comparison

### BEFORE (Original Arrow Button ⬆)
- ❌ Confusing icon (what does arrow mean?)
- ❌ No indication of available modes
- ❌ Only 2 states: Sidebar ↔ Floating
- ❌ Can't put phasor with charts
- ❌ Boss unhappy! 😞

### AFTER (New Box + State Icon ⊞▦⬅)
- ✅ Clear, intuitive icons
- ✅ Icon shows current state
- ✅ 3 states available
- ✅ CAN put phasor with charts (⬅ mode)
- ✅ Boss happy! 😊

---

## Console Output Example

When you interact with the button, console shows:
```
[main.js] Sidebar moved to floating window
[main.js] Sidebar moved to charts container inline
[main.js] Sidebar returned to original sidebar position
```

This helps developers debug and understand what's happening.

---

## Summary for Users

**Remember:**
- 🔘 **⊞** = Sidebar mode (normal)
- 🔘 **▦** = Floating mode (separate window)
- 🔘 **⬅** = Charts inline mode (together)
- 🔘 **Click = Cycle** to next mode
- 🔘 **Hover = See** what will happen

**Boss's Favorite**: Charts inline mode (⬅) lets you see phasor diagram and charts side-by-side perfectly!
