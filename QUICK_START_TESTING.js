/**
 * QUICK START: Running & Testing the Application
 * ===============================================
 *
 * Choose your preferred method below:
 */

// =============================================================================
// OPTION 1: PowerShell (EASIEST - Recommended)
// =============================================================================

/*
From PowerShell in project directory:

  .\start-server.ps1

This will:
✓ Auto-detect Node.js or Python
✓ Start the appropriate server
✓ Display server URL
✓ You're ready to test!

Then open: http://localhost:8000
*/

// =============================================================================
// OPTION 2: Windows Command Prompt (CMD)
// =============================================================================

/*
From Command Prompt in project directory:

  start-server.bat

This will:
✓ Auto-detect Node.js or Python
✓ Start the appropriate server
✓ Display server URL

Then open: http://localhost:8000 in your browser
*/

// =============================================================================
// OPTION 3: Python (Direct)
// =============================================================================

/*
From PowerShell:

  python -m http.server 8000

Then open: http://localhost:8000

This is the easiest if you don't have Node.js installed.
*/

// =============================================================================
// OPTION 4: Node.js (Direct)
// =============================================================================

/*
From PowerShell:

  node server.js

This uses the included Node.js server script.
The server will show a nice startup banner.

Then open: http://localhost:8000
*/

// =============================================================================
// OPTION 5: VS Code Live Server Extension
// =============================================================================

/*
1. Install "Live Server" extension in VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search "Live Server"
   - Install by Ritwick Dey

2. Right-click index.html → "Open with Live Server"
   - Browser opens automatically
   - Changes auto-reload when you save files

URL will be: http://localhost:5500
*/

// =============================================================================
// TESTING WORKFLOW
// =============================================================================

/*
After starting server, follow these steps:

1. Load COMTRADE File
   ─────────────────────
   • Click "Load Files" button in the UI
   • Select a CFG file and corresponding DAT file
   • Charts will display with your data
   
   (Use HR_85429_ASCII.CFG if available)

2. Create Vertical Lines
   ───────────────────────
   • Click on any chart at a data point
   • A vertical line appears
   • Line is color-coded (T1, T2, etc.)
   
   OR add programmatically in browser console:
     window.verticalLinesX.value = [1.5, 3.0]

3. Test Interpolation
   ────────────────────
   • Check that crosshair points appear
   • Points should interpolate between data samples
   • Hover to see values in tooltip
   
   Console check:
     window.verticalLinesX.asArray()

4. Test Delta Display
   ──────────────────────
   • Look at bottom section (#fixed-results)
   • Should show Δtime and ΔY for each signal
   • Values should update when you drag lines
   
   Example output:
     Signal A: Δtime: 2.00 μs, ΔY: 20.00
     Signal B: Δtime: 2.00 μs, ΔY: 30.00

5. Drag Vertical Lines
   ─────────────────────
   • Hover near line (cursor changes to ↔)
   • Click and drag to new position
   • Deltas automatically update
   • All charts sync together
   
6. Test Delta Box
   ────────────────
   • Drag creates overlay box (top-right)
   • Shows interpolated V1 and V2 values
   • Shows percentage changes
   • Should be color-matched to series

7. Multi-Chart Synchronization
   ─────────────────────────────
   • If you have multiple charts (analog + computed)
   • Add line on one chart
   • Verify it appears on all charts
   • Drag on any chart - all update
*/

// =============================================================================
// BROWSER CONSOLE DEBUG COMMANDS
// =============================================================================

/*
Open browser DevTools (F12) → Console tab and try:

1. Check if vertical lines state exists:
   
   window.verticalLinesX
   
   Should return state object with .value and .subscribe methods

2. View current vertical lines:
   
   window.verticalLinesX.asArray()
   
   Returns array like [1.0, 2.5, ...]

3. Add vertical lines programmatically:
   
   window.verticalLinesX.value = [1.5, 3.0]
   
   Lines should immediately appear on chart

4. Check if charts loaded:
   
   window.charts
   
   Should show array of chart instances

5. Manually trigger delta calculation:
   
   import { calculateDeltas } from './src/utils/calculateDeltas.js'
   calculateDeltas([1, 3], window.charts[0], 'microseconds')

6. Check delta box overlay:
   
   document.querySelector('[style*="absolute"][style*="top"]')
   
   Should find the delta box element

7. View fixed results:
   
   document.getElementById('fixed-results').innerHTML
   
   Should show delta calculation results
*/

// =============================================================================
// EXPECTED BEHAVIOR
// =============================================================================

/*
✓ Vertical Lines:
  - Appear at clicked positions
  - Color-coded (Red, Cyan, Green, etc.)
  - Label shows "T1", "T2", etc.
  - Crosshair points on each series
  - Draggable with cursor feedback

✓ Interpolation:
  - Values interpolate between samples
  - Works with different sampling rates
  - Uses linear formula: y = y1 + (y2-y1) * (x-x1) / (x2-x1)
  - Handles edge cases gracefully

✓ Delta Display:
  - Shows in bottom section (#fixed-results)
  - Color-matched to chart series
  - Shows Δtime, ΔY, and percentage change
  - Updates when lines drag
  - Multiple delta sections for each line pair

✓ Delta Box:
  - Appears in top-right when selecting
  - Shows V1 and V2 values
  - Shows percentage change
  - Auto-scrolls if content overflows
  - Disappears when no selection
*/

// =============================================================================
// TROUBLESHOOTING
// =============================================================================

/*
Problem: "Cannot use import statement"
Solution: 
  ✓ Make sure using http:// not file://
  ✓ Run through local server (Options 1-5)
  ✓ Check browser console for errors

Problem: Vertical lines don't appear
Solution:
  1. Open DevTools (F12)
  2. Check Console for red errors
  3. Verify charts loaded: window.charts
  4. Try: window.verticalLinesX.value = [1.5]
  5. Check deltaBoxPlugin registered

Problem: Deltas not showing
Solution:
  1. Verify #fixed-results element exists
  2. Check you have 2+ vertical lines
  3. Check console for errors
  4. Verify chart has valid data

Problem: Interpolation wrong values
Solution:
  1. Check data arrays have 2+ points
  2. Verify X-axis is sorted ascending
  3. Check Y values are numbers
  4. Verify vertical line is between samples

Problem: Port 8000 already in use
Solution:
  Use different port:
    python -m http.server 8001
  OR
    PORT=8001 node server.js
*/

// =============================================================================
// QUICK COMMANDS
// =============================================================================

/*
Copy & paste into PowerShell:

METHOD 1 - Python (Simplest):
  python -m http.server 8000

METHOD 2 - Node.js:
  node server.js

METHOD 3 - PowerShell Script:
  .\start-server.ps1

Then open: http://localhost:8000
*/

// =============================================================================
// NEXT STEPS
// =============================================================================

/*
1. Choose a method above (PowerShell script recommended)
2. Run the command
3. Open browser to http://localhost:8000
4. Load a COMTRADE file
5. Click on chart to add vertical lines
6. Drag lines to test delta calculations
7. Check console (F12) for debug info
8. Try commands from Debug Commands section

You're ready to test! 🚀
*/

export const QUICK_START = true;
