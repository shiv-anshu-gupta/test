import {
  calculateAxisCountsForAllGroups,
  didAxisCountChange,
} from "../utils/axisCalculator.js";

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
 * - Publish maxYAxes changes to global store for all charts to consume
 * - Use analyzeGroupsAndPublishMaxYAxes() for functional group analysis
 *
 * Features:
 * - Automatic chart update on state mutation
 * - Dual-chart support (analog and digital)
 * - Time-windowing with start/duration filtering
 * - Series inversion with in-place optimization
 * - Deltastate-based change detection
 * - Fallback from in-place to full rebuild on errors
 * - Debug logging via debugPanelLite
 * - Global axis alignment published to centralized store via functional approach
 *
 * Dependencies:
 * - chartComponent.js: createChartOptions factory
 * - renderComtradeCharts.js: Full chart reconstruction
 * - debugPanelLite.js: Console debug logging
 * - createState.js: Reactive state management
 * - analyzeGroupsAndPublish.js: Pure function to analyze & publish axes
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
 * channelState.analog.groups[0] = 1;              // Group change -> full rebuild + publish axes to store
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

import { createChartOptions } from "./chartComponent.js";
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

  // Debounce group changes to prevent multiple rapid rebuilds
  let groupChangeTimeout = null;
  let isRebuildingFromGroup = false;

  // Store chart metadata for reuse detection
  let chartMetadata = {};

  // Store PREVIOUS group state to detect changes (needed for smart merge)
  let previousGroups = { analog: [], digital: [] };

  // ✅ NEW: Store previous axis counts to detect when rebuild is needed
  // Format: { analog: [1, 2, 1], digital: [1, 1] } - one entry per group
  let previousAxisCounts = { analog: [], digital: [] };

  // Store stroke functions to avoid recreating them on every color change
  // Cache key: `${type}-${globalIdx}` -> function
  const strokeFunctions = new Map();

  // ⚡ Fast index: channel -> array of charts that contain it
  // Format: { "analog-5": [chart0, chart2], "digital-3": [chart1] }
  // Rebuilt whenever chart structure changes
  const channelToChartsIndex = new Map();

  function rebuildChannelToChartsIndex() {
    channelToChartsIndex.clear();
    for (let ci = 0; ci < charts.length; ci++) {
      const chart = charts[ci];
      if (!chart || !chart._channelIndices || !chart._type) continue;

      const type = chart._type;
      chart._channelIndices.forEach((globalIdx) => {
        const key = `${type}-${globalIdx}`;
        if (!channelToChartsIndex.has(key)) {
          channelToChartsIndex.set(key, []);
        }
        channelToChartsIndex.get(key).push(chart);
      });
    }
  }

  // Initialize index on first call
  rebuildChannelToChartsIndex();

  // ⚡ RAF batch rendering: collect multiple chart redraws and execute in single frame
  let redrawBatch = new Set();
  let redrawRAFId = null;

  function scheduleChartRedraw(chart) {
    if (!chart) return;
    redrawBatch.add(chart);

    if (redrawRAFId === null) {
      redrawRAFId = requestAnimationFrame(() => {
        const t0 = performance.now();
        let count = 0;

        // Execute all pending redraws in batch
        for (const c of redrawBatch) {
          try {
            if (typeof c.redraw === "function") {
              c.redraw(false); // Don't clear canvas
              count++;
            }
          } catch (e) {
            console.warn("[scheduleChartRedraw] Batch redraw failed:", e);
          }
        }

        redrawBatch.clear();
        redrawRAFId = null;

        const elapsed = (performance.now() - t0).toFixed(2);
        if (count > 0 && elapsed > 5) {
          console.log(
            `[Performance] Batch redraw: ${count} charts in ${elapsed}ms`
          );
        }
      });
    }
  }

  /**
   * Efficiently update chart data in-place using setData().
   * Preserves event listeners, plugins, and DOM structure.
   * ~10x faster than full recreation (100ms vs 1000ms+)
   */
  function updateChartDataInPlace(chart, newData, type) {
    if (!chart || typeof chart.setData !== "function") {
      return false;
    }
    try {
      chart.setData(newData);
      chart.redraw();
      console.log(
        `[updateChartDataInPlace] ✓ Updated ${type} chart data (~100ms)`
      );
      return true;
    } catch (e) {
      console.warn(`[updateChartDataInPlace] Failed to update:`, e);
      return false;
    }
  }

  /**
   * Check if charts can be reused (same count, structure) without recreation.
   * Returns true if current charts match expected structure from groups.
   */
  function canReuseCharts(type, expectedGroupCount) {
    const typeCharts = charts.filter((c) => c && c._type === type);
    return typeCharts.length === expectedGroupCount;
  }

  /**
   * ✨ SMART CHART MERGING: Intelligently move channels between existing charts
   * Instead of full rebuild, this attempts to:
   * 1. Detect which channels moved between groups
   * 2. Find target group's existing chart
   * 3. Move channels into that chart (merge)
   * 4. Remove empty charts
   * 5. Update all affected charts efficiently
   *
   * Returns { succeeded: boolean, channelsMoved: number, chartsKept: number, chartsRemoved: number }
   */
  function attemptSmartChartMerge(
    existingCharts,
    newGroups,
    oldGroups,
    data,
    channelState,
    expectedGroupCount
  ) {
    try {
      // ✅ STEP 1: Build map of which channels should be in which group (NEW state)
      const newGroupStructure = {};
      newGroups.forEach((groupId, channelIdx) => {
        if (
          groupId === -1 ||
          groupId === "-1" ||
          groupId < 0 ||
          groupId === null
        )
          return;
        if (!newGroupStructure[groupId]) {
          newGroupStructure[groupId] = [];
        }
        newGroupStructure[groupId].push(channelIdx);
      });

      const targetGroupIds = Object.keys(newGroupStructure).sort((a, b) => {
        // Extract numeric part for sorting (e.g., "G2" -> 2)
        const aNum = parseInt(a.replace(/\D/g, ""));
        const bNum = parseInt(b.replace(/\D/g, ""));
        return aNum - bNum;
      });

      console.log(
        `[attemptSmartChartMerge] Target structure: ${targetGroupIds.length} groups`,
        targetGroupIds.map(
          (g) => `${g}: ${newGroupStructure[g].length} channels`
        )
      );

      // ✅ STEP 2: Build map of CURRENT chart structure using OLD groups
      // This is critical: use oldGroups to properly identify which chart belongs to which group
      const currentStructure = {};
      existingCharts.forEach((chart) => {
        if (
          chart &&
          chart._channelIndices &&
          chart._channelIndices.length > 0
        ) {
          // Find which group(s) these channels belonged to in OLD state
          const groupsInChart = new Set();
          chart._channelIndices.forEach((idx) => {
            if (idx < oldGroups.length) {
              const oldGroupId = oldGroups[idx];
              if (oldGroupId !== -1 && oldGroupId !== "-1" && oldGroupId >= 0) {
                groupsInChart.add(oldGroupId);
              }
            }
          });

          if (groupsInChart.size > 0) {
            const groupId = Array.from(groupsInChart)[0]; // Primary group
            if (!currentStructure[groupId]) {
              currentStructure[groupId] = { chart, indices: [] };
            }
            currentStructure[groupId].indices = chart._channelIndices.slice();
          }
        }
      });

      console.log(
        `[attemptSmartChartMerge] Current structure: ${
          Object.keys(currentStructure).length
        } charts`,
        Object.entries(currentStructure).map(
          ([g, info]) => `${g}: ${info.indices.length} channels`
        )
      );

      // ✅ STEP 3: Check if structure is compatible for merging
      // Compatible if:
      // - Same number of groups
      // - Groups haven't changed drastically
      if (
        targetGroupIds.length !== Object.keys(currentStructure).length &&
        Math.abs(targetGroupIds.length - Object.keys(currentStructure).length) >
          1
      ) {
        console.log(
          `[attemptSmartChartMerge] ❌ Group count differs too much (${
            targetGroupIds.length
          } vs ${Object.keys(currentStructure).length}), need full rebuild`
        );
        return { succeeded: false };
      }

      // ✅ STEP 4: Update each chart with merged data
      let chartsKept = 0;
      let chartsRemoved = 0;
      let channelsMoved = 0;

      targetGroupIds.forEach((groupId) => {
        const indices = newGroupStructure[groupId];

        if (currentStructure[groupId]) {
          // Chart exists for this group - update it
          const chart = currentStructure[groupId].chart;
          const oldIndices = currentStructure[groupId].indices;

          // Check if indices changed
          const indicesChanged =
            oldIndices.length !== indices.length ||
            !oldIndices.every((idx, i) => idx === indices[i]);

          if (indicesChanged) {
            console.log(
              `[attemptSmartChartMerge] 🔄 Updating ${groupId}: ${oldIndices.length} → ${indices.length} channels`
            );
            channelsMoved += Math.abs(indices.length - oldIndices.length);

            // Build new chart data
            const newChartData = [
              data.time,
              ...indices.map((idx) => data.analogData[idx]),
            ];

            // Update chart metadata
            chart._channelIndices = indices.slice();

            // Update chart data efficiently
            updateChartDataInPlace(chart, newChartData, "analog");
          } else {
            console.log(
              `[attemptSmartChartMerge] ✓ ${groupId}: No changes needed (${indices.length} channels)`
            );
          }
          chartsKept++;
        } else {
          // No existing chart for this group - shouldn't happen in merge mode
          console.warn(
            `[attemptSmartChartMerge] ⚠️ ${groupId} has no existing chart, need full rebuild`
          );
          return { succeeded: false };
        }
      });

      // ✅ STEP 5: Remove charts that are no longer needed (async destruction)
      const chartsToRemove = [];
      Object.keys(currentStructure).forEach((groupId) => {
        if (!newGroupStructure[groupId]) {
          const chart = currentStructure[groupId].chart;
          chartsToRemove.push(chart);
        }
      });

      // Batch remove charts asynchronously
      if (chartsToRemove.length > 0) {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(
            () => {
              chartsToRemove.forEach((chart) => {
                try {
                  chart.destroy();
                  const chartIdx = charts.indexOf(chart);
                  if (chartIdx >= 0) {
                    charts.splice(chartIdx, 1);
                    chartsRemoved++;
                    rebuildChannelToChartsIndex();
                    console.log(
                      `[attemptSmartChartMerge] 🗑️ Removed empty chart (async)`
                    );
                  }
                } catch (e) {
                  console.warn(
                    `[attemptSmartChartMerge] Failed to remove chart:`,
                    e
                  );
                }
              });
            },
            { timeout: 1000 }
          );
        } else {
          // Fallback: batch in setTimeout
          setTimeout(() => {
            chartsToRemove.forEach((chart) => {
              try {
                chart.destroy();
                const chartIdx = charts.indexOf(chart);
                if (chartIdx >= 0) {
                  charts.splice(chartIdx, 1);
                  chartsRemoved++;
                  rebuildChannelToChartsIndex();
                  console.log(
                    `[attemptSmartChartMerge] 🗑️ Removed empty chart (async)`
                  );
                }
              } catch (e) {
                console.warn(
                  `[attemptSmartChartMerge] Failed to remove chart:`,
                  e
                );
              }
            });
          }, 0);
        }
      }

      console.log(
        `[attemptSmartChartMerge] ✅ Success: Moved ${channelsMoved} channels, kept ${chartsKept} charts, removed ${chartsRemoved} empty charts`
      );
      return {
        succeeded: true,
        channelsMoved,
        chartsKept,
        chartsRemoved,
      };
    } catch (err) {
      console.warn(`[attemptSmartChartMerge] Error during merge attempt:`, err);
      return { succeeded: false };
    }
  }

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

      // Step 1: Get container FIRST before destroying
      if (!chartsContainer || !chartsContainer.children[idx]) {
        console.warn(
          `[recreateChart] chartsContainer.children[${idx}] does not exist`
        );
        return;
      }
      const container = chartsContainer.children[idx];

      // Step 2: Destroy old chart if it exists
      if (charts[idx]) {
        try {
          charts[idx].destroy();
          console.log(`[recreateChart] ✓ Destroyed old chart at index ${idx}`);
        } catch (e) {
          console.warn(`[recreateChart] Failed to destroy chart[${idx}]:`, e);
        }
      }

      // Step 3: CLEAR container HTML to remove any leftover DOM elements
      try {
        container.innerHTML = "";
        console.log(`[recreateChart] ✓ Cleared container HTML`);
      } catch (e) {
        console.warn(`[recreateChart] Failed to clear container:`, e);
      }

      // Step 4: Set reference to null
      charts[idx] = null;

      // Step 5: Create chart options
      const options = createChartOptions(channelState[type], verticalLinesX);
      const chartData = dataState[type];

      console.log(
        `[recreateChart] type="${type}", idx=${idx}, dataLength=${
          chartData.length
        }, seriesCount=${chartData.length - 1}`
      );

      // Step 6: Create new uPlot instance
      try {
        const chart = new uPlot(options, chartData, container);
        charts[idx] = chart;
        console.log(`[recreateChart] ✓ Created new uPlot instance`);

        // ⚡ Rebuild the fast lookup index since we added a new chart
        rebuildChannelToChartsIndex();

        console.log(
          `[recreateChart] ✅ Successfully recreated chart[${idx}] for type "${type}"`
        );
      } catch (uplotErr) {
        console.error(`[recreateChart] ❌ Failed to create uPlot:`, uplotErr);
        throw uplotErr;
      }
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

  /**
   * Force chart redraw without resizing (much faster than setSize)
   * Optimized to use chart.redraw() instead of expensive setSize() calls
   * ~5ms with redraw(false), vs ~100ms with setSize()
   * @param {uPlot} chart - uPlot instance
   */
  function forceRedraw(chart) {
    if (!chart) return;

    try {
      // Method 1: Direct redraw (fastest - ~5ms)
      if (typeof chart.redraw === "function") {
        chart.redraw(false); // false = don't clear canvas
        return;
      }

      // Method 2: Batch + noop scale update (slower - ~20ms)
      if (typeof chart.batch === "function") {
        chart.batch(() => {
          // Trigger internal recalculation without full resize
          const currentMin = chart.scales.x.min;
          const currentMax = chart.scales.x.max;

          if (currentMin !== undefined && currentMax !== undefined) {
            chart.setScale("x", { min: currentMin, max: currentMax });
          }
        });
        return;
      }

      // Method 3: Fallback to setSize (slowest - ~100ms)
      console.warn("[forceRedraw] Using slow setSize fallback");
      chart.setSize({ width: chart.width, height: chart.height });
    } catch (e) {
      console.warn("[forceRedraw] Failed:", e);
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
    // ✨ Optimized color updates (5-10x faster than full recreation)
    channelState.subscribeProperty("color", (change) => {
      const t0 = performance.now();

      try {
        const t1 = performance.now();
        const type = change.path && change.path[0];
        const globalIdx = change.path && change.path[2];

        // ✅ Handle both cases:
        // 1. Single color change: path = ['analog', 'lineColors', 0], newValue = '#fff'
        // 2. Whole array replace: path = ['analog', 'lineColors'], newValue = [...colors]
        if (!type || (type !== "analog" && type !== "digital")) {
          return; // Invalid type, silently ignore
        }

        // Case 2: Whole lineColors array was replaced
        if (Array.isArray(change.newValue) && !Number.isFinite(globalIdx)) {
          // Update all colors for this type
          for (let ci = 0; ci < charts.length; ci++) {
            const chart = charts[ci];
            if (!chart || chart._type !== type) continue;

            const mapping = chart._channelIndices || [];
            for (let pos = 0; pos < mapping.length; pos++) {
              const idx = mapping[pos];
              const color = change.newValue[idx];
              if (color) {
                try {
                  const seriesIdx = pos + 1;
                  const strokeFn = () => color;
                  chart.series[seriesIdx].stroke = strokeFn;
                  if (chart.series[seriesIdx].points) {
                    chart.series[seriesIdx].points.stroke = strokeFn;
                  }
                } catch (e) {
                  // Ignore errors for individual series
                }
              }
            }
            try {
              scheduleChartRedraw(chart);
            } catch (e) {
              // Ignore
            }
          }
          return;
        }

        // Case 1: Single color element was changed
        if (!Number.isFinite(globalIdx)) {
          return; // Not a single-element update, ignore
        }

        const newColor = change.newValue;
        let updateCount = 0;
        let failedCharts = [];

        // ✅ FIX 1: Create/reuse stroke function instead of passing string
        // uPlot expects stroke to be a function, not a string
        const t2 = performance.now();
        const cacheKey = `${type}-${globalIdx}`;
        let strokeFn = strokeFunctions.get(cacheKey);

        if (!strokeFn || strokeFn._color !== newColor) {
          // Create new function that returns the color
          strokeFn = () => newColor;
          strokeFn._color = newColor; // Store for comparison
          strokeFunctions.set(cacheKey, strokeFn);
        }
        const t3 = performance.now();

        // ✅ FIX 2: Update all charts that contain this channel using fast index
        const t4 = performance.now();
        const chartsWithThisChannel =
          channelToChartsIndex.get(`${type}-${globalIdx}`) || [];

        for (const chart of chartsWithThisChannel) {
          try {
            // Find the series index in this specific chart
            const mapping = chart._channelIndices || [];
            const pos = mapping.indexOf(globalIdx);
            if (pos < 0) continue;

            const seriesIdx = pos + 1; // uPlot series index (0 is x-axis)

            // Update both stroke and cached stroke
            chart.series[seriesIdx].stroke = strokeFn;
            chart.series[seriesIdx]._stroke = newColor; // Cached value

            if (chart.series[seriesIdx].points) {
              chart.series[seriesIdx].points.stroke = strokeFn;
              chart.series[seriesIdx].points._stroke = newColor;
            }

            updateCount++;
          } catch (err) {
            console.warn(`[color subscriber] Failed to update series:`, err);
            failedCharts.push(chart);
          }
        }
        const t5 = performance.now();

        // ✅ FIX 5: Batch redraw with RAF (prevents browser layout thrashing)
        const t6 = performance.now();
        let redrawCount = 0;
        for (const chart of chartsWithThisChannel) {
          try {
            // Schedule for batch redraw instead of immediate
            scheduleChartRedraw(chart);
            redrawCount++;
          } catch (e) {
            console.warn(`[color subscriber] Failed to schedule redraw:`, e);
          }
        }
        const t7 = performance.now();

        // ✅ FIX 6: Only recreate charts that actually failed
        if (failedCharts.length > 0 && updateCount === 0) {
          console.warn(
            `[color subscriber] All updates failed, recreating ${failedCharts.length} charts`
          );
          failedCharts.forEach((chart) => {
            const type = chart._type;
            const idx = charts.indexOf(chart);
            if (idx >= 0) recreateChartSync(type, idx);
          });
        }

        const totalTime = t7 - t0;

        // Detailed timing breakdown
        const timings = {
          pathExtract: (t1 - t0).toFixed(2),
          cacheFunc: (t3 - t2).toFixed(2),
          seriesUpdate: (t5 - t4).toFixed(2),
          redraw: (t7 - t6).toFixed(2),
          total: totalTime.toFixed(2),
        };

        // Log only if slow or in debug mode
        if (totalTime > 20) {
          console.warn(
            `[Performance] 🐢 Color update SLOW: ${totalTime.toFixed(0)}ms | ` +
              `[Extract: ${timings.pathExtract}ms | Cache: ${timings.cacheFunc}ms | ` +
              `Series: ${timings.seriesUpdate}ms | Redraw: ${timings.redraw}ms] | ` +
              `Charts: ${updateCount}, Redraws: ${redrawCount}`
          );
        } else if (updateCount > 0) {
          console.log(
            `[Performance] ✅ Color update FAST: ${totalTime.toFixed(
              1
            )}ms for ${updateCount} charts`
          );
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
      const t0 = performance.now();
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
              // Schedule redraw with RAF instead of immediate
              scheduleChartRedraw(chart);
            } catch (e) {}
          }
          const elapsed = (performance.now() - t0).toFixed(2);
          if (elapsed > 20) {
            console.warn(
              `[Performance] Name update scheduled: ${elapsed}ms (array replace)`
            );
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
                  // Schedule redraw with RAF instead of immediate
                  scheduleChartRedraw(chart);
                } catch (e) {}
                const elapsed = (performance.now() - t0).toFixed(2);
                if (elapsed > 10) {
                  console.warn(
                    `[Performance] Name update scheduled: ${elapsed}ms for 1 channel`
                  );
                }
                return;
              } catch (e) {
                console.warn(
                  "chartManager: in-place label update failed on chart",
                  ci,
                  e
                );
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

      // ✅ SYNC FIX: Update cfg with the new group assignment so Tabulator reads correct data
      // This ensures when Tabulator window is closed/reopened, it shows the current state
      try {
        const changeType = change.path && change.path[0]; // 'analog' or 'digital'
        const channelIdx = change.path && change.path[2]; // channel index
        const newGroup = change.newValue; // new group number/ID

        if (
          changeType &&
          Number.isFinite(channelIdx) &&
          cfg &&
          cfg[changeType + "Channels"]
        ) {
          const channels = cfg[changeType + "Channels"];
          if (channels[channelIdx]) {
            // Convert numeric group to string format (e.g., 0 → "G0", 1 → "G1")
            const groupString =
              typeof newGroup === "number" ? `G${newGroup}` : String(newGroup);
            channels[channelIdx].group = groupString;
            console.log(
              `[group subscriber] ✅ Synced cfg: ${changeType}[${channelIdx}].group = "${groupString}"`
            );
          }
        }
      } catch (syncErr) {
        console.warn(`[group subscriber] ⚠️ Failed to sync cfg:`, syncErr);
      }

      // Skip if we're already rebuilding
      if (isRebuildingFromGroup) {
        console.log(
          `[group subscriber] ℹ️ Already rebuilding, skipping duplicate call`
        );
        return;
      }

      // Clear any pending rebuild
      if (groupChangeTimeout) {
        clearTimeout(groupChangeTimeout);
      }

      // Debounce: wait 200ms to collect all group changes before processing
      groupChangeTimeout = setTimeout(async () => {
        const rebuildStartTime = performance.now();
        isRebuildingFromGroup = true;

        try {
          console.log(`[group subscriber] 🔄 Processing group change...`);

          // ✅ FUNCTIONAL APPROACH: Analyze groups and publish maxYAxes to global store
          // This single call handles all axis calculations reactively
          const { analyzeGroupsAndPublishMaxYAxes } = await import(
            "../utils/analyzeGroupsAndPublish.js"
          );
          const newMaxYAxes = analyzeGroupsAndPublishMaxYAxes(
            charts,
            channelState,
            cfg
          );

          // Get previous axes to detect if rebuild needed
          const previousGlobalAxes = previousAxisCounts?.analog?.globalMax || 1;
          const axisCountChanged = newMaxYAxes !== previousGlobalAxes;

          console.log(
            `[group subscriber] 📊 Axis count: old=${previousGlobalAxes}, new=${newMaxYAxes}, changed=${axisCountChanged}`
          );

          // Build currentGroups for state tracking
          const userGroups = channelState?.analog?.groups || [];
          const expectedGroupCount =
            Math.max(...userGroups.map((g) => (g === -1 ? 0 : g)), 0) + 1;

          const { calculateAxisCountForGroup } = await import(
            "../utils/axisCalculator.js"
          );

          const currentGroups = Array.from(
            { length: expectedGroupCount },
            (_, groupId) => {
              const groupIndices = userGroups
                .map((g, idx) => (g === groupId ? idx : -1))
                .filter((idx) => idx >= 0);

              return {
                indices: groupIndices,
                axisCount: calculateAxisCountForGroup(
                  groupIndices.map((idx) => cfg?.analogChannels?.[idx] || {})
                ),
              };
            }
          );

          // Only rebuild charts if axis count actually changed
          if (axisCountChanged) {
            console.log(
              `[group subscriber] 🔥 Axis requirement changed -> FULL REBUILD`
            );

            // Import render functions
            const { autoGroupChannels: autoGroup } = await import(
              "../utils/autoGroupChannels.js"
            );
            const { renderAnalogCharts: renderAnalog } = await import(
              "./renderAnalogCharts.js"
            );

            // Destroy all old analog charts immediately
            const chartsToDestroy = charts.filter(
              (c) => c && c._type === "analog"
            );
            chartsToDestroy.forEach((chart) => {
              if (chart && typeof chart.destroy === "function") {
                try {
                  chart.destroy();
                } catch (err) {
                  console.warn(
                    `[group subscriber] Failed to destroy chart:`,
                    err
                  );
                }
              }
            });

            // ✅ FIX: Properly remove destroyed charts from array
            const remainingCharts = charts.filter(
              (c) => c && c._type !== "analog"
            );
            charts.length = 0;
            charts.push(...remainingCharts);

            // ✅ FIX: Selective DOM clearing - only remove analog chart containers
            const chartsContainer =
              document.querySelector(".charts-container") ||
              document.querySelector("#charts");
            if (chartsContainer) {
              // Only remove analog chart containers, keep digital charts intact
              Array.from(chartsContainer.children).forEach((child) => {
                if (child.getAttribute("data-chart-type") === "analog") {
                  child.remove();
                }
              });
            }

            // Re-render with fresh axis calculation
            renderAnalog(
              cfg,
              data,
              chartsContainer,
              charts,
              verticalLinesX,
              channelState,
              autoGroup
            );

            // ✅ OPTIMIZATION: Only rebuild digital charts if axis count changed OR digital chart doesn't exist
            const digitalChartExists = charts.some(
              (c) => c && c._type === "digital"
            );
            if (axisCountChanged || !digitalChartExists) {
              if (
                cfg.digitalChannels &&
                cfg.digitalChannels.length > 0 &&
                data.digitalData &&
                data.digitalData.length > 0
              ) {
                try {
                  const { renderDigitalCharts: renderDigital } = await import(
                    "./renderDigitalCharts.js"
                  );
                  renderDigital(
                    cfg,
                    data,
                    chartsContainer,
                    charts,
                    verticalLinesX,
                    channelState
                    // ✅ REMOVED: currentGlobalAxes parameter - digital charts now read from global store
                  );
                  console.log(
                    `[group subscriber] ✓ Digital charts rendered (axis changed: ${axisCountChanged}, existed: ${digitalChartExists})`
                  );
                } catch (err) {
                  console.error(
                    `[group subscriber] ❌ Digital render failed:`,
                    err
                  );
                }
              }
            } else {
              console.log(
                `[group subscriber] ⏭️ Skipping digital chart rebuild (axis unchanged, chart exists)`
              );
            }

            // ✅ Render computed channels
            try {
              const { renderComputedChannels: renderComputed } = await import(
                "./renderComputedChannels.js"
              );
              renderComputed(
                data,
                chartsContainer,
                charts,
                verticalLinesX,
                channelState
              );
              console.log(`[group subscriber] ✓ Computed channels rendered`);
            } catch (err) {
              console.warn(
                `[group subscriber] ⚠️ Computed channels render optional:`,
                err
              );
            }

            // Update state
            previousGroups.analog = userGroups.slice();
            previousAxisCounts.analog = {
              globalMax: newMaxYAxes,
              perGroup: currentGroups.map((g) => g.axisCount),
            };
            isRebuildingFromGroup = false;

            console.log(
              `[group subscriber] ✅ All charts rebuilt - analog + digital + computed`
            );
            return; // ← CRITICAL: Exit early, skip all fast paths
          } else {
            console.log(
              `[group subscriber] ✓ Axis counts unchanged: ${newMaxYAxes}`
            );
          }

          console.log(
            `[group subscriber] Expected groups: ${expectedGroupCount}, Current charts: ${
              charts.filter((c) => c?._type === "analog").length
            }`
          );

          // 🚀 SUPER-FAST PATH: If chart count hasn't changed, just reorder data
          const analogCharts = charts.filter((c) => c?._type === "analog");
          if (
            !axisCountChanged && // ⚠️ CRITICAL: Skip fast paths if axes changed
            analogCharts.length === expectedGroupCount &&
            expectedGroupCount > 0
          ) {
            console.log(
              `[group subscriber] 🚀 SUPER-FAST PATH: Same chart count (${expectedGroupCount}), reordering data only`
            );

            try {
              // Build new data arrays for each group
              const groupData = new Map(); // groupId -> indices array
              userGroups.forEach((groupId, channelIdx) => {
                if (groupId < 0) return; // Skip unassigned
                if (!groupData.has(groupId)) {
                  groupData.set(groupId, []);
                }
                groupData.get(groupId).push(channelIdx);
              });

              // Update each chart with its group's data in the correct order
              let chartIdx = 0;
              for (const [groupId, channelIndices] of Array.from(
                groupData.entries()
              ).sort()) {
                if (chartIdx >= analogCharts.length) break;

                const chart = analogCharts[chartIdx];
                const newChartData = [
                  data.time,
                  ...channelIndices.map((idx) => data.analogData[idx]),
                ];

                // Update chart data in-place (fast!)
                if (typeof chart.setData === "function") {
                  try {
                    chart.setData(newChartData);
                    chart._channelIndices = channelIndices.slice();
                    chart.redraw();
                    chartIdx++;
                  } catch (e) {
                    console.warn(
                      `[group subscriber] setData failed for chart ${chartIdx}:`,
                      e
                    );
                    throw e; // Fall back to merge
                  }
                }
              }

              // Rebuild the fast index since channels moved between charts
              rebuildChannelToChartsIndex();

              const superFastTime = performance.now() - rebuildStartTime;
              console.log(
                `[group subscriber] ✨ SUPER-FAST PATH complete: ${superFastTime.toFixed(
                  0
                )}ms (data reorder only)`
              );

              // ✅ Update previous groups and axis counts for next change
              previousGroups.analog = userGroups.slice();
              previousAxisCounts.analog = {
                globalMax: newMaxYAxes,
                perGroup: currentGroups.map((g) => g.axisCount),
              };
              isRebuildingFromGroup = false;
              return;
            } catch (e) {
              console.log(
                `[group subscriber] Super-fast path failed, trying smart merge...`
              );
            }
          }

          // ⚡⚡ ULTRA-FAST PATH: Try SMART CHART MERGING (moves channels between existing charts)
          if (
            !axisCountChanged &&
            analogCharts.length > 0 &&
            previousGroups.analog.length > 0
          ) {
            // ⚠️ Skip if axes changed
            console.log(
              `[group subscriber] Comparing old groups to new groups...`,
              `Old: ${previousGroups.analog
                .slice(0, 3)
                .join(",")}..., New: ${userGroups.slice(0, 3).join(",")}...`
            );

            const mergeResult = attemptSmartChartMerge(
              analogCharts,
              userGroups,
              previousGroups.analog, // ✅ Pass OLD groups to detect current chart structure
              data,
              channelState,
              expectedGroupCount
            );

            if (mergeResult.succeeded) {
              const mergeTime = performance.now() - rebuildStartTime;
              console.log(
                `[group subscriber] ✨ ULTRA-FAST PATH: Smart merge complete in ${mergeTime.toFixed(
                  0
                )}ms`
              );
              console.log(
                `[group subscriber] Summary: Merged ${mergeResult.channelsMoved} channels, Kept ${mergeResult.chartsKept} charts, Removed ${mergeResult.chartsRemoved} empty charts`
              );

              // ✅ Update previous groups and axis counts for next change
              previousGroups.analog = userGroups.slice();
              previousAxisCounts.analog = {
                globalMax: newMaxYAxes,
                perGroup: currentGroups.map((g) => g.axisCount),
              };

              isRebuildingFromGroup = false;
              return;
            }
            console.log(
              `[group subscriber] ℹ️ Smart merge not applicable, trying standard reuse...`
            );
          }

          // ⚡ OPTIMIZATION: Try to REUSE charts instead of recreating
          if (
            !axisCountChanged &&
            canReuseCharts("analog", expectedGroupCount)
          ) {
            // ⚠️ Skip if axes changed
            console.log(
              `[group subscriber] ⚡ FAST PATH: Reusing ${expectedGroupCount} analog charts (skipping recreation)`
            );

            // Rebuild groups with current data
            const groupData = new Map(); // groupId -> { indices, data }

            // Collect data for each group
            userGroups.forEach((groupId, channelIdx) => {
              if (groupId < 0) return; // Skip unassigned

              if (!groupData.has(groupId)) {
                groupData.set(groupId, { indices: [], data: [] });
              }
              groupData.get(groupId).indices.push(channelIdx);
            });

            // Build chart data for each group
            let groupIdx = 0;
            for (const [groupId, groupInfo] of groupData.entries()) {
              const chart = charts.find(
                (c) =>
                  c &&
                  c._type === "analog" &&
                  charts.indexOf(c) >= groupIdx &&
                  charts.indexOf(c) < groupIdx + expectedGroupCount
              );
              if (!chart) continue;

              // Build data: [time, ...series for this group]
              const newChartData = [
                data.time,
                ...groupInfo.indices.map((idx) => data.analogData[idx]),
              ];

              // Update chart in-place
              updateChartDataInPlace(chart, newChartData, "analog");
              groupIdx++;
            }

            const fastPathTime = performance.now() - rebuildStartTime;
            console.log(
              `[group subscriber] ✅ Fast path complete: ${fastPathTime.toFixed(
                0
              )}ms (data update only)`
            );

            if (fastPathTime > 500) {
              console.warn(
                `[group subscriber] ⚠️ Fast path slower than expected: ${fastPathTime.toFixed(
                  0
                )}ms`
              );
            }

            // ✅ Update previous groups and axis counts for next change
            previousGroups.analog = userGroups.slice();
            previousAxisCounts.analog = {
              globalMax: newMaxYAxes,
              perGroup: currentGroups.map((g) => g.axisCount),
            };

            isRebuildingFromGroup = false;
            return;
          }

          // ❌ SLOW PATH: Charts structure changed, need full rebuild
          console.log(
            `[group subscriber] 🔄 Chart count changed, using SLOW PATH (full rebuild)...`
          );

          // ⚡ CRITICAL: Destroy all old charts IMMEDIATELY (synchronous)
          const destroyStartTime = performance.now();
          const chartsToDestroy = charts.slice(); // Copy array

          // Destroy all charts immediately (don't batch - it causes 22 second freeze!)
          for (let i = 0; i < chartsToDestroy.length; i++) {
            try {
              if (
                chartsToDestroy[i] &&
                typeof chartsToDestroy[i].destroy === "function"
              ) {
                chartsToDestroy[i].destroy();
              }
            } catch (e) {
              console.warn(
                `[group subscriber] Failed to destroy chart[${i}]:`,
                e
              );
            }
          }

          const destroyTime = performance.now() - destroyStartTime;
          console.log(
            `[group subscriber] ✓ Destroyed ${
              chartsToDestroy.length
            } old charts in ${destroyTime.toFixed(0)}ms`
          );

          // Clear old charts
          charts.length = 0;
          chartsContainer.innerHTML = "";

          // Render with new groups
          const { renderAnalogCharts: renderAnalog } = await import(
            "./renderAnalogCharts.js"
          );

          renderAnalog(
            cfg,
            data,
            chartsContainer,
            charts,
            verticalLinesX,
            channelState,
            autoGroup
          );

          // ✅ Render digital charts IMMEDIATELY in parallel (no freeze!)
          if (
            cfg.digitalChannels &&
            cfg.digitalChannels.length > 0 &&
            data.digitalData &&
            data.digitalData.length > 0
          ) {
            try {
              const { renderDigitalCharts: renderDigital } = await import(
                "./renderDigitalCharts.js"
              );
              renderDigital(
                cfg,
                data,
                chartsContainer,
                charts,
                verticalLinesX,
                channelState
                // ✅ REMOVED: currentGlobalAxes parameter - digital charts now read from global store
              );
              console.log(
                `[group subscriber] ✓ Digital charts rendered (reading maxYAxes from global store)`
              );
            } catch (err) {
              console.error(
                `[group subscriber] ❌ Digital render failed:`,
                err
              );
            }
          }

          console.log(`[group subscriber] ✓ Charts rendered: ${charts.length}`);

          const slowPathTime = performance.now() - rebuildStartTime;
          console.log(
            `[group subscriber] ✅ Slow path complete: ${slowPathTime.toFixed(
              0
            )}ms (full rebuild)`
          );

          if (slowPathTime > 5000) {
            console.warn(
              `[group subscriber] ⚠️ SLOW REBUILD: ${slowPathTime.toFixed(0)}ms`
            );
          }

          // ✅ Update previous groups and axis counts for next change
          previousGroups.analog = userGroups.slice();
          previousAxisCounts.analog = {
            globalMax: newMaxYAxes,
            perGroup: currentGroups.map((g) => g.axisCount),
          };
        } catch (err) {
          console.error(
            `[group subscriber] ❌ Group change processing failed:`,
            err
          );
          // Fallback to full renderComtradeCharts if rebuild fails
          try {
            console.log(
              `[group subscriber] 🔄 Falling back to full renderComtradeCharts...`
            );
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
          } catch (fallbackErr) {
            console.error(
              `[group subscriber] ❌ Full rebuild also failed:`,
              fallbackErr
            );
          }
        } finally {
          isRebuildingFromGroup = false;
          groupChangeTimeout = null;
        }
      }, 200);
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
