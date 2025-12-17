// src/utils/autoGroupChannels.js
/**
 * Group analog channels by pattern (Currents, Voltages, Line Voltages, Other).
 * @param {Array} analogChannels - Array of analog channel objects with 'id' and 'unit'.
 * @returns {Array} Array of grouped channel info: { name, indices, colors }
 */
export function autoGroupChannels(analogChannels) {
  const groups = [];
  const patterns = [
    // Your custom naming conventions
    {
      name: "Z-Currents",
      regex: /^Z[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "X-Voltages",
      regex: /^X[123]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // New patterns requested
    {
      name: "IK-IM-Currents",
      regex: /^I[KLMO]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "VP-VR-Voltages",
      regex: /^V[PQR]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Standard IEC naming
    {
      name: "Currents",
      regex: /^I[ABC]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a"],
    },
    {
      name: "Voltages",
      regex: /^V[ABC]$/i,
      colorSet: ["#984ea3", "#ff7f00", "#ffff33"],
    },

    // Alternative naming (L/R)
    {
      name: "L-Currents",
      regex: /^L[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "R-Voltages",
      regex: /^R[123]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Line notation (IL, UL)
    {
      name: "IL-Currents",
      regex: /^IL[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "UL-Voltages",
      regex: /^UL[123]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Underscore notation (I_A, V_A)
    {
      name: "I_-Currents",
      regex: /^I_[ABCN]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "V_-Voltages",
      regex: /^V_[ABC]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Descriptive naming (CUR_A, VOL_A)
    {
      name: "CUR-Currents",
      regex: /^CUR_[ABCN]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "VOL-Voltages",
      regex: /^VOL_[ABC]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Line Voltages
    {
      name: "Line Voltages",
      regex: /^V(AB|BC|CA)$/i,
      colorSet: ["#a65628", "#f781bf", "#999999"],
    },
  ];

  let groupId = 0;
  patterns.forEach((pattern) => {
    const indices = analogChannels
      .map((ch, idx) => (pattern.regex.test(ch.id) ? idx : -1))
      .filter((idx) => idx !== -1);
    if (indices.length > 0) {
      groups.push({
        groupId: `G${groupId}`,
        name: pattern.name,
        indices,
        colors: pattern.colorSet.slice(0, indices.length),
      });
      groupId++;
    }
  });

  const groupedIndices = groups.flatMap((g) => g.indices);
  const remaining = analogChannels
    .map((ch, idx) => (groupedIndices.includes(idx) ? -1 : idx))
    .filter((idx) => idx !== -1);
  if (remaining.length > 0) {
    groups.push({
      groupId: `G${groupId}`,
      name: "Other",
      indices: remaining,
      colors: ["#888"],
    });
  }
  return groups;
}

/**
 * Group files into CFG/DAT pairs by base name
 * @param {FileList|File[]} files - Array of files to group
 * @returns {Array} Array of {cfg, dat} pairs
 */
export function groupCfgDatFiles(files) {
  const fileMap = {};

  for (const file of files) {
    const name = file.name.toUpperCase();

    // Extract base name (without extension)
    const match = name.match(/^(.+)\.(CFG|DAT)$/);
    if (!match) {
      console.warn(
        `[groupCfgDatFiles] Skipping non-CFG/DAT file: ${file.name}`
      );
      continue;
    }

    const baseName = match[1];
    const ext = match[2];

    if (!fileMap[baseName]) {
      fileMap[baseName] = {};
    }

    fileMap[baseName][ext] = file;
  }

  // Build pairs, ensuring both CFG and DAT exist
  const pairs = [];
  for (const baseName in fileMap) {
    const pair = fileMap[baseName];
    if (pair.CFG && pair.DAT) {
      pairs.push({
        cfg: pair.CFG,
        dat: pair.DAT,
        baseName,
      });
    } else if (pair.CFG) {
      console.warn(`[groupCfgDatFiles] Missing DAT for CFG: ${baseName}`);
    } else if (pair.DAT) {
      console.warn(`[groupCfgDatFiles] Missing CFG for DAT: ${baseName}`);
    }
  }

  console.log(
    `[groupCfgDatFiles] Created ${pairs.length} file pairs from ${files.length} files`
  );
  return pairs;
}

/**
 * Sort file pairs alphabetically by base name
 * @param {Array} filePairs - Array of {cfg, dat} pairs
 * @returns {Array} Sorted pairs
 */
export function sortFilePairs(filePairs) {
  return [...filePairs].sort((a, b) => {
    const nameA = a.baseName || a.cfg.name;
    const nameB = b.baseName || b.cfg.name;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Separate computed channel files from regular COMTRADE files
 * @param {Array} filePairs - Array of {cfg, dat} pairs
 * @returns {Object} {regular: [], computed: []} arrays
 */
export function separateComputedFiles(filePairs) {
  const regular = [];
  const computed = [];

  for (const pair of filePairs) {
    // Check if CFG file indicates computed channels
    const baseName = (pair.baseName || pair.cfg.name).toUpperCase();

    if (baseName.includes("COMPUTED") || baseName.includes("_CC_")) {
      computed.push(pair);
    } else {
      regular.push(pair);
    }
  }

  console.log(
    `[separateComputedFiles] Regular: ${regular.length}, Computed: ${computed.length}`
  );
  return { regular, computed };
}

/**
 * Validate sample rates across multiple CFG files
 * @param {Array} cfgArray - Array of parsed CFG objects
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
export function validateSampleRates(cfgArray) {
  const errors = [];

  if (cfgArray.length === 0) {
    return { isValid: true, errors: [] };
  }

  const firstSampleRate = cfgArray[0].sample_rate;

  for (let i = 1; i < cfgArray.length; i++) {
    const rate = cfgArray[i].sample_rate;
    if (rate !== firstSampleRate) {
      errors.push(
        `File ${i} has sample rate ${rate} but expected ${firstSampleRate}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
