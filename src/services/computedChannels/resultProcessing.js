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
  customChannelName = null // ← NEW: Optional custom channel name
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

  return {
    id: channelName,
    name: channelName,
    equation: expression,
    mathJsExpression: mathJsExpr,
    data: results,
    results: results,
    stats: stats,
    unit: unit || "",
    sampleCount: results.length,
    createdAt: Date.now(),
    index: window.globalData?.computedData?.length || 0,
  };
};
