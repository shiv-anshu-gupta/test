// src/utils/autoGroupChannels.js
/**
 * Group analog channels by pattern (Currents, Voltages, Line Voltages, Other).
 * @param {Array} analogChannels - Array of analog channel objects with 'id' and 'unit'.
 * @returns {Array} Array of grouped channel info: { name, indices, colors }
 */
export function autoGroupChannels(analogChannels) {
  const groups = [];
  const patterns = [
    { name: "Currents", regex: /^I[ABC]$/i, colorSet: ["#e41a1c", "#377eb8", "#4daf4a"] },
    { name: "Voltages", regex: /^V[ABC]$/i, colorSet: ["#984ea3", "#ff7f00", "#ffff33"] },
    { name: "Line Voltages", regex: /^V(AB|BC|CA)$/i, colorSet: ["#a65628", "#f781bf", "#999999"] }
  ];
  patterns.forEach(pattern => {
    const indices = analogChannels
      .map((ch, idx) => pattern.regex.test(ch.id) ? idx : -1)
      .filter(idx => idx !== -1);
    if (indices.length > 0) {
      groups.push({
        name: pattern.name,
        indices,
        colors: pattern.colorSet.slice(0, indices.length)
      });
    }
  });
  const groupedIndices = groups.flatMap(g => g.indices);
  const remaining = analogChannels
    .map((ch, idx) => groupedIndices.includes(idx) ? -1 : idx)
    .filter(idx => idx !== -1);
  if (remaining.length > 0) {
    groups.push({
      name: "Other",
      indices: remaining,
      colors: ["#888"]
    });
  }
  return groups;
}
