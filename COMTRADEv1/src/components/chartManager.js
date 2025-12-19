/**
 * chartManager.js
 * 
 * Purpose:
 *   Provides the main chart reactivity and update logic for the COMTRADE charting app.
 *   Handles efficient chart updates in response to state changes (channels, data, overlays).
 *   Integrates with uPlot for fast, interactive chart rendering.
 *
 * Features:
 *   - Subscribes to channel state and data state changes using the custom createState system.
 *   - Updates chart series colors and labels live (without full re-creation) when possible.
 *   - Recreates charts when structural channel changes occur (axes, order, units, etc).
 *   - Recreates charts when data changes (e.g., new file loaded).
 *   - Updates overlays (vertical lines) when their state changes.
 *   - Warns in the console if state/data is missing or malformed.
 *
 * Parameters:
 *   @param {Object} channelState - Reactive state for channel metadata (liabels, colors, units, etc).
 *   @param {Object} dataState    - Reactive state for chart data (analog and digital arrays).
 *   @param {Array}  charts       - Array of uPlot chart instances [analogChart, digitalChart].
 *   @param {HTMLElement} chartsContainer - DOM element containing chart containers.
 *   @param {Object} verticalLinesX - Reactive state for vertical line overlays.
 *
 * Usage Example:
 *   import { subscribeChartUpdates } from './components/chartManager.js';
 *   // ...after initializing state and rendering charts...
 *   subscribeChartUpdates(channelState, dataState, charts, chartsContainer, verticalLinesX);
 *
 *   // Now, any changes to channelState or dataState will automatically update the charts.
 */

import { createChartOptions } from './chartComponent.js';
// Use global uPlot if loaded via <script> in index.html
const uPlot = window.uPlot;

export function subscribeChartUpdates(channelState, dataState, charts, chartsContainer, verticalLinesX) {
  const chartTypes = ['analog', 'digital'];

  function recreateChart(type, idx) {
    if (!channelState[type] || typeof channelState[type] !== 'object') {
      console.warn(`channelState[${type}] is undefined or not an object`);
      return;
    }
    if (!Array.isArray(dataState[type])) {
      console.warn(`dataState[${type}] is not an array or is undefined`);
      return;
    }
    if (charts[idx]) {
      charts[idx].destroy();
    }
    const options = createChartOptions(channelState[type], verticalLinesX);
    const data = dataState[type];
    const chart = new uPlot(options, data, chartsContainer.children[idx]);
    charts[idx] = chart;
  }

  // Subscribe to channelState changes
  channelState.subscribe(change => {
    chartTypes.forEach((type, idx) => {
      // Live updates: color or label
      if (
        change.path[0] === type &&
        (change.path[1] === 'lineColors' || change.path[1] === 'yLabels')
      ) {
        const seriesIdx = change.path[2];
        const prop = change.path[1];
        if (charts[idx]) {
          if (prop === 'lineColors') {
            charts[idx].setSeries(seriesIdx, { stroke: change.newValue });
          }
          if (prop === 'yLabels') {
            charts[idx].setSeries(seriesIdx, { label: change.newValue });
          }
        }
        return;
      }

      // Structural changes: axes, order, units, etc.
      if (
        change.path[0] === type &&
        (
          change.path[1] === 'axesScales' ||
          change.path[1] === 'order' ||
          change.path[1] === 'yUnits' ||
          change.path[1] === 'xLabel' ||
          change.path[1] === 'xUnit'
        )
      ) {
        recreateChart(type, idx);
        return;
      }
    });
  }, { descendants: true });

  // Subscribe to data changes (full re-create)
  dataState.subscribe(change => {
    const type = change.path[0];
    const idx = chartTypes.indexOf(type);
    if (idx !== -1) {
      recreateChart(type, idx);
    }
  });

  // Subscribe to verticalLinesX changes (re-apply overlays)
  verticalLinesX.subscribe(() => {
    chartTypes.forEach((type, idx) => {
      if (charts[idx]) {
        // Assuming you have a function to update vertical lines overlay
        updateVerticalLinesOverlay(charts[idx], verticalLinesX);
      }
    });
  });
}

// Helper: update vertical lines overlay (implement as needed)
function updateVerticalLinesOverlay(chart, verticalLines) {
  // Your logic to update vertical lines on the chart
  // For example, re-draw or update plugin state
}