# COMTRADE File Merger Integration - Code Changes Reference

## Summary of All Changes

| File | Type | Lines Added | Purpose |
|------|------|------------|---------|
| src/utils/mergerWindowLauncher.js | NEW | 276 | Window management & communication |
| index.html | MODIFIED | 1 | Merger button |
| src/main.js | MODIFIED | 300+ | Event handlers & processing |
| comtrade-combiner/src/app.js | MODIFIED | 180+ | postMessage sending |

---

## File 1: src/utils/mergerWindowLauncher.js (NEW - 276 lines)

### Purpose
Central hub for managing the merger app window and inter-app communication via postMessage.

### Key Functions

#### openMergerWindow()
```javascript
export function openMergerWindow() {
  // Close existing window if open
  if (mergerWindow && !mergerWindow.closed) {
    mergerWindow.focus();
    return mergerWindow;
  }

  // Open merger app in new window
  const mergerUrl = new URL("./comtrade-combiner/index.html", window.location).href;

  mergerWindow = window.open(
    mergerUrl,
    "COMTRADE_Merger",
    "width=1200,height=800,resizable=yes,scrollbars=yes"
  );
  
  // Setup window monitoring
  monitorMergerWindow();
  setupPostMessageListener();
  
  return mergerWindow;
}
```

#### closeMergerWindow()
```javascript
export function closeMergerWindow() {
  if (mergerWindow && !mergerWindow.closed) {
    mergerWindow.close();
  }
  mergerWindow = null;
  if (mergerWindowInterval) {
    clearInterval(mergerWindowInterval);
  }
}
```

#### isMergerWindowOpen()
```javascript
export function isMergerWindowOpen() {
  return mergerWindow && !mergerWindow.closed;
}
```

#### sendToMerger()
```javascript
export function sendToMerger(type, payload) {
  if (!isMergerWindowOpen()) {
    console.warn("[mergerWindowLauncher] Merger window is not open");
    return;
  }
  
  try {
    mergerWindow.postMessage(
      {
        source: "MainApp",
        type,
        payload
      },
      "*"
    );
  } catch (error) {
    console.error("[mergerWindowLauncher] Error sending message:", error);
  }
}
```

### Private Functions

#### handleMergerMessage(event)
Routes incoming postMessage by type:
- "merger_ready" → Log initialization
- "merged_files_ready" → Extract payload and dispatch event
- "merger_error" → Show user alert
- "merger_closed" → Cleanup reference

#### handleMergedFilesReady(payload)
- Extracts CFG, DAT, filenames from payload
- Creates custom event with payload
- Dispatches "mergedFilesReceived" event to main app listeners

---

## File 2: index.html (MODIFIED)

### Change Location
Section: `<div class="upload-actions">` (around line 244)

### Before
```html
<div class="upload-actions">
  <input type="file" id="chooseFilesInput" multiple hidden />
  <button id="chooseFilesBtn" class="btn-primary">📁 Choose Files</button>
  <button id="loadBtn" class="btn-primary">📂 Load Files</button>
</div>
```

### After
```html
<div class="upload-actions">
  <input type="file" id="chooseFilesInput" multiple hidden />
  <button id="chooseFilesBtn" class="btn-primary">📁 Choose Files</button>
  <button id="loadBtn" class="btn-primary">📂 Load Files</button>
  <button class="btn-secondary" id="mergeMultipleFilesBtn" title="Open file merger to combine multiple COMTRADE files">🔗 Merge Multiple Files</button>
</div>
```

### Change Details
- **Type:** Single button addition
- **Position:** After "Load Files" button
- **Button Properties:**
  - `id="mergeMultipleFilesBtn"` - Identifier for JavaScript
  - `class="btn-secondary"` - Styling to match existing buttons
  - `title="..."` - Tooltip on hover
  - Text: "🔗 Merge Multiple Files" - User-friendly label with emoji
  - **Emoji:** 🔗 (Link symbol) represents connection/integration

---

## File 3: src/main.js (MODIFIED - 300+ lines added)

### Change 1: Import Statement (Line 60)

### Before
```javascript
// ... existing imports ...
import someOtherModule from "./utils/someOtherModule.js";
```

### After
```javascript
// ... existing imports ...
import someOtherModule from "./utils/someOtherModule.js";
import { openMergerWindow } from "./utils/mergerWindowLauncher.js";
```

### Change 2: Merger Button Event Listener (Around line 978-985)

### Location
Find section: `// --- Event Listeners ---` near bottom of file

### Added Code
```javascript
// Merger button handler
const mergeMultipleFilesBtn = document.getElementById("mergeMultipleFilesBtn");
if (mergeMultipleFilesBtn) {
  mergeMultipleFilesBtn.addEventListener("click", () => {
    console.log("[main.js] Opening COMTRADE File Merger...");
    openMergerWindow();
  });
  console.log("[main.js] mergeMultipleFilesBtn event listener attached");
}
```

### Change 3: Merged Files Event Listener (300+ lines added after event listeners section)

### Added Complete Listener
```javascript
// Listen for merged files from merger app
window.addEventListener("mergedFilesReceived", async (event) => {
  try {
    console.log("[mergedFilesReceived] Starting merged file processing...");
    
    const { 
      cfg: cfgData, 
      datContent, 
      filenames, 
      fileCount, 
      isMerged 
    } = event.detail;

    // ============ PHASE 1: Parse merged CFG/DAT data ============
    console.log("[mergedFilesReceived] PHASE 1: Parsing merged CFG/DAT data");
    
    let parsedCfg = cfgData;
    if (typeof cfgData === "string") {
      parsedCfg = parseComtradeCfg(cfgData);
    }

    let parsedDat = datContent;
    if (typeof datContent === "string") {
      parsedDat = parseComtradeDat(datContent, parsedCfg);
    }

    // ============ PHASE 2: Initialize data state ============
    console.log("[mergedFilesReceived] PHASE 2: Initializing data state with merged data");
    
    if (!window.dataState) {
      window.dataState = {
        analogData: [],
        digitalData: [],
        duration: 0,
        sampleRate: 50,
        metadata: {}
      };
    }

    window.dataState.analogData = parsedDat.analogData || [];
    window.dataState.digitalData = parsedDat.digitalData || [];
    window.dataState.duration = parsedCfg.duration || 0;
    window.dataState.sampleRate = parsedCfg.frequency || 50;
    window.dataState.metadata = {
      station: parsedCfg.stationName,
      device: parsedCfg.deviceName,
      version: parsedCfg.version,
      fileCount: fileCount,
      isMerged: true,
      filenames: filenames
    };

    // ============ PHASE 3: Channel state initialization ============
    console.log("[mergedFilesReceived] PHASE 3: Channel state initialization from merged files");
    
    if (!window.channelState) {
      window.channelState = {
        analog: {},
        digital: {},
        groups: {},
        colors: {}
      };
    }

    // Initialize analog channels
    (parsedCfg.analogChannels || []).forEach((ch, idx) => {
      const chId = `A${idx + 1}`;
      window.channelState.analog[chId] = {
        name: ch.name || `Analog ${idx + 1}`,
        unit: ch.unit || "",
        index: idx,
        visible: true,
        selected: false,
        color: getColorForChannel(idx, "analog"),
        scale: ch.scale || 1,
        offset: ch.offset || 0,
        group: "Analog"
      };
    });

    // Initialize digital channels
    (parsedCfg.digitalChannels || []).forEach((ch, idx) => {
      const chId = `D${idx + 1}`;
      window.channelState.digital[chId] = {
        name: ch.name || `Digital ${idx + 1}`,
        unit: "Boolean",
        index: idx,
        visible: true,
        selected: false,
        color: getColorForChannel(idx, "digital"),
        group: "Digital"
      };
    });

    // ============ PHASE 4: Render charts ============
    console.log("[mergedFilesReceived] PHASE 4: Rendering charts with merged data");
    
    if (typeof renderComtradeCharts === "function") {
      renderComtradeCharts();
    }

    // ============ PHASE 5: Initialize polar chart (deferred) ============
    console.log("[mergedFilesReceived] PHASE 5: Initializing polar chart (deferred)");
    
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => {
        if (typeof renderPolarChart === "function") {
          renderPolarChart();
        }
      });
    } else {
      setTimeout(() => {
        if (typeof renderPolarChart === "function") {
          renderPolarChart();
        }
      }, 100);
    }

    // ============ PHASE 6: Load computed channels ============
    console.log("[mergedFilesReceived] PHASE 6: Loading computed channels");
    
    if (typeof loadComputedChannels === "function") {
      await loadComputedChannels();
    }

    // ============ PHASE 7: Chart integrations ============
    console.log("[mergedFilesReceived] PHASE 7: Chart integrations");
    
    if (typeof setupChartIntegrations === "function") {
      setupChartIntegrations();
    }

    // ============ PHASE 8: Final setup ============
    console.log("[mergedFilesReceived] PHASE 8: Final setup - vertical line control");
    
    if (typeof setupVerticalLineControl === "function") {
      setupVerticalLineControl();
    }

    if (typeof setupResizableGroups === "function") {
      setupResizableGroups();
    }

    // Show success message
    console.log("[mergedFilesReceived] ✅ Merged files loaded and processed successfully");
    
    // Hide loading spinner if exists
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.style.display = "none";
    }

  } catch (error) {
    console.error("[mergedFilesReceived] ❌ Error processing merged files:", error);
    alert(`Error loading merged files: ${error.message}`);
    
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.style.display = "none";
    }
  }
});
```

### Key Characteristics
- **8 Phases:** Mirrors handleLoadFiles pattern exactly
- **Error Handling:** Try-catch with user alerts
- **Performance:** requestIdleCallback for background work
- **Logging:** Detailed console logs for debugging
- **Compatibility:** Graceful fallback for missing functions

---

## File 4: comtrade-combiner/src/app.js (MODIFIED - 180+ lines added)

### Change 1: Constructor Enhancement

### Before
```javascript
class ComtradeComberApp {
  constructor() {
    this.selectedFiles = [];
    this.parsedData = [];
    this.groups = [];
    this.report = null;
    this.initializeEventListeners();
    this.initializeTabs();
  }
```

### After
```javascript
class ComtradeComberApp {
  constructor() {
    this.selectedFiles = [];
    this.parsedData = [];
    this.groups = [];
    this.report = null;
    this.initializeEventListeners();
    this.initializeTabs();
    
    // Notify main app that merger app is ready (if opened from main app)
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(
          {
            source: "MergerApp",
            type: "merger_ready",
            payload: {
              message: "COMTRADE File Merger is ready",
            },
          },
          "*"
        );
        console.log("[ComtradeComberApp] Notified main app that merger is ready");
      } catch (err) {
        console.warn("[ComtradeComberApp] Could not notify main app:", err);
      }
    }
  }
```

### Change 2: combineFiles() Method Enhancement

### Before
```javascript
async combineFiles() {
  // ... existing code for preparation ...
  
  // Export files
  combinedData.forEach((data) => {
    try {
      const exported = ComtradeDataExporter.exportGroup(...);
      console.log(`[combineFiles] Exported group ${data.groupNumber}:`, exported.filename);
    } catch (err) {
      console.warn(`[combineFiles] Could not export CFG/DAT...`, err.message);
    }
  });

  this.updateStatus(`✅ Combination complete! ${combinedData.length} group(s) processed.`);
  
  // Switch to report tab
  const reportTab = document.querySelector('[data-tab="report"]');
  if (reportTab) {
    reportTab.click();
  }
}
```

### After (Key Addition)
```javascript
async combineFiles() {
  // ... existing code for preparation ...
  
  // Export files AND collect for sending back
  const filesToSendBack = [];

  combinedData.forEach((data) => {
    try {
      const exported = ComtradeDataExporter.exportGroup(...);
      console.log(`[combineFiles] Exported group ${data.groupNumber}:`, exported.filename);

      // NEW: Store for sending back to main app
      filesToSendBack.push({
        cfgFilename: exported.cfgFilename,
        cfgContent: exported.cfgContent,
        datFilename: exported.datFilename,
        datContent: exported.datContent,
        groupNumber: data.groupNumber,
      });
    } catch (err) {
      console.warn(`[combineFiles] Could not export CFG/DAT...`, err.message);
    }
  });

  this.updateStatus(`✅ Combination complete! ${combinedData.length} group(s) processed.`);

  // NEW: Send merged files back to main app via postMessage
  if (window.opener && !window.opener.closed) {
    try {
      console.log("[combineFiles] Sending merged files back to main app...");
      
      if (filesToSendBack.length > 0) {
        const firstFile = filesToSendBack[0];
        const cfgData = this.parseCFGContent(firstFile.cfgContent.split("\n"));
        
        window.opener.postMessage(
          {
            source: "MergerApp",
            type: "merged_files_ready",
            payload: {
              cfg: cfgData,
              datContent: firstFile.datContent,
              filenames: this.parsedData.map((f) => f.fileName),
              fileCount: this.parsedData.length,
              mergedGroups: combinedData.length,
              groupFiles: filesToSendBack,
            },
          },
          "*"
        );
        
        console.log("[combineFiles] Merged files sent to main app successfully");
      }
    } catch (sendError) {
      console.error("[combineFiles] Error sending merged files:", sendError);
      window.opener?.postMessage(
        {
          source: "MergerApp",
          type: "merger_error",
          payload: {
            message: `Error sending merged files: ${sendError.message}`,
          },
        },
        "*"
      );
    }
  }
  
  // ... rest of existing code ...
}
```

### Change 3: New parseCFGContent() Method (110 lines)

```javascript
/**
 * Parse CFG content string into a structured object
 * Extracts station, device, channels, and sampling information
 */
parseCFGContent(cfgLines) {
  const cfg = {
    stationName: "",
    deviceName: "",
    version: "2013",
    analogChannels: [],
    digitalChannels: [],
    frequency: 50,
    sampleRate: 50,
  };

  try {
    // Line 1: MID (station, device, version)
    if (cfgLines[0]) {
      const [station, device, version] = cfgLines[0].split(",");
      cfg.stationName = station?.trim() || "";
      cfg.deviceName = device?.trim() || "";
      cfg.version = version?.trim() || "2013";
    }

    // Line 2: n_A, n_D (number of analog and digital channels)
    if (cfgLines[1]) {
      const [nA, nD] = cfgLines[1].split(",");
      cfg.numAnalog = parseInt(nA?.trim()) || 0;
      cfg.numDigital = parseInt(nD?.trim()) || 0;
    }

    // Parse analog channels
    let lineIdx = 2;
    for (let i = 0; i < cfg.numAnalog && lineIdx < cfgLines.length; i++) {
      const parts = cfgLines[lineIdx].split(",");
      if (parts.length >= 2) {
        cfg.analogChannels.push({
          index: i + 1,
          name: parts[1]?.trim() || `Analog${i + 1}`,
          unit: parts[5]?.trim() || "N/A",
          scale: parseFloat(parts[6]) || 1,
          offset: parseFloat(parts[7]) || 0,
        });
      }
      lineIdx++;
    }

    // Parse digital channels
    for (let i = 0; i < cfg.numDigital && lineIdx < cfgLines.length; i++) {
      const parts = cfgLines[lineIdx].split(",");
      if (parts.length >= 2) {
        cfg.digitalChannels.push({
          index: cfg.numAnalog + i + 1,
          name: parts[1]?.trim() || `Digital${i + 1}`,
        });
      }
      lineIdx++;
    }

    // Parse frequency (sample rate)
    if (lineIdx < cfgLines.length) {
      cfg.frequency = parseInt(cfgLines[lineIdx]?.trim()) || 50;
      cfg.sampleRate = cfg.frequency;
    }

    console.log("[parseCFGContent] Parsed CFG:", cfg);
  } catch (parseError) {
    console.warn("[parseCFGContent] Error parsing CFG content:", parseError);
  }

  return cfg;
}
```

---

## Message Protocol Reference

### Merger Ready (Initialization)
```javascript
// From: Merger App
// To: Main App
// When: Merger app initializes (on page load)

{
  source: "MergerApp",
  type: "merger_ready",
  payload: {
    message: "COMTRADE File Merger is ready"
  }
}
```

### Merged Files Ready (After Combine)
```javascript
// From: Merger App
// To: Main App
// When: User clicks "Combine & Export" button

{
  source: "MergerApp",
  type: "merged_files_ready",
  payload: {
    cfg: {
      stationName: "MERGED",
      deviceName: "COMBINER",
      version: "2013",
      analogChannels: [
        {index: 1, name: "Voltage_A", unit: "V", scale: 1, offset: 0},
        {index: 2, name: "Current_A", unit: "A", scale: 1, offset: 0}
      ],
      digitalChannels: [
        {index: 3, name: "Relay_1"}
      ],
      frequency: 50,
      sampleRate: 50
    },
    datContent: "1,1234,5678,0\n2,1245,5689,0\n...",
    filenames: ["file1.cfg", "file2.cfg", "file3.cfg"],
    fileCount: 3,
    mergedGroups: 1,
    groupFiles: [...]
  }
}
```

### Merger Error
```javascript
// From: Merger App
// To: Main App
// When: Error occurs during processing

{
  source: "MergerApp",
  type: "merger_error",
  payload: {
    message: "Error description here"
  }
}
```

### Merger Closed
```javascript
// From: Main App (detected)
// When: Merger window is manually closed by user

{
  source: "MergerApp",
  type: "merger_closed",
  payload: {
    message: "Merger window has been closed"
  }
}
```

---

## Integration Points

### In Main App
1. **Button Handler:** `getElementById("mergeMultipleFilesBtn")`
2. **Window Manager:** `import { openMergerWindow } from "./utils/mergerWindowLauncher.js"`
3. **Event Listener:** `window.addEventListener("mergedFilesReceived", ...)`

### In Merger App
1. **Ready Signal:** `window.opener.postMessage({type: "merger_ready"}, "*")`
2. **File Send:** `window.opener.postMessage({type: "merged_files_ready"}, "*")`
3. **Error Send:** `window.opener.postMessage({type: "merger_error"}, "*")`

---

## Testing Points

### Verify Each Change
- [ ] Button renders in HTML
- [ ] Button click listener attached (console log)
- [ ] Merger window opens when button clicked
- [ ] Merger app sends "merger_ready" message
- [ ] Main app receives and logs "merger_ready"
- [ ] User can merge files in merger app
- [ ] Merger app sends "merged_files_ready" message
- [ ] Main app receives and processes through 8 phases
- [ ] Charts render with merged data
- [ ] No console errors

---

## Rollback Instructions

If needed to revert changes:

### Restore index.html
Remove the merger button from line 244:
```html
<button class="btn-secondary" id="mergeMultipleFilesBtn" title="...">🔗 Merge Multiple Files</button>
```

### Restore src/main.js
1. Remove import on line 60
2. Remove merger button listener (~10 lines after line 975)
3. Remove mergedFilesReceived listener (~300 lines)

### Restore comtrade-combiner/src/app.js
1. Remove merger_ready code from constructor (~20 lines)
2. Revert combineFiles() method to original
3. Remove parseCFGContent() method (~110 lines)

### Delete New File
- Delete: `src/utils/mergerWindowLauncher.js`

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| New Files | 1 |
| Modified Files | 3 |
| Total Lines Added | 757+ |
| New Functions | 7 (in mergerWindowLauncher) |
| Message Types | 4 |
| Processing Phases | 8 |
| Error Handlers | 3 |
| No. of Console Logs | 15+ |

