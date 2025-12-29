/**
 * COPY-PASTE CODE SNIPPETS
 * ========================
 * Just copy these exact snippets into your code
 */

// ============================================
// SNIPPET 1: Add to src/main.js imports
// ============================================

/*
Add this line at the top of src/main.js:

import { adjustMainContent } from './utils/sidebarResize.js';
*/

// ============================================
// SNIPPET 2: Delta Button Click Handler
// ============================================

/*
Find your delta button click handler and replace with this:

// Delta Button - Left Sidebar (400px)
document.getElementById('delta-btn')?.addEventListener('click', () => {
  // Your existing delta window code here...
  const deltaWin = window.open(
    '',
    'Delta Window',
    'width=400,height=600,left=0,top=0'
  );
  
  // ... your existing deltaWin initialization code ...
  
  // ✅ NEW: Adjust main content
  adjustMainContent('left', 400);
  
  // ✅ NEW: Reset when closed
  deltaWin.addEventListener('beforeunload', () => {
    adjustMainContent('left', 0);
  });
});
*/

// ============================================
// SNIPPET 3: Phasor Button Click Handler
// ============================================

/*
Find your phasor button click handler and replace with this:

// Phasor Button - Right Sidebar (500px)
document.getElementById('phasor-btn')?.addEventListener('click', () => {
  // Your existing phasor window code here...
  const phasorWin = window.open(
    '',
    'Phasor Diagram',
    'width=500,height=600,right=0,top=0'
  );
  
  // ... your existing phasorWin initialization code ...
  
  // ✅ NEW: Adjust main content
  adjustMainContent('right', 500);
  
  // ✅ NEW: Reset when closed
  phasorWin.addEventListener('beforeunload', () => {
    adjustMainContent('right', 0);
  });
});
*/

// ============================================
// SNIPPET 4: Analysis Drawer Toggle
// ============================================

/*
Find your analysis drawer toggle and replace with this:

// Analysis Drawer Toggle - Left Sidebar
document.getElementById('analysis-sidebar-toggle')?.addEventListener('click', () => {
  const drawer = document.getElementById('analysis-drawer');
  
  if (drawer.style.display === 'none' || !drawer.style.display) {
    // OPENING
    drawer.style.display = 'block';
    
    // ✅ NEW: Get drawer width and adjust
    const drawerWidth = drawer.offsetWidth;
    adjustMainContent('left', drawerWidth);
    console.log(`Analysis drawer opened - ${drawerWidth}px`);
  } else {
    // CLOSING
    drawer.style.display = 'none';
    
    // ✅ NEW: Reset to full width
    adjustMainContent('left', 0);
    console.log('Analysis drawer closed');
  }
});
*/

// ============================================
// SNIPPET 5: Quick Dimension Reference
// ============================================

/*
Use these widths when calling adjustMainContent:

Delta Window:      400px  → adjustMainContent('left', 400)
Phasor Window:     500px  → adjustMainContent('right', 500)
Analysis Drawer:   350px  → adjustMainContent('left', drawer.offsetWidth)
Channel List:      400px  → adjustMainContent('right', 400)

Close any:         0px    → adjustMainContent('left', 0) or adjustMainContent('right', 0)
*/

// ============================================
// SNIPPET 6: Testing in Console
// ============================================

/*
Paste these in browser console (F12 → Console) to test:

// Test 1: Open Delta only
adjustMainContent('left', 400);

// Test 2: Open Phasor only  
adjustMainContent('right', 500);

// Test 3: Open both
adjustMainContent('left', 400);
adjustMainContent('right', 500);

// Test 4: Close all
adjustMainContent('left', 0);
adjustMainContent('right', 0);

// Test 5: Simulated rapid opens/closes
adjustMainContent('left', 400);
setTimeout(() => adjustMainContent('left', 0), 2000);

You should see charts smoothly resize each time!
*/

// ============================================
// SNIPPET 7: Complete main.js Integration
// ============================================

/*
Here's how your src/main.js button handlers might look:

// At the top of file
import { adjustMainContent } from './utils/sidebarResize.js';

// ... other imports ...

// Somewhere in your initialization code:
function setupSidebarButtons() {
  // Delta button (left side, 400px)
  const deltaBtn = document.getElementById('delta-btn');
  if (deltaBtn) {
    deltaBtn.addEventListener('click', () => {
      const deltaWin = window.open('', 'Delta Window', 'width=400,height=600,left=0,top=0');
      
      // ... your delta initialization ...
      
      adjustMainContent('left', 400);
      deltaWin.addEventListener('beforeunload', () => {
        adjustMainContent('left', 0);
      });
    });
  }

  // Phasor button (right side, 500px)
  const phasorBtn = document.getElementById('phasor-btn');
  if (phasorBtn) {
    phasorBtn.addEventListener('click', () => {
      const phasorWin = window.open('', 'Phasor Diagram', 'width=500,height=600,right=0,top=0');
      
      // ... your phasor initialization ...
      
      adjustMainContent('right', 500);
      phasorWin.addEventListener('beforeunload', () => {
        adjustMainContent('right', 0);
      });
    });
  }

  // Analysis drawer toggle (left side, dynamic width)
  const analysisToggle = document.getElementById('analysis-sidebar-toggle');
  if (analysisToggle) {
    analysisToggle.addEventListener('click', () => {
      const drawer = document.getElementById('analysis-drawer');
      if (drawer.style.display === 'none' || !drawer.style.display) {
        drawer.style.display = 'block';
        adjustMainContent('left', drawer.offsetWidth);
      } else {
        drawer.style.display = 'none';
        adjustMainContent('left', 0);
      }
    });
  }
}

// Call when DOM is ready
setupSidebarButtons();
*/

// ============================================
// SNIPPET 8: Troubleshooting
// ============================================

/*
If charts don't resize:

1. Check console for errors:
   - Open DevTools (F12)
   - Look for red errors
   - Run: adjustMainContent('left', 400)

2. Verify chart containers exist:
   console.log(document.getElementById('charts'));
   console.log(document.getElementById('main-content'));

3. Check if charts are stored:
   console.log(window.charts);
   console.log(window.__chartsComputed);

4. Manually test resize:
   if (window.charts[0]) {
     window.charts[0].setSize({ width: 500, height: 400 });
   }

5. View computed margins:
   console.log(document.getElementById('charts').style.marginLeft);
   console.log(document.getElementById('charts').style.marginRight);
*/

// ============================================
// FILES CREATED
// ============================================

/*
1. src/utils/sidebarResize.js
   - adjustMainContent(position, sidebarWidth)
   - resizeAllCharts()
   - getElementWidth(elementId)

2. styles/main.css
   - Added CSS transitions for smooth resize

3. SIDEBAR_RESIZE_SIMPLE_EXAMPLE.js
   - Complete working examples

4. SIDEBAR_RESIZE_QUICK_GUIDE.md
   - Quick reference guide

5. This file (COPY_PASTE_SNIPPETS.js)
   - Ready-to-use code snippets
*/

// ============================================
// SUMMARY
// ============================================

/*
✅ To implement:
1. Import the utility in src/main.js
2. Call adjustMainContent('left', width) when sidebar opens
3. Call adjustMainContent('left', 0) when sidebar closes
4. Do the same for 'right' if needed
5. Done! Charts auto-resize

✅ That's it! 3 lines per sidebar.

✅ No event listeners
✅ No manual chart resizing
✅ No complex calculations
✅ No CSS modifications needed

The utility handles everything automatically.
*/
