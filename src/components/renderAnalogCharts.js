import {
  createChartOptions,
  getMaxYAxesForAlignment,
} from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { createCustomElement } from "../utils/helpers.js";
import {
  createTooltip,
  updateTooltip,
  hideTooltip,
} from "../components/Tooltip.js";
import {
  createChartContainer,
  initUPlotChart,
} from "../utils/chartDomUtils.js";
import verticalLinePlugin from "../plugins/verticalLinePlugin.js";
// import { deltaBoxPlugin } from "../plugins/deltaBoxPlugin.js"; // DISABLED: Using DeltaWindow popup instead

export function renderAnalogCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState,
  autoGroupChannels
) {
  let groups;

  const optimizationStartTime = performance.now();
  const userGroups = channelState?.analog?.groups || [];

  // LOG: Debug group population
  console.log("[renderAnalogCharts] 📊 userGroups from state:", userGroups);
  console.log(
    "[renderAnalogCharts] Total analog channels:",
    cfg.analogChannels?.length
  );

  // Build groups using stable channelIDs when available.
  // Each group object will have: { name, ids: [channelID,...], indices: [globalIndex,...] }
  const totalAnalog = Array.isArray(cfg.analogChannels)
    ? cfg.analogChannels
    : [];
  const channelIDs = channelState?.analog?.channelIDs || [];

  if (
    Array.isArray(userGroups) &&
    userGroups.length > 0 &&
    userGroups.some((g) => g !== undefined && g !== null && g !== "")
  ) {
    // ⚡ OPTIMIZATION: User has assigned groups - use them directly without autoGroupChannels
    console.log(
      `[renderAnalogCharts] ⚡ Using user-assigned groups (${userGroups.length} channels)`
    );

    // collect explicit groups by name using channelIDs; keep unassigned indices for auto grouping
    const explicit = {};
    const autoIndices = [];
    for (let i = 0; i < totalAnalog.length; i++) {
      const g = userGroups[i];
      if (g === undefined || g === null || g === "") {
        autoIndices.push(i);
      } else {
        if (!explicit[g]) explicit[g] = [];
        explicit[g].push(i);
      }
    }

    groups = Object.entries(explicit).map(([name, idxs]) => ({
      name,
      indices: idxs.slice(),
      ids: idxs.map((j) => channelIDs[j]),
    }));

    // Auto-group any remaining channels and remap to global indices/ids
    if (autoIndices.length > 0) {
      console.log(
        `[renderAnalogCharts] ⚡ Auto-grouping ${autoIndices.length} unassigned channels`
      );
      const autoStartTime = performance.now();

      const remainingChannels = autoIndices.map((i) => totalAnalog[i]);
      const autoGroups = autoGroupChannels(remainingChannels || []);

      const autoEndTime = performance.now();
      console.log(
        `[renderAnalogCharts] ✓ Auto-grouping took ${(
          autoEndTime - autoStartTime
        ).toFixed(2)}ms`
      );

      autoGroups.forEach((ag) => {
        const globalIndices = ag.indices.map(
          (localIdx) => autoIndices[localIdx]
        );
        groups.push({
          name: ag.name,
          indices: globalIndices,
          ids: globalIndices.map((gi) => channelIDs[gi]),
          colors: ag.colors,
        });
      });
    }
  } else {
    // full auto grouping -> convert local indices to global indices and ids
    console.log(
      `[renderAnalogCharts] 🔄 Running full autoGroupChannels on ${totalAnalog.length} channels...`
    );
    const autoStartTime = performance.now();

    const autoGroups = autoGroupChannels(cfg.analogChannels || []);

    const autoEndTime = performance.now();
    console.log(
      `[renderAnalogCharts] ✓ Full autoGroupChannels took ${(
        autoEndTime - autoStartTime
      ).toFixed(2)}ms`
    );

    groups = autoGroups.map((g) => ({
      name: g.name,
      indices: (g.indices || []).slice(),
      ids: (g.indices || []).map((idx) => channelIDs[idx]),
      colors: g.colors,
    }));
  }

  // Calculate max Y-axes for alignment across all groups
  const maxYAxes = getMaxYAxesForAlignment(groups);
  console.log(
    "[renderAnalogCharts] Max Y-axes for alignment:",
    maxYAxes,
    "across",
    groups.length,
    "groups"
  );

  // ⏱️ TIMING: Start chart creation
  const chartsStartTime = performance.now();
  console.log(
    `[renderAnalogCharts] 🔧 Starting chart creation for ${groups.length} groups...`
  );

  // Render each group as a chart
  groups.forEach((group) => {
    const groupStartTime = performance.now();
    // resolve any missing ids -> indices mapping defensively
    const resolvedIndicesRaw = (group.ids || []).map((id, i) => {
      if (id == null) return group.indices ? group.indices[i] : -1;
      const idx = channelIDs.indexOf(id);
      return idx >= 0 ? idx : group.indices ? group.indices[i] : -1;
    });
    // filter out unresolved indices
    const resolvedIndices = resolvedIndicesRaw.filter(
      (idx) => Number.isFinite(idx) && idx >= 0
    );

    // skip empty groups
    if (!resolvedIndices || resolvedIndices.length === 0) return;

    const dragBar = createDragBar(
      { indices: resolvedIndices, name: group.name },
      cfg,
      channelState
    );

    const yLabels = channelState.analog.yLabels;
    const lineColors = channelState.analog.lineColors;
    const yUnits = channelState.analog.yUnits;
    const axesScales = channelState.analog.axesScales;
    const xLabel = channelState.analog.xLabel;
    const xUnit = channelState.analog.xUnit;

    const groupYLabels = resolvedIndices.map((idx) => yLabels[idx]);
    const groupLineColors = resolvedIndices.map((idx) => lineColors[idx]);
    const groupYUnits = resolvedIndices.map((idx) => yUnits[idx]);
    const groupAxesScales = [
      axesScales[0],
      ...resolvedIndices.map((idx) => axesScales[idx + 1]),
    ];

    // Extract group ID from first channel in this group
    // All channels in the same group share the same groupId, so just take the first one
    const groupId =
      resolvedIndices.length > 0 ? userGroups[resolvedIndices[0]] : "";

    // LOG: Debug group extraction
    console.log(
      `[renderAnalogCharts] 🏷️ Group "${
        group.name
      }": resolved indices = [${resolvedIndices.join(
        ","
      )}], extracted groupId = "${groupId}"`
    );

    // Create chart container with individual channel names, colors, type label, and single group ID
    const { parentDiv, chartDiv } = createChartContainer(
      dragBar,
      "chart-container",
      groupYLabels,
      groupLineColors,
      "Analog Channels",
      groupId
    );
    chartsContainer.appendChild(parentDiv);

    const chartData = [
      data.time,
      ...resolvedIndices.map((idx) => data.analogData[idx]),
    ];

    const opts = createChartOptions({
      title: group.name || "",
      yLabels: groupYLabels,
      lineColors: groupLineColors,
      verticalLinesX: verticalLinesX,
      xLabel,
      xUnit,
      getCharts: () => charts,
      yUnits: groupYUnits,
      axesScales: groupAxesScales,
      singleYAxis: true,
      maxYAxes: maxYAxes,
    });

    console.log("[renderAnalogCharts] Chart options for group:", {
      groupName: group.name,
      yUnits: groupYUnits,
      axesScales: groupAxesScales,
      resolvedIndices: resolvedIndices,
    });

    opts.plugins = opts.plugins || [];
    opts.plugins = opts.plugins.filter(
      (p) => !(p && p.id === "verticalLinePlugin")
    );
    opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));
    // opts.plugins.push(deltaBoxPlugin()); // DISABLED: Using DeltaWindow popup instead

    const chart = initUPlotChart(opts, chartData, chartDiv, charts);

    // store mapping from chart series -> global channel indices so chartManager can map updates
    try {
      chart._channelIndices = resolvedIndices.slice();
      chart._type = "analog";
    } catch (e) {}

    // tooltip
    const tooltip = createTooltip();
    chart.over.addEventListener("mousemove", (e) => {
      const idx = chart.posToIdx(e.offsetX);
      if (idx >= 0 && idx < chart.data[0].length) {
        const time = chart.data[0][idx];
        const values = chart.data
          .slice(1)
          .map((series, i) => {
            const liveSeries =
              chart.series && chart.series[i + 1] ? chart.series[i + 1] : null;
            const label =
              (liveSeries && liveSeries.label) ||
              opts.series[i + 1]?.label ||
              `Ch${i + 1}`;
            const stroke =
              (liveSeries && liveSeries.stroke) ||
              opts.series[i + 1]?.stroke ||
              (chart._seriesColors && chart._seriesColors[i]);
            const val =
              series[idx] != null && series[idx].toFixed
                ? series[idx].toFixed(2)
                : String(series[idx]);
            return `<span style="color:${stroke}">${label}</span>: ${val}`;
          })
          .join("<br>");
        updateTooltip(
          e.pageX,
          e.pageY,
          `<b>t:</b> ${time.toFixed(2)}<br>${values}`
        );
      }
    });
    chart.over.addEventListener("mouseleave", hideTooltip);

    // Click handler to add/remove vertical lines
    chart.over.addEventListener("click", (e) => {
      if (!chart.scales || !chart.scales.x) return;

      const xVal = chart.posToVal(e.offsetX, "x");
      const currentLines = verticalLinesX.asArray();

      // Check if clicking near an existing line (within 2% of x-range)
      const xRange = chart.scales.x.max - chart.scales.x.min;
      const tolerance = xRange * 0.02;
      const existingIdx = currentLines.findIndex(
        (line) => Math.abs(line - xVal) < tolerance
      );

      if (existingIdx >= 0) {
        // Remove line if clicking near existing line
        verticalLinesX.value = currentLines.filter((_, i) => i !== existingIdx);
      } else {
        // Add new line
        verticalLinesX.value = [...currentLines, xVal];
        // Auto-trigger delta calculation and open delta window (only if 2+ lines)
        setTimeout(async () => {
          try {
            // Update polar chart with new vertical line position
            const { getPolarChart, getCfg, getData } = await import(
              "../main.js"
            );
            const polarChart = getPolarChart();
            const cfgData = getCfg();
            const dataObj = getData();

            if (polarChart && cfgData && dataObj) {
              console.log(
                "[renderAnalogCharts] Updating polar chart for new vertical line at:",
                xVal
              );
              // Find nearest time index for this vertical line position
              const timeIndex = dataObj.time
                ? dataObj.time.findIndex((t) => t >= xVal)
                : 0;
              console.log(
                "[renderAnalogCharts] Calculated timeIndex:",
                timeIndex
              );
              polarChart.updatePhasorAtTimeIndex(
                cfgData,
                dataObj,
                Math.max(0, timeIndex)
              );
            } else {
              console.warn(
                "[renderAnalogCharts] Missing polarChart, cfg, or data:",
                {
                  polarChart: !!polarChart,
                  cfgData: !!cfgData,
                  dataObj: !!dataObj,
                }
              );
            }

            const { deltaWindow } = await import("../main.js");
            // Only show delta window if there are 2 or more vertical lines
            if (deltaWindow && verticalLinesX.value.length > 1) {
              deltaWindow.show();
            }
          } catch (e) {
            console.error(
              "[renderAnalogCharts] Cannot update polar chart or deltaWindow:",
              e.message
            );
            console.error(e);
          }
          charts.forEach((c) => c.redraw());
        }, 0);
      }
    });

    // ⏱️ Log time for this group
    const groupEndTime = performance.now();
    const groupTime = groupEndTime - groupStartTime;
    if (groupTime > 1000) {
      console.warn(
        `[renderAnalogCharts] ⚠️ SLOW GROUP: "${
          group.name
        }" took ${groupTime.toFixed(0)}ms`
      );
    } else {
      console.log(
        `[renderAnalogCharts] ✓ Group "${
          group.name
        }" created in ${groupTime.toFixed(0)}ms`
      );
    }
  });

  // ⏱️ Log chart creation time
  const chartsEndTime = performance.now();
  const chartsTime = chartsEndTime - chartsStartTime;
  console.log(
    `[renderAnalogCharts] ✓ All ${
      groups.length
    } charts created in ${chartsTime.toFixed(0)}ms`
  );

  // ⏱️ Log total render time
  const optimizationEndTime = performance.now();
  const totalTime = optimizationEndTime - optimizationStartTime;
  if (totalTime > 1000) {
    console.warn(
      `[renderAnalogCharts] ⚠️ SLOW RENDER: ${totalTime.toFixed(0)}ms for ${
        groups.length
      } groups`
    );
  } else {
    console.log(
      `[renderAnalogCharts] ✅ Render complete in ${totalTime.toFixed(0)}ms`
    );
  }
}
