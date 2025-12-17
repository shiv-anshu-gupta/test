/**
 * Multi-File Load Handler
 * Processes multiple CFG/DAT file pairs and merges them
 * Integrates with main.js handleLoadFiles function
 */

import {
  groupCfgDatFiles,
  sortFilePairs,
  validateSampleRates,
  separateComputedFiles,
} from "./autoGroupChannels.js";
import { mergeComtradeFilesSetsSequential } from "./mergeComtradeFiles.js";
import { parseCFG, parseDAT } from "../components/comtradeUtils.js";

/**
 * Process multiple file pairs
 * @param {FileList} fileInput - Files from input element
 * @param {number} TIME_UNIT - Time unit for parsing
 * @returns {Promise<{cfg: Object, data: Object, fileCount: number, filenames: string[]}>}
 */
export async function handleMultipleFiles(fileInput, TIME_UNIT = 1) {
  const files = Array.from(fileInput);

  if (files.length === 0) {
    throw new Error("[multiFileHandler] No files provided");
  }

  console.log("[multiFileHandler] Processing", files.length, "files");

  // Step 1: Group files into CFG/DAT pairs
  const filePairs = groupCfgDatFiles(files);
  const sortedPairs = sortFilePairs(filePairs);

  // Separate computed files from regular COMTRADE files
  const separated = separateComputedFiles(sortedPairs);
  const regularPairs = separated.regular;
  const computedPairs = separated.computed;

  console.log(
    "[multiFileHandler] Processing",
    regularPairs.length,
    "regular +",
    computedPairs.length,
    "computed files..."
  );

  // Step 2: Parse regular file pairs (parallel)
  const parsedFileSets = await parseAllFilePairs(regularPairs, TIME_UNIT);

  // Step 3: Parse computed file pairs separately (parallel)
  const parsedComputedSets = await parseAllFilePairs(computedPairs, TIME_UNIT);

  // Step 4: Validate sample rates (only regular files)
  const cfgArray = parsedFileSets.map((set) => set.cfg);
  const validation = validateSampleRates(cfgArray);

  if (!validation.isValid) {
    console.warn(
      "[multiFileHandler] ⚠️  Sample rate validation warnings:",
      validation.errors
    );
  }

  // Step 5: Merge regular files if multiple, or return single file as-is
  let result;
  if (parsedFileSets.length === 1) {
    console.log("[multiFileHandler] Single file - no merge needed");
    result = {
      cfg: parsedFileSets[0].cfg,
      data: parsedFileSets[0].dat,
      isMerged: false,
      fileCount: 1,
      filenames: [regularPairs[0].groupName],
    };
  } else if (parsedFileSets.length > 1) {
    console.log("[multiFileHandler] Multiple files - merging...");
    const mergeResult = mergeComtradeFilesSetsSequential(parsedFileSets);
    result = {
      cfg: mergeResult.mergedCfg,
      data: mergeResult.mergedData,
      isMerged: mergeResult.isMerged,
      fileCount: mergeResult.fileCount,
      filenames: regularPairs.map((p) => p.groupName),
    };
  } else {
    // No regular files, use first computed file
    if (parsedComputedSets.length > 0) {
      result = {
        cfg: parsedComputedSets[0].cfg,
        data: parsedComputedSets[0].dat,
        isMerged: false,
        fileCount: 1,
        filenames: [computedPairs[0].groupName],
      };
    } else {
      throw new Error("[multiFileHandler] No valid file pairs to process");
    }
  }

  // Step 6: Add computed channels to result
  if (parsedComputedSets.length > 0) {
    console.log(
      "[multiFileHandler] Adding",
      parsedComputedSets.length,
      "computed file(s) as channels"
    );
    // Parse all computed files and add to cfg.computedChannels and data.computedData
    if (!result.cfg.computedChannels) result.cfg.computedChannels = [];
    if (!result.data.computedData) result.data.computedData = [];

    for (let i = 0; i < parsedComputedSets.length; i++) {
      const computedCfg = parsedComputedSets[i].cfg;
      const computedData = parsedComputedSets[i].dat;

      // Add all analog channels from computed file as computed channels
      if (computedCfg.analogChannels && computedCfg.analogChannels.length > 0) {
        for (let j = 0; j < computedCfg.analogChannels.length; j++) {
          const ch = computedCfg.analogChannels[j];
          result.cfg.computedChannels.push({
            ...ch,
            id: ch.name || `Computed_${result.cfg.computedChannels.length}`,
            sourceFile: computedPairs[i].groupName,
            originalIndex: j,
          });

          // Add the data array
          if (computedData.analogData && computedData.analogData[j]) {
            result.data.computedData.push(computedData.analogData[j]);
          }
        }
      }
    }

    console.log(
      "[multiFileHandler] Added",
      result.cfg.computedChannels.length,
      "computed channels"
    );
  }

  console.log(
    "[multiFileHandler] ✅ Complete - loaded",
    result.fileCount,
    "file(s)"
  );
  return result;
}

/**
 * Parse all CFG/DAT file pairs (parallel for speed)
 * @private
 */
async function parseAllFilePairs(filePairs, TIME_UNIT) {
  if (filePairs.length === 0) return [];

  // Parse all files in parallel instead of sequential
  const parsePromises = filePairs.map(async (pair, i) => {
    try {
      // Parse CFG
      const cfgText = await pair.cfg.text();
      const cfg = parseCFG(cfgText, TIME_UNIT);
      cfg.filename = pair.groupName;

      // Parse DAT
      const fileType = cfg.ft.toUpperCase();
      let datContent;
      if (fileType === "ASCII") {
        datContent = await pair.dat.text();
      } else {
        datContent = await pair.dat.arrayBuffer();
      }

      const dat = parseDAT(datContent, cfg, fileType, TIME_UNIT);
      dat.filename = pair.groupName;

      return {
        cfg,
        dat,
        filename: pair.groupName,
        index: i,
      };
    } catch (err) {
      console.error(
        `[multiFileHandler] ✗ Error parsing ${pair.groupName}:`,
        err.message
      );
      throw new Error(`Failed to parse ${pair.groupName}: ${err.message}`);
    }
  });

  // Wait for all files to parse in parallel
  const results = await Promise.all(parsePromises);

  // Sort by original order
  results.sort((a, b) => a.index - b.index);

  // Log summary instead of per-file logs
  console.log(
    `[multiFileHandler] ✓ Parsed ${results.length} files in parallel`
  );

  return results;
}

/**
 * Get merged file info summary
 * @param {Object} result - Result from handleMultipleFiles
 * @returns {string} User-friendly summary
 */
export function getMergedFileSummary(result) {
  if (!result.isMerged) {
    return `Loaded single file: ${result.filenames[0]}`;
  }

  const durations = result.data.fileOffsets
    .map((o) => o.duration.toFixed(3))
    .join(", ");

  return (
    `Merged ${result.fileCount} files (${result.filenames.join(", ")}). ` +
    `Durations: ${durations}s. Total: ${result.data.time[
      result.data.time.length - 1
    ].toFixed(3)}s`
  );
}

export default {
  handleMultipleFiles,
  getMergedFileSummary,
};
