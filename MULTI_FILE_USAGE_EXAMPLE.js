/**
 * USAGE EXAMPLE: How to integrate multiFileHandler into main.js
 *
 * This shows the exact code changes needed to enable multi-file import
 */

// ============================================
// STEP 1: Add import at top of main.js
// ============================================

import { handleMultipleFiles } from "./utils/multiFileHandler.js";

// ============================================
// STEP 2: Replace handleLoadFiles function
// ============================================

/**
 * BEFORE (current single-file implementation):
 */
async function handleLoadFiles_OLD() {
  const files = Array.from(cfgFileInput.files);
  const cfgFile = files.find((file) =>
    file.name.toLowerCase().endsWith(".cfg")
  );
  // ... parse single files ...
  cfg = parseCFG(cfgText, TIME_UNIT);
  data = parseDAT(datContent, cfg, fileType, TIME_UNIT);
  // ... rest of setup ...
}

/**
 * AFTER (new multi-file implementation):
 */
async function handleLoadFiles() {
  console.log("[handleLoadFiles] Files selected:", cfgFileInput.files.length);

  if (cfgFileInput.files.length === 0) {
    showError("Please select at least one CFG/DAT file pair.", fixedResultsEl);
    return;
  }

  try {
    // ============================================
    // THIS IS THE KEY CHANGE:
    // Use handleMultipleFiles instead of manual parsing
    // ============================================
    const result = await handleMultipleFiles(cfgFileInput.files, TIME_UNIT);

    // Assign to global variables
    cfg = result.cfg;
    data = result.data;

    // Log merge information
    console.log("[handleLoadFiles] ✅ Load complete");
    console.log("[handleLoadFiles]    Files loaded:", result.fileCount);
    console.log("[handleLoadFiles]    Is merged:", result.isMerged);
    console.log("[handleLoadFiles]    Filenames:", result.filenames);

    // Update UI with filenames
    const filenameText = result.isMerged
      ? `Merged: ${result.filenames.join(", ")}`
      : `Loaded: ${result.filenames[0]}`;

    cfgFileNameEl.textContent = filenameText;
    datFileNameEl.textContent = result.isMerged
      ? `(${result.fileCount} DAT files)`
      : `DAT File: ${result.filenames[0]}.dat`;

    // ============================================
    // EVERYTHING BELOW THIS STAYS THE SAME
    // ============================================
    const groups = autoGroupChannels(cfg.analogChannels);

    dataState.analog = data.analog;
    dataState.digital = data.digital;

    // UI HELPER CALLS - unchanged
    showFileInfo();
    updateFileInfo(
      result.isMerged
        ? `${result.fileCount} files merged`
        : cfgFileInput.files[0].name,
      result.isMerged
        ? `${result.fileCount} DAT files`
        : cfgFileInput.files[1].name
    );
    updateStatsCards({
      sampleRate: cfg.sampleRate || 4800,
      duration: cfg.duration || 2000,
      analogChannels: cfg.analogChannels,
      digitalChannels: cfg.digitalChannels,
    });
    toggleChartsVisibility(true);

    // Polar chart initialization - works exactly the same
    try {
      console.log("[handleLoadFiles] Creating PolarChart instance...");
      polarChart = new PolarChart("polarChartContainer");
      polarChart.init();
      polarChart.updatePhasorAtTimeIndex(cfg, data, 0);
      console.log("[handleLoadFiles] ✅ Polar chart initialized");
    } catch (err) {
      console.error("[handleLoadFiles] Failed to initialize polar chart:", err);
    }

    // Channel initialization - works exactly the same
    if (channelState && channelState.suspendHistory) {
      channelState.suspendHistory();
    }
    try {
      // ... rest of initialization code unchanged ...
    } catch (err) {
      console.error("Error during setup:", err);
    }
  } catch (err) {
    console.error("[handleLoadFiles] Error:", err);
    showError("Failed to load files: " + err.message, fixedResultsEl);
  }
}

// ============================================
// STEP 3: Update HTML input element
// ============================================

/**
 * BEFORE:
 * <input id="cfgFileInput" type="file" accept=".cfg,.dat" />
 *
 * AFTER:
 * <input id="cfgFileInput" type="file" accept=".cfg,.dat" multiple />
 *
 * The only change is adding "multiple" attribute!
 */

// ============================================
// USAGE SCENARIOS
// ============================================

/**
 * Scenario 1: Single file pair (backwards compatible)
 * User selects: case1.cfg, case1.dat
 *
 * Output:
 * {
 *   cfg: {isMerged: false, analogChannels: [IA, IB, IC]},
 *   data: {time: [...], analog: [[...], [...], [...]]},
 *   isMerged: false,
 *   fileCount: 1,
 *   filenames: ['case1']
 * }
 */

/**
 * Scenario 2: Multiple file pairs
 * User selects: case1.cfg, case1.dat, case2.cfg, case2.dat, case3.cfg, case3.dat
 *
 * Output:
 * {
 *   cfg: {
 *     isMerged: true,
 *     sourceFiles: [
 *       {filename: 'case1', ...},
 *       {filename: 'case2', ...},
 *       {filename: 'case3', ...}
 *     ],
 *     analogChannels: [
 *       {displayName: 'IA', sourceFileIndex: 0},
 *       {displayName: 'IB', sourceFileIndex: 0},
 *       {displayName: 'IC', sourceFileIndex: 0},
 *       {displayName: 'case2_IA', sourceFileIndex: 1},
 *       {displayName: 'case2_IB', sourceFileIndex: 1},
 *       {displayName: 'case2_IC', sourceFileIndex: 1},
 *       {displayName: 'case3_IA', sourceFileIndex: 2},
 *       {displayName: 'case3_IB', sourceFileIndex: 2},
 *       {displayName: 'case3_IC', sourceFileIndex: 2}
 *     ]
 *   },
 *   data: {
 *     time: [0, 0.001, ..., 2.999],  // 3000 samples, 3 seconds total
 *     analog: [
 *       [case1_ia_samples],
 *       [case1_ib_samples],
 *       [case1_ic_samples],
 *       [case2_ia_samples],
 *       [case2_ib_samples],
 *       [case2_ic_samples],
 *       [case3_ia_samples],
 *       [case3_ib_samples],
 *       [case3_ic_samples]
 *     ],
 *     fileOffsets: [
 *       {fileIdx: 0, timeOffset: 0, duration: 0.999},
 *       {fileIdx: 1, timeOffset: 0.999, duration: 0.999},
 *       {fileIdx: 2, timeOffset: 1.998, duration: 0.999}
 *     ],
 *     isMerged: true,
 *     sourceFileCount: 3
 *   },
 *   isMerged: true,
 *   fileCount: 3,
 *   filenames: ['case1', 'case2', 'case3']
 * }
 */

// ============================================
// CHECKING IF DATA IS MERGED
// ============================================

// In any code that needs to know:
if (cfg.isMerged) {
  console.log("This is merged data from", cfg.sourceFiles.length, "files");

  // Get file info
  for (const source of cfg.sourceFiles) {
    console.log(`  - ${source.filename}`);
  }
}

// Get channels for a specific file
function getChannelsForFile(fileIndex) {
  if (!cfg.isMerged) {
    // Single file
    return cfg.analogChannels;
  }

  // Multi-file: filter by sourceFileIndex
  return cfg.analogChannels.filter((ch) => ch.sourceFileIndex === fileIndex);
}

// Get time bounds for a specific file
function getTimeBoundsForFile(fileIndex) {
  if (!data.fileOffsets) return null;

  const offset = data.fileOffsets.find((o) => o.fileIdx === fileIndex);
  return offset
    ? {
        start: offset.timeOffset,
        end: offset.timeOffset + offset.duration,
        duration: offset.duration,
      }
    : null;
}

// ============================================
// MIGRATION CHECKLIST
// ============================================

/**
 * To migrate to multi-file support:
 *
 * [ ] 1. Add import for handleMultipleFiles
 * [ ] 2. Replace handleLoadFiles function body
 * [ ] 3. Update HTML input to add "multiple" attribute
 * [ ] 4. Test single-file scenario (backwards compatibility)
 * [ ] 5. Test multi-file scenario (new feature)
 * [ ] 6. Test mixed-channel scenarios
 * [ ] 7. Test UI display with merged files
 * [ ] 8. Test all existing features (render, deltas, polar chart, etc.)
 * [ ] 9. Optional: Add advanced features (filtering, interpolation, etc.)
 */

export {};
