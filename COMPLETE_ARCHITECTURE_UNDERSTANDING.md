# COMTRADE Architecture - Complete Understanding

## Your Question Answered

**"If merge files already exist in original codebase, why create separate application?"**

### The Short Answer

**They do different things:**

| Original `mergeComtradeFiles.js`                          | New `comtrade-combiner/`                                  |
| --------------------------------------------------------- | --------------------------------------------------------- |
| **Purpose**: Stack multiple files for viewing             | **Purpose**: Create new merged file for export            |
| **Merge method**: Concatenate channels + add prefixes     | **Merge method**: Intelligent grouping + deduplication    |
| **Output**: Display in viewer                             | **Output**: New CFG/DAT + report JSON                     |
| **Use case**: "Show me all channels from File1 and File2" | **Use case**: "Combine File1 and File2 into one new file" |

---

## The Complete Picture

### What You Already Have (Original Codebase)

```
src/utils/
├── multiFileHandler.js
│   └─ handleMultipleFiles()
│      └─ Calls: parseAllFilePairs()
│         └─ Returns: [{ cfg, dat }, { cfg, dat }, ...]
│
├── mergeComtradeFiles.js
│   └─ mergeComtradeFilesSetsSequential()
│      ├─ Takes: Array of parsed files
│      ├─ Does: Stack all channels + add file prefixes
│      └─ Returns: { mergedCfg, mergedData }
│
├── channelMerger.js
│   ├─ mergeAnalogChannels()
│   └─ mergeDigitalChannels()
│
├── fileGrouping.js
│   └─ groupCfgDatFiles()
│
└── autoGroupChannels.js
    └─ autoGroupChannels()
```

**How it works:**

```
File1.cfg + File1.dat  ┐
File2.cfg + File2.dat  ├─→ parseAllFilePairs() ─→ [parsed1, parsed2]
File3.cfg + File3.dat  ┘
                              ↓
                    mergeComtradeFilesSetsSequential()
                              ↓
                    Stack channels + prefix
                              ↓
                    File1_Voltage_A, File1_Voltage_B, File1_Current
                    File2_Voltage_A, File2_Voltage_B, File2_Current
                    File3_Voltage_A, File3_Voltage_B, File3_Current
                              ↓
                    Display in viewer (7 channels, though only 3 unique)
```

**Problem**:

- If File2 started 0.5 seconds after File1, the data is displayed WRONG
- File2's voltage is shown at File1's time (off by 0.5 seconds)
- Works for viewing, NOT for exporting as accurate new file

---

### What You're Building (New Combiner)

```
comtrade-combiner/
├── src/
│   └── utils/
│       ├── fileParser.js (imports parseCFG/parseDAT from original)
│       ├── combiner.js
│       │   └─ combineByTimeWindow()
│       │      ├─ Group files within time window
│       │      ├─ Find duplicates
│       │      ├─ Find similar channels
│       │      └─ Keep best quality
│       ├── reportGenerator.js
│       │   └─ generateReport()
│       │      └─ Detailed JSON showing what was removed/kept
│       └── dataExporter.js
│           ├─ generateCFG()
│           ├─ generateDAT()
│           └─ downloadFiles()
```

**How it works:**

```
File1.cfg + File1.dat (10:00:05.200) ┐
File2.cfg + File2.dat (10:00:05.201) ├─→ parseFiles() (reuses original)
File3.cfg + File3.dat (10:00:05.198) ┘
                              ↓
                    combineByTimeWindow(0.5s)
                    ↓
                    "All within 3ms → Same event!"
                              ↓
                    findDuplicates()
                    "Voltage_A exists in all 3 files"
                              ↓
                    selectBestQuality()
                    "Keep File2's Voltage_A (best SNR)"
                              ↓
                    Result:
                    Voltage_A, Voltage_B, Current, Trip_Signal
                    (4 channels instead of 9)
                              ↓
                    generateReport()
                    { removed: 5, duplicates: 2, similar: 0 }
                              ↓
                    generateCFG() + generateDAT()
                              ↓
                    Export: Event_Combined.cfg/dat + Report.json
```

**Advantage**:

- Exported file has correct timestamps
- Duplicates removed intelligently
- Report shows decisions made
- Can be loaded back in viewer

---

## Visual Comparison

### Original Viewer (Concatenation)

```
┌─ File1 ─────┐
│ Voltage_A   │
│ Voltage_B   │
│ Current     │
└─────────────┘
┌─ File2 ─────┐
│ Voltage_A   │
│ Voltage_B   │
│ Current     │
└─────────────┘
┌─ File3 ─────┐
│ Voltage_A   │
│ Voltage_B   │
│ Current     │
└─────────────┘
        ↓
    (All stacked)
        ↓
┌─ Merged ──────────────┐
│ File1_Voltage_A       │
│ File1_Voltage_B       │
│ File1_Current         │
│ File2_Voltage_A ← dup │
│ File2_Voltage_B ← dup │
│ File2_Current   ← dup │
│ File3_Voltage_A ← dup │
│ File3_Voltage_B ← dup │
│ File3_Current   ← dup │
└──────────────────────┘
(9 channels in viewer)
```

### New Combiner (Intelligent Merging)

```
┌─ File1 ─────┐        ┌─ File2 ─────┐        ┌─ File3 ─────┐
│ Voltage_A   │        │ Voltage_A   │        │ Voltage_A   │
│ Voltage_B   │        │ Voltage_B   │        │ Voltage_B   │
│ Current     │        │ Current     │        │ Current     │
└─────────────┘        └─────────────┘        │ Trip_Signal │
                                              └─────────────┘
        ↓                       ↓                       ↓
    Same event? (check timestamps)
        ↓
    YES - within 3ms window
        ↓
    Intelligent merge:
    - Voltage_A: Keep File2 (best quality)
    - Voltage_B: Keep File1 (best resolution)
    - Current: Merge all 3 (with interpolation)
    - Trip_Signal: Keep File3 (unique)
        ↓
┌─ Merged ──────────────┐
│ Voltage_A (File2)     │
│ Voltage_B (File1)     │
│ Current (merged)      │
│ Trip_Signal (File3)   │
└──────────────────────┘
(4 channels in new file)

Report:
- Removed 5 duplicates
- Kept best quality
- Aligned timestamps
- Added 1 unique channel
```

---

## The Three Phases of Usage

### Phase 1: Exploration (Original Viewer)

```
User: "Do these 3 files show the same event?"
      ↓
      Open original viewer
      Load File1.cfg, File2.cfg, File3.cfg
      ↓
      See 9 channels (File1_*, File2_*, File3_*)
      ↓
      Inspect waveforms
      Check timestamps
      Compare channel names
      ↓
      Decision: "Yes, same event but different sensors"
```

### Phase 2: Processing (New Combiner)

```
User: "Create a single combined file"
      ↓
      Open combiner app
      Load same 3 files
      ↓
      Combiner detects: All within 3ms → same event
      Removes: 5 duplicates
      Exports: Event_Combined.cfg/dat + Report.json
      ↓
      Decision: "Done! Here's your merged file"
```

### Phase 3: Validation (Original Viewer Again)

```
User: "Does the exported file look correct?"
      ↓
      Open original viewer
      Load Event_Combined.cfg + Event_Combined.dat
      ↓
      See 4 channels (no prefixes, deduplicated)
      Verify: Charts look correct
      ↓
      Decision: "Perfect! Use this merged file for analysis"
```

---

## Code Sharing Strategy

### Files to REUSE (Same in both)

```javascript
// Both use these WITHOUT modification:

import { parseCFG, parseDAT } from "../../src/components/comtradeUtils.js";
// ✓ Parsing logic identical

import { groupCfgDatFiles } from "../../src/utils/fileGrouping.js";
// ✓ File pairing logic identical

import { autoGroupChannels } from "../../src/utils/autoGroupChannels.js";
// ✓ Channel grouping logic same

import { constants } from "../../src/utils/constants.js";
// ✓ All constants same
```

### Files NOT to Reuse (Different implementations)

```javascript
// Original has:
mergeComtradeFilesSetsSequential(); // Concatenates + prefixes

// Combiner has:
combineByTimeWindow(); // Groups by time window
findDuplicates(); // Deduplicates
reportGenerator.generateReport(); // Creates report
dataExporter.downloadFiles(); // Exports as new CFG/DAT
```

---

## File Locations

### Original Codebase (No Changes Needed)

```
COMTRADEv1/
├── src/
│   ├── main.js
│   ├── components/
│   │   └── comtradeUtils.js    ← Keep for reuse
│   └── utils/
│       ├── multiFileHandler.js ← Keep, still used for viewer
│       ├── mergeComtradeFiles.js ← Keep, still used for viewer
│       ├── fileGrouping.js     ← Keep, can reuse
│       ├── autoGroupChannels.js ← Keep, can reuse
│       └── constants.js        ← Keep, can reuse
└── index.html
```

### New Combiner App (Separate)

```
COMTRADEv1/comtrade-combiner/
├── src/
│   ├── app.js
│   ├── utils/
│   │   ├── fileParser.js       ← Imports parseCFG from original
│   │   ├── combiner.js         ← NEW: Time-window grouping
│   │   ├── reportGenerator.js  ← NEW: Report generation
│   │   └── dataExporter.js     ← NEW: CFG/DAT export
│   └── components/
│       └── (UI components)
├── index.html
├── styles.css
├── QUICK_START_ENHANCED.md
├── ARCHITECTURE_GUIDE.md
└── ENHANCED_FEATURES.md
```

---

## Why NOT Merge Them?

### Option A: Keep Original Only

❌ Problem:

- Can't remove duplicates
- Can't generate reports
- Can't export accurate merged file
- Viewer gets cluttered with 100+ prefixed channels

### Option B: Replace with Combiner Only

❌ Problem:

- Can't do side-by-side comparison
- Combiner designed for export, not viewing
- Can't interactively select what to combine

### Option C: Use Both (Current)

✅ Solution:

- Original for viewing/comparison
- Combiner for intelligent export
- Each optimized for its purpose
- Modular and maintainable

---

## Integration Points

### How Users Will Use Both

```
Workflow:
1. User loads 3 files in VIEWER
   ├─ See them stacked with prefixes
   ├─ Verify they're same event
   ├─ Check channel overlap
   └─ Note: 7 channels displayed (3 unique)

2. User thinks: "I need these combined into 1 file"
   └─ Opens COMBINER app (separate window/tab)

3. User loads same 3 files in COMBINER
   ├─ Combiner detects: "Same event, 3ms window"
   ├─ Removes duplicates automatically
   ├─ Shows report: "Removed 4 duplicate channels"
   └─ Exports: Event_Combined.cfg/dat

4. User loads Event_Combined.cfg back in VIEWER
   ├─ Now sees 4 channels (no prefixes)
   ├─ No duplicates
   ├─ Charts render correctly
   └─ Uses this merged file for further analysis
```

### Future Integration (Tauri/Node)

```
[Phase 3: Tauri/Node Enhancement]

VIEWER gets menu item: "Process in Combiner"
         ↓
Automatically:
1. Export files to temporary location
2. Launch Combiner with files
3. Wait for completion
4. Auto-reload merged file
5. Show notification: "Successfully merged 3 files into 1"

This happens within single application, but
engines are still separate and optimized independently.
```

---

## Success Criteria Checklist

### Phase 1: ✅ Combiner Created

- [x] Separate application built
- [x] Time-window grouping working
- [x] Duplicate detection implemented
- [x] Report generation complete
- [x] Export to CFG/DAT working

### Phase 2: Test Separately

- [ ] Test combiner loads files correctly
- [ ] Test time-window detection (3ms, 100ms, 1s)
- [ ] Test exported file has correct timestamps
- [ ] Test loading exported file in viewer

### Phase 3: Document Workflow

- [ ] User guide: "When to use viewer vs combiner"
- [ ] Examples: Real-world scenarios
- [ ] Troubleshooting guide

### Phase 4: Future Enhancement (Tauri)

- [ ] Unified window system
- [ ] Automatic file watching
- [ ] Menu integration
- [ ] OS-specific functions

---

## Key Takeaway

**You're building TWO tools, not replacing one:**

1. **Viewer**: "Show me the data"

   - Uses: `mergeComtradeFiles.js` (concatenation)
   - Displays: All channels stacked
   - Purpose: Visual analysis

2. **Combiner**: "Create a merged file"
   - Uses: New modules (intelligent grouping)
   - Exports: New CFG/DAT
   - Purpose: Data processing

**Both needed because they answer different questions.**

Think of it like:

- Excel = Viewer (display data)
- Pivot Tables = Combiner (transform data)
- You use both when analyzing spreadsheets!
