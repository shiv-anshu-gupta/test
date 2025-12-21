# COMTRADE Combiner - Code Flow Comparison

## Side-by-Side Code Comparison

### Original Viewer Flow

```javascript
// File: src/main.js (Lines 1539-1580)

async function handleLoadFiles() {
  // Get files from HTML input
  const files = cfgFileInput.files; // User selected files

  // OPTION 1: Use multiFileHandler (current approach)
  const result = await processFilesInBatches(files, TIME_UNIT);

  // Internally calls: handleMultipleFiles() → mergeComtradeFilesSetsSequential()

  // Result structure:
  // {
  //   cfg: { analogChannels, digitalChannels, ... },
  //   data: { time, analogData, digitalData },
  //   isMerged: true/false,
  //   fileCount: number,
  //   filenames: [...]
  // }

  // DISPLAY in viewer (NOT for export)
  renderComtradeCharts(cfg, data, dataState);
}
```

### New Combiner Flow

```javascript
// File: comtrade-combiner/src/app.js

class ComtradeComberApp {
  async analyzeFiles() {
    // Get files from HTML input
    const files = fileInput.files;

    // Parse files
    const parsedFiles = await this.parseFiles(files);

    // COMBINE intelligently (NOT just stack)
    const groups = await this.combineFilesByTimeWindow(parsedFiles);

    // Generate REPORT
    const report = ReportGenerator.generateReport(groups);

    // Display report + download options
    this.displayDetailedReport(report);
  }

  async combineFilesByTimeWindow(parsedFiles) {
    // NEW LOGIC: Group by time window
    const timeWindow = 0.5; // seconds (configurable)

    const groups = [];
    for (let i = 0; i < parsedFiles.length; i++) {
      const file = parsedFiles[i];
      let added = false;

      // Try to find existing group within time window
      for (const group of groups) {
        const timeDiff = Math.abs(
          file.cfg.recordingStartTime - group.startTime
        );

        if (timeDiff < timeWindow) {
          group.files.push(file);
          added = true;
          break;
        }
      }

      // Create new group if not found
      if (!added) {
        groups.push({
          startTime: file.cfg.recordingStartTime,
          files: [file],
        });
      }
    }

    return groups;
  }

  downloadReport() {
    // EXPORT: Can save as new CFG/DAT + JSON report
    const cfg = this.generateCFG();
    const dat = this.generateDAT();

    ComtradeDataExporter.downloadFiles(cfg, dat);
  }
}
```

---

## Core Algorithm Differences

### Original: mergeComtradeFilesSetsSequential()

```javascript
// File: src/utils/mergeComtradeFiles.js (Lines 13-98)

export function mergeComtradeFilesSetsSequential(parsedFileSets) {
  console.log("Merging", parsedFileSets.length, "files");

  // KEY: Use FIRST file's time for ALL files
  const baseTime = dataArray[0].time; // ← All files use this

  // Define file offsets (but they're not actually used for alignment)
  const fileOffsets = parsedFileSets.map((set, idx) => ({
    fileIdx: idx,
    startTime: baseTime[0],
    endTime: baseTime[baseTime.length - 1],
    sampleCount: baseTime.length,
    timeOffset: 0, // ← Not used! All files on same time
    duration: baseTime[baseTime.length - 1] - baseTime[0],
  }));

  // STACK channels (add prefixes to avoid conflicts)
  const { analogChannels: mergedAnalogChannels } = mergeAnalogChannels(
    cfgArray,
    dataArray
  );

  // Build merged CFG with PREFIXED names
  const mergedCfg = buildMergedCfg(
    cfgArray,
    mergedAnalogChannels, // File1_Voltage_A, File2_Voltage_A, ...
    mergedDigitalChannels,
    fileOffsets
  );

  // Return data with STACKED channels
  return {
    mergedCfg, // All channels with prefixes
    mergedData: {
      time: baseTime, // Only first file's time
      analogData: mergedAnalogData, // All stacked
      digitalData: mergedDigitalData, // All stacked
    },
    isMerged: true,
    fileCount: parsedFileSets.length,
  };
}

// Channel prefix logic (in channelMerger.js)
// For each file, prepend filename:
// Voltage_A → File1_Voltage_A
// Voltage_A → File2_Voltage_A  ← Becomes separate channel!
```

### New: combineByTimeWindow()

```javascript
// File: comtrade-combiner/src/utils/combiner.js

export function combineByTimeWindow(parsedFiles, timeWindowSeconds = 0.5) {
  // Group files by time proximity
  const groups = groupByTimeWindow(parsedFiles, timeWindowSeconds);

  console.log("Found", groups.length, "time-based groups");

  const mergedGroups = [];

  for (const group of groups) {
    console.log(
      `Processing group with ${group.files.length} files:`,
      group.timeRange
    );

    // For each group, intelligently merge
    const merged = {
      ...group,
      mergedData: mergeGroupIntelligently(group.files),
      report: analyzeGroup(group.files),
    };

    mergedGroups.push(merged);
  }

  return mergedGroups;
}

function mergeGroupIntelligently(files) {
  // DEDUPLICATION: Find duplicate channels
  const duplicates = findDuplicates(files);
  // [
  //   { name: "Voltage_A", files: [File1, File2] },
  //   { name: "Voltage_B", files: [File1, File2] }
  // ]

  // For each duplicate, keep BEST quality
  const finalChannels = [];
  const seen = new Set();

  for (const file of files) {
    for (const channel of file.cfg.analogChannels) {
      if (!seen.has(channel.name)) {
        // Find if duplicate exists
        const dup = duplicates.find((d) => d.name === channel.name);

        if (dup) {
          // Keep best quality
          const best = selectBestChannel(dup.files);
          finalChannels.push(best);
          seen.add(channel.name);
        } else {
          // Unique channel, keep as-is
          finalChannels.push(channel);
          seen.add(channel.name);
        }
      }
    }
  }

  // ALIGNMENT: Fix time offsets if needed
  const alignedData = alignChannelsByTime(files, finalChannels);

  return {
    channels: finalChannels,
    data: alignedData,
    removedCount: {
      duplicates: duplicates.length,
      similar: similarChannels.length,
    },
  };
}
```

---

## Data Structure Comparison

### Original Viewer Output

```javascript
// Result from multiFileHandler + mergeComtradeFilesSetsSequential

const result = {
  cfg: {
    stationName: "Multiple Files",
    recordingDeviceId: "MERGED",
    isMerged: true,
    sourceFiles: [
      { filename: "relay1.cfg", index: 0, fileOffset: {...} },
      { filename: "relay2.cfg", index: 1, fileOffset: {...} }
    ],
    analogChannels: [
      // File 1's channels
      {
        id: 1,
        name: "Voltage_A",
        displayName: "File1_Voltage_A",  // ← PREFIXED!
        sourceFileIndex: 0,
        unit: "kV",
        ...
      },
      // File 2's channels
      {
        id: 1,
        name: "Voltage_A",
        displayName: "File2_Voltage_A",  // ← SAME NAME, PREFIXED!
        sourceFileIndex: 1,
        unit: "kV",
        ...
      },
      // File 1's other channels
      {
        id: 2,
        name: "Voltage_B",
        displayName: "File1_Voltage_B",
        sourceFileIndex: 0,
        ...
      },
      // File 2's other channels
      {
        id: 2,
        name: "Voltage_B",
        displayName: "File2_Voltage_B",
        sourceFileIndex: 1,
        ...
      }
    ],
    digitalChannels: [...]
  },

  data: {
    time: [
      0.0000, 0.0002, 0.0004, 0.0006, ...  // Only File1's time!
    ],
    analogData: [
      // File1_Voltage_A data
      [1.0, 1.1, 1.2, 1.3, ...],
      // File2_Voltage_A data (but AT File1's time - WRONG if File2 started later!)
      [2.0, 2.1, 2.2, 2.3, ...],
      // File1_Voltage_B data
      [0.95, 1.05, 1.15, ...],
      // File2_Voltage_B data
      [0.90, 1.00, 1.10, ...]
    ],
    digitalData: [...]
  }
};

// Problem: If File2 started at 10:00:05.5 but we use File1's time (10:00:05.0),
// File2's data is displayed 0.5 seconds too early!
```

### New Combiner Output

```javascript
// Result from combineByTimeWindow + mergeGroupIntelligently

const result = {
  groups: [
    {
      startTime: 1000000.200,  // File1: 10:00:05.200
      endTime: 1000000.201,    // File3: 10:00:05.201 (within 1ms)
      files: [File1, File2, File3],
      timeRange: "10:00:05.198 - 10:00:05.201 (3ms window)",

      mergedCfg: {
        stationName: "Event_Combined",
        recordingDeviceId: "MERGED",
        analogChannels: [
          // DEDUPLICATED channels
          {
            id: 1,
            name: "Voltage_A",          // ← NO PREFIX!
            displayName: "Voltage_A",
            sourceFile: "best quality", // File2 had better data
            unit: "kV",
            ...
          },
          {
            id: 2,
            name: "Voltage_B",
            displayName: "Voltage_B",
            sourceFile: "best quality",
            ...
          },
          // Unique channels added
          {
            id: 3,
            name: "Trip_Signal",
            displayName: "Trip_Signal",  // ← Only in File3
            sourceFile: "File3",
            ...
          }
        ]
      },

      mergedData: {
        time: [
          0.0000, 0.0002, 0.0004, ...   // ALIGNED time
        ],
        analogData: [
          [1.05, 1.15, 1.25, ...],      // Voltage_A (best merged)
          [0.92, 1.02, 1.12, ...],      // Voltage_B (best merged)
          [1.0, 0.9, 1.1, ...]          // Trip_Signal (from File3)
        ]
      },

      report: {
        analysisType: "time_window",
        filesProcessed: 3,
        duplicatesFound: 4,
        removedDuplicates: 4,
        similarChannelsFound: 0,
        removedSimilar: 0,
        timeAlignment: {
          File1: { offset: "0ms" },
          File2: { offset: "+1ms" },
          File3: { offset: "-2ms" }
        },
        finalChannelCount: 3,
        detail: [
          { action: "KEEP", channel: "Voltage_A", source: "File2 (best SNR)" },
          { action: "KEEP", channel: "Voltage_B", source: "File1 (best resolution)" },
          { action: "REMOVE", channel: "Voltage_A", source: "File1", reason: "Duplicate" },
          { action: "REMOVE", channel: "Voltage_A", source: "File3", reason: "Duplicate" },
          { action: "REMOVE", channel: "Voltage_B", source: "File2", reason: "Duplicate" },
          { action: "REMOVE", channel: "Voltage_B", source: "File3", reason: "Duplicate" },
          { action: "ADD", channel: "Trip_Signal", source: "File3", reason: "Unique" }
        ]
      }
    }
  ]
};

// ADVANTAGES:
// 1. Duplicates removed (Voltage_A, Voltage_B only appear once)
// 2. Time properly aligned (each file's data at correct time)
// 3. Best quality selected (File2's Voltage_A, File1's Voltage_B)
// 4. Detailed report showing decisions
// 5. Can be exported as new CFG/DAT
```

---

## Processing Pipeline Comparison

### Original Viewer Pipeline

```
Files in Browser
       ↓
[HTML: <input type="file" id="cfgFile" multiple>]
       ↓
handleLoadFiles()
       ↓
processFilesInBatches()
       ↓
multiFileHandler.handleMultipleFiles()
       ↓
Step 1: groupCfgDatFiles() → Pair CFG with DAT
Step 2: parseAllFilePairs() → Parse all (parallel)
Step 3: validateSampleRates() → Check if compatible
Step 4: mergeComtradeFilesSetsSequential() → STACK channels + prefix
Step 5: Add computed channels (if any)
       ↓
Result: cfg + data objects
       ↓
renderComtradeCharts()
       ↓
Display in viewer (all channels stacked)
```

### New Combiner Pipeline

```
Files in Browser
       ↓
[HTML: <input type="file" id="files" multiple>]
       ↓
app.analyzeFiles()
       ↓
Step 1: parseFiles() → Group + Parse (reuses parseCFG/parseDAT)
Step 2: combineByTimeWindow() → Group by timestamp
Step 3: For each time group:
          - findDuplicates()
          - findSimilarChannels()
          - selectBestQuality()
          - alignByTime() [uses interpolation]
Step 4: ReportGenerator.generateReport()
       ↓
Display: Report (HTML + JSON)
       ↓
downloadReport() or downloadCombined()
       ↓
Export: New_Combined.cfg, New_Combined.dat, Report.json
       ↓
User can load New_Combined.cfg in VIEWER
```

---

## Function Call Comparison

### Parsing (SAME in both)

```javascript
// ORIGINAL - src/utils/multiFileHandler.js
async function parseAllFilePairs(filePairs, TIME_UNIT) {
  const parsePromises = filePairs.map(async (pair) => {
    const cfgText = await pair.cfg.text();
    const cfg = parseCFG(cfgText, TIME_UNIT); // ← From comtradeUtils
    const dat = parseDAT(datContent, cfg, fileType, TIME_UNIT); // ← From comtradeUtils
    return { cfg, dat };
  });
  return Promise.all(parsePromises);
}

// NEW COMBINER - comtrade-combiner/src/utils/fileParser.js
export async function parseFiles(files, TIME_UNIT) {
  const pairs = groupCfgDatFiles(files);
  const parsePromises = pairs.map(async (pair) => {
    const cfgText = await pair.cfg.text();
    const cfg = parseCFG(cfgText, TIME_UNIT); // ← SAME: From comtradeUtils
    const dat = parseDAT(datContent, cfg, fileType, TIME_UNIT); // ← SAME
    return { cfg, dat };
  });
  return Promise.all(parsePromises);
}

// ✓ Same parsing logic = code reuse!
```

### Merging (DIFFERENT)

```javascript
// ORIGINAL - Concatenate + Prefix
const mergedChannels = cfgArray.flatMap((cfg, idx) =>
  cfg.analogChannels.map((ch) => ({
    ...ch,
    displayName: `File${idx + 1}_${ch.name}`, // ← ADD PREFIX
  }))
);

// NEW COMBINER - Deduplicate + Select best
const mergedChannels = [];
const seen = new Set();
for (const channel of allChannels) {
  if (!seen.has(channel.name)) {
    const best = selectBestQuality(channel.name);
    mergedChannels.push(best);
    seen.add(channel.name);
  }
}

// ✗ Different logic = different results!
```

---

## Summary

| Stage              | Original           | Combiner              | Same?           |
| ------------------ | ------------------ | --------------------- | --------------- |
| **Load Files**     | fileInput.files    | fileInput.files       | ✓ Same          |
| **Parse CFG/DAT**  | parseCFG/parseDAT  | parseCFG/parseDAT     | ✓ Same (reused) |
| **Group Files**    | Group into pairs   | Group by time window  | ✗ Different     |
| **Merge Strategy** | Stack + prefix     | Deduplicate           | ✗ Different     |
| **Channel Naming** | File1_Ch, File2_Ch | Ch (deduplicated)     | ✗ Different     |
| **Time Array**     | First file only    | Intelligently aligned | ✗ Different     |
| **Report**         | None               | Detailed JSON         | ✗ Different     |
| **Export**         | Display only       | CFG/DAT + Report      | ✗ Different     |

**Key insight**: They use the SAME PARSING but DIFFERENT MERGING strategies!
