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
 * Generate unique channel name
 */
export const generateChannelName = () => {
  return `computed_${Date.now()}`;
};

/**
 * Build channel data object from results
 */
export const buildChannelData = (
  results,
  expression,
  mathJsExpr,
  unit,
  stats
) => {
  const channelName = generateChannelName();

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
