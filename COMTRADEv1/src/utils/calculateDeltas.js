/*
 * Calculates ΔX and ΔY between consecutive vertical lines.
 * Accepts timeUnit for correct deltaX labeling.
 *
 * @param {uPlot[]} charts - Array of chart instances.
 * @param {number[]} verticalLinesX - X positions of vertical lines.
 * @param {number[]} timeArr - Array of X-axis values.
 * @param {number[][]} seriesData - Array of Y-series data arrays.
 * @param {string} [timeUnit] - Time unit for ΔX label.
 */
import { crosshairColors } from "./constants.js";
import { getNearestIndex, createCustomElement } from "./helpers.js";
export function calculateDeltas(
  charts,
  verticalLinesX,
  timeArr,
  seriesData,
  timeUnit = "microseconds"
) {
  const output = document.getElementById("fixed-results");
  output.innerHTML = "";

  // Defensive: If seriesData is not an array, exit early
  if (!Array.isArray(seriesData)) return;
  if (!Array.isArray(verticalLinesX) || verticalLinesX.length < 2) return;
  if (!Array.isArray(timeArr) || timeArr.length === 0) return;

  // Debug log
  // Remove or comment out after debugging
  // console.log('calculateDeltas:', {seriesData, verticalLinesX, timeArr, charts});

  charts.forEach((chart) => {
    for (let i = 0; i < verticalLinesX.length - 1; i++) {
      const idx1 = getNearestIndex(timeArr, verticalLinesX[i]);
      const idx2 = getNearestIndex(timeArr, verticalLinesX[i + 1]);
      const deltaX = (timeArr[idx2] - timeArr[idx1]).toFixed(2);

      const border = createCustomElement("div", "border-bottom");
      output.appendChild(border);

      // Loop through each data series (skip index 0 because it's x-axis)
      chart.series.slice(1).forEach((series, j) => {
        if (!seriesData[j] || !Array.isArray(seriesData[j])) return; // Guard: skip if data missing or not array
        const v1 = seriesData[j][idx2];
        const v2 = seriesData[j][idx1];
        if (typeof v1 !== 'number' || typeof v2 !== 'number') return;
        const deltaY = (v1 - v2).toFixed(2);

        const result = createCustomElement("div");

        const seriesLabel = series.label || `Series ${j + 1}`;
        // Fetch color from stored metadata
        const seriesColor = chart._seriesColors
          ? chart._seriesColors[j]
          : "black";

        const crosshairColor1 = crosshairColors[i % crosshairColors.length];
        const crosshairColor2 =
          crosshairColors[(i + 1) % crosshairColors.length];

        let deltaXLabel = `Δtime: ${deltaX}`;
        if (timeUnit === "seconds") deltaXLabel += " s";
        else if (timeUnit === "milliseconds") deltaXLabel += " ms";
        else deltaXLabel += " μs";

        result.innerHTML = `
                    <span style="color:${seriesColor}">
                        ${seriesLabel}
                    </span> 
                    <span style="color:${crosshairColor1}">
                        ${deltaXLabel},
                    </span>
                     <span style="color:${crosshairColor2}">
                        ΔY: ${deltaY}
                    </span>
                `;
        output.appendChild(result);
      });
    }
  });
}