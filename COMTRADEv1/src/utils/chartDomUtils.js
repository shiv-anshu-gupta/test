// chartDomUtils.js
// Small abstractions for chart container and uPlot chart setup
import { createCustomElement } from './helpers.js';

/**
 * Creates a chart parent container with a drag bar and chart div.
 * @param {HTMLElement} dragBar - The drag bar element.
 * @param {string} chartContainerClass - The class for the chart container div.
 * @returns {{ parentDiv: HTMLElement, chartDiv: HTMLElement }}
 */
export function createChartContainer(dragBar, chartContainerClass = "chart-container") {
  const parentDiv = createCustomElement("div", "chart-parent-container");
  parentDiv.appendChild(dragBar);
  const chartDiv = createCustomElement("div", chartContainerClass);
  parentDiv.appendChild(chartDiv);
  return { parentDiv, chartDiv };
}

/**
 * Initializes a uPlot chart, sets series colors, adds to array, and attaches ResizeObserver.
 * @param {Object} opts - uPlot options.
 * @param {Array} chartData - Data for the chart.
 * @param {HTMLElement} chartDiv - The chart container div.
 * @param {Array} charts - Array to store chart instances.
 * @returns {uPlot} The created chart instance.
 */
export function initUPlotChart(opts, chartData, chartDiv, charts) {
  const chart = new uPlot(opts, chartData, chartDiv);
  chart._seriesColors = opts.series.slice(1).map(s => s.stroke);
  charts.push(chart);
  const ro = new ResizeObserver(entries => {
    for (let entry of entries) {
      chart.setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    }
  });
  ro.observe(chartDiv);
  return chart;
}
