# Quick Reference Card - Sidebar Resize

## 🎯 The Function

```javascript
adjustMainContent(position, sidebarWidth);
```

| Parameter    | Type   | Example | Meaning                     |
| ------------ | ------ | ------- | --------------------------- |
| position     | string | 'left'  | Which side to adjust        |
|              |        | 'right' |                             |
| sidebarWidth | number | 400     | Sidebar width in pixels     |
|              |        | 0       | Close (reset to full width) |

---

## 📝 Common Use Cases

### Open Left Sidebar (400px)

```javascript
adjustMainContent("left", 400);
```

### Close Left Sidebar

```javascript
adjustMainContent("left", 0);
```

### Open Right Sidebar (500px)

```javascript
adjustMainContent("right", 500);
```

### Close Right Sidebar

```javascript
adjustMainContent("right", 0);
```

### Open Both

```javascript
adjustMainContent("left", 400);
adjustMainContent("right", 500);
```

### Close Both

```javascript
adjustMainContent("left", 0);
adjustMainContent("right", 0);
```

---

## 🔧 Delta Button (Typical)

```javascript
document.getElementById("delta-btn")?.addEventListener("click", () => {
  const deltaWin = window.open("", "Delta Window", "width=400,height=600");
  adjustMainContent("left", 400); // OPEN
  deltaWin.addEventListener("beforeunload", () => {
    adjustMainContent("left", 0); // CLOSE
  });
});
```

---

## 🔧 Phasor Button (Typical)

```javascript
document.getElementById("phasor-btn")?.addEventListener("click", () => {
  const phasorWin = window.open("", "Phasor Diagram", "width=500,height=600");
  adjustMainContent("right", 500); // OPEN
  phasorWin.addEventListener("beforeunload", () => {
    adjustMainContent("right", 0); // CLOSE
  });
});
```

---

## 🔧 Drawer Toggle (Typical)

```javascript
document.getElementById("drawer-toggle")?.addEventListener("click", () => {
  const drawer = document.getElementById("my-drawer");
  if (drawer.style.display === "none") {
    drawer.style.display = "block";
    adjustMainContent("left", drawer.offsetWidth); // OPEN
  } else {
    drawer.style.display = "none";
    adjustMainContent("left", 0); // CLOSE
  }
});
```

---

## 📊 Width Reference

```
Delta Window:           400px
Phasor Window:          500px
Analysis Drawer:        350px
Channel List Drawer:    400px
Custom Drawer:          drawer.offsetWidth
```

---

## 🧪 Console Testing

```javascript
// Test left
adjustMainContent("left", 400);

// Test right
adjustMainContent("right", 500);

// Test both
adjustMainContent("left", 400);
adjustMainContent("right", 500);

// Test close
adjustMainContent("left", 0);
adjustMainContent("right", 0);
```

Expected: Charts shift and resize smoothly ✅

---

## 🎨 CSS Transitions

The utility uses these CSS transitions (already added to styles/main.css):

```css
#main-content,
#charts,
.charts-container {
  transition: margin-left 0.3s ease, margin-right 0.3s ease;
}
```

**Duration**: 0.3s (300ms)
**Timing**: ease (smooth)
**Properties**: margin-left, margin-right

To customize:

```css
transition: margin-left 0.5s ease, margin-right 0.5s ease; /* Slower */
transition: margin-left 0.1s ease, margin-right 0.1s ease; /* Faster */
```

---

## 📊 Visual Reference

### State 1: No Sidebars

```
Main Charts: 100% width
Margin Left: 0px
Margin Right: 0px
```

### State 2: Left Sidebar Open (400px)

```
Main Charts: calc(100% - 400px)
Margin Left: 400px
Margin Right: 0px
```

### State 3: Right Sidebar Open (500px)

```
Main Charts: calc(100% - 500px)
Margin Left: 0px
Margin Right: 500px
```

### State 4: Both Sidebars Open

```
Main Charts: calc(100% - 900px)
Margin Left: 400px
Margin Right: 500px
```

---

## ✅ Checklist - Before Using

- [ ] `src/utils/sidebarResize.js` created ✓
- [ ] `styles/main.css` updated ✓
- [ ] Import added to `src/main.js` ✓
- [ ] Button handlers updated ✓
- [ ] No console errors ✓
- [ ] Tested in browser ✓

---

## 🚀 Integration Template

### Minimal (Copy-Paste Ready)

```javascript
// Step 1: Add import at top of src/main.js
import { adjustMainContent } from "./utils/sidebarResize.js";

// Step 2: Add to your button handlers
// Delta Button
deltaBtn.addEventListener("click", () => {
  const win = window.open("", "Delta", "width=400,height=600");
  adjustMainContent("left", 400);
  win.addEventListener("beforeunload", () => {
    adjustMainContent("left", 0);
  });
});

// Phasor Button
phasorBtn.addEventListener("click", () => {
  const win = window.open("", "Phasor", "width=500,height=600");
  adjustMainContent("right", 500);
  win.addEventListener("beforeunload", () => {
    adjustMainContent("right", 0);
  });
});
```

---

## 📞 Troubleshooting

### Charts don't resize?

```javascript
console.log(window.charts); // Check exists
console.log(window.__chartsComputed); // Check exists
```

### No margin appears?

```javascript
adjustMainContent("left", 400);
const el = document.getElementById("charts");
console.log(el.style.marginLeft); // Check CSS applied
```

### Too slow/fast?

Edit `styles/main.css` transition duration:

```css
transition: margin-left 0.3s ease;    /* 0.3s = 300ms */
                       ^^^^^ adjust this
```

---

## 🔗 File Locations

| File                               | Purpose                   |
| ---------------------------------- | ------------------------- |
| `src/utils/sidebarResize.js`       | Main utility function     |
| `styles/main.css`                  | CSS transitions (updated) |
| `SIDEBAR_RESIZE_QUICK_GUIDE.md`    | Detailed guide            |
| `COPY_PASTE_SNIPPETS.js`           | Code snippets             |
| `SIDEBAR_RESIZE_SIMPLE_EXAMPLE.js` | Working examples          |

---

## 💡 Tips

1. **Calculate width from window.open()**:

   ```javascript
   'width=400,height=600'  →  Use 400 in adjustMainContent
   ```

2. **Get dynamic drawer width**:

   ```javascript
   const drawerWidth = drawer.offsetWidth; // Get actual width
   adjustMainContent("left", drawerWidth);
   ```

3. **Verify charts exist**:

   ```javascript
   window.charts = [chart1, chart2, ...];           // Set by your code
   window.__chartsComputed = [computedChart, ...];  // Set by your code
   ```

4. **Watch resize in action**:
   ```javascript
   // Slowly open/close to see animation
   adjustMainContent("left", 100);
   adjustMainContent("left", 200);
   adjustMainContent("left", 300);
   adjustMainContent("left", 400);
   adjustMainContent("left", 0);
   ```

---

## 📌 Remember

- ✅ Position: 'left' or 'right'
- ✅ Width: 0 to close, number to open
- ✅ Import once, use many times
- ✅ CSS transition: 0.3s (automatic)
- ✅ Chart resize: automatic
- ✅ Works with any sidebar width
- ✅ Both sidebars work together

---

## 🎯 Quick Decision Tree

```
Need to open a sidebar?
  ├─ Left side?    → adjustMainContent('left', width)
  └─ Right side?   → adjustMainContent('right', width)

Need to close a sidebar?
  ├─ Left side?    → adjustMainContent('left', 0)
  └─ Right side?   → adjustMainContent('right', 0)

Want to know sidebar width?
  ├─ Fixed?        → Use number from window.open()
  └─ Dynamic?      → Use element.offsetWidth
```

---

**That's all you need to know! Use this card as a reference.** ✨
