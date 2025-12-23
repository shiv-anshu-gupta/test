# COMTRADE File Merger Integration - Testing Guide

## Overview
This document provides complete testing instructions for the integrated merger functionality in the COMTRADE viewer application. The merger app is now fully integrated with the main app through postMessage communication.

## Architecture Summary

### Components
1. **Main App** (`src/main.js`, `index.html`)
   - Contains "🔗 Merge Multiple Files" button
   - Handles file loading and chart rendering
   - Receives merged file data from merger app

2. **Merger Window Launcher** (`src/utils/mergerWindowLauncher.js`)
   - Manages window.open() for merger app
   - Handles postMessage communication
   - Routes messages by type
   - Dispatches custom event for merged files

3. **Merger App** (`comtrade-combiner/src/app.js`, `comtrade-combiner/index.html`)
   - Runs in separate window
   - Provides file selection and merging UI
   - Sends merged CFG/DAT back to main app via postMessage
   - Sends "merger_ready" on initialization

### Communication Flow
```
1. User clicks "Merge Multiple Files" button
   ↓
2. Main app calls openMergerWindow()
   ↓
3. Merger app opens in new window
   ↓
4. Merger app sends "merger_ready" message
   ↓
5. User selects files and clicks "Analyze Files"
   ↓
6. User clicks "Combine & Export"
   ↓
7. Merger app processes and sends "merged_files_ready" message
   ↓
8. Main app receives custom event "mergedFilesReceived"
   ↓
9. Main app processes through 8-phase pipeline
   ↓
10. Charts render with merged data
```

## Pre-Testing Checklist

### Files to Verify
- ✅ `src/utils/mergerWindowLauncher.js` - Window manager (276 lines)
- ✅ `index.html` - Contains "🔗 Merge Multiple Files" button
- ✅ `src/main.js` - Contains merger button handler and mergedFilesReceived listener
- ✅ `comtrade-combiner/src/app.js` - Updated with postMessage functionality
- ✅ `comtrade-combiner/index.html` - UI for merger app

### Compilation Status
- ✅ No errors found in any modified files
- ✅ All imports valid
- ✅ All functions properly defined

## Test Scenarios

### Test 1: Basic Merger Window Launch
**Objective:** Verify that clicking the merger button opens the merger app window

**Steps:**
1. Start the main COMTRADE app in browser
   ```bash
   npm start
   # or manually open index.html
   ```
2. Locate the "🔗 Merge Multiple Files" button (should be adjacent to "Load Files" button)
3. Click the button
4. Verify:
   - New window opens (not blocked by browser)
   - URL shows `comtrade-combiner/index.html`
   - Window title shows COMTRADE File Combiner
   - Browser console shows no errors

**Expected Outcome:**
- Merger window opens successfully
- Console logs: "[main.js] Opening COMTRADE File Merger..."
- Console logs: "[mergerWindowLauncher] Opening merger window at: comtrade-combiner/index.html"
- Merger window console logs: "[ComtradeComberApp] Notified main app that merger is ready"

**Pass/Fail:** ___

---

### Test 2: Merger Ready Signal
**Objective:** Verify that merger app sends "merger_ready" message on initialization

**Steps:**
1. From Test 1, keep both windows open
2. Open browser DevTools in main app (F12)
3. Go to Console tab
4. Look for message: "[mergerWindowLauncher] Received message from merger app: merger_ready"
5. Verify merger app console also shows ready message

**Expected Output:**
```
[mergerWindowLauncher] Window opened successfully
[mergerWindowLauncher] Received message from merger app: merger_ready
```

**Pass/Fail:** ___

---

### Test 3: File Selection in Merger App
**Objective:** Verify that merger app correctly handles file selection

**Steps:**
1. In the open merger app window
2. Click "Choose Files" button
3. Select 2-3 matching CFG/DAT file pairs from your test data
4. Verify file list updates showing selected files

**Expected Outcome:**
- File pairs display correctly in "Selected Files" section
- File count updates
- "Analyze Files" button becomes enabled

**Pass/Fail:** ___

---

### Test 4: File Analysis in Merger App
**Objective:** Verify that merger app analyzes files correctly

**Steps:**
1. With files selected (from Test 3)
2. Click "Analyze Files" button
3. Wait for analysis to complete
4. Verify "Analysis Results" tab populates with:
   - Time span information
   - Channel counts (analog/digital)
   - Time-window groups
   - Duplicate detection results (if applicable)

**Expected Outcome:**
- Analysis completes successfully
- Results show detailed breakdown of each time window
- "Combine & Export" button becomes enabled

**Pass/Fail:** ___

---

### Test 5: File Combination and Data Sending
**Objective:** Verify that merger app sends merged files back to main app via postMessage

**Steps:**
1. With files analyzed (from Test 4)
2. Open DevTools in main app and go to Console
3. In merger app, click "Combine & Export" button
4. Wait for completion (status shows "✅ Combination complete!")
5. In main app console, check for message:
   ```
   [mergerWindowLauncher] Received message from merger app: merged_files_ready
   ```

**Expected Console Output (Main App):**
```
[mergerWindowLauncher] Received message from merger app: merged_files_ready
[mergerWindowLauncher] Merged files received. Payload:
{
  cfg: {stationName: "...", deviceName: "...", analogChannels: [...], ...},
  datContent: "1,1234,5678,...\n2,1234,5678,...\n...",
  filenames: ["file1", "file2", "file3"],
  fileCount: 3,
  mergedGroups: 1,
  groupFiles: [...]
}
```

**Expected Console Output (Merger App):**
```
[combineFiles] Sending merged files back to main app...
[combineFiles] Merged files sent to main app successfully
```

**Pass/Fail:** ___

---

### Test 6: Merged File Processing in Main App
**Objective:** Verify that main app receives and processes merged files through 8-phase pipeline

**Steps:**
1. From Test 5, after merger sends data
2. In main app console, observe processing messages
3. Should see messages like:
   ```
   [mergedFilesReceived] PHASE 1: Parsing merged CFG/DAT data
   [mergedFilesReceived] PHASE 2: Initializing data state with merged data
   [mergedFilesReceived] PHASE 3: Channel state initialization from merged files
   [mergedFilesReceived] PHASE 4: Rendering charts with merged data
   [mergedFilesReceived] PHASE 5: Initializing polar chart (deferred)
   [mergedFilesReceived] PHASE 6: Loading computed channels
   [mergedFilesReceived] PHASE 7: Chart integrations
   [mergedFilesReceived] PHASE 8: Final setup - vertical line control
   ```
4. Verify UI updates:
   - Loading spinner appears during processing
   - Status shows processing progress
   - Charts render with merged data
   - Channel list populates with merged channels

**Expected Outcome:**
- All 8 phases complete successfully
- Charts display merged data
- Console shows no errors
- UI responsive and interactive

**Pass/Fail:** ___

---

### Test 7: Chart Verification with Merged Data
**Objective:** Verify that charts render correctly with merged file data

**Steps:**
1. After merged files load (from Test 6)
2. Verify in main app:
   - Time chart displays data across all merged files
   - Polar chart shows waveform data
   - Channel list shows all merged channels
   - Channel count matches analysis results from merger app
3. Click on different channels in channel list
4. Verify each channel's data displays correctly
5. Test zoom and pan functionality

**Expected Outcome:**
- Time chart shows continuous merged data
- Polar chart displays properly
- Channel selection works
- All chart interactions responsive
- Data looks correct and continuous

**Pass/Fail:** ___

---

### Test 8: Error Handling - Merger Window Close
**Objective:** Verify graceful handling when merger window is closed

**Steps:**
1. Open merger window (from Test 1)
2. Close the merger window manually (X button or Alt+F4)
3. Check main app console for:
   ```
   [mergerWindowLauncher] Received message from merger app: merger_closed
   [mergerWindowLauncher] Merger window closed
   ```
4. Try clicking "Merge Multiple Files" button again
5. Verify new window opens successfully

**Expected Outcome:**
- Main app detects merger window closure
- Console logs closure message
- Button click opens new merger window successfully
- No memory leaks or console errors

**Pass/Fail:** ___

---

### Test 9: Error Handling - Analysis Failure
**Objective:** Verify error handling when file analysis fails

**Steps:**
1. In merger app, select an invalid or corrupted file
2. Click "Analyze Files"
3. Verify error message displays in merger app UI
4. Check main app console for error message from merger app:
   ```
   [mergerWindowLauncher] Received message from merger app: merger_error
   ```
5. Verify main app continues functioning normally

**Expected Outcome:**
- Error displayed in merger app UI
- Error message sent to main app via postMessage
- Main app handles error gracefully
- No console errors in main app

**Pass/Fail:** ___

---

### Test 10: End-to-End Workflow
**Objective:** Complete workflow test from file selection to chart display

**Steps:**
1. Start main COMTRADE app
2. Load some initial COMTRADE files using "Load Files" button
3. Click "Merge Multiple Files" button
4. In merger window:
   - Select 2-3 CFG/DAT pairs
   - Click "Analyze Files"
   - Configure options (remove duplicates, similar channels)
   - Click "Combine & Export"
5. Wait for merged data to process in main app
6. Verify:
   - Charts display merged data
   - Channel list shows all merged channels
   - Interactions work smoothly
   - No console errors

**Expected Outcome:**
- Complete workflow functions correctly
- All features work together seamlessly
- User can switch between original and merged data loading
- Application remains stable

**Pass/Fail:** ___

---

## Console Message Checklist

### Expected Main App Messages (in order)
- [ ] `[main.js] Opening COMTRADE File Merger...`
- [ ] `[mergerWindowLauncher] Opening merger window at: ...`
- [ ] `[mergerWindowLauncher] Window opened successfully`
- [ ] `[mergerWindowLauncher] Received message from merger app: merger_ready`
- [ ] `[mergerWindowLauncher] Received message from merger app: merged_files_ready` (after combine)
- [ ] `[mergerWindowLauncher] Merged files received. Payload: {...}`
- [ ] `[mergedFilesReceived] PHASE 1: Parsing merged CFG/DAT data`
- [ ] `[mergedFilesReceived] PHASE 2: Initializing data state with merged data`
- [ ] `[mergedFilesReceived] PHASE 3: Channel state initialization from merged files`
- [ ] `[mergedFilesReceived] PHASE 4: Rendering charts with merged data`
- [ ] `[mergedFilesReceived] PHASE 5: Initializing polar chart`
- [ ] `[mergedFilesReceived] PHASE 6: Loading computed channels`
- [ ] `[mergedFilesReceived] PHASE 7: Chart integrations`
- [ ] `[mergedFilesReceived] PHASE 8: Final setup - vertical line control`

### Expected Merger App Messages
- [ ] `[ComtradeComberApp] Notified main app that merger is ready`
- [ ] `[combineFiles] Sending merged files back to main app...`
- [ ] `[combineFiles] Merged files sent to main app successfully`
- [ ] `[parseCFGContent] Parsed CFG: {...}`

---

## Known Issues & Limitations

### Current Implementation
- Merger app sends first merged group only
- CFG parsing uses string-based approach (simplified)
- DAT content sent as string for simplicity
- No multi-window queueing (only one active merger window)

### Future Enhancements
- Support multiple merged groups
- Add automatic window closing after successful merge
- Implement progress notification during processing
- Add retry mechanism for failed transmissions
- Support for binary DAT file format

---

## Browser Console Debugging Tips

### View All PostMessage Events
```javascript
// In main app console:
window.addEventListener("message", (e) => {
  console.log("[DEBUG] PostMessage received:", e.data);
});
```

### Monitor Merger Window Status
```javascript
// In main app console:
import { isMergerWindowOpen } from "./src/utils/mergerWindowLauncher.js";
setInterval(() => {
  console.log("[DEBUG] Merger window open:", isMergerWindowOpen());
}, 1000);
```

### Check Processed Data
```javascript
// After merged files load:
console.log("[DEBUG] Data state:", window.dataState);
console.log("[DEBUG] Channel state:", window.channelState);
console.log("[DEBUG] Chart instance:", window.chart);
```

---

## Testing Results Summary

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Merger Window Launch | ✓/✗ | |
| 2 | Merger Ready Signal | ✓/✗ | |
| 3 | File Selection | ✓/✗ | |
| 4 | File Analysis | ✓/✗ | |
| 5 | Data Sending | ✓/✗ | |
| 6 | Merged File Processing | ✓/✗ | |
| 7 | Chart Verification | ✓/✗ | |
| 8 | Error Handling (Close) | ✓/✗ | |
| 9 | Error Handling (Failure) | ✓/✗ | |
| 10 | End-to-End Workflow | ✓/✗ | |

**Overall Status:** ___________

**Date Tested:** ___________

**Tester Name:** ___________

**Comments:**
```
________________________________________________________________________

________________________________________________________________________

________________________________________________________________________
```

---

## Support & Troubleshooting

### Issue: Merger window won't open
**Solution:**
- Check browser popup blocker settings
- Verify comtrade-combiner/index.html exists
- Check browser console for errors
- Verify window.open() is not being blocked by security policy

### Issue: No message received from merger app
**Solution:**
- Check both windows are from same origin or using CORS correctly
- Verify postMessage is sending to correct window reference
- Check for JavaScript errors in merger app console
- Verify source field matches "MergerApp"

### Issue: Merged data not displaying in charts
**Solution:**
- Check CFG parsing is working (console: [parseCFGContent])
- Verify datContent format is correct
- Check channel names and units are parsed
- Verify time array and data arrays have matching lengths

### Issue: Charts render but data looks wrong
**Solution:**
- Verify scale and offset values in CFG are correct
- Check that analog/digital channels are properly separated
- Verify file order in merger app matches expected time sequence
- Check for gaps or overlaps in time data

---

## Files Modified for Integration

1. **New File:** `src/utils/mergerWindowLauncher.js`
   - 276 lines
   - Handles window management and postMessage communication

2. **Modified:** `index.html`
   - Added: "🔗 Merge Multiple Files" button
   - Location: upload-actions section (adjacent to Load Files button)

3. **Modified:** `src/main.js`
   - Added: Import for mergerWindowLauncher
   - Added: Click handler for merge button
   - Added: Event listener for "mergedFilesReceived" (300+ lines)
   - Contains: Complete 8-phase processing pipeline

4. **Modified:** `comtrade-combiner/src/app.js`
   - Added: "merger_ready" message in constructor
   - Updated: combineFiles() method to send merged data via postMessage
   - Added: parseCFGContent() helper method for CFG parsing
   - Improved: Error handling with postMessage notification

---

## Success Criteria Verification

- [ ] Merger window opens successfully when button clicked
- [ ] Merger app detects it was opened by main app
- [ ] Merger app sends "merger_ready" message
- [ ] User can select and analyze files in merger app
- [ ] After combining, merged data sent via postMessage
- [ ] Main app receives and processes merged files
- [ ] Charts render with merged data correctly
- [ ] All 8 phases complete without errors
- [ ] Channel list populates with merged channels
- [ ] Chart interactions work (zoom, pan, select)
- [ ] No console errors in either window
- [ ] Graceful handling of window closure
- [ ] Error messages displayed appropriately

---

## Version Information

- **Integration Date:** [Current Date]
- **Main App Version:** 2.0
- **Merger App Version:** 1.0
- **Communication Protocol:** postMessage API
- **Target Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

