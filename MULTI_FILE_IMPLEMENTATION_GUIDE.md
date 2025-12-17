# Multi-File CFG/DAT Import Implementation Guide

## Overview

Complete modular implementation for loading and merging multiple COMTRADE CFG/DAT file pairs into a single unified dataset. Uses **sequential time alignment** with **file prefixes** for channel naming.

---

## Architecture

### Module Structure

```
src/utils/
├── multiFileHandler.js          # Integration layer (main entry point)
├── fileGrouping.js              # Groups CFG/DAT file pairs
├── timeMerger.js                # Combines time arrays sequentially
├── channelMerger.js             # Renames channels with file prefixes
└── mergeComtradeFiles.js        # Orchestrates the merge strategy

src/main.js (to be updated)       # Call multiFileHandler instead of single-file logic
```

---

## Module Descriptions

### 1. **multiFileHandler.js** (Integration Layer)

**Purpose**: Single entry point for handling multiple file imports

**Main Function**:

```javascript
handleMultipleFiles(fileInput, TIME_UNIT);
```

**Returns**:

```javascript
{
  cfg: MergedCfgObject,
  data: MergedDataObject,
  isMerged: boolean,
  fileCount: number,
  filenames: string[]
}
```

**Usage in main.js**:

```javascript
import { handleMultipleFiles } from "./utils/multiFileHandler.js";

// In handleLoadFiles():
const result = await handleMultipleFiles(cfgFileInput.files, TIME_UNIT);
cfg = result.cfg;
data = result.data;
```

---

### 2. **fileGrouping.js** (File Organization)

**Purpose**: Groups CFG/DAT files into pairs

**Key Functions**:

- `groupCfgDatFiles(files)` - Pairs files by base name
- `sortFilePairs(filePairs)` - Orders pairs alphabetically
- `validateSampleRates(parsedCfgArray)` - Checks sample rate compatibility

**Logic**:

- Input: `[file1.cfg, file1.dat, file2.cfg, file2.dat, ...]`
- Output: `[{cfg: file1.cfg, dat: file1.dat}, {cfg: file2.cfg, dat: file2.dat}, ...]`

---

### 3. **timeMerger.js** (Time Array Merging)

**Purpose**: Combines time arrays from multiple files sequentially

**Strategy**:

```
File 1: [0.000, 0.001, 0.002, ..., 0.999]  (1000 samples, 1s duration)
File 2: [0.000, 0.001, 0.002, ..., 0.999]  (1000 samples, 1s duration)

Result: [0.000, 0.001, ..., 0.999, 1.000, 1.001, ..., 1.999]
        (time offsets file 2 by file 1 duration)
```

**Key Functions**:

- `mergeTimeArraysSequential(fileDataArray)` - Main merge function
- `getFileIndexForTime(time, fileOffsets, timeValue)` - Find which file a time belongs to
- `getSampleIndexInFile(mergedIndex, mergedTime, fileOffsets)` - Get original sample index

**Output**:

```javascript
{
  time: [merged time array],
  fileOffsets: [
    {fileIdx: 0, startTime: 0, endTime: 0.999, sampleCount: 1000, timeOffset: 0, duration: 0.999},
    {fileIdx: 1, startTime: 0, endTime: 0.999, sampleCount: 1000, timeOffset: 0.999, duration: 0.999}
  ]
}
```

---

### 4. **channelMerger.js** (Channel Organization)

**Purpose**: Combines and renames channels with file prefixes

**Renaming Logic**:

```
File 1, Channel "IA"  → "IA" (first file keeps original name)
File 2, Channel "IA"  → "File2_IA"
File 3, Channel "IA"  → "File3_IA"

Alternative with filename:
File "case1.cfg", Channel "IA"  → "case1_IA"
File "case2.cfg", Channel "IA"  → "case2_IA"
```

**Key Functions**:

- `mergeAnalogChannels(cfgArray, dataArray)` - Combines analog channels
- `mergeDigitalChannels(cfgArray, dataArray)` - Combines digital channels
- `getOriginalChannelName(displayName)` - Extract original name from prefixed name

**Output**:

```javascript
{
  analogChannels: [
    {
      name: "IA",
      originalName: "IA",
      displayName: "IA",        // First file
      sourceFileIndex: 0,
      sourceChannelIndex: 0,
      globalChannelIndex: 0,
      // ... other properties
    },
    {
      name: "IA",
      originalName: "IA",
      displayName: "File2_IA",  // Second file
      sourceFileIndex: 1,
      sourceChannelIndex: 0,
      globalChannelIndex: 3
    }
  ],
  analogData: [
    [ia_file1_samples],
    [ib_file1_samples],
    [ia_file2_samples],
    [ib_file2_samples]
  ]
}
```

---

### 5. **mergeComtradeFiles.js** (Orchestrator)

**Purpose**: Coordinates the merge strategy

**Main Function**:

```javascript
mergeComtradeFilesSetsSequential(parsedFileSets);
```

**Process**:

1. Call `mergeTimeArraysSequential()` → Combined time array
2. Call `mergeAnalogChannels()` → Merged analog channels + data
3. Call `mergeDigitalChannels()` → Merged digital channels + data
4. Build merged CFG object with metadata
5. Build merged data object with fileOffsets reference

**Returns**:

```javascript
{
  mergedCfg: {
    isMerged: true,
    sourceFiles: [
      {filename, index, fileOffset},
      {filename, index, fileOffset}
    ],
    analogChannels: [...],
    digitalChannels: [...],
    // ... other CFG properties
  },
  mergedData: {
    time: [...],
    analog: [...],
    digital: [...],
    fileOffsets: [...],
    isMerged: true,
    sourceFileCount: 2
  },
  isMerged: true,
  fileCount: 2
}
```

---

## Data Flow

```
User selects files (CFG/DAT pairs)
         ↓
multiFileHandler.handleMultipleFiles()
         ↓
fileGrouping.groupCfgDatFiles()    [Group files]
         ↓
Parse all CFG/DAT files
         ↓
fileGrouping.validateSampleRates() [Check compatibility]
         ↓
mergeComtradeFiles.mergeComtradeFilesSetsSequential()
         ├→ timeMerger.mergeTimeArraysSequential()      [Combine times]
         ├→ channelMerger.mergeAnalogChannels()         [Rename & merge analog]
         ├→ channelMerger.mergeDigitalChannels()        [Rename & merge digital]
         └→ Build merged CFG and data
         ↓
Return {cfg, data, isMerged, fileCount, filenames}
         ↓
main.js: cfg = result.cfg, data = result.data
```

---

## Integration Steps (To Complete)

### Step 1: Update File Input Element

Modify HTML to allow multiple file selection:

```html
<!-- Before -->
<input id="cfgFileInput" type="file" accept=".cfg,.dat" />

<!-- After -->
<input id="cfgFileInput" type="file" accept=".cfg,.dat" multiple />
```

### Step 2: Update handleLoadFiles in main.js

```javascript
import { handleMultipleFiles } from "./utils/multiFileHandler.js";

async function handleLoadFiles() {
  try {
    // REPLACE old single-file logic with:
    const result = await handleMultipleFiles(cfgFileInput.files, TIME_UNIT);

    cfg = result.cfg;
    data = result.data;

    // Log merge info
    console.log("[handleLoadFiles] Loaded", result.fileCount, "file(s)");
    if (result.isMerged) {
      console.log("[handleLoadFiles] Files merged - source:", result.filenames);
    }

    // Continue with existing code (updateFileInfo, updateStatsCards, etc.)
    // Everything else works the same because cfg/data structure is compatible
  } catch (err) {
    showError("Error loading files: " + err.message, fixedResultsEl);
  }
}
```

### Step 3: Update UI Display

Show merge status in file info:

```javascript
function updateFileInfo(cfgFile, datFile) {
  // If cfg.isMerged is true, show:
  // "Merged Files: file1, file2, file3 (3 analog channels each = 9 total)"
}
```

---

## Backwards Compatibility

✅ **All existing code works unchanged**:

- Render functions use `cfg.analogChannels` and `data.analog` (same structure)
- Charts render the same way
- Computed channels, delta calculations, polar chart all compatible
- Single-file imports work exactly as before

**Only difference**:

- `cfg.analogChannels[i].displayName` contains prefixed name for multi-file merges
- `cfg.isMerged` flag indicates if data is merged
- `data.fileOffsets` contains merge metadata (for advanced features)

---

## Example: Merging 3 Files

**Input Files**:

- case1.cfg / case1.dat (1000 samples, 1s @ 1000Hz)
- case2.cfg / case2.dat (1000 samples, 1s @ 1000Hz)
- case3.cfg / case3.dat (1000 samples, 1s @ 1000Hz)

**Result**:

```javascript
cfg.isMerged = true
cfg.sourceFiles = [
  {filename: 'case1', index: 0, ...},
  {filename: 'case2', index: 1, ...},
  {filename: 'case3', index: 2, ...}
]

// If each file has 3 analog channels (IA, IB, IC):
cfg.analogChannels = [
  {displayName: 'IA', sourceFileIndex: 0},
  {displayName: 'IB', sourceFileIndex: 0},
  {displayName: 'IC', sourceFileIndex: 0},
  {displayName: 'case2_IA', sourceFileIndex: 1},
  {displayName: 'case2_IB', sourceFileIndex: 1},
  {displayName: 'case2_IC', sourceFileIndex: 1},
  {displayName: 'case3_IA', sourceFileIndex: 2},
  {displayName: 'case3_IB', sourceFileIndex: 2},
  {displayName: 'case3_IC', sourceFileIndex: 2}
]  // Total: 9 channels

data.time = [0, 0.001, ..., 2.999]  // 3000 samples, 0-3s
data.fileOffsets = [
  {fileIdx: 0, timeOffset: 0, duration: 0.999},
  {fileIdx: 1, timeOffset: 0.999, duration: 0.999},
  {fileIdx: 2, timeOffset: 1.998, duration: 0.999}
]
```

---

## Console Output Example

```
[multiFileHandler] Processing 6 files
[fileGrouping] Grouping 6 files into CFG/DAT pairs
[fileGrouping] ✓ Pair: case1.cfg + case1.dat
[fileGrouping] ✓ Pair: case2.cfg + case2.dat
[fileGrouping] ✓ Pair: case3.cfg + case3.dat
[fileGrouping] ✅ Created 3 file pairs

[multiFileHandler] Parsing file pair 1/3: case1
[multiFileHandler]   ✓ case1: 3 analog + 0 digital
[multiFileHandler] Parsing file pair 2/3: case2
[multiFileHandler]   ✓ case2: 3 analog + 0 digital
[multiFileHandler] Parsing file pair 3/3: case3
[multiFileHandler]   ✓ case3: 3 analog + 0 digital

[fileGrouping] Validating sample rates for 3 files
[fileGrouping] File 0 (case1): 1000 Hz
[fileGrouping] File 1 (case2): 1000 Hz
[fileGrouping] File 2 (case3): 1000 Hz
[fileGrouping] ✅ Sample rate validation: 1000 Hz

[mergeComtradeFiles] Starting merge of 3 file sets
[mergeComtradeFiles] Step 1: Merging time arrays...
[timeMerger] Merging 3 files sequentially
[timeMerger] File 0: 1000 samples, duration=0.9990s, offset=0.0000s
[timeMerger] File 1: 1000 samples, duration=0.9990s, offset=0.9990s
[timeMerger] File 2: 1000 samples, duration=0.9990s, offset=1.9980s
[timeMerger] ✅ Merged time array: 3000 total samples

[mergeComtradeFiles] Step 2: Merging analog channels...
[channelMerger] Merging analog channels from 3 files
[channelMerger] File 0: Processing 3 analog channels
[channelMerger]   ✓ IA: 1000 samples
[channelMerger]   ✓ IB: 1000 samples
[channelMerger]   ✓ IC: 1000 samples
[channelMerger] File 1: Processing 3 analog channels
[channelMerger]   ✓ case2_IA: 1000 samples
[channelMerger]   ✓ case2_IB: 1000 samples
[channelMerger]   ✓ case2_IC: 1000 samples
[channelMerger] File 2: Processing 3 analog channels
[channelMerger]   ✓ case3_IA: 1000 samples
[channelMerger]   ✓ case3_IB: 1000 samples
[channelMerger]   ✓ case3_IC: 1000 samples
[channelMerger] ✅ Merged 9 analog channels

[mergeComtradeFiles] ✅ Merge complete
[mergeComtradeFiles]    Total time samples: 3000
[mergeComtradeFiles]    Total analog channels: 9
[mergeComtradeFiles]    Total digital channels: 0
[mergeComtradeFiles]    Total duration: 2.9970s

[multiFileHandler] ✅ Complete - loaded 3 file(s)
```

---

## Next Steps

1. ✅ Core merge logic created (this file)
2. ⏳ Update main.js handleLoadFiles to use multiFileHandler
3. ⏳ Modify HTML input to accept `multiple` attribute
4. ⏳ Test with actual multi-file scenarios
5. ⏳ Add UI display for merged file info
6. ⏳ Add error handling for mismatched file types

---

## Advanced Features (Future)

- **Interpolation**: Resample if files have different sample rates
- **Synchronized Mode**: Keep overlapping times with renamed channels
- **Composite Mode**: Group channels by type (all IAs, all IBs)
- **Time Shift**: Manual offset adjustment between files
- **Filtering**: Select specific channels from each file
