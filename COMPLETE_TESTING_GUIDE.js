/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║     COMPLETE TESTING GUIDE FOR COMTRADE VIEWER                ║
 * ║  (Vertical Line Interpolation & Delta Display Features)       ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// 🚀 FASTEST WAY TO START TESTING (30 seconds)
// =============================================================================

/*
In PowerShell from project directory:

  .\start-server.ps1

This auto-detects Node.js or Python and starts the server.
Then open: http://localhost:8000

Done! The application is running.
*/

// =============================================================================
// 📋 WHAT YOU'LL NEED
// =============================================================================

/*
✓ A web browser (Chrome, Firefox, Edge, Safari)
✓ A COMTRADE file pair (CFG + DAT files)
  - OR use HR_85429_ASCII.CFG if available
✓ Node.js (v22+) OR Python 3 (auto-detected)
*/

// =============================================================================
// 🎯 TESTING THE 4 MAIN FEATURES
// =============================================================================

// FEATURE 1: Vertical Line Drawing
// ==================================
/*
Steps:
1. Load a COMTRADE file through the UI
2. Click anywhere on a chart
3. A vertical line appears

What to see:
✓ Vertical line at click position
✓ Line is color-coded (Red, Cyan, etc.)
✓ Label shows "T1" or "T2" at top
✓ Crosshair points on all series

Success criteria: Line appears and is draggable
*/

// FEATURE 2: Value Interpolation
// ===============================
/*
Steps:
1. Click on chart between two data points
2. The vertical line appears
3. Check the crosshair points

What to see:
✓ Crosshair points interpolated between samples
✓ Not just at nearest point
✓ Different sampling rates interpolate correctly
✓ No errors in browser console

Expected interpolation formula check:
  If data at X=1 is Y=20, X=2 is Y=30
  And you click at X=1.5
  Then Y should be ≈25 (linear interpolation)

Success criteria: Values appear at non-sample points
*/

// FEATURE 3: Delta Calculations
// ==============================
/*
Steps:
1. Create 2 vertical lines (click twice on chart)
2. Look at bottom section (#fixed-results)

What to see:
✓ "Δtime: X" showing time difference
✓ "ΔY: X" showing value differences
✓ Percentage changes
✓ Color-matched to each series

Example output:
  Signal A
  Δtime: 2.00 μs, ΔY: 20.00

Success criteria: Delta values show and update when dragging
*/

// FEATURE 4: Delta Box Overlay
// =============================
/*
Steps:
1. Create 2 vertical lines
2. Look at top-right corner

What to see:
✓ Semi-transparent box appears
✓ Shows "V1: X → V2: Y" for each signal
✓ Shows percentage change
✓ Color-matched to series
✓ Auto-scrolls if content overflows

Success criteria: Box shows and updates with line movement
*/

// =============================================================================
// 🧪 DETAILED TEST SCENARIOS
// =============================================================================

// SCENARIO 1: Basic Functionality
// ================================
/*
Objective: Verify core features work
Duration: 5 minutes

Steps:
1. Start server using start-server.ps1
2. Open http://localhost:8000
3. Load any COMTRADE file
4. Click on chart to create first line
5. Click again to create second line
6. Verify both lines appear and are draggable
7. Drag one line - check deltas update
8. Check #fixed-results shows delta values

Expected Result: ✓ All features work smoothly
*/

// SCENARIO 2: Interpolation Accuracy
// ==================================
/*
Objective: Verify interpolation calculations
Duration: 10 minutes

Steps:
1. Load COMTRADE file
2. Add vertical line at data point (exact sample)
   - Value should match exactly
3. Add vertical line between samples
   - Value should interpolate
   
Manual Verification:
   Data: (X=0, Y=10), (X=1, Y=20)
   Test at X=0.5
   Expected: Y = 10 + (20-10) * (0.5-0) / (1-0) = 15
   Check value in tooltip

Success: Interpolated values match formula
*/

// SCENARIO 3: Multi-Chart Synchronization
// ========================================
/*
Objective: Verify lines sync across all charts
Duration: 5 minutes

Steps:
1. Load data that creates multiple charts
   (e.g., Analog channels + Computed channels)
2. Add vertical line on one chart
3. Verify line appears on ALL charts
4. Drag line on first chart
5. Verify it moves on ALL charts
6. Drag line on different chart
7. Verify it updates everywhere

Success: Lines perfectly synchronized
*/

// SCENARIO 4: Delta Accuracy
// ==========================
/*
Objective: Verify delta calculations
Duration: 10 minutes

Steps:
1. Load file with simple data
2. Note exact values at specific points
   Example: 
   - At X=1: Signal A = 20
   - At X=3: Signal A = 40
3. Place vertical lines at X=1 and X=3
4. Check delta shows ΔY = 20 (40-20)
5. Check percentage shows 100% (20/20 * 100)

Manual Calculation:
   ΔY = V2 - V1 = 40 - 20 = 20 ✓
   % change = (ΔY / |V1|) * 100 = (20/20)*100 = 100% ✓

Success: All calculations match expected values
*/

// SCENARIO 5: Different Sampling Rates
// ====================================
/*
Objective: Verify handling different sampling rates
Duration: 10 minutes

Setup:
  Signal A: Samples every 0.01 seconds (100 Hz)
  Signal B: Samples every 0.02 seconds (50 Hz)
  Computed: Custom sampling rate

Steps:
1. Add vertical line between all sampling rates
2. Each series should interpolate independently
3. No errors should occur
4. Delta calculations should work correctly

Success: All sampling rates handled gracefully
*/

// SCENARIO 6: Edge Cases
// ======================
/*
Objective: Test error handling
Duration: 10 minutes

Test Cases:
1. Line at exact data point (no interpolation)
   - Should show exact value, no errors
2. Line at chart boundary
   - Should handle gracefully
3. Line between missing data points (nulls)
   - Should interpolate or skip gracefully
4. Very large value differences
   - Should calculate deltas correctly
5. Very small value differences
   - Should show percentage changes correctly
6. Dragging line outside data range
   - Should clamp or handle gracefully

Success: No errors, handles all edge cases
*/

// =============================================================================
// 🔍 BROWSER CONSOLE DEBUGGING
// =============================================================================

/*
Open DevTools: F12 or Ctrl+Shift+I

1. Check for JavaScript errors:
   - Red text in console = errors
   - Warnings are okay
   - Errors must be fixed

2. Test vertical lines state:
   
   window.verticalLinesX
   
   Output should look like:
   Object {
     value: [1.5, 3.0],
     _subscribers: [...],
     subscribe: ƒ(cb),
     asArray: ƒ()
   }

3. Get current line positions:
   
   window.verticalLinesX.asArray()
   
   Output: [1.5, 3.0]

4. Add lines programmatically:
   
   window.verticalLinesX.value = [2.0, 4.0]
   
   Lines should immediately appear on chart

5. Trigger delta update:
   
   window.verticalLinesX.asArray()
   
   Check #fixed-results updates

6. Check if charts exist:
   
   window.charts
   
   Should return array of chart instances

7. Manually calculate delta:
   
   const v1 = window.charts[0].data[1][0]  // First Y value of first series
   const v2 = window.charts[0].data[1][5]  // Sixth Y value of first series
   console.log('Delta:', v2 - v1)

8. View delta results HTML:
   
   document.getElementById('fixed-results').innerHTML
   
   Should show formatted delta calculations

9. Inspect delta box styling:
   
   document.querySelector('div[style*="background: rgba(0"]')
   
   Should find the delta box element
*/

// =============================================================================
// 📊 EXPECTED OUTPUT EXAMPLES
// =============================================================================

/*
When everything works:

1. Vertical Lines on Chart:
   [Red vertical line with "T1" label]
   [Cyan vertical line with "T2" label]
   [Crosshair points on each series]

2. Delta Results (#fixed-results):
   
   Signal A
   Δtime: 2.00 μs, ΔY: 20.00
   
   Signal B
   Δtime: 2.00 μs, ΔY: 30.00

3. Delta Box (top-right overlay):
   
   ┌─────────────────────────┐
   │ Δt: 2.00 μs             │
   │ Signal A                │
   │ V1: 20.00 → V2: 40.00   │
   │ ΔY: 20.00 (100%)        │
   │ Signal B                │
   │ V1: 110.00 → V2: 130.00 │
   │ ΔY: 20.00 (18.2%)       │
   └─────────────────────────┘

4. Console (no errors):
   
   [chart loaded]
   [data parsed]
   No red error text
*/

// =============================================================================
// ❌ COMMON ISSUES & FIXES
// =============================================================================

/*
ISSUE: "Cannot use import statement"
CAUSE: Running with file:// protocol instead of http://
FIX:   Use local server (start-server.ps1 or python command)

ISSUE: Vertical lines don't appear
CAUSE: Could be several things
STEPS:
  1. Open DevTools (F12)
  2. Check Console for errors (red text)
  3. Verify data loaded: window.charts
  4. Try adding manually: window.verticalLinesX.value = [1.5]
  5. Check if element exists: document.getElementById('fixed-results')

ISSUE: Deltas show NaN or undefined
CAUSE: Data might have missing values
FIX:   Check data integrity
       Verify all Y values are numbers
       Check X values are sorted

ISSUE: Interpolation gives wrong values
CAUSE: Could be formula error or data issue
DEBUG: 
  1. Check values at exact data points first
  2. Then test between points
  3. Compare to formula: y = y1 + (y2-y1) * (x-x1) / (x2-x1)
  4. Check X values are ascending

ISSUE: Port 8000 already in use
CAUSE: Another process on port 8000
FIX:   Use different port:
       PORT=8001 node server.js
       OR
       python -m http.server 8001

ISSUE: Multi-chart sync not working
CAUSE: Charts might not be linked
FIX:   Check verticalLinePlugin has getCharts callback
       Verify all charts have plugins registered
       Check console for errors
*/

// =============================================================================
// ✅ VERIFICATION CHECKLIST
// =============================================================================

/*
Run through this checklist to verify everything works:

□ Server starts without errors
□ http://localhost:8000 opens browser
□ COMTRADE file loads
□ Charts display with data
□ Can click on chart
□ Vertical line appears
□ Line is draggable
□ Deltas calculate and display
□ Interpolation works (values between samples)
□ Multi-chart sync works (if multiple charts)
□ No errors in browser console
□ Delta box overlay shows values
□ Percentage changes calculate correctly
□ All series colors match
□ Zoom/pan doesn't break features
□ Refreshing page resets properly

If ALL checked: ✓ Implementation successful!
*/

// =============================================================================
// 📞 SUPPORT INFO
// =============================================================================

/*
If you encounter issues:

1. Check browser console for error messages (F12)
2. Verify data files are valid COMTRADE format
3. Make sure you're using http:// not file://
4. Try different port if 8000 is in use
5. Clear browser cache and reload (Ctrl+Shift+Delete)
6. Try different browser to rule out browser-specific issues
7. Check that all source files are present in src/ directory

Code files to verify exist:
✓ src/plugins/verticalLinePlugin.js
✓ src/plugins/deltaBoxPlugin.js
✓ src/utils/calculateDeltas.js
✓ src/utils/helpers.js (with getNearestIndex)
✓ index.html (with #fixed-results element)
*/

export const TESTING_COMPLETE = true;
