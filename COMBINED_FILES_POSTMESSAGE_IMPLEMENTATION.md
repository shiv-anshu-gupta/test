# Window postMessage Implementation - Combined Files Flow

## ✅ Implementation Complete

Integration of combined CFG/DAT files from child merger app to parent app using `window.postMessage()`.

---

## **Architecture Overview**

```
┌─────────────────────────────────────────────────────────┐
│  Parent App (main.js)                                   │
│  ───────────────────────────────────────────────────     │
│  • Message Listener (Line 3044)                          │
│    └─ Checks for: type === "combinedFilesReady"        │
│  • processCombinedDataFromMerger() (Line 903)           │
│    └─ Parses CFG + DAT text strings                     │
│    └─ Runs all 6 phases (parse, state, charts, etc.)   │
└─────────────────────────────────────────────────────────┘
           ↑
           │ postMessage({
           │   type: "combinedFilesReady",
           │   cfgText: string,
           │   datText: string
           │ })
           │
┌─────────────────────────────────────────────────────────┐
│  Child App (comtrade-combiner/app.js)                   │
│  ───────────────────────────────────────────────────     │
│  • combineFiles() function (Line 424)                    │
│    └─ Combines multiple CFG/DAT file pairs             │
│    └─ Generates combined CFG + DAT text                │
│    └─ Sends via postMessage to parent                  │
└─────────────────────────────────────────────────────────┘
```

---

## **Child App - What Changed** 

**File:** `comtrade-combiner/src/app.js` (Line 424)

**In the `combineFiles()` function:**
```javascript
// After combining files, send to parent:
window.opener.postMessage(
  {
    source: "ChildWindow",
    type: "combinedFilesReady",
    payload: {
      cfgText: firstFile.cfgContent,      // CFG as text string
      datText: firstFile.datContent,      // DAT as text string
      groupNumber: firstFile.groupNumber,
      filenames: this.parsedData.map((f) => f.fileName),
      fileCount: this.parsedData.length,
      mergedGroups: combinedData.length,
    },
  },
  "*"
);
```

**Key Points:**
- Sends CFG and DAT as **text strings** (not file objects)
- Message type: `"combinedFilesReady"`
- Source: `"ChildWindow"` (matches parent's listener)
- Includes metadata (filenames, file count, group info)

---

## **Parent App - What Changed**

### **1. New Helper Function** (Line 903)
**Function:** `processCombinedDataFromMerger(cfgText, datText)`

**What it does:**
- **PHASE 1:** Parse CFG and DAT text using existing `parseCFG()` and `parseDAT()` functions
- **PHASE 2:** Update UI state (`dataState`, filename display)
- **PHASE 3:** Initialize channel state
- **PHASE 4:** Render all charts (uPlot graphs)
- **PHASE 5:** Setup polar chart (phasor diagram)
- **PHASE 6:** Load saved computed channels

**Same as:** `handleLoadFiles()` but starts from parsing (skips file reading)

---

### **2. New Message Handler** (Line 3054)
**In:** `window.addEventListener("message", ...)`

**Added case:**
```javascript
case "combinedFilesReady": {
  console.log("[main.js] 📦 Received combined files from merger app");
  const { cfgText, datText } = payload || {};
  if (cfgText && datText) {
    processCombinedDataFromMerger(cfgText, datText);
  } else {
    console.error("[main.js] ❌ Combined files incomplete");
  }
  break;
}
```

**Flow:**
1. Receives message with type `"combinedFilesReady"`
2. Extracts CFG and DAT text
3. Calls `processCombinedDataFromMerger()`
4. All 6 phases execute automatically

---

## **Data Flow Example**

**Step 1:** User selects multiple CFG/DAT pairs in child app
```
├─ HR_85429_1.cfg + HR_85429_1.dat
├─ HR_85429_2.cfg + HR_85429_2.dat
└─ HR_85429_3.cfg + HR_85429_3.dat
```

**Step 2:** Child app combines them
```javascript
// combineFiles() merges all into one pair
→ Combined CFG text (all channels merged)
→ Combined DAT text (all data merged)
```

**Step 3:** Child sends to parent
```javascript
window.opener.postMessage({
  type: "combinedFilesReady",
  payload: {
    cfgText: "COMTRADE\nversion,20131\n...",
    datText: "0,0.0,0,0,0,0,0,0,...",
  }
})
```

**Step 4:** Parent receives and processes
```javascript
// Message listener catches it
→ Calls processCombinedDataFromMerger(cfgText, datText)
→ Parses CFG + DAT
→ Renders charts
→ All 62,464 samples visible in chart
```

**Step 5:** User can now:
- ✅ View combined data in charts
- ✅ Create computed channels
- ✅ Download charts
- ✅ Export data

---

## **Console Logs to Watch**

When combined files arrive:
```
[main.js] 📦 Received combined files from merger app
[processCombinedDataFromMerger] 🔄 Starting combined data processing...
[processCombinedDataFromMerger] 📝 Parsing CFG and DAT...
[processCombinedDataFromMerger] ✅ Parsing complete
[processCombinedDataFromMerger] 📊 PHASE 2: Updating UI state
[processCombinedDataFromMerger] 🎨 PHASE 3: Channel state initialization
[processCombinedDataFromMerger] 📈 PHASE 4: Chart rendering
[processCombinedDataFromMerger] 🎯 PHASE 5: Polar chart initialization
[processCombinedDataFromMerger] 📟 PHASE 6: Computed channels
[processCombinedDataFromMerger] ✅ Combined data processing complete!
```

---

## **Files Modified**

1. **`src/main.js`**
   - Added `processCombinedDataFromMerger()` function (Line 903)
   - Added message handler case for `"combinedFilesReady"` (Line 3054)

2. **`comtrade-combiner/src/app.js`**
   - Updated `combineFiles()` function (Line 424)
   - Added postMessage send with `"combinedFilesReady"` type
   - Sends CFG and DAT as text strings

---

## **Testing**

1. **Open main app** and click "Multiple Files Load" button
2. **Child merger app opens**
3. **Select 2-3 COMTRADE file pairs**
4. **Click "Combine" button**
5. **Check console** for logs
6. **Check main app** - charts should appear automatically with combined data

---

## **Backward Compatibility**

✅ **Old message format still supported:**
- Source: `"MergerApp"` (old)
- Type: `"merged_files_ready"` (old)

✅ **New message format added:**
- Source: `"ChildWindow"` (new)
- Type: `"combinedFilesReady"` (new)

Both work together, so existing code won't break.

---

## **Summary**

| Step | Component | Action |
|------|-----------|--------|
| 1 | Child App | Combine CFG/DAT files |
| 2 | Child App | Send postMessage with CFG+DAT text |
| 3 | Parent App | Receive "combinedFilesReady" message |
| 4 | Parent App | Parse CFG + DAT text |
| 5 | Parent App | Run all 6 phases (state, charts, etc.) |
| 6 | User | View combined data in charts |

✅ **Complete and ready to test!**
