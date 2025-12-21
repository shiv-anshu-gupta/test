# COMTRADE Combiner - Integration Architecture Explanation

## The Core Question: Why Separate Applications?

You're right to question this. Let me explain the **architectural difference** between:

1. **Original Codebase** (`mergeComtradeFiles.js`, `multiFileHandler.js`)
2. **New Combiner Application** (`comtrade-combiner/`)

---

## Current Original Codebase Architecture

### File Structure (What Already Exists)

```
src/utils/
├── multiFileHandler.js       ← Main entry point for file loading
├── mergeComtradeFiles.js     ← Merges CFG/DAT objects
├── channelMerger.js          ← Merges channel arrays
├── timeMerger.js             ← Handles time arrays
└── autoGroupChannels.js      ← Groups channels by similarity
```

### How Original Merge Works (Current Flow)

```
User loads files in main viewer
         ↓
[fileInput] (HTML)
         ↓
handleLoadFiles() (main.js)
         ↓
processFilesInBatches() or
handleMultipleFiles() (multiFileHandler.js)
         ↓
1. Group CFG/DAT files into pairs
2. Parse CFG + DAT files (parallel)
3. MERGE the parsed objects:
   - Stack channels with prefixes (File1_ChannelA, File2_ChannelA)
   - Keep first file's time array (all files same duration)
   - Rename duplicate channels to avoid conflicts
         ↓
Merged CFG + Data objects returned
         ↓
Pass to renderComtradeCharts()
         ↓
Display in UI with all files' channels visible
```

### Key Problem with Current System

**The original merge is designed for:**

- ✅ **Concatenating channels** (stacking File1's channels + File2's channels)
- ✅ **Simple display** (show all channels from all files)
- ❌ **NOT for intelligent combining** (time-window grouping, duplicate removal, reporting)
- ❌ **NOT for file export** (can't save merged result as new CFG/DAT)

**Current Behavior:**

```
File1 (timestamp 10:00:05)      File2 (timestamp 10:00:06)
├─ Voltage_A                    ├─ Voltage_A
├─ Voltage_B                    ├─ Voltage_B
└─ Current                      └─ Current
         ↓ MERGE ↓
Result (still time 10:00:05):
├─ File1_Voltage_A
├─ File1_Voltage_B
├─ File1_Current
├─ File2_Voltage_A    ← PROBLEM: File2 data is NOW at File1's time!
├─ File2_Voltage_B
└─ File2_Current
```

---

## Why You Need BOTH Systems

### System 1: Original Viewer (Current)

**Purpose**: Visualize and compare multiple COMTRADE files side-by-side
**File Merge Strategy**: CONCATENATE channels
**Use Case**:

- "Show me all channels from all files"
- "Compare relay1.cfg + relay2.cfg in same window"
- "View all signals simultaneously"

**What it does:**

1. Takes any number of files
2. Adds them all as separate channels to display
3. Shows them on same time axis (using first file's time)
4. Good for visual comparison

---

### System 2: New Combiner Application (Separate UI)

**Purpose**: Create a NEW merged COMTRADE file from multiple sources
**File Merge Strategy**: TIME-WINDOW based intelligent combining
**Use Case**:

- "These 3 files captured the same event at different timestamps"
- "Remove duplicate channels between files"
- "Export a new CFG/DAT with merged result"
- "Understand what happened to data during merge"

**What it does:**

1. Takes files with same EVENT but different timestamps
2. Groups them by configurable time-window (e.g., "within 0.5 seconds")
3. Removes duplicates and similar channels
4. Generates comprehensive REPORT showing decisions
5. Exports NEW CFG/DAT file pair

---

## The Two Use Cases Side-by-Side

### Scenario 1: Compare Different Relay Records (Original Viewer)

```
Relay 1 captured: 10:00:05.000 to 10:00:07.500
  ├─ Voltage_A [sample rate: 4800 Hz]
  ├─ Voltage_B
  └─ Current

Relay 2 captured: 10:00:05.100 to 10:00:07.600
  ├─ Voltage_A
  ├─ Voltage_B
  └─ Current

User wants: "Show me all channels from both files in one window"

ORIGINAL VIEWER SOLUTION:
- Stack all channels (duplicates renamed to File1_Voltage_A, File2_Voltage_A)
- Display on same time axis
- User can see what changed between relays
- ✅ Works great for visual comparison
```

### Scenario 2: Combine Same Event from Multiple Files (New Combiner)

```
Same relay malfunction recorded by:
- Main Relay (timestamp 10:00:05.200)
- Backup Relay (timestamp 10:00:05.201)  ← 1ms offset
- Phase Selector (timestamp 10:00:05.198) ← 2ms offset

User wants: "Create ONE combined file representing this single event"

NEW COMBINER SOLUTION:
1. Load 3 files → combiner recognizes they're within 3ms window (configurable)
2. Groups them as single event
3. Analyzes channels:
   - Voltage_A exists in all 3 → Keep best quality
   - Current exists in Relay + BackupRelay → Merge aligned
   - Trip_Signal only in Phase Selector → Add as computed
4. Generates detailed report:
   - "Removed 2 duplicate Voltage_A channels"
   - "File alignment required time-shift of +1ms"
   - "Total 9 channels → 6 unique channels"
5. Exports new CFG/DAT:
   - New_Event_Combined.cfg
   - New_Event_Combined.dat
   - Report.json
- ✅ Works for creating exportable merged result
```

---

## Architectural Comparison

| Feature                | Original Viewer         | New Combiner         |
| ---------------------- | ----------------------- | -------------------- |
| **File Merge Type**    | Concatenate channels    | Intelligent grouping |
| **Time Alignment**     | First file's time only  | Time-window aware    |
| **Duplicate Handling** | Rename (File1*, File2*) | Remove/analyze       |
| **Channel Prefix**     | Yes (File1_Voltage_A)   | No (just Voltage_A)  |
| **Output**             | Display in viewer       | Save new CFG/DAT     |
| **Report**             | None                    | Detailed JSON report |
| **Use Case**           | Visual comparison       | Export merged file   |
| **Location**           | Main application        | Standalone app       |
| **File Count**         | Any number              | Specific event files |

---

## Why NOT Merge Both Systems?

### Option 1: Use ONLY Original Merge System

**Problem**:

- Can't remove duplicates intelligently
- Can't generate reports
- Can't export as new file
- Viewer gets cluttered with 100+ stacked channels

### Option 2: Use ONLY New Combiner

**Problem**:

- Can't do side-by-side comparison
- Designed only for exporting, not viewing
- Can't interactively select channels to combine

### Option 3: Use BOTH (Current Design)

**Benefit**:

- Original viewer for analysis/comparison
- Combiner for intelligent export
- Each tool optimized for its use case
- Modular and maintainable

---

## Integration Strategy

### How They Should Work Together

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S WORKFLOW                           │
└─────────────────────────────────────────────────────────────┘

Step 1: Initial Exploration (Original Viewer)
┌──────────────────────────────────┐
│ 1. Load 3+ COMTRADE files        │
│ 2. Viewer stacks all channels    │
│ 3. Check: Are they same event?   │
│ 4. Check: Which channels overlap?│
└──────────────────────────────────┘
         ↓ (Yes, they're same event + overlapping channels)

Step 2: Intelligent Combining (New Combiner)
┌──────────────────────────────────┐
│ 1. Open Combiner app             │
│ 2. Load same 3 files             │
│ 3. Configure time window (1 sec)  │
│ 4. Review report:                │
│    - Duplicates found: 3         │
│    - Time offsets: <2ms          │
│ 5. Export combined result        │
└──────────────────────────────────┘
         ↓ (New_Combined.cfg/dat created)

Step 3: Validation (Original Viewer Again)
┌──────────────────────────────────┐
│ 1. Load New_Combined.cfg/dat     │
│ 2. Verify it looks correct       │
│ 3. Chart now shows merged data   │
│ 4. Only essential channels shown │
└──────────────────────────────────┘
```

---

## Code Reuse Strategy

### What CAN Be Shared

```
These modules are GENERIC and can be used by BOTH:
├── fileParser.js         ← Both parse CFG/DAT
├── combiner.js           ← Original + Combiner both group channels
├── autoGroupChannels.js  ← Both need channel grouping
├── constants.js          ← Both use same constants
└── helpers.js            ← Utility functions
```

### What IS DIFFERENT

```
Original Viewer Only:
├── renderComtradeCharts.js
├── chartComponent.js
├── DeltaWindow.js
└── Vertical line system

New Combiner Only:
├── reportGenerator.js           ← NEW
├── dataExporter.js              ← NEW (export to CFG/DAT)
├── interpolation.js             ← NEW (for export accuracy)
└── All the comtrade-combiner/ ← Standalone app
```

---

## How to Think About It

### Original Merge System (existing)

```
Purpose: "Show me all data"
Strategy:
  Input:  File1 + File2 + File3
  Output: Display all channels together

Principle: "Concatenate everything"
```

### New Combiner System (new)

```
Purpose: "Create a new merged file"
Strategy:
  Input:  File1 + File2 + File3 (same event, different times)
  Process: Analyze, deduplicate, align time
  Output:  New_Merged.cfg/dat + Report.json

Principle: "Analyze and intelligently combine"
```

---

## Files You Already Have (Don't Duplicate!)

### In `src/utils/` (Original Codebase)

```
✓ multiFileHandler.js      — Handles file loading/parsing
✓ mergeComtradeFiles.js    — Simple concatenation merge
✓ channelMerger.js         — Merges channel arrays
✓ timeMerger.js            — Time array handling
✓ autoGroupChannels.js     — Channel grouping logic
✓ fileGrouping.js          — File pair grouping
```

### Do NOT recreate in combiner-combiner/!

The combiner application **imports** from main codebase:

```javascript
// In comtrade-combiner/src/utils/fileParser.js
import { parseCFG, parseDAT } from "../../src/components/comtradeUtils.js";

// In comtrade-combiner/src/utils/combiner.js
import { groupCfgDatFiles } from "../../src/utils/fileGrouping.js";
```

This way:

- Single source of truth for parsing logic
- Updates in main codebase automatically used
- No code duplication

---

## The Key Insight

**The original merge files (`mergeComtradeFiles.js`, `multiFileHandler.js`) are NOT being replaced.**

They serve a DIFFERENT purpose:

- **Original**: "How do I display multiple files together?"
- **Combiner**: "How do I intelligently merge multiple files into ONE new file?"

**Both exist** because they answer different questions!

---

## Implementation Checklist

### Phase 1: Separate Application (Combiner) ✅ DONE

- [x] Create standalone `comtrade-combiner/` app
- [x] Implement time-window grouping
- [x] Implement duplicate detection
- [x] Implement similarity detection
- [x] Generate reports
- [x] Export as CFG/DAT

### Phase 2: Integration (Next)

- [ ] Test combiner with real files
- [ ] Validate exported files load in viewer
- [ ] Document workflow
- [ ] Add cross-linking between apps

### Phase 3: Advanced Integration (Future - Tauri/Node)

- [ ] Add file dialog integration (Tauri)
- [ ] Add file watcher (Node.js backend)
- [ ] Add OS-specific functions (file scanning)
- [ ] Create unified menu system

---

## Bottom Line

**You need BOTH because:**

| Viewer                   | Combiner                   |
| ------------------------ | -------------------------- |
| "Show me"                | "Create a new file for me" |
| View → Analyze → Compare | Load → Process → Export    |
| Display all channels     | Export unique channels     |
| Visual tool              | Processing tool            |

**They're complementary, not redundant.**

The original merge system stays as-is. The new combiner is a **separate tool** for a **specific use case** (intelligent merging with reporting and export).

Think of it like Excel + Pivot Tables:

- Excel is the viewer (display data)
- Pivot Tables is the processor (transform data)
- Both are needed, they serve different purposes!
