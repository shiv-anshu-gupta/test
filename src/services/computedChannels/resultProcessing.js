// File: src/services/computedChannels/resultProcessing.js
// Single Responsibility: Process worker results

/**
 * Convert ArrayBuffer to array
 */
export const convertResultsToArray = (resultsBuffer) => {
  return Array.from(new Float64Array(resultsBuffer));
};

/**
 * Calculate statistics from results
 */
export const calculateStatistics = (results) => {
  const validResults = results.filter((v) => isFinite(v) && v !== 0);

  if (validResults.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      count: results.length,
      validCount: 0,
    };
  }

  return {
    min: Math.min(...validResults),
    max: Math.max(...validResults),
    mean: validResults.reduce((a, b) => a + b, 0) / validResults.length,
    count: results.length,
    validCount: validResults.length,
  };
};

/**
 * Generate unique channel name (or use provided name)
 * If channelName provided, use it; otherwise generate timestamp-based name
 */
export const generateChannelName = (customChannelName = null) => {
  if (
    customChannelName &&
    typeof customChannelName === "string" &&
    customChannelName.trim()
  ) {
    const finalName = customChannelName.trim();
    console.log("[resultProcessing] ✅ Using custom channel name:", finalName);
    return finalName;
  }

  const timestampName = `computed_${Date.now()}`;
  console.log(
    "[resultProcessing] ⏱️ No custom name, using timestamp:",
    timestampName
  );
  return timestampName;
};

function detectComputedGroup() {
  if (typeof window === "undefined") {
    return "G0";
  }

  try {
    const cfgGroups = window.globalCfg?.computedChannels;
    if (Array.isArray(cfgGroups) && cfgGroups.length > 0) {
      const last = cfgGroups[cfgGroups.length - 1];
      if (last && typeof last.group === "string" && last.group.trim()) {
        return last.group;
      }
    }

    const taken = new Set();
    const collect = (value) => {
      if (typeof value !== "string") return;
      if (!value.startsWith("G")) return;
      const parsed = parseInt(value.slice(1), 10);
      if (!Number.isNaN(parsed)) {
        taken.add(parsed);
      }
    };

    const analogGroups = window.channelState?.analog?.groups;
    if (Array.isArray(analogGroups)) analogGroups.forEach(collect);

    const digitalGroups = window.channelState?.digital?.groups;
    if (Array.isArray(digitalGroups)) digitalGroups.forEach(collect);

    const computedGroups = window.channelState?.computed?.groups;
    if (Array.isArray(computedGroups)) computedGroups.forEach(collect);

    let next = 0;
    while (taken.has(next)) {
      next += 1;
    }

    return `G${next}`;
  } catch (error) {
    console.warn(
      "[resultProcessing] Failed to detect group, falling back to G0",
      error
    );
    return "G0";
  }
}

/**
 * Build channel data object from results
 * Now accepts custom channel name from equation
 */
export const buildChannelData = (
  results,
  expression,
  mathJsExpr,
  unit,
  stats,
  customChannelName = null,
  groupOverride = null // ← NEW: Optional group override
) => {
  console.log("[resultProcessing] 🏗️ buildChannelData called with:", {
    customChannelName: customChannelName,
    expression: expression,
    mathJsExpr: mathJsExpr,
    hasResults: !!results,
    resultCount: results?.length,
  });

  const channelName = generateChannelName(customChannelName);

  console.log("[resultProcessing] 📝 Final channel name:", channelName);

  const resolvedGroup =
    typeof groupOverride === "string" && groupOverride.trim()
      ? groupOverride
      : detectComputedGroup();

  return {
    id: channelName,
    name: channelName,
    equation: expression,
    mathJsExpression: mathJsExpr,
    data: results,
    results: results,
    stats: stats,
    unit: unit || "",
    group: resolvedGroup,
    sampleCount: results.length,
    createdAt: Date.now(),
    index: window.globalData?.computedData?.length || 0,
    type: "Analog", // ✅ Set type to Analog so it displays with analog channels
  };
};
