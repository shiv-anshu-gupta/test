/**
 * @module chartComponent
 * @description
 * Factory module for building complete uPlot chart option configurations. Handles
 * the complex setup of axes, series, scales, and plugins needed for rendering
 * COMTRADE data with support for multiple Y-axes, auto-scaling, and interactive
 * features like vertical line markers and horizontal zoom/pan.
 *
 * Key Features:
 * - Single or multiple Y-axis support (adaptive layout)
 * - Auto-unit scaling plugin for SI prefix formatting
 * - Horizontal zoom and pan plugin
 * - Vertical line plugin for time markers
 * - Synchronized crosshair cursors across charts
 * - Smart axis labeling with units (A, V, kA, mV, etc)
 * - Y-axis alternation (left/right sides)
 * - Diagnostic logging for scale debugging
 *
 * Dependencies:
 * - uPlot.js: Main charting library
 * - scaleUtils.js: SI prefix and axis formatting
 * - createState.js: Reactive state management
 * - autoUnitScalePlugin: Auto-scaling plugin
 * - horizontalZoomPanPlugin: Zoom/pan functionality
 * - verticalLinePlugin: Vertical line markers
 *
 * @example
 * import { createChartOptions } from './chartComponent.js';
 * const opts = createChartOptions({
 *   title: "Analog Channels",
 *   yLabels: ["Phase A", "Phase B", "Phase C"],
 *   lineColors: ["#FF0000", "#00FF00", "#0000FF"],
 *   verticalLinesX: [],
 *   xLabel: "Time",
 *   xUnit: "seconds",
 *   getCharts: () => charts,
 *   yUnits: ["kA", "kA", "kA"],
 *   axesScales: [1000, 1000, 1000],  // x-scale, y0-scale, y1-scale, etc
 *   scales: { x: { auto: true }, y: { auto: true } },
 *   singleYAxis: false,               // Multiple Y-axes
 *   autoScaleUnit: { x: true, y: true }
 * });
 * const chart = new uPlot(opts, chartData, container);
 */

import { getSiPrefix, makeAxisValueFormatter } from "../utils/scaleUtils.js";
import { extractUnit, getNearestIndex } from "../utils/helpers.js";
import { unwrap, createState } from "./createState.js";
import { calculateDeltas } from "../utils/calculateDeltas.js";
import { crosshairColors } from "../utils/constants.js";
import autoUnitScalePlugin from "../plugins/autoUnitScalePlugin.js";
import verticalLinePlugin from "../plugins/verticalLinePlugin.js";
import horizontalZoomPanPlugin from "../plugins/horizontalZoomPanPlugin.js";

/**
 * Calculate the maximum number of Y-axes needed across all chart groups
 * This ensures all charts have the same number of axes for alignment
 * @param {Array} groups - Array of channel groups (from autoGroupChannels)
 * @returns {number} Maximum number of Y-axes needed
 */
export function getMaxYAxesForAlignment(groups) {
  if (!groups || groups.length === 0) return 1;

  // In single Y-axis mode, we just need 1 axis per chart
  // But in multi-axis mode, find the group with most channels
  const maxChannelsInGroup = Math.max(...groups.map((g) => g.indices.length));
  return Math.max(1, maxChannelsInGroup); // At least 1 axis
}

/**
 * Generate complete uPlot chart options configuration.
 *
 * Factory function that builds a comprehensive uPlot options object from
 * configuration parameters. Supports single and multiple Y-axis layouts,
 * auto-scaling with SI prefixes, synchronized cursors, and plugin support.
 *
 * Key responsibilities:
 * 1. Resolve scales and axis configuration
 * 2. Build series array with line colors and scales
 * 3. Configure X and Y axes with proper labeling
 * 4. Set up synchronized cursor and selection
 * 5. Attach plugins (auto-scale, zoom/pan, vertical lines)
 * 6. Return fully configured uPlot options
 *
 * @function createChartOptions
 * @param {Object} config - Configuration object
 * @param {string} config.title - Chart title displayed at top
 * @param {Array<string>} config.yLabels - Y-axis labels for each series
 * @param {Array<string>} config.lineColors - Stroke colors for each series (cycles if fewer than series)
 * @param {Array<number>|Object} config.verticalLinesX - Vertical line positions array (or createState)
 * @param {string} [config.xLabel=""] - X-axis label
 * @param {string} [config.xUnit="sec"] - X-axis unit
 * @param {number} [config.width=400] - Chart width in pixels
 * @param {number} [config.height=200] - Chart height in pixels
 * @param {Function} [config.getCharts] - Getter function returning all chart instances
 * @param {Array<string>} [config.yUnits=[]] - Y-axis units for each series
 * @param {Array<number>} [config.axesScales=[]] - Scale factors [xScale, y0Scale, y1Scale, ...]
 * @param {Object} [config.scales={}] - uPlot scales object: { x: {...}, y: {...}, y0: {...}, ... }
 * @param {Object} [config.select={show: true}] - Selection tool configuration
 * @param {boolean} [config.singleYAxis=true] - True for single Y-axis, false for multi
 * @param {Object} [config.autoScaleUnit={x: true, y: true}] - Auto-scale SI prefix formatting
 *
 * @returns {Object} Complete uPlot options object with:
 * - @property {string} title
 * - @property {number} width, height
 * - @property {Object} scales - uPlot scale configuration
 * - @property {Array} series - Series definitions with labels and colors
 * - @property {Array} axes - X and Y axis configurations
 * - @property {Object} cursor - Synchronized crosshair configuration
 * - @property {Array} plugins - [autoUnitScale, horizontalZoomPan, verticalLine]
 * - @property {Object} legend - { show: false }
 *
 * @example
 * // Single Y-axis for analog channels (grouped by phase)
 * const analogOpts = createChartOptions({
 *   title: "Three-Phase Current",
 *   yLabels: ["Phase A Current", "Phase B Current", "Phase C Current"],
 *   lineColors: ["#FF5733", "#33FF57", "#3357FF"],
 *   verticalLinesX: verticalLinesArray,
 *   xLabel: "Time",
 *   xUnit: "seconds",
 *   getCharts: () => charts,
 *   yUnits: ["A", "A", "A"],
 *   axesScales: [1000, 500],  // x: 1000, y: 500
 *   singleYAxis: true,
 *   autoScaleUnit: { x: true, y: true }
 * });
 *
 * @example
 * // Multiple Y-axes for mixed units
 * const mixedOpts = createChartOptions({
 *   title: "Voltage and Current",
 *   yLabels: ["Voltage", "Current", "Temperature"],
 *   lineColors: ["#FF0000", "#00FF00", "#0000FF"],
 *   verticalLinesX: [],
 *   yUnits: ["V", "A", "°C"],
 *   axesScales: [1000, 1000, 1000, 100],  // x, y0, y1, y2 scales
 *   scales: { x: { auto: true }, y0: { auto: true }, y1: { auto: true }, y2: { auto: true } },
 *   singleYAxis: false,
 *   autoScaleUnit: { x: false, y: false }
 * });
 *
 * @example
 * // Digital channels with fixed scale
 * const digitalOpts = createChartOptions({
 *   title: "Digital States",
 *   yLabels: ["State 0", "State 1", "State 2"],
 *   lineColors: ["#FFAA00", "#00AAFF", "#FF00AA"],
 *   scales: { x: { auto: true }, y: { min: -0.5, max: 8, auto: false } },
 *   singleYAxis: true,
 *   autoScaleUnit: { x: true, y: false }
 * });
 */
export function createChartOptions({
  title,
  yLabels,
  lineColors,
  verticalLinesX,
  xLabel = "",
  xUnit,
  width = 400,
  height = 200,
  getCharts = null, // Optional getter for all charts
  yUnits = [],
  axesScales = [], // Optional: scales for axes, e.g. { x: 1, y0: 1, y1: 1 }\\
  scales = {}, // Unified: scales[0] is x, rest are y
  select = { show: true },
  singleYAxis = true,
  autoScaleUnit = { x: true, y: true }, // NEW: default autoScaleUnit
}) {
  // Only verticalLinesX may be a createState object, others are plain values/arrays
  const verticalLinesXVal = unwrap(verticalLinesX);

  // xScale is now always axesScales[0]
  const xScaleVal = axesScales[0] || 1;

  return {
    title,
    width,
    height,
    scales:
      Object.keys(scales).length > 0
        ? scales
        : {
            x: { time: false, auto: true },
            ...yLabels.reduce((acc, _, idx) => {
              acc[`y${idx}`] = { auto: true };
              return acc;
            }, {}),
          },
    series: [
      {},
      ...yLabels.map((label, idx) => ({
        label,
        stroke: lineColors[idx % lineColors.length],
        width: 1,
        scale: singleYAxis ? "y" : `y${idx}`,
        points: {
          size: 4,
          fill: "white",
          stroke: lineColors[idx % lineColors.length],
        },
      })),
    ],
    axes: [
      {
        scale: "x",
        side: 2,
        label: `${xLabel}(${xUnit || "sec"})`,
        grid: { show: true },
        values: (u, splits) =>
          splits.map((v) => {
            const scaled = v * (axesScales[0] || 1); // normalize tick value
            return scaled.toFixed(3); // force 3 decimal places
          }),
      },
      ...(singleYAxis
        ? [
            {
              scale: "y",
              side: 3,
              label: (() => {
                const unit = yUnits[0] || extractUnit(yLabels[0]);
                const scaleVal = axesScales[1] || 1;
                const siPrefix = getSiPrefix(scaleVal);
                return unit ? `(${siPrefix}${unit})` : yLabels[0];
              })(),
              grid: { show: true },
              values: makeAxisValueFormatter(
                yUnits[0] || extractUnit(yLabels[0]),
                axesScales[1] || 1
              ),
            },
          ]
        : yLabels.map((label, idx) => {
            const unit = yUnits[idx] || extractUnit(label);
            const scaleVal = axesScales[idx + 1] || 1;
            const siPrefix = getSiPrefix(scaleVal);
            const labelWithUnit = unit ? `(${siPrefix}${unit})` : label;
            return {
              scale: `y${idx}`,
              side: 3, // All Y-axes on the right side
              label: labelWithUnit,
              grid: { show: idx === 0 },
              values: makeAxisValueFormatter(unit, scaleVal),
            };
          })),
    ],
    cursor: {
      sync: { key: "globalAllSync", setSeries: true },
      x: true,
      y: true,
    },
    plugins: [
      autoUnitScalePlugin({
        axesScales: axesScales,
        autoScaleUnit: autoScaleUnit,
      }),
      horizontalZoomPanPlugin("globalSync", getCharts),
      verticalLinePlugin(verticalLinesX, getCharts), // verticalLinePlugin intentionally NOT added here; must be added last in the caller after any other plugins
    ],
    legend: {
      show: false, // Hides the legend at the bottom
    },
  };
}

// Diagnostic: Track changes to scales after createChartOptions
export function logScalesDiagnostics(opts, context = "") {
  if (opts && opts.scales) {
    console.log(`[${context}] opts.scales:`, opts.scales);
    if (opts.scales.y) {
      console.log(`[${context}] opts.scales.y:`, opts.scales.y);
      console.log(`[${context}] opts.scales.y.auto:`, opts.scales.y.auto);
    } else {
      // Check for y0, y1, etc.
      Object.keys(opts.scales).forEach((key) => {
        if (key.startsWith("y")) {
          console.log(`[${context}] opts.scales.${key}:`, opts.scales[key]);
          console.log(
            `[${context}] opts.scales.${key}.auto:`,
            opts.scales[key].auto
          );
        }
      });
    }
  } else {
    console.log(`[${context}] opts.scales is missing!`);
  }
}

/**
 * Fix axis text colors in uPlot chart for dark theme
 * Since uPlot uses inline SVG styles, we need to modify the DOM directly
 * @param {HTMLElement} chartContainer - The container element of the chart
 */
export function fixChartAxisColors(chartContainer) {
  if (!chartContainer) return;

  // Use requestAnimationFrame to ensure SVG is fully rendered
  requestAnimationFrame(() => {
    // Get current theme color from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const axisColor =
      computedStyle.getPropertyValue("--chart-text").trim() || "#e5e7eb";
    const gridColor =
      computedStyle.getPropertyValue("--chart-grid").trim() || "#404040";

    // Inject a style tag into the chart's SVG if not already present
    let svg = chartContainer.querySelector("svg");
    if (svg) {
      // Remove old style if it exists
      const oldStyle = svg.querySelector("style[data-uplot-theme]");
      if (oldStyle) {
        oldStyle.remove();
      }

      // Add new style with current theme colors
      const style = document.createElement("style");
      style.setAttribute("data-uplot-theme", "true");
      style.textContent = `
        svg text {
          fill: ${axisColor} !important;
          color: ${axisColor} !important;
        }
        svg line {
          stroke: ${gridColor} !important;
        }
      `;
      svg.insertBefore(style, svg.firstChild);
    }

    // Get all SVG text elements in the chart
    const textElements = chartContainer.querySelectorAll("svg text");

    if (textElements.length > 0) {
      textElements.forEach((textEl) => {
        // Override fill attribute with theme color
        textEl.setAttribute("fill", axisColor);
        textEl.style.fill = axisColor;
        textEl.style.color = axisColor;
      });
      console.log(
        `[fixChartAxisColors] Fixed ${textElements.length} text elements with color: ${axisColor}`
      );
    }

    // Update grid lines and axis lines - be aggressive with stroke updates
    const gridLines = chartContainer.querySelectorAll(
      "svg line, svg [class*='u-axis'] line, svg .u-grid line"
    );
    if (gridLines.length > 0) {
      gridLines.forEach((line) => {
        // Set attribute and inline style
        line.setAttribute("stroke", gridColor);
        line.style.stroke = gridColor;
        line.style.strokeWidth = line.style.strokeWidth || "1";
        // Remove any fill attribute that might interfere
        if (line.hasAttribute("fill")) {
          line.removeAttribute("fill");
        }
      });
      console.log(
        `[fixChartAxisColors] Fixed ${gridLines.length} line elements with color: ${gridColor}`
      );
    }

    // Also update the SVG itself if it has fill/stroke attributes
    if (svg) {
      // Ensure grid lines in the entire SVG use correct color
      const allLines = svg.querySelectorAll("line");
      allLines.forEach((line) => {
        line.setAttribute("stroke", gridColor);
        line.style.stroke = gridColor;
      });
    }
  });
}

/**
 * Update all visible chart axes when theme changes
 * Called by theme manager when user toggles theme
 */
export function updateAllChartAxisColors() {
  // Find all chart containers
  const chartsContainer = document.getElementById("charts-container");
  if (chartsContainer) {
    const chartDivs = chartsContainer.querySelectorAll('[class*="chart"]');
    chartDivs.forEach((chartDiv) => {
      fixChartAxisColors(chartDiv);
    });
    console.log(
      `[updateAllChartAxisColors] Updated ${chartDivs.length} charts`
    );
  }
}

// Listen for theme changes and update chart colors
if (typeof window !== "undefined") {
  window.addEventListener("themeChanged", (e) => {
    console.log("[chartComponent] Theme changed, updating chart axes...");
    updateAllChartAxisColors();
  });
}
