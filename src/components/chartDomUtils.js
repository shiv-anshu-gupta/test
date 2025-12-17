/**
 * @module chartDomUtils
 * @description
 * Utility functions for DOM structure setup and uPlot chart initialization.
 * Handles creation of chart containers with drag bars, initialization of uPlot
 * instances with responsive sizing via ResizeObserver.
 *
 * Key Responsibilities:
 * - Create hierarchical DOM structure (parent container with drag bar)
 * - Apply positioning context for absolute-positioned children (tooltips)
 * - Initialize uPlot chart instances with proper configuration
 * - Attach ResizeObserver for responsive chart resizing
 * - Store chart instance references for later access
 * - Extract and cache series colors for styling
 *
 * DOM Structure Created:
 * - chart-parent-container (position: relative, overflow: hidden)
 *   - dragBar element (for reordering)
 *   - chart-container element (chart will render here)
 *
 * uPlot Integration:
 * - Uses global uPlot instance from window.uPlot
 * - Caches series stroke colors to chart._seriesColors
 * - Automatically handles window resize events via ResizeObserver
 * - Provides responsive chart sizing based on container dimensions
 *
 * Dependencies:
 * - helpers.js: createCustomElement utility
 * - uPlot: Global charting library
 *
 * @example
 * import { createChartContainer, initUPlotChart } from './components/chartDomUtils.js';
 *
 * // Step 1: Create DOM structure
 * const dragBar = createDragBar(...);
 * const { parentDiv, chartDiv } = createChartContainer(dragBar);
 *
 * // Step 2: Create chart options and data
 * const opts = createChartOptions({...});
 * const chartData = [timeArray, series1, series2, ...];
 *
 * // Step 3: Initialize uPlot
 * const charts = [];
 * const chart = initUPlotChart(opts, chartData, chartDiv, charts);
 *
 * // Step 4: Append to DOM
 * document.getElementById('charts-container').appendChild(parentDiv);
 */

// chartDomUtils.js
import { createCustomElement } from "../utils/helpers.js";

/**
 * Creates a chart parent container with proper DOM hierarchy and positioning.
 *
 * Builds the DOM structure required for chart rendering:
 * 1. chart-parent-container (positioned parent for absolute children)
 * 2. dragBar element (visual drag handle at top)
 * 3. chart-container element (where uPlot renders)
 *
 * Positioning context is important for:
 * - Tooltips and overlays (absolute positioning)
 * - Drag bar reordering (requires positioned parent)
 * - Vertical line plugins (need proper context)
 *
 * @function createChartContainer
 * @param {HTMLElement} dragBar - Pre-created drag bar element from createDragBar
 * @param {string} [chartContainerClass="chart-container"] - CSS class for chart div
 * @returns {Object} Container structure
 * @returns {HTMLElement} return.parentDiv - Parent container (chart-parent-container)
 * @returns {HTMLElement} return.chartDiv - Chart rendering container
 *
 * Side Effects:
 * - Applies CSS: position: relative, overflow: hidden to parentDiv
 * - Applies CSS: position: relative to chartDiv
 * - Appends dragBar and chartDiv as children to parentDiv
 *
 * @example
 * // Create drag bar
 * const dragBar = createDragBar(
 *   { indices: [0, 1, 2], colors: [...] },
 *   cfg,
 *   channelState
 * );
 *
 * // Create container structure
 * const { parentDiv, chartDiv } = createChartContainer(dragBar);
 *
 * // HTML Result:
 * // <div class="chart-parent-container" style="position: relative; overflow: hidden;">
 * //   <div class="dragBar" draggable="true">...</div>
 * //   <div class="chart-container" style="position: relative;"></div>
 * // </div>
 */
export function createChartContainer(
  dragBar,
  chartContainerClass = "chart-container"
) {
  const parentDiv = createCustomElement("div", "chart-parent-container");

  // // Important: make the parent positioned so absolute children (tooltip) are relative to it
  // parentDiv.style.position = "relative";
  // parentDiv.style.overflow = "hidden"; // optional, but keeps visuals tidy

  parentDiv.appendChild(dragBar);

  const chartDiv = createCustomElement("div", chartContainerClass);
  // // ensure chartDiv also has positioning context if you prefer
  // chartDiv.style.position = "relative";
  parentDiv.appendChild(chartDiv);

  return { parentDiv, chartDiv };
}

/**
 * Initialize a uPlot chart with responsive sizing.
 *
 * Complete chart initialization workflow:
 * 1. Create new uPlot instance with provided options and data
 * 2. Extract and cache series colors for reference
 * 3. Add chart to charts array for access by other components
 * 4. Attach ResizeObserver for automatic responsive resizing
 * 5. Return chart reference
 *
 * The ResizeObserver monitors the chartDiv container and automatically
 * calls chart.setSize() when the container dimensions change, ensuring
 * the chart always fills its container.
 *
 * @function initUPlotChart
 * @param {Object} opts - Complete uPlot options object (from createChartOptions)
 * @param {Array} opts.series - Array of series definitions with stroke colors
 * @param {Array} chartData - Chart data array in uPlot format [timeArray, series1, series2, ...]
 * @param {HTMLElement} chartDiv - Container div where chart will render
 * @param {Array<uPlot>} charts - Shared charts array (modified in place)
 * @returns {uPlot} The initialized chart instance
 *
 * Side Effects:
 * - Creates uPlot instance in chartDiv (modifies DOM)
 * - Adds chart reference to charts array
 * - Sets chart._seriesColors property with extracted colors
 * - Creates ResizeObserver subscription (remains active)
 *
 * Cached Properties:
 * - chart._seriesColors: Array of hex color codes from opts.series[1..n].stroke
 *   Used for: Color-dependent styling, legend generation, visual references
 *
 * @example
 * // Create chart options
 * const opts = createChartOptions({
 *   title: "Analog Channels",
 *   yLabels: ["Phase A", "Phase B", "Phase C"],
 *   lineColors: ["#FF0000", "#00FF00", "#0000FF"],
 *   // ... other options
 * });
 *
 * // Prepare data
 * const chartData = [
 *   [0, 0.001, 0.002, ...],              // Time array
 *   [100, 102, 101, ...],                 // Series 1 (Phase A)
 *   [99, 101, 100, ...],                  // Series 2 (Phase B)
 *   [101, 100, 102, ...]                  // Series 3 (Phase C)
 * ];
 *
 * // Initialize chart
 * const charts = [];
 * const chart = initUPlotChart(opts, chartData, chartDiv, charts);
 *
 * // Chart is now ready and responsive
 * console.log(chart._seriesColors);  // ["#FF0000", "#00FF00", "#0000FF"]
 * console.log(charts.length);         // 1
 *
 * @example
 * // Multiple charts initialization
 * const analogChart = initUPlotChart(analogOpts, analogData, analogDiv, charts);
 * const digitalChart = initUPlotChart(digitalOpts, digitalData, digitalDiv, charts);
 *
 * // Both charts are responsive and stored in charts array
 * charts[0]._type = 'analog';
 * charts[1]._type = 'digital';
 */
export function initUPlotChart(opts, chartData, chartDiv, charts) {
  const chart = new uPlot(opts, chartData, chartDiv);
  chart._seriesColors = opts.series.slice(1).map((s) => s.stroke);
  charts.push(chart);

  const ro = new ResizeObserver((entries) => {
    for (let entry of entries) {
      chart.setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  ro.observe(chartDiv);

  return chart;
}
