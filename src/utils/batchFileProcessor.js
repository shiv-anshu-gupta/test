/**
 * Batch File Processor - Optimized multi-file loading with deferred rendering
 * Prevents application crashes by parsing files without recreating charts
 * until all merging is complete
 *
 * Key Features:
 * - Parse files in chunks with thread yielding
 * - Progress reporting without UI recreation
 * - Single render cycle after all files processed
 * - Automatic memory management
 */

/**
 * Parse and merge files with progress reporting
 * Does NOT trigger any chart recreation during parsing
 *
 * @param {FileList} fileInput - Files from input element
 * @param {number} TIME_UNIT - Time unit for parsing
 * @param {Function} onProgress - Callback for progress: {phase, current, total, message}
 * @returns {Promise<{cfg, data, isMerged, fileCount, filenames, error}>}
 */
export async function processFilesInBatches(
  fileInput,
  TIME_UNIT = 1,
  onProgress = null
) {
  try {
    // Import here to avoid circular dependencies
    const { parseCFG, parseDAT } = await import(
      "../components/comtradeUtils.js"
    );

    // Phase 1: Validate input
    const files = Array.from(fileInput);
    if (files.length === 0) {
      throw new Error("No files selected");
    }

    reportProgress(onProgress, {
      phase: "validation",
      current: 0,
      total: files.length,
      message: `Validating ${files.length} files...`,
    });

    // Phase 2: Parse and merge with progress
    console.log(
      "[batchFileProcessor] Starting batch file processing:",
      files.length,
      "files"
    );

    reportProgress(onProgress, {
      phase: "parsing",
      current: 0,
      total: files.length,
      message: `Parsing files (0/${files.length})...`,
    });

    // Read and parse files
    const parsedFiles = [];
    const filenames = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Skip DAT files - we'll read them when processing CFG
      if (file.name.toLowerCase().endsWith(".dat")) {
        continue;
      }

      // Only process CFG files
      if (!file.name.toLowerCase().endsWith(".cfg")) {
        continue;
      }

      // Read CFG file using FileReader
      const cfgText = await readFileAsText(file);

      // Parse CFG
      const cfg = parseCFG(cfgText, TIME_UNIT);

      // Find corresponding DAT file
      const baseName = file.name.replace(/\.(cfg|dat)$/i, "");
      const datFile = files.find(
        (f) =>
          f.name.toLowerCase().startsWith(baseName.toLowerCase()) &&
          f.name.toLowerCase().endsWith(".dat")
      );

      if (!datFile) {
        console.warn(
          `[batchFileProcessor] No matching DAT file for ${file.name}`
        );
        continue;
      }

      // Read DAT file using FileReader
      const datText = await readFileAsText(datFile);

      // Parse DAT
      const { time, analogData, digitalData } = parseDAT(
        datText,
        cfg,
        "ASCII",
        TIME_UNIT
      );

      parsedFiles.push({
        cfg,
        time,
        analogData,
        digitalData,
        fileName: baseName,
      });

      filenames.push(baseName);

      reportProgress(onProgress, {
        phase: "parsing",
        current: parsedFiles.length,
        total: Math.ceil(files.length / 2), // Rough estimate (pairs)
        message: `Parsing files (${parsedFiles.length} pair(s))...`,
      });

      // Yield to event loop
      await yieldToEventLoop(10);
    }

    if (parsedFiles.length === 0) {
      throw new Error("No valid CFG/DAT file pairs found");
    }

    // Merge parsed files if multiple
    let cfg = parsedFiles[0].cfg;
    let data;

    if (parsedFiles.length === 1) {
      // Single file - no merging needed
      data = {
        time: parsedFiles[0].time,
        analogData: parsedFiles[0].analogData,
        digitalData: parsedFiles[0].digitalData,
      };
    } else {
      // Multiple files - merge by time
      data = mergeFilesByTime(parsedFiles);
    }

    console.log(
      "[batchFileProcessor] ✅ All files parsed and merged successfully"
    );
    reportProgress(onProgress, {
      phase: "complete",
      current: files.length,
      total: files.length,
      message: `Ready to render (${parsedFiles.length} file(s))`,
    });

    return {
      cfg,
      data,
      isMerged: parsedFiles.length > 1,
      fileCount: parsedFiles.length,
      filenames,
      error: null,
    };
  } catch (err) {
    console.error("[batchFileProcessor] ✗ Error:", err.message);
    reportProgress(onProgress, {
      phase: "error",
      current: 0,
      total: 0,
      message: `Error: ${err.message}`,
    });

    return {
      cfg: null,
      data: null,
      isMerged: false,
      fileCount: 0,
      filenames: [],
      error: err.message,
    };
  }
}

/**
 * Merge multiple parsed files by time
 * @private
 */
function mergeFilesByTime(parsedFiles) {
  // Simple merge: concatenate data from all files
  const mergedTime = [];
  const mergedAnalogData = [];
  const mergedDigitalData = [];

  let timeOffset = 0;

  parsedFiles.forEach((file, idx) => {
    const timeDelta = idx === 0 ? 0 : timeOffset;

    file.time.forEach((t) => {
      mergedTime.push(t + timeDelta);
    });

    file.analogData.forEach((analogSample) => {
      mergedAnalogData.push(analogSample);
    });

    file.digitalData.forEach((digitalSample) => {
      mergedDigitalData.push(digitalSample);
    });

    // Update offset for next file
    if (file.time.length > 0) {
      timeOffset = mergedTime[mergedTime.length - 1];
    }
  });

  return {
    time: mergedTime,
    analogData: mergedAnalogData,
    digitalData: mergedDigitalData,
  };
}

/**
 * Read file as text using FileReader
 * Ensures compatibility across all browsers
 * @private
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(e.target.result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    reader.readAsText(file);
  });
}

/**
 * Yield to event loop to prevent UI blocking
 * Allows browser to process UI events during heavy processing
 *
 * @param {number} ms - Milliseconds to wait
 */
export function yieldToEventLoop(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process large arrays in chunks to prevent blocking
 *
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} chunkSize - How many items per batch
 * @param {Function} onProgress - Progress callback
 */
export async function processInChunks(
  items,
  processor,
  chunkSize = 5,
  onProgress = null
) {
  const results = [];
  const total = items.length;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Yield to event loop
    await yieldToEventLoop(10);

    // Report progress
    if (onProgress) {
      onProgress({
        current: Math.min(i + chunkSize, total),
        total,
        percentage: Math.round((Math.min(i + chunkSize, total) / total) * 100),
      });
    }
  }

  return results;
}

/**
 * Debounced chart rendering
 * Prevents multiple chart render cycles
 *
 * @param {Function} renderFn - Function to call to render charts
 * @param {number} delay - Milliseconds to wait before rendering
 * @returns {Function} - Debounced render function
 */
export function createDebouncedRender(renderFn, delay = 500) {
  let timeoutId = null;
  let isScheduled = false;

  return async function debouncedRender() {
    if (isScheduled) {
      console.log("[batchFileProcessor] Render already scheduled, skipping...");
      return;
    }

    isScheduled = true;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      console.log("[batchFileProcessor] Executing debounced render");
      try {
        await renderFn();
      } finally {
        isScheduled = false;
        timeoutId = null;
      }
    }, delay);
  };
}

/**
 * Report progress to callback
 * @private
 */
function reportProgress(callback, info) {
  if (typeof callback === "function") {
    try {
      callback(info);
    } catch (err) {
      console.error("[batchFileProcessor] Progress callback error:", err);
    }
  }
}

/**
 * Get memory usage estimate (if available)
 * @returns {Object|null} - Memory info or null if not available
 */
export function getMemoryInfo() {
  if (performance && performance.memory) {
    return {
      usedJSHeapSize:
        (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + " MB",
      totalJSHeapSize:
        (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + " MB",
      jsHeapSizeLimit:
        (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + " MB",
    };
  }
  return null;
}

/**
 * Clear memory caches
 * Call this after charts are rendered to free up memory
 */
export function clearCaches() {
  console.log("[batchFileProcessor] Clearing caches to free memory");

  // Force garbage collection hint (non-standard, doesn't actually GC but helps)
  if (global.gc) {
    global.gc();
    console.log("[batchFileProcessor] Garbage collection triggered");
  }

  // Clear any temporary arrays
  // (Implementation depends on your data structures)
}

export default {
  processFilesInBatches,
  yieldToEventLoop,
  processInChunks,
  createDebouncedRender,
  getMemoryInfo,
  clearCaches,
};
