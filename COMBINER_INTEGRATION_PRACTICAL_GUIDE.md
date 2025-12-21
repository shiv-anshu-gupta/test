# COMTRADE Combiner - Practical Integration Guide

## Quick Answer to Your Question

**Q: Why create separate app if merge files already exist?**

**A: Because they do DIFFERENT things:**

1. **Original `mergeComtradeFiles.js`** (in viewer)

   - Purpose: Stack multiple files' channels for display
   - Merge type: Simple concatenation
   - Output: Display in viewer
   - Example: "Show Relay1 + Relay2 channels together"

2. **New `comtrade-combiner/`** (standalone app)
   - Purpose: Create a NEW merged COMTRADE file
   - Merge type: Intelligent time-window based grouping
   - Output: Export CFG/DAT + JSON report
   - Example: "Combine same event from 3 different sources into 1 file"

---

## What the Original Code Does

### `multiFileHandler.js` Flow

```javascript
// File: src/utils/multiFileHandler.js

export async function handleMultipleFiles(fileInput, TIME_UNIT = 1) {
  // Step 1: Group files into pairs
  const filePairs = groupCfgDatFiles(files); // {cfg, dat, groupName}

  // Step 2: Parse all files in PARALLEL
  const parsedFileSets = await parseAllFilePairs(filePairs);
  // Returns: [{cfg: {...}, dat: {...}, filename: "File1"}, ...]

  // Step 3: If single file, return as-is
  if (parsedFileSets.length === 1) {
    return { cfg, data, isMerged: false };
  }

  // Step 4: If multiple files, MERGE
  const mergeResult = mergeComtradeFilesSetsSequential(parsedFileSets);
  return { cfg: mergeResult.mergedCfg, data: mergeResult.mergedData };
}
```

### `mergeComtradeFiles.js` Logic

```javascript
// File: src/utils/mergeComtradeFiles.js

export function mergeComtradeFilesSetsSequential(parsedFileSets) {
  // Get first file's time array - USE FOR ALL FILES
  const baseTime = dataArray[0].time;  // ← IMPORTANT: All files use this time!

  // STACK channels from all files
  mergeAnalogChannels(cfgArray, dataArray);   // File1_Ch1, File1_Ch2, File2_Ch1, File2_Ch2...
  mergeDigitalChannels(cfgArray, dataArray);

  // Return merged objects
  return {
    mergedCfg: {...all channels prefixed...},
    mergedData: { time: baseTime, analogData: [...], digitalData: [...] }
  };
}
```

### The Problem with Original Merge

**All files forced to use FIRST file's time:**

```
File 1: timestamp 10:00:05.000  (time array: [0, 0.0002, 0.0004, ...])
File 2: timestamp 10:00:05.500  (time array: [500, 500.0002, 500.0004, ...])
                    ↓ FORCED INTO ↓
Result: timestamp 10:00:05.000  (time array from File 1 only)
        File1_Voltage_A @ t=0.000
        File2_Voltage_A @ t=0.000  ← WRONG! Should be @ t=500s
```

**This works for DISPLAY (you can see both) but NOT for EXPORT (time is wrong).**

---

## What the New Combiner Does

### `combiner.js` Logic (in combiner app)

```javascript
// File: comtrade-combiner/src/utils/combiner.js

export function combineByTimeWindow(parsedFiles, timeWindowSeconds = 0.5) {
  // Group files by timestamp proximity
  const groups = groupByTimeWindow(parsedFiles, timeWindowSeconds);
  // [
  //   { window: [10:00:05.000 to 10:00:05.500], files: [File1, File2] },
  //   { window: [10:00:06.000 to 10:00:06.500], files: [File3] }
  // ]

  const mergedGroups = [];
  for (const group of groups) {
    // For files in same window:
    // 1. Align timestamps (interpolate if needed)
    // 2. Remove duplicate channels
    // 3. Remove similar channels

    const merged = mergeGroupIntelligently(group.files);
    mergedGroups.push(merged);
  }

  return mergedGroups;
}
```

### Difference in Output

```
Original Merge Output:
{
  cfg: {
    analogChannels: [
      { name: "File1_Voltage_A", ... },
      { name: "File1_Voltage_B", ... },
      { name: "File2_Voltage_A", ... },  ← Duplicate!
      { name: "File2_Voltage_B", ... }
    ]
  },
  data: {
    time: [0, 0.0002, 0.0004, ...],  ← File1's time only
    analogData: [[...], [...], [...], [...]]
  }
}

New Combiner Output:
{
  cfg: {
    analogChannels: [
      { name: "Voltage_A", ... },  ← Deduplicated
      { name: "Voltage_B", ... }
    ]
  },
  data: {
    time: [0, 0.0002, 0.0004, ...],  ← Properly aligned
    analogData: [[...], [...]]
  },
  report: {
    removed: {
      duplicates: ["Voltage_A from File2"],
      similar: []
    },
    alignmentInfo: { ... },
    statistics: { ... }
  }
}
```

---

## Integration Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                  SHARED CODE (Reused by Both)                 │
├──────────────────────────────────────────────────────────────┤
│  src/components/comtradeUtils.js   ← parseCFG(), parseDAT()   │
│  src/utils/constants.js            ← Time units, sample rates │
│  src/utils/helpers.js              ← Utility functions        │
└──────────────────────────────────────────────────────────────┘
         ↑                                      ↑
         │                                      │
         │                                      │
    ┌────────────────────┐          ┌──────────────────────────┐
    │  ORIGINAL VIEWER   │          │  NEW COMBINER APP        │
    │ (main codebase)    │          │ (comtrade-combiner/)     │
    ├────────────────────┤          ├──────────────────────────┤
    │ multiFileHandler   │          │ fileParser               │
    │  - Load files      │          │  - Load files            │
    │  - Parse CFG/DAT   │          │  - Parse CFG/DAT         │
    │                    │          │                          │
    │ mergeComtradeFiles │          │ combiner                 │
    │  - Stack channels  │          │  - Time window grouping  │
    │  - Simple concat   │          │  - Deduplication        │
    │                    │          │  - Similarity detection  │
    │ renderComtradeCharts
    │  - Display charts  │          │ reportGenerator          │
    │                    │          │  - Analyze results       │
    │                    │          │  - Generate report       │
    │                    │          │                          │
    └────────────────────┘          │ dataExporter             │
         ↓                          │  - Export CFG/DAT        │
    Viewer UI                       │  - Download files        │
    (display data)                  │                          │
                                    └──────────────────────────┘
                                         ↓
                                    Combiner UI
                                    (process data)
```

---

## Data Flow Example

### Scenario: Combine 3 Event Files

```
User loads 3 files in VIEWER:
  File1: relay1.cfg (timestamp 10:00:05.200)
  File2: relay2.cfg (timestamp 10:00:05.201)
  File3: phase.cfg  (timestamp 10:00:05.198)

In VIEWER:
  Step 1: multiFileHandler.handleMultipleFiles() called
  Step 2: parseAllFilePairs() - parse all 3 files
  Step 3: mergeComtradeFilesSetsSequential() called
  Step 4: All channels stacked:
          - relay1_Voltage_A, relay1_Voltage_B, relay1_Current
          - relay2_Voltage_A, relay2_Voltage_B, relay2_Current  ← DUPLICATE
          - phase_Trip_Signal
  Step 5: Display in viewer

  RESULT: 7 channels shown (4 duplicates + 3 unique)
          All on File1's time scale (10:00:05.200)


User opens COMBINER with SAME 3 files:
  Step 1: fileParser.handleLoadFiles() called
  Step 2: parseAllFilePairs() - parse all 3 files
  Step 3: combineByTimeWindow() called
          - Detects all 3 are within 3ms (configurable window = 0.5s)
          - Groups them as single event
  Step 4: Analyzes each group:
          - Finds duplicates: Voltage_A, Voltage_B, Current
          - Finds similar: (none in this case)
          - Keeps best quality version
          - Aligns timestamps (if needed)
  Step 5: Generates report:
          {
            "action": "combined",
            "filesProcessed": 3,
            "timeWindow": "10:00:05.198 - 10:00:05.201 (3ms)",
            "duplicatesRemoved": 6,
            "similarChannelsRemoved": 0,
            "finalChannelCount": 4
          }
  Step 6: Exports new files:
          - Event_Combined.cfg  ← NEW FILE
          - Event_Combined.dat  ← NEW FILE
          - Event_Report.json

  RESULT: New merged COMTRADE file + detailed report
```

---

## Code Reuse Strategy

### ✅ DO Reuse From Original

These modules should be imported by combiner:

```javascript
// In comtrade-combiner/src/utils/fileParser.js

// Import from main codebase
import { parseCFG, parseDAT } from "../../src/components/comtradeUtils.js";
import { groupCfgDatFiles } from "../../src/utils/fileGrouping.js";
import { autoGroupChannels } from "../../src/utils/autoGroupChannels.js";

// Use them exactly like original
export async function parseFiles(files, TIME_UNIT) {
  const pairs = groupCfgDatFiles(files); // From original
  const cfgText = await pair.cfg.text();
  const cfg = parseCFG(cfgText, TIME_UNIT); // From original
  return cfg;
}
```

### ❌ DO NOT Duplicate

Don't recreate these in combiner:

```javascript
// ❌ WRONG - Creating duplicate
// comtrade-combiner/src/components/comtradeUtils.js
export function parseCFG(cfgText, TIME_UNIT) { ... }  // DUPLICATE!

// ✅ RIGHT - Import from main
import { parseCFG } from "../../src/components/comtradeUtils.js";
```

---

## How They Communicate

### Original Viewer → Combiner Workflow

```
1. User analyzes files in VIEWER
   ↓
2. User realizes: "These 3 files are same event, need to merge"
   ↓
3. User opens COMBINER (separate app/window)
   ↓
4. User selects same 3 files in COMBINER
   ↓
5. COMBINER processes and exports new CFG/DAT
   ↓
6. User loads new file in VIEWER
   ↓
7. VIEWER displays merged result correctly
```

### Optional: Future Direct Integration

```
[Future Tauri/Node Enhancement]

VIEWER creates menu item: "Process in Combiner"
         ↓
Passes file references to COMBINER process
         ↓
COMBINER processes and saves result
         ↓
VIEWER automatically reloads merged file
         ↓
Shows success message: "Merged X files into Y channels"
```

---

## File Location Reference

### Original Codebase (Stays As-Is)

```
COMTRADEv1/
├── src/
│   ├── main.js
│   ├── components/
│   │   └── comtradeUtils.js         ← Keep here
│   └── utils/
│       ├── multiFileHandler.js      ← Keep here
│       ├── mergeComtradeFiles.js    ← Keep here
│       ├── fileGrouping.js          ← Keep here
│       ├── autoGroupChannels.js     ← Keep here
│       └── helpers.js               ← Keep here
└── index.html
```

### New Combiner App (Separate)

```
COMTRADEv1/comtrade-combiner/
├── index.html
├── src/
│   ├── app.js
│   ├── utils/
│   │   ├── fileParser.js            ← Imports from main
│   │   ├── combiner.js              ← New logic
│   │   ├── reportGenerator.js       ← New logic
│   │   └── dataExporter.js          ← New logic (exports CFG/DAT)
│   └── components/ (UI components)
└── styles.css
```

---

## Testing Checklist

### Test 1: Combiner Independence

```
✓ Open combiner app standalone
✓ Load files directly
✓ Process them
✓ Export new files
✓ Works without main viewer running
```

### Test 2: Code Reuse Verification

```
✓ Combiner uses parseCFG from main
✓ Combiner uses groupCfgDatFiles from main
✓ No code duplication in parsing
✓ Updates in main automatically used
```

### Test 3: Exported Files Compatibility

```
✓ Export new CFG/DAT from combiner
✓ Load in main viewer
✓ Viewer displays correctly
✓ Charts render without errors
✓ All channels visible
```

### Test 4: Workflow Integration

```
✓ Load 3 files in viewer
✓ See them stacked with duplicates
✓ Open combiner with same files
✓ Combiner shows 3ms time window
✓ Export merged version
✓ Load merged file in viewer
✓ Now see cleaned version
```

---

## Key Differences Summary

| Aspect                 | Original Viewer         | New Combiner          |
| ---------------------- | ----------------------- | --------------------- |
| **Primary Goal**       | Display multiple files  | Create merged file    |
| **Merge Strategy**     | Stack all channels      | Group by time window  |
| **Time Handling**      | Use first file's time   | Intelligent alignment |
| **Duplicate Handling** | Rename (File1*, File2*) | Remove/deduplicate    |
| **Export**             | Display only            | CFG/DAT + Report      |
| **Location**           | Main application        | Standalone app        |
| **Use When**           | Exploring/comparing     | Exporting/combining   |

---

## Migration from Understanding to Implementation

Now that you understand the architecture:

### Phase 1: ✅ Combiner App Created

- [x] Separate application built
- [x] Time-window grouping implemented
- [x] Duplicate/similar detection working
- [x] Report generation complete
- [x] Data export to CFG/DAT working

### Phase 2: Test Combiner Standalone

- [ ] Test combiner with 3 real event files
- [ ] Verify time-window detection works
- [ ] Verify exported CFG/DAT is valid
- [ ] Load exported file in viewer
- [ ] Confirm viewer loads it correctly

### Phase 3: Document User Workflow

- [ ] Create user guide: "When to use viewer vs combiner"
- [ ] Document both use cases with examples
- [ ] Create troubleshooting guide

### Phase 4: Future - Integrate with Tauri

- [ ] Create Tauri window for combiner
- [ ] Add file watching
- [ ] Add automatic batch processing
- [ ] Create unified menu system

---

## Bottom Line

**Your original merge files are NOT being replaced. They serve a different purpose.**

- **Original System**: "Show me multiple files together"
  - Uses: `mergeComtradeFiles.js`, `multiFileHandler.js`
  - Purpose: Display/visualization
- **New System**: "Create a new merged file"
  - Uses: `combiner.js`, `reportGenerator.js`, `dataExporter.js`
  - Purpose: Processing/export

**Both are needed because they answer different questions.**
