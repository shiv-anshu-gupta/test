# Visual Flowchart - How It Works

## 🎬 User Opens Delta Window

```
┌─────────────────────────────────┐
│  User Clicks Delta Button       │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Your Code Runs:    │
    │ window.open(...)   │
    └────────────┬───────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │ adjustMainContent('left',400)│
    └────────────┬─────────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ Set margin-left: 400px│
         │ on #charts            │
         └────────┬──────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ CSS Transition     │
         │ (0.3s animation)   │
         └─────────┬──────────┘
                   │
                   ▼
          ┌────────────────────┐
          │ Wait 350ms         │
          │ (for animation to  │
          │  complete)         │
          └──────────┬─────────┘
                     │
                     ▼
          ┌────────────────────────────┐
          │ Find all charts:           │
          │ window.charts              │
          │ window.__chartsComputed    │
          └──────────┬─────────────────┘
                     │
                     ▼
          ┌────────────────────────┐
          │ For each chart:        │
          │ chart.setSize({        │
          │   width: container...  │
          │   height: container... │
          │ })                     │
          └──────────┬─────────────┘
                     │
                     ▼
          ┌────────────────────┐
          │ Console log:       │
          │ ✅ Charts resized  │
          └─────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Result: Charts fit   │
         │ in available space!  │
         └──────────────────────┘
```

---

## 📊 State Transitions

```
STATE 1: Initial (No sidebars)
┌────────────────────────────────────┐
│         Main Charts (100%)         │
│  margin-left: 0px                  │
│  margin-right: 0px                 │
└────────────────────────────────────┘

         ↓ User opens Delta
         ↓ adjustMainContent('left', 400)

STATE 2: Delta Open (Left 400px)
┌──────────┬──────────────────────────┐
│  Delta   │ Main Charts              │
│  (400px) │ margin-left: 400px       │
│          │ Charts resized to fit    │
└──────────┴──────────────────────────┘

         ↓ User opens Phasor
         ↓ adjustMainContent('right', 500)

STATE 3: Both Open (Left 400px, Right 500px)
┌──────────┬────────────┬──────────────┐
│  Delta   │   Charts   │   Phasor     │
│  (400px) │ margin-l:  │   (500px)    │
│          │ 400px      │              │
│          │ margin-r:  │ Charts in    │
│          │ 500px      │ middle only  │
└──────────┴────────────┴──────────────┘

         ↓ User closes Delta
         ↓ adjustMainContent('left', 0)

STATE 4: Only Phasor Open (Right 500px)
┌────────────────────────────┬──────────┐
│ Main Charts                │ Phasor   │
│ margin-right: 500px        │ (500px)  │
│ Charts resize to fit       │          │
└────────────────────────────┴──────────┘

         ↓ User closes Phasor
         ↓ adjustMainContent('right', 0)

STATE 5: Back to Initial
┌────────────────────────────────────┐
│         Main Charts (100%)         │
│  margin-left: 0px                  │
│  margin-right: 0px                 │
└────────────────────────────────────┘
```

---

## 🔄 Call Sequence Diagram

```
Your Code                 Utility                CSS                Charts
    │                       │                     │                   │
    │ adjustMainContent()   │                     │                   │
    ├──────────────────────>│                     │                   │
    │                       │ setStyle            │                   │
    │                       │ marginLeft: 400px   │                   │
    │                       ├────────────────────>│                   │
    │                       │                     │ Animate (0.3s)    │
    │                       │                     ├──────────────────>│
    │                       │                     │ (Smooth)          │
    │                       │                     │                   │
    │                       │ setTimeout(350ms)   │                   │
    │                       ├─────┐               │                   │
    │                       │     │ Wait...       │                   │
    │                       │     │               │                   │
    │                       │<────┘               │                   │
    │                       │ After animation     │                   │
    │                       │ finishes:           │                   │
    │                       │ resizeAllCharts()   │                   │
    │                       │                     │                   │
    │                       │ Find charts         │                   │
    │                       ├────────────────────────────────────────>│
    │                       │ chart.setSize()     │                   │
    │                       │ {width, height}     │                   │
    │                       │<────────────────────────────────────────┤
    │                       │ Console log         │                   │
    │                       │ "Charts resized"    │                   │
    │                       │                     │                   │
    │<──────────────────────┤                     │                   │
    │ Done!                 │                     │                   │
    │                       │                     │                   │
```

---

## 🎨 CSS Animation Timeline

```
Time 0ms (Initial)
margin-left: 0px
┌────────────────────────────────────┐
│         Full Width Charts          │
└────────────────────────────────────┘

Time 0ms (Call adjustMainContent)
margin-left: 0px → 400px (transition starts)
┌────────────────────────────────────┐
│         Full Width Charts          │ ← Starting to animate
└────────────────────────────────────┘

Time 150ms (Halfway through)
margin-left: ≈200px
┌──────────┬───────────────────────────┐
│  (Half)  │ Charts Shifting           │
└──────────┴───────────────────────────┘

Time 300ms (Animation complete)
margin-left: 400px
┌──────────┬───────────────────────────┐
│  Delta   │ Charts At Final Position  │
│ (400px)  │                           │
└──────────┴───────────────────────────┘

Time 350ms (Resize triggered)
resizeAllCharts() is called
setSize() recalculates width
├─ Container: 100% - 400px = X pixels
├─ Chart width = X
├─ New proportions calculated
└─ Charts redrawn at new size
```

---

## 🔌 Integration Points

```
Your Application
│
├─ Button Click
│  └─ "delta-btn" onclick
│     └─ window.open(...)
│     └─ adjustMainContent('left', 400)  ← HERE
│        │
│        └─► sidebarResize.js
│           ├─ DOM manipulation
│           ├─ CSS margin setting
│           ├─ setTimeout (wait 350ms)
│           └─ resizeAllCharts()
│              ├─ window.charts (detect)
│              ├─ window.__chartsComputed (detect)
│              └─ chart.setSize() (each chart)
│
├─ styles/main.css
│  └─ transition: margin-left 0.3s ease;
│     └─ Smooth animation
│
└─ UI Result
   └─ Smooth sidebar expansion
   └─ Charts reposition
   └─ Charts resize
   └─ Professional appearance
```

---

## 🎯 Decision Tree

```
User wants to open sidebar
│
├─ Position?
│  ├─ Left?
│  │  └─ adjustMainContent('left', width)
│  │     └─ margin-left = width
│  │        └─ Charts shift right
│  │
│  └─ Right?
│     └─ adjustMainContent('right', width)
│        └─ margin-right = width
│           └─ Charts shift left
│
├─ Width?
│  ├─ Fixed (from window.open)?
│  │  └─ Use that number (400, 500, etc)
│  │
│  └─ Dynamic (drawer)?
│     └─ Use element.offsetWidth
│
└─ Close?
   └─ adjustMainContent(position, 0)
      └─ Margin = 0
      └─ Back to full width
```

---

## 💻 JavaScript Event Flow

```
1. User clicks button
   ↓ onclick event fires
   ↓ Your code runs
   ↓
2. adjustMainContent() called
   ↓ Find main content element
   ├─ #main-content
   ├─ #charts
   └─ .charts-container
   ↓
3. Set margin style
   ├─ margin-left: 400px
   └─ margin-right: 500px
   ↓
4. CSS transition activates
   ├─ 0.3s ease animation
   ├─ Smoothly changes margin
   └─ GPU accelerated
   ↓
5. setTimeout fires after 350ms
   ├─ Animation is complete
   └─ Now safe to resize charts
   ↓
6. resizeAllCharts() executes
   ├─ Find window.charts array
   ├─ Find window.__chartsComputed array
   ├─ For each chart:
   │  ├─ Get container dimensions
   │  ├─ Call chart.setSize()
   │  └─ Chart redraws
   └─ Log: "Charts resized"
   ↓
7. User sees:
   ├─ Smooth animation (0.3s)
   ├─ Charts repositioned
   ├─ Charts resized
   └─ Professional appearance
```

---

## 🔍 Debugging Flowchart

```
"Charts don't resize"
│
├─ Check 1: Does utility exist?
│  └─ browser console: typeof adjustMainContent
│     ├─ "function" ✓
│     └─ "undefined" → Import failed
│
├─ Check 2: Can it find charts?
│  └─ browser console: window.charts
│     ├─ Array [...] ✓
│     └─ undefined → Charts not stored
│
├─ Check 3: Does margin change?
│  └─ browser console:
│     document.getElementById('charts').style.marginLeft
│     ├─ "400px" ✓
│     └─ "" → CSS not applied
│
├─ Check 4: Are charts being resized?
│  └─ Check console for:
│     ├─ "✅ Charts resized" ✓
│     └─ Error message → setSize() failed
│
└─ Check 5: All checks pass?
   └─ Test manually:
      ├─ window.charts[0].setSize({w:500, h:400})
      ├─ Should see chart resize
      └─ If not → Chart issue (not utility)
```

---

## 🎬 Animation Timeline

```
Sidebar opens →

[0ms] ─────────────────────────────────────────── Event triggered
      adjustMainContent('left', 400)

[0ms-300ms] ─░░░░░░░░░░░░░░░░░░░░░░░░░░░░░────── CSS Transition
             margin: 0px → 400px (smooth)

[350ms] ─────────────────────────────────────────── Resize triggered
        resizeAllCharts()

[350ms-360ms] ────░░░░░░░░────────────────────── Chart Detection
              Find all chart instances

[360ms-370ms] ────░░░░░░░░────────────────────── Chart Resizing
              Call setSize() on each chart

[370ms] ─────────────────────────────────────────── Complete
        Charts visible at new size ✅
```

---

## 📦 Component Relationship

```
┌─────────────────────────────────────────┐
│         Your Application                │
│  (button handlers in src/main.js)       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│    adjustMainContent() Utility          │
│   (src/utils/sidebarResize.js)          │
│                                         │
│  ├─ DOM Manipulation                    │
│  ├─ CSS Style Setting                   │
│  ├─ Timing Control (setTimeout)         │
│  └─ Chart Detection & Resizing          │
└────┬──────────────────────┬─────────────┘
     │                      │
     ▼                      ▼
┌──────────────┐    ┌──────────────┐
│ HTML/CSS     │    │ Chart Engine │
│ (margin)     │    │ (uPlot)      │
│              │    │ setSize()    │
│ styles/      │    │              │
│ main.css     │    │ window.      │
│              │    │ charts[]     │
│ transition:  │    │              │
│ 0.3s         │    │ window.__    │
│              │    │ chartsComp.. │
└──────────────┘    └──────────────┘
```

---

**These diagrams show how the system works internally and can help with understanding, implementation, and debugging.**
