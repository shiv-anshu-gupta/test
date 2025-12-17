/**
 * HOW TO RUN & TEST THE APPLICATION
 * ==================================
 *
 * This is a vanilla JavaScript application using ES6 modules.
 * You need to run it through a local web server (not file:// protocol).
 *
 *
 * METHOD 1: Using Python (Easiest if Python is installed)
 * ========================================================
 *
 * From PowerShell in the project directory:
 *
 *   # Python 3.x
 *   python -m http.server 8000
 *
 *   Then open: http://localhost:8000
 *
 *
 * METHOD 2: Using Node.js http-server package
 * =============================================
 *
 * From PowerShell:
 *
 *   # Install globally (one-time)
 *   npm install -g http-server
 *
 *   # Run server
 *   http-server
 *
 *   Then open: http://localhost:8080
 *
 *
 * METHOD 3: Using Live Server (VS Code Extension)
 * ================================================
 *
 * 1. Install "Live Server" extension in VS Code
 * 2. Right-click on index.html → "Open with Live Server"
 * 3. Browser opens automatically at http://localhost:5500
 * 4. Changes auto-reload
 *
 *
 * METHOD 4: Using Node.js built-in server (Node 18+)
 * ==================================================
 *
 * From PowerShell:
 *
 *   node --run "node -e \"require('http').createServer((req,res)=>{res.end(require('fs').readFileSync(req.url===\\\"/\\\"?\\\"index.html\\\":req.url))}).listen(8000)\""
 *
 * Or create a simple server.js (see METHOD 5)
 *
 *
 * METHOD 5: Create a simple server.js file
 * ========================================
 *
 * Create file: server.js in project root
 *
 *   const http = require('http');
 *   const fs = require('fs');
 *   const path = require('path');
 *
 *   const server = http.createServer((req, res) => {
 *     let filePath = req.url === '/' ? 'index.html' : req.url;
 *     filePath = path.join(__dirname, filePath);
 *
 *     try {
 *       const content = fs.readFileSync(filePath);
 *       res.end(content);
 *     } catch (err) {
 *       res.statusCode = 404;
 *       res.end('Not found');
 *     }
 *   });
 *
 *   server.listen(8000, () => {
 *     console.log('Server running at http://localhost:8000');
 *   });
 *
 * Then run:
 *   node server.js
 *
 *
 * TESTING WORKFLOW:
 * =================
 *
 * 1. Start server (use METHOD 1-5 above)
 * 2. Open browser to http://localhost:8000 (or appropriate port)
 * 3. You should see: "COMTRADE Viewer - Fault Recording Analysis"
 *
 *
 * TESTING VERTICAL LINES & DELTA DISPLAY:
 * ========================================
 *
 * 1. Load a COMTRADE file (CFG + DAT pair)
 *    - Click "Load Files" or drag/drop
 *
 * 2. Charts will display with your data
 *
 * 3. Create vertical lines:
 *    - Click on a chart at desired X positions
 *    - Or use keyboard shortcut (check implementation)
 *
 * 4. Vertical lines will appear with:
 *    ✓ Color-coded vertical bars
 *    ✓ Crosshair points showing interpolated values
 *    ✓ Line labels (T1, T2, etc)
 *
 * 5. Drag vertical lines:
 *    - Hover near line (cursor changes to ↔)
 *    - Click and drag to new position
 *    - Deltas auto-calculate and display
 *
 * 6. Delta results display:
 *    - Bottom section shows "Δtime" for each signal
 *    - Shows ΔY (value difference) and percentage change
 *    - Color-matched to chart series
 *
 * 7. Delta overlay box (top-right):
 *    - Shows when you drag vertical lines
 *    - Displays interpolated V1 and V2 values
 *    - Shows percentage changes
 *
 *
 * BROWSER CONSOLE DEBUGGING:
 * ==========================
 *
 * Open browser DevTools (F12) and check:
 *
 * 1. Console tab for errors
 *    - Log statements from plugins
 *    - Any interpolation or delta calculation errors
 *
 * 2. Network tab
 *    - Verify CFG and DAT files load correctly
 *    - Check for 404 errors
 *
 * 3. Application tab
 *    - Inspect DOM elements (#fixed-results element)
 *    - Check delta box overlay positioning
 *    - Verify vertical line canvas drawing
 *
 * 4. Console commands to test:
 *
 *    // Check if vertical lines state exists
 *    window.verticalLinesX
 *
 *    // Add a vertical line programmatically
 *    window.verticalLinesX.value = [1.5]
 *
 *    // View current vertical lines
 *    window.verticalLinesX.asArray()
 *
 *    // Check if charts are loaded
 *    window.charts
 *
 *
 * TEST SCENARIOS:
 * ===============
 *
 * Scenario 1: Basic Interpolation
 * --------------------------------
 * 1. Load a COMTRADE file with uniform sampling
 * 2. Add vertical line at X = 0.5 (between samples)
 * 3. Check that crosshair points interpolate Y values
 * 4. Verify values match linear interpolation formula
 *
 *
 * Scenario 2: Multiple Sampling Rates
 * ------------------------------------
 * 1. Create computed channel at different sampling rate
 * 2. Add vertical line between samples
 * 3. Verify both signals show interpolated values
 * 4. Check that different rates don't cause errors
 *
 *
 * Scenario 3: Delta Calculations
 * --------------------------------
 * 1. Add two vertical lines on chart
 * 2. Check #fixed-results element shows deltas
 * 3. Verify: ΔY = V2 - V1 for each signal
 * 4. Verify: % change = (ΔY / |V1|) * 100
 * 5. Drag one line and confirm deltas update
 *
 *
 * Scenario 4: Multi-Chart Synchronization
 * ----------------------------------------
 * 1. Display both analog and computed channel charts
 * 2. Add vertical line on one chart
 * 3. Verify line appears on all charts
 * 4. Drag line on any chart
 * 5. Confirm all charts update together
 *
 *
 * Scenario 5: Edge Cases
 * ----------------------
 * 1. Line at exact data point (no interpolation needed)
 * 2. Line at chart boundaries
 * 3. Line with missing/null data points
 * 4. Charts with very different time scales
 * 5. Very high or very low values
 *
 *
 * SAMPLE COMTRADE FILES FOR TESTING:
 * ===================================
 *
 * If you don't have COMTRADE files, create a simple test:
 *
 * 1. Create a test CFG file (HR_85429_ASCII.CFG is included)
 * 2. Create a test DAT file with sample data
 * 3. Load through the UI
 *
 * Or use the included HR_85429_ASCII.CFG and generate DAT data
 *
 *
 * COMMON ISSUES & FIXES:
 * ======================
 *
 * Issue: "Cannot use import statement"
 * Fix: Make sure you're using http:// not file:// protocol
 *      Run through a local server (see METHOD 1-5)
 *
 *
 * Issue: Vertical lines don't appear
 * Fix: 1. Open DevTools → Console
 *      2. Check for errors (red text)
 *      3. Verify charts are loaded
 *      4. Try: window.verticalLinesX.value = [1.0]
 *      5. Check if deltaBoxPlugin is registered
 *
 *
 * Issue: Deltas not calculating
 * Fix: 1. Verify #fixed-results element exists
 *      2. Check that you have 2+ vertical lines
 *      3. Open DevTools and check console for errors
 *      4. Verify calculateDeltas function is called
 *      5. Check that chart has valid data
 *
 *
 * Issue: Interpolation not working
 * Fix: 1. Verify data arrays have at least 2 points
 *      2. Check X-axis data is sorted ascending
 *      3. Verify Y values are numbers (not null/undefined)
 *      4. Check that vertical line X is between data points
 *
 *
 * Issue: Multi-chart sync not working
 * Fix: 1. Verify both charts have plugins registered
 *      2. Check that verticalLinesX is shared between charts
 *      3. Verify getCharts() callback returns all chart instances
 *      4. Check console for errors in mousemove handler
 *
 *
 * QUICK START (COPY-PASTE):
 * =========================
 *
 * In PowerShell, from project directory:
 *
 *   # Start Python server
 *   python -m http.server 8000
 *
 *   # Open browser (or do manually)
 *   # Then load COMTRADE file through UI
 *   # Click on chart to add vertical lines
 *   # Drag lines to see delta calculations
 *
 *
 * NEXT: Open http://localhost:8000 in your browser!
 *
 */

export const TESTING_GUIDE = true;
