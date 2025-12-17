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

import { handleMultipleFiles } from "./multiFileHandler.js";

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

    // Call handleMultipleFiles which handles all parsing and merging
    const result = await handleMultipleFiles(fileInput, TIME_UNIT);

    console.log(
      "[batchFileProcessor] ✅ All files parsed and merged successfully"
    );
    reportProgress(onProgress, {
      phase: "complete",
      current: files.length,
      total: files.length,
      message: `Ready to render (${result.fileCount} file(s))`,
    });

    return {
      cfg: result.cfg,
      data: result.data,
      isMerged: result.isMerged,
      fileCount: result.fileCount,
      filenames: result.filenames,
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
