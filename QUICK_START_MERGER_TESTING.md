# Quick Start Testing Guide - COMTRADE File Merger Integration

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js and npm installed
- Browser with JavaScript enabled
- Popup blocker disabled (for merger window)
- Sample COMTRADE files (CFG/DAT pairs) for testing

### Step 1: Start the Application
```bash
npm start
# or manually open index.html in browser
```

### Step 2: Test the Basic Button
1. Look for the **"🔗 Merge Multiple Files"** button (next to "Load Files")
2. Click it
3. Verify: A new window opens with the COMTRADE File Combiner interface

### Step 3: Test File Merging
In the merger window:
1. Click **"Choose Files"** button
2. Select 2-3 matching CFG/DAT file pairs from your test data
3. Click **"Load Files"** button
4. Click **"Analyze Files"** button
5. Wait for analysis to complete
6. Click **"Combine & Export"** button

### Step 4: Verify Merged Data Loading
In the main window:
1. Check the browser console (F12 → Console tab)
2. Look for message: `[mergerWindowLauncher] Received message from merger app: merged_files_ready`
3. Verify charts render with merged data
4. Check channel list shows merged channels

---

## ⚙️ Detailed Testing

### Test 1: Window Management
```
✓ Button exists in main app
✓ Clicking button opens new window
✓ Merger window loads with UI
✓ Window stays open until manually closed
✓ Clicking button again focuses existing window (doesn't open 2nd)
```

**Console Expected:**
```
[main.js] Opening COMTRADE File Merger...
[mergerWindowLauncher] Opening merger window at: comtrade-combiner/index.html
[mergerWindowLauncher] Window opened successfully
[mergerWindowLauncher] Received message from merger app: merger_ready
```

---

### Test 2: File Merger Processing
```
✓ Merger app accepts file selection
✓ Analyze button processes files
✓ Combine button creates merged output
✓ Status updates show completion
```

**Expected Status:**
```
Ready
→ Selected N files
→ Analyzing files...
→ Analysis complete! N group(s) processed.
→ Preparing combined files...
→ ✅ Combination complete! 1 group(s) processed.
```

---

### Test 3: Data Transmission
```
✓ Merged CFG data received
✓ Merged DAT data received
✓ File names transmitted
✓ File count correct
```

**Console Expected (Main App):**
```
[mergerWindowLauncher] Received message from merger app: merged_files_ready
[mergerWindowLauncher] Merged files received. Payload: {
  cfg: {stationName: "...", analogChannels: [...], ...},
  datContent: "1,1234,5678,...",
  filenames: ["file1.cfg", "file2.cfg"],
  fileCount: 2,
  ...
}
```

---

### Test 4: Chart Rendering
```
✓ Charts render with merged data
✓ Channel list populates
✓ Time chart displays waveforms
✓ Polar chart displays correctly
✓ Channel selection works
```

**Expected Processing Phases:**
```
[mergedFilesReceived] PHASE 1: Parsing merged CFG/DAT data
[mergedFilesReceived] PHASE 2: Initializing data state with merged data
[mergedFilesReceived] PHASE 3: Channel state initialization from merged files
[mergedFilesReceived] PHASE 4: Rendering charts with merged data
[mergedFilesReceived] PHASE 5: Initializing polar chart (deferred)
[mergedFilesReceived] PHASE 6: Loading computed channels
[mergedFilesReceived] PHASE 7: Chart integrations
[mergedFilesReceived] PHASE 8: Final setup - vertical line control
[mergedFilesReceived] ✅ Merged files loaded and processed successfully
```

---

## 🔍 Console Debugging

### View All Messages
Open browser DevTools console (F12) and filter by these keywords:
- `mergerWindowLauncher` - Window and communication logs
- `mergedFilesReceived` - Data processing logs
- `ComtradeComberApp` - Merger app initialization logs
- `combineFiles` - Merge processing logs

### Quick Debug Commands
```javascript
// Check if merger window is open
window.mergerWindow?.closed

// Send test message to merger
window.mergerWindow?.postMessage(
  {source: "MainApp", type: "test"},
  "*"
)

// Listen for all messages
window.addEventListener("message", (e) => {
  console.log("[DEBUG] Message:", e.data);
});

// Check data state
console.log("Data State:", window.dataState);
console.log("Channel State:", window.channelState);
```

---

## ✅ Verification Checklist

### Basic Functionality
- [ ] "🔗 Merge Multiple Files" button visible
- [ ] Clicking button opens new window
- [ ] Merger window closes when X clicked
- [ ] No JavaScript errors in console

### File Merging
- [ ] Can select multiple files in merger
- [ ] Analyze button works
- [ ] Combine button works
- [ ] No errors during processing

### Data Communication
- [ ] "merger_ready" message received
- [ ] "merged_files_ready" message received
- [ ] File data transmitted correctly
- [ ] No postMessage errors

### Chart Rendering
- [ ] Charts render with merged data
- [ ] Channel list shows merged channels
- [ ] Charts are interactive
- [ ] Data looks correct and continuous

---

## 🐛 Troubleshooting

### Problem: Merger window won't open
**Solution:**
- Check browser popup blocker (whitelist your site)
- Ensure comtrade-combiner/index.html exists
- Check browser console for errors
- Try different browser

### Problem: No "merger_ready" message
**Solution:**
- Check merger window console for errors
- Verify window.opener reference exists in merger
- Check that merger app is from same origin
- Verify postMessage not blocked by security policy

### Problem: Merged data not displaying
**Solution:**
- Check merged files were actually sent (console message)
- Verify CFG parsing completed successfully
- Check data arrays have correct structure
- Verify time and data arrays have same length

### Problem: Charts render but data looks wrong
**Solution:**
- Check CFG scale and offset values
- Verify analog/digital channels separated correctly
- Check file order in merger matches time sequence
- Look for time gaps or overlaps in data

---

## 📊 Expected Console Output (Complete Session)

```javascript
// USER CLICKS "MERGE MULTIPLE FILES" BUTTON
[main.js] Opening COMTRADE File Merger...
[mergerWindowLauncher] Opening merger window at: /comtrade-combiner/index.html
[mergerWindowLauncher] Window opened successfully

// MERGER APP INITIALIZES
[ComtradeComberApp] Notified main app that merger is ready

// MAIN APP RECEIVES READY MESSAGE
[mergerWindowLauncher] Received message from merger app: merger_ready

// USER SELECTS FILES AND PROCESSES IN MERGER

// USER CLICKS COMBINE & EXPORT
[combineFiles] Sending merged files back to main app...
[parseCFGContent] Parsed CFG: {...}
[combineFiles] Merged files sent to main app successfully

// MAIN APP RECEIVES AND PROCESSES
[mergerWindowLauncher] Received message from merger app: merged_files_ready
[mergerWindowLauncher] Merged files received. Payload: {...}
[mergedFilesReceived] PHASE 1: Parsing merged CFG/DAT data
[mergedFilesReceived] PHASE 2: Initializing data state with merged data
[mergedFilesReceived] PHASE 3: Channel state initialization from merged files
[mergedFilesReceived] PHASE 4: Rendering charts with merged data
[mergedFilesReceived] PHASE 5: Initializing polar chart (deferred)
[mergedFilesReceived] PHASE 6: Loading computed channels
[mergedFilesReceived] PHASE 7: Chart integrations
[mergedFilesReceived] PHASE 8: Final setup - vertical line control
[mergedFilesReceived] ✅ Merged files loaded and processed successfully
```

---

## 📁 Key Files to Verify

### New Files
- `src/utils/mergerWindowLauncher.js` - Should exist and be 276 lines
- `MERGER_INTEGRATION_TEST_GUIDE.md` - Complete testing guide
- `MERGER_INTEGRATION_IMPLEMENTATION_COMPLETE.md` - Implementation summary

### Modified Files
- `index.html` - Should have `mergeMultipleFilesBtn` button
- `src/main.js` - Should have import and event listeners
- `comtrade-combiner/src/app.js` - Should have merger_ready and postMessage code

---

## 🎯 Success Criteria

**All of these should be true:**
1. ✅ Merger button visible and clickable
2. ✅ New window opens when button clicked
3. ✅ Merger app initializes without errors
4. ✅ Can select and analyze files in merger
5. ✅ Can combine files in merger
6. ✅ Data successfully transmitted to main app
7. ✅ Main app processes through all 8 phases
8. ✅ Charts render correctly with merged data
9. ✅ No console errors in either window
10. ✅ Application remains stable

**If all above are true: ✅ INTEGRATION SUCCESSFUL**

---

## 📞 Support Resources

### Documentation
- `MERGER_INTEGRATION_IMPLEMENTATION_COMPLETE.md` - Full technical details
- `MERGER_INTEGRATION_TEST_GUIDE.md` - Comprehensive test scenarios
- `README.md` - General application information

### Code Location
- Merger launcher: `src/utils/mergerWindowLauncher.js`
- Event handlers: `src/main.js` (search for "mergerWindowLauncher" or "mergedFilesReceived")
- Merger app: `comtrade-combiner/src/app.js` (search for "postMessage")

### Browser DevTools
- Press F12 to open DevTools
- Go to Console tab
- Search for "mergerWindowLauncher" for all communication logs
- Search for "mergedFilesReceived" for processing logs

---

## 🎓 Learning Resources

### How It Works (Overview)
1. User clicks button in main app
2. Button handler calls `openMergerWindow()`
3. New window opens with merger app
4. Merger app processes files
5. Merger app sends merged data via `postMessage()`
6. Main app's `mergerWindowLauncher` receives message
7. Custom event dispatched to listeners
8. Main app processes data through 8-phase pipeline
9. Charts render with merged data

### Key Technologies
- **postMessage API** - Inter-window communication
- **CustomEvent** - Event dispatching within app
- **window.open()** - Window management
- **JSON** - Data serialization

---

## ⏱️ Expected Timing

| Step | Time | Note |
|------|------|------|
| Open merger window | <1 sec | Instant |
| Select files | <2 sec | User dependent |
| Analyze files | 1-5 sec | Depends on file size |
| Combine files | 2-10 sec | Depends on processing |
| Transmit data | <1 sec | Network instant |
| Process phases 1-4 | 1-3 sec | Chart rendering |
| Process phases 5-8 | <1 sec | Final setup |
| **Total workflow** | **10-30 sec** | Typical |

---

## 🚀 Next Steps After Testing

1. **If successful:** Integration is ready for production
2. **If issues found:** Use debugging section above to troubleshoot
3. **For enhancements:** See MERGER_INTEGRATION_IMPLEMENTATION_COMPLETE.md "Next Steps"

---

## Version & Date

- **Test Guide Version:** 1.0
- **Created:** [Current Date]
- **Status:** Ready for Testing
- **Integration Status:** ✅ Complete

