/**
 * @module chartManager
 * @description
 * Central reactive state manager for chart updates in the COMTRADE charting application.
 * Bridges between user-triggered state changes (via Tabulator editor) and uPlot chart
 * rendering. Provides intelligent update strategies: in-place updates for simple changes
 * (colors, labels) and full re-rendering for structural changes (channel add/remove, grouping).
 *
 * Key Responsibilities:
 * - Subscribe to reactive state (channelState, dataState, verticalLinesX)
 * - Detect change types: simple (label/color) vs structural (add/remove/group)
 * - Apply in-place updates for performance when possible
 * - Recreate charts on structural changes
 * - Handle amplitude inversion for selected channels
 * - Apply time-window filtering (start/duration)
 * - Manage vertical line overlays and delta calculations
 *
 * Features:
 * - Automatic chart update on state mutation
 * - Dual-chart support (analog and digital)
 * - Time-windowing with start/duration filtering
 * - Series inversion with in-place optimization
 * - Deltastate-based change detection
 * - Fallback from in-place to full rebuild on errors
 * - Debug logging via debugPanelLite
 *
 * Dependencies:
 * - chartComponent.js: createChartOptions factory
 * - renderComtradeCharts.js: Full chart reconstruction
 * - debugPanelLite.js: Console debug logging
 * - createState.js: Reactive state management
 *
 * @example
 * import { subscribeChartUpdates } from './components/chartManager.js';
 *
 * // After initializing state and rendering charts
 * subscribeChartUpdates(
 *   channelState,           // { analog: {...}, digital: {...} }
 *   dataState,              // { analog: [...], digital: [...] }
 *   charts,                 // [analogChart, digitalChart]
 *   chartsContainer,        // DOM element
 *   verticalLinesX          // Reactive array of marker positions
 * );
 *
 * // Now any changes trigger automatic updates:
 * channelState.analog.lineColors[0] = '#FF0000';  // Color change -> in-place update
 * channelState.analog.yLabels[0] = 'New Label';   // Label change -> in-place update
 * channelState.analog.groups[0] = 1;              // Group change -> full rebuild
 */

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
 *   @param {Object} channelState - Reactive state for channel metadata (labels, colors, units, etc).
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

import { createChartOptions, fixChartAxisColors } from "./chartComponent.js";
// Use global uPlot if loaded via <script> in index.html
const uPlot = window.uPlot;
import { debugLite } from "./debugPanelLite.js";
import { renderComtradeCharts } from "./renderComtradeCharts.js";

// Defensive: ensure uPlot is available to avoid runtime errors during subscription wiring
if (!uPlot) {
  console.warn(
    "[chartManager] window.uPlot is not available. Ensure uPlot.iife.js is loaded before modules."
  );
}

/**
 * Subscribe chart manager to reactive state changes.
 *
 * Establishes bidirectional reactive binding between channelState/dataState and
 * uPlot chart instances. Automatically updates charts when state mutates.
 *
 * Update Strategy:
 * - Check if change is structural (groups/units/order) -> full rebuild
 * - Check if change is cosmetic (colors/labels) -> in-place update
 * - Check if data changed -> full rebuild
 * - Check if vertical lines changed -> overlay update only
 *
 * In-place Updates (Performance-Critical):
 * - Series colors: Sets `chart.series[i].stroke`
 * - Series labels: Sets `chart.series[i].label`
 * - Both trigger via `chart.setSize()` to refresh
 *
 * Full Rebuild Operations:
 * - Adds/removes channels
 * - Changes grouping strategy
 * - Modifies units or scales
 * - Data array dimensions change
 * - Inverts series amplitude
 *
 * subscribeChartUpdates(channelState, dataState, charts, chartsContainer, verticalLinesX)
 *
 * Subscribes the chart manager to reactive state and maps channel-level
 * messages to uPlot updates. This function is the central bridge between the
 * `channelState` (mutations produced by Tabulator via the parent message
 * handler) and the uPlot instances that render the data.
 *
 * Key responsibilities:
 * - Maintain in-place updates for cheap operations (color, label) when possible.
 * - Recreate charts on structural changes (channel add/remove, grouping, axes).
 * - Apply x-axis windows when `start`/`duration` are provided and a time array
 *   is available in `dataState`.
 * - Handle `invert` toggles: attempt an in-place amplitude inversion on the
 *   affected series (works for series-only arrays as well as the uPlot-style
 *   `[time, ...series]` shape); fallback to recreate if unsafe.
 *
 * @function subscribeChartUpdates
 * @param {Object} channelState - Reactive channel metadata store. Expected shape:
 *   { analog: { yLabels: string[], lineColors: string[], channelIDs: string[], inverts: boolean[], groups: number[], units: string[], ... },
 *     digital: { yLabels: string[], lineColors: string[], ... } }
 * @param {Object} dataState - Reactive data arrays. Each type (`analog`/`digital`)
 *   normally follows uPlot's shape: either `[timeArray, series0, series1, ...]`
 *   or (in some legacy flows) series-only arrays. The manager detects the
 *   presence of a leading time array before acting on `start`/`duration`.
 * @param {uPlot[]} charts - Array of uPlot chart instances matching types [analog, digital].
 *   Each chart is expected to expose a `_channelIndices` array mapping chart-series
 *   positions (0-based) -> global channel indices in `channelState`.
 * @param {HTMLElement} chartsContainer - Parent DOM container for charts.
 * @param {Object} verticalLinesX - Reactive state holding vertical-line positions.
 * @param {Object} [cfg] - Optional config passed through to renderers.
 * @param {Object} [data] - Optional raw parsed data object.
 * @param {Function} [createState] - Optional state factory passed to renderers.
 * @param {Function} [calculateDeltas] - Optional helper for delta calculations.
 * @param {string} [TIME_UNIT] - Optional time unit string used by renderers.
 * @returns {void}
 *
 * @example
 * // Basic subscription after chart creation
 * subscribeChartUpdates(
 *   channelState,
 *   dataState,
 *   charts,
 *   document.getElementById('charts-container'),
 *   verticalLinesX
 * );
 *
 * @example
 * // State mutation triggering automatic color update
 * // Before: channelState.analog.lineColors = ['#FF0000', '#00FF00', '#0000FF']
 * channelState.analog.lineColors[0] = '#FF1111';  // Slight color shift
 * // After: All analog charts automatically update (in-place, no rebuild)
 *
 * @example
 * // Structural change triggering full rebuild
 * // Before: 3 analog channels displayed
 * channelState.analog.yLabels.splice(1, 1);      // Remove middle channel
 * channelState.analog.lineColors.splice(1, 1);
 * // After: Charts fully rebuilt with 2 channels, vertical lines refreshed
 *
 * @example
 * // Amplitude inversion (in-place if possible)
 * // Before: channelState.analog.inverts = [false, false, false]
 * channelState.analog.inverts[0] = true;         // Invert first channel
 * // After: First series amplitude inverted in-place
 */
export function subscribeChartUpdates(
  channelState,
  dataState,
  charts,
  chartsContainer,
  verticalLinesX,
  cfg, // ✅ add
  data, // ✅ add
  createState, // ✅ add
  calculateDeltas, // ✅ add
  TIME_UNIT // ✅ add
) {
  const chartTypes = ["analog", "digital"];

  function recreateChart(type, idx) {
    try {
      if (!channelState[type] || typeof channelState[type] !== "object") {
        console.warn(
          `[recreateChart] channelState[${type}] is undefined or not an object`
        );
        return;
      }
      if (!Array.isArray(dataState[type])) {
        console.warn(
          `[recreateChart] dataState[${type}] is not an array or is undefined`
        );
        return;
      }
      if (charts[idx]) {
        try {
          charts[idx].destroy();
        } catch (e) {
          console.warn(`[recreateChart] Failed to destroy chart[${idx}]:`, e);
        }
      }
      const options = createChartOptions(channelState[type], verticalLinesX);
      const chartData = dataState[type];

      console.log(
        `[recreateChart] type="${type}", idx=${idx}, dataLength=${
          chartData.length
        }, seriesCount=${chartData.length - 1}`
      );

      if (!chartsContainer || !chartsContainer.children[idx]) {
        console.warn(
          `[recreateChart] chartsContainer.children[${idx}] does not exist`
        );
        return;
      }
      const chart = new uPlot(
        options,
        chartData,
        chartsContainer.children[idx]
      );
      charts[idx] = chart;
      // Fix axis text colors for dark theme
      fixChartAxisColors(chartsContainer.children[idx]);
      console.log(
        `[recreateChart] ✅ Successfully recreated chart[${idx}] for type "${type}"`
      );
    } catch (err) {
      console.error(
        `[recreateChart] ❌ Failed to recreate chart[${idx}] for type "${type}":`,
        err
      );
    }
  }

  // Direct synchronous updates - no debouncing
  // This ensures data is current when chart renders
  const recreateChartSync = (type, idx) => {
    console.log(`[recreateChartSync] Direct call for ${type}-${idx}`);
    recreateChart(type, idx);
  };

  // Small helper to force a uPlot chart redraw when setSeries doesn't visually update everything
  function forceRedraw(chart) {
    try {
      // Prefer batch + noop setSize to trigger redraw
      if (!chart) return;
      if (typeof chart.batch === "function") {
        chart.batch(() => {
          try {
            chart.setSize({ width: chart.width, height: chart.height });
          } catch (e) {
            // ignore
          }
        });
      } else {
        try {
          chart.setSize({ width: chart.width, height: chart.height });
        } catch (e) {}
      }
    } catch (e) {
      console.warn("forceRedraw failed", e);
    }
  }

  // --- Boss-style subscription wiring (if channelState exposes subscribeProperty) ---
  // This wires friendly property names (color, name, scale, invert, channelIDs)
  // to uPlot updates or chart recreation so child callbacks update charts directly.
  console.log("[subscribeChartUpdates] Starting subscription wiring");
  if (channelState && typeof channelState.subscribeProperty === "function") {
    console.log(
      "[subscribeChartUpdates] channelState.subscribeProperty available, wiring subscriptions"
    );
    // Fast color updates (attempt in-place, fallback to recreate)
    channelState.subscribeProperty("color", (change) => {
      try {
        const type = change.path && change.path[0];
        const globalIdx = change.path && change.path[2];
        if (!type) return;
        // Find the chart that contains this global channel index (grouped charts)
        let applied = false;
        if (!Array.isArray(charts)) {
          console.warn(
            "[color subscriber] charts is not an array:",
            typeof charts
          );
          return;
        }
        for (let ci = 0; ci < charts.length; ci++) {
          const chart = charts[ci];
          if (!chart || chart._type !== type) continue;
          const mapping = chart._channelIndices;
          if (Array.isArray(mapping) && Number.isFinite(globalIdx)) {
            const pos = mapping.indexOf(globalIdx);
            if (pos >= 0) {
              try {
                if (typeof chart.setSeries === "function") {
                  chart.setSeries(pos + 1, {
                    stroke: change.newValue,
                    points: { stroke: change.newValue },
                  });
                  try {
                    debugLite.log("chart.color", {
                      type,
                      globalIdx,
                      chartIndex: ci,
                      pos,
                      newValue: change.newValue,
                    });
                  } catch (e) {}
                  // Force redraw to ensure any UI that reads chart internals updates
                  try {
                    forceRedraw(chart);
                  } catch (e) {}
                  applied = true;
                }
              } catch (err) {
                console.warn(
                  "chartManager: in-place color update failed on chart",
                  ci,
                  err
                );
              }
            }
          }
        }
        if (applied) return;
        // Fallback: if nothing matched, attempt recreate for all charts of this type
        for (let ci = 0; ci < charts.length; ci++) {
          if (charts[ci] && charts[ci]._type === type) {
            recreateChartSync(type, ci);
          }
        }
      } catch (err) {
        console.error("[color subscriber] Unhandled error:", err);
      }
    });
  } else {
    console.log(
      "[subscribeChartUpdates] channelState.subscribeProperty not available, skipping property subscriptions"
    );
  }

  // Name/label updates (in-place)
  // Request descendant notifications so we receive per-series changes
  channelState.subscribeProperty(
    "name",
    (change) => {
      const type = change.path && change.path[0];
      if (!type) return;
      const globalIdx = change.path && change.path[2];
      try {
        // Whole-array replacement: update labels for each chart based on its mapping
        if (
          change.path &&
          change.path.length === 2 &&
          Array.isArray(change.newValue)
        ) {
          for (let ci = 0; ci < charts.length; ci++) {
            const chart = charts[ci];
            if (!chart || chart._type !== type) continue;
            const mapping = chart._channelIndices || [];
            mapping.forEach((global, pos) => {
              try {
                const lbl = change.newValue[global];
                if (typeof chart.setSeries === "function")
                  chart.setSeries(pos + 1, { label: lbl });
              } catch (e) {}
            });
            try {
              debugLite.log("chart.label.array", {
                type,
                chartIndex: ci,
                count: mapping.length,
              });
            } catch (e) {}
            try {
              forceRedraw(chart);
            } catch (e) {}
          }
          return;
        }

        // Single-series update: find the chart containing this global index
        if (Number.isFinite(globalIdx)) {
          for (let ci = 0; ci < charts.length; ci++) {
            const chart = charts[ci];
            if (!chart || chart._type !== type) continue;
            const mapping = chart._channelIndices || [];
            const pos = mapping.indexOf(globalIdx);
            if (pos >= 0) {
              try {
                if (typeof chart.setSeries === "function")
                  chart.setSeries(pos + 1, { label: change.newValue });
                try {
                  debugLite.log("chart.label", {
                    type,
                    globalIdx,
                    chartIndex: ci,
                    pos,
                    newValue: change.newValue,
                  });
                } catch (e) {}
                try {
                  forceRedraw(chart);
                } catch (e) {}
                return;
              } catch (e) {
                console.warn(
                  "chartManager: in-place label update failed on chart",
                  ci,
                  e
                );
                // continue to next chart
              }
            }
          }
        }
      } catch (err) {
        console.warn(
          "chartManager: in-place label update failed, recreating charts",
          err
        );
        // Recreate all charts of this type as fallback
        for (let ci = 0; ci < charts.length; ci++) {
          if (charts[ci] && charts[ci]._type === type) recreateChart(type, ci);
        }
      }
    },
    { descendants: true }
  );

  // Structural updates: scale/invert should recreate the chart
  channelState.subscribeProperty(
    "scale",
    (change) => {
      const type = change.path && change.path[0];
      const typeIdx = chartTypes.indexOf(type);
      if (typeIdx === -1) return;
      recreateChart(type, typeIdx);
    },
    { descendants: true }
  );
  channelState.subscribeProperty(
    "group",
    (change) => {
      try {
        debugLite.log("chart.group.change", change);
      } catch (e) {}
      // Re-render charts with updated grouping
      renderComtradeCharts(
        cfg,
        data,
        chartsContainer,
        charts,
        verticalLinesX,
        createState,
        calculateDeltas,
        TIME_UNIT,
        channelState
      );
    },
    { descendants: true }
  );
  channelState.subscribeProperty(
    "invert",
    (change) => {
      const type = change.path && change.path[0];
      const typeIdx = chartTypes.indexOf(type);
      if (typeIdx === -1) return;

      // If the whole-array was replaced, fallback to full recreate
      if (
        change.path &&
        change.path.length === 2 &&
        Array.isArray(change.newValue)
      ) {
        recreateChart(type, typeIdx);
        return;
      }

      const globalIdx = change.path && change.path[2];
      if (!Number.isFinite(globalIdx)) {
        // No specific series index provided — safe fallback
        recreateChart(type, typeIdx);
        return;
      }

      try {
        const arr = dataState && dataState[type];
        if (!Array.isArray(arr)) {
          recreateChart(type, typeIdx);
          return;
        }

        // Determine whether arr has a leading time array.
        // We treat it as having time iff the first element is an array AND
        // channelState[type].channelIDs exists and arr.length === channelCount + 1
        const chState = channelState[type] || {};
        const hasChannelIDs = Array.isArray(chState.channelIDs);
        const channelCount = hasChannelIDs ? chState.channelIDs.length : null;
        const firstIsArray = Array.isArray(arr[0]);
        const hasTime =
          firstIsArray &&
          channelCount != null &&
          arr.length === channelCount + 1;

        const seriesPos = hasTime ? globalIdx + 1 : globalIdx;
        const oldSeries = arr[seriesPos];
        if (!Array.isArray(oldSeries)) {
          recreateChart(type, typeIdx);
          return;
        }

        const isAnalog = type === "analog";
        const newSeries = oldSeries.map((v) => {
          if (isAnalog) return Number.isFinite(v) ? -v : v;
          return v ? 0 : 1;
        });

        // Apply in-place to dataState so other parts of app see the change.
        arr[seriesPos] = newSeries;

        // Try to update the uPlot chart(s) that contain this channel without full recreate
        let applied = false;
        for (let ci = 0; ci < charts.length; ci++) {
          const chart = charts[ci];
          if (!chart || chart._type !== type) continue;
          const mapping = chart._channelIndices || [];
          const pos = mapping.indexOf(globalIdx);
          if (pos < 0) continue;
          try {
            if (typeof chart.setData === "function") {
              // uPlot expects the full data array; pass our mutated arr reference
              chart.setData(arr);
              applied = true;
            }
          } catch (e) {
            applied = false;
          }
        }

        if (!applied) recreateChart(type, typeIdx);
      } catch (e) {
        recreateChart(type, typeIdx);
      }
    },
    { descendants: true }
  );

  // Add/Delete: channelIDs or yLabels descendant changes -> recreate
  channelState.subscribeProperty(
    "channelIDs",
    (change) => {
      const type = change.path && change.path[0];
      const typeIdx = chartTypes.indexOf(type);
      if (typeIdx === -1) return;
      recreateChartSync(type, typeIdx);
    },
    { descendants: true }
  );

  // Start / Duration: prefer setting x scale (time window) when possible
  // Robustness: starts/durations may be provided as sample indices or as timestamps.
  // Use dataState[type][0] (time array) to map indices -> time when necessary.
  function resolveTimeRange(type, seriesIdx) {
    const timeArr =
      Array.isArray(dataState[type]) && Array.isArray(dataState[type][0])
        ? dataState[type][0]
        : null;

    // Debug check
    if (!timeArr) {
      console.warn(
        `[resolveTimeRange] Missing or invalid time array for ${type}`
      );
    }

    const starts = channelState[type]?.starts || [];
    const durations = channelState[type]?.durations || [];

    const sRaw = starts[seriesIdx];
    const dRaw = durations[seriesIdx];

    let sNum = sRaw == null ? NaN : Number(sRaw);
    let dNum = dRaw == null ? NaN : Number(dRaw);

    try {
      debugLite.log("resolveTimeRange.request", {
        type,
        seriesIdx,
        sRaw,
        dRaw,
        timeArrLength: timeArr ? timeArr.length : 0,
      });
    } catch (e) {}

    if (Array.isArray(timeArr) && timeArr.length) {
      const first = timeArr[0];
      const last = timeArr[timeArr.length - 1];
      const totalSamples = timeArr.length;

      // If start is sample index, map to time
      if (Number.isInteger(sNum) && sNum >= 0 && sNum < totalSamples) {
        sNum = timeArr[sNum];
      }

      // If duration is sample count, map to time duration
      if (Number.isInteger(dNum) && dNum > 0 && dNum < totalSamples) {
        const dt = (last - first) / Math.max(1, totalSamples - 1);
        dNum = dNum * dt;
      }

      // Clamp start/duration
      if (Number.isFinite(sNum)) {
        if (sNum < first) sNum = first;
        if (sNum > last) sNum = last;
      }

      if (Number.isFinite(dNum) && Number.isFinite(sNum)) {
        if (sNum + dNum > last) dNum = Math.max(0, last - sNum);
      }
    }

    try {
      debugLite.log("resolveTimeRange.result", {
        type,
        seriesIdx,
        sNum,
        dNum,
        hasTime: !!(timeArr && timeArr.length),
      });
    } catch (e) {}

    return {
      sNum,
      dNum,
      hasTime: Array.isArray(timeArr) && timeArr.length > 0,
    };
  }

  // Helper: apply x-scale robustly with a cheap redraw and single retry
  function applyScale(chart, type, typeIdx, min, max) {
    try {
      // Attempt immediate apply (batched when possible)
      if (typeof chart.batch === "function") {
        try {
          chart.batch(() => chart.setScale("x", { min, max }));
        } catch (e) {
          chart.setScale("x", { min, max });
        }
      } else {
        chart.setScale("x", { min, max });
      }

      try {
        debugLite.log("subscriber.apply.attempt", { type, min, max });
      } catch (e) {}

      // 🩵 Force re-render after short delay to avoid race with uPlot DOM initialization
      setTimeout(() => {
        try {
          if (chart.setScale) chart.setScale("x", { min, max });
          if (chart.redraw) chart.redraw();
          forceRedraw(chart);
          debugLite.log("subscriber.apply.redraw.ok", { type, min, max });
        } catch (err) {
          debugLite.log("subscriber.apply.redraw.error", { type, err });
        }
      }, 50);

      // schedule a single short retry if needed to work around timing races
      if (!chart._scaleRetryScheduled) {
        chart._scaleRetryScheduled = true;
        setTimeout(() => {
          chart._scaleRetryScheduled = false;
          try {
            if (typeof chart.batch === "function") {
              chart.batch(() => chart.setScale("x", { min, max }));
            } else {
              chart.setScale("x", { min, max });
            }
            try {
              forceRedraw(chart);
            } catch (e) {}
            try {
              debugLite.log("subscriber.apply.retry", { type, min, max });
            } catch (e) {}
          } catch (err) {
            try {
              debugLite.log("subscriber.apply.retry.error", { type, err });
            } catch (e) {}
            // fallback to recreate if still failing
            try {
              debugLite.log("subscriber.apply.retry.fallback", { type });
            } catch (e) {}
            recreateChart(type, typeIdx);
          }
        }, 50);
      }
    } catch (err) {
      try {
        debugLite.log("subscriber.apply.error", { type, err });
      } catch (e) {}
      recreateChart(type, typeIdx);
    }
  }

  // Note: we intentionally do not schedule retries here to avoid extra timers.
  // Initial start/duration application is handled once after initial render
  // by the parent (`main.js`) using a small helper.

  channelState.subscribeProperty(
    "start",
    (change) => {
      const subscriberStartTime = performance.now();
      const type = change.path && change.path[0];
      const seriesIdx = change.path && change.path[2];
      const typeIdx = chartTypes.indexOf(type);
      if (typeIdx === -1) return;
      const chart = charts[typeIdx];
      if (!chart || typeof chart.setScale !== "function") return;
      try {
        try {
          debugLite.log("subscriber.start.received", { change });
        } catch (e) {}
        const { sNum, dNum, hasTime } = resolveTimeRange(type, seriesIdx);
        try {
          debugLite.log("subscriber.start.resolved", {
            type,
            seriesIdx,
            sNum,
            dNum,
            hasTime,
          });
        } catch (e) {}
        if (!hasTime) return;
        if (Number.isFinite(sNum) && Number.isFinite(dNum)) {
          const min = sNum;
          const max = sNum + dNum;
          applyScale(chart, type, typeIdx, min, max);
        } else if (Number.isFinite(sNum)) {
          const min = sNum;
          applyScale(chart, type, typeIdx, min, null);
        }

        const subscriberEndTime = performance.now();
        const subscriberTime = subscriberEndTime - subscriberStartTime;
        if (subscriberTime > 50) {
          console.log(
            `[Performance] 'start' subscriber: ${type} series ${seriesIdx}`,
            {
              timeMs: subscriberTime.toFixed(2),
              performance: subscriberTime > 200 ? "🔴 VERY SLOW" : "🟡 SLOW",
            }
          );
        }
      } catch (err) {
        // fallback to full recreate if setScale fails - use debounced update
        try {
          debugLite.log("subscriber.start.fallback.recreate", {
            type,
            err,
          });
        } catch (e) {}
        recreateChartSync(type, typeIdx);
      }
    },
    { descendants: true }
  );

  channelState.subscribeProperty(
    "duration",
    (change) => {
      const subscriberStartTime = performance.now();
      const type = change.path && change.path[0];
      const seriesIdx = change.path && change.path[2];
      const typeIdx = chartTypes.indexOf(type);
      if (typeIdx === -1) return;
      const chart = charts[typeIdx];
      if (!chart || typeof chart.setScale !== "function") return;
      try {
        try {
          debugLite.log("subscriber.duration.received", { change });
        } catch (e) {}
        const { sNum, dNum, hasTime } = resolveTimeRange(type, seriesIdx);
        try {
          debugLite.log("subscriber.duration.resolved", {
            type,
            seriesIdx,
            sNum,
            dNum,
            hasTime,
          });
        } catch (e) {}
        if (!hasTime) return;
        if (Number.isFinite(sNum) && Number.isFinite(dNum)) {
          const min = sNum;
          const max = sNum + dNum;
          applyScale(chart, type, typeIdx, min, max);
        } else if (Number.isFinite(dNum) && Number.isFinite(sNum) === false) {
          // if duration present but no start, treat as max only (no min)
          const max = dNum;
          applyScale(chart, type, typeIdx, null, max);
        }

        const subscriberEndTime = performance.now();
        const subscriberTime = subscriberEndTime - subscriberStartTime;
        if (subscriberTime > 50) {
          console.log(
            `[Performance] 'duration' subscriber: ${type} series ${seriesIdx}`,
            {
              timeMs: subscriberTime.toFixed(2),
              performance: subscriberTime > 200 ? "🔴 VERY SLOW" : "🟡 SLOW",
            }
          );
        }
      } catch (err) {
        try {
          debugLite.log("subscriber.duration.fallback.recreate", {
            type,
            err,
          });
        } catch (e) {}
        recreateChartSync(type, typeIdx);
      }
    },
    { descendants: true }
  );

  // Subscribe to channelState changes
  try {
    console.log("[subscribeChartUpdates] Setting up channelState.subscribe");
    channelState.subscribe(
      (change) => {
        try {
          if (!Array.isArray(change.path) || !change.path[0]) return;
          chartTypes.forEach((type, idx) => {
            // Skip color/label here - those are handled by subscribeProperty to
            // avoid duplicate handling and duplicate debug logs.
            if (
              change.path[0] === type &&
              (change.path[1] === "lineColors" || change.path[1] === "yLabels")
            ) {
              return;
            }

            // Structural changes: axes, order, units, etc.
            if (
              change.path[0] === type &&
              (change.path[1] === "axesScales" ||
                change.path[1] === "order" ||
                change.path[1] === "yUnits" ||
                change.path[1] === "xLabel" ||
                change.path[1] === "xUnit")
            ) {
              recreateChart(type, idx);
              return;
            }
          });
        } catch (err) {
          console.error("[channelState subscriber] Error:", err);
        }
      },
      { descendants: true }
    );
    console.log("[subscribeChartUpdates] channelState.subscribe set up");
  } catch (err) {
    console.error(
      "[subscribeChartUpdates] Failed to set up channelState subscription:",
      err
    );
  }

  // Subscribe to data changes (full re-create)
  try {
    console.log("[subscribeChartUpdates] Setting up dataState.subscribe");
    dataState.subscribe((change) => {
      try {
        const type = change.path && change.path[0];
        const idx = chartTypes.indexOf(type);
        if (idx !== -1) {
          recreateChart(type, idx);
        }
      } catch (err) {
        console.error("[dataState subscriber] Error:", err);
      }
    });
    console.log("[subscribeChartUpdates] dataState.subscribe set up");
  } catch (err) {
    console.error(
      "[subscribeChartUpdates] Failed to set up dataState subscription:",
      err
    );
  }

  // Subscribe to verticalLinesX changes (re-apply overlays)
  try {
    console.log("[subscribeChartUpdates] Setting up verticalLinesX.subscribe");
    verticalLinesX.subscribe(() => {
      try {
        if (!Array.isArray(charts)) return;
        chartTypes.forEach((type, idx) => {
          if (charts[idx]) {
            // Assuming you have a function to update vertical lines overlay
            updateVerticalLinesOverlay(charts[idx], verticalLinesX);
          }
        });
      } catch (err) {
        console.error("[verticalLinesX subscriber] Error:", err);
      }
    });
    console.log("[subscribeChartUpdates] verticalLinesX.subscribe set up");
  } catch (err) {
    console.error(
      "[subscribeChartUpdates] Failed to set up verticalLinesX subscription:",
      err
    );
  }

  console.log("[subscribeChartUpdates] All subscriptions set up successfully");
}

// Helper: update vertical lines overlay (implement as needed)
function updateVerticalLinesOverlay(chart, verticalLines) {
  // Your logic to update vertical lines on the chart
  // For example, re-draw or update plugin state
}
