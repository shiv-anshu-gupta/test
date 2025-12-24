import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { findChangedDigitalChannelIndices } from "../utils/digitalChannelUtils.js";
import { createCustomElement } from "../utils/helpers.js";
import { createChartContainer } from "../utils/chartDomUtils.js";
import verticalLinePlugin from "../plugins/verticalLinePlugin.js";
import { getMaxYAxes } from "../utils/maxYAxesStore.js";
import { attachListenerWithCleanup } from "../utils/eventListenerManager.js";

export function renderDigitalCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState
  // ✅ REMOVED: globalMaxYAxes parameter - now reading from global store
) {
  const renderStartTime = performance.now();
  console.log("[renderDigitalCharts] 🟦 Starting digital chart rendering...");

  const DigChannelOffset = 3;

  const changedIndices = findChangedDigitalChannelIndices(data.digitalData);
  console.log(
    `[renderDigitalCharts] 📊 Found ${changedIndices.length} changed digital channels:`,
    changedIndices
  );

  const digitalIndicesToShow = changedIndices;
  // Keep originalIndex on displayed channel objects so mapping is stable
  const digitalChannelsToShow = digitalIndicesToShow.map((i) => ({
    ...cfg.digitalChannels[i],
    originalIndex: i,
  }));
  const digitalDataToShow = digitalIndicesToShow.map(
    (i) => data.digitalData[i]
  );
  const yLabels = channelState.digital.yLabels;
  const lineColors = channelState.digital.lineColors;
  const yUnits = channelState.digital.yUnits;
  const axesScales = channelState.digital.axesScales;
  const xLabel = channelState.digital.xLabel;
  const xUnit = channelState.digital.xUnit;
  // Colors corresponding to the displayed channels (map from full channelState)
  const displayedColors = digitalIndicesToShow.map((i) => lineColors[i]);

  // Get digital channel names for display on left side
  const digitalYLabels = digitalIndicesToShow.map((i) => yLabels[i]);

  console.log(
    `[renderDigitalCharts] 📋 Channel labels: ${digitalYLabels.join(", ")}`
  );
  console.log(
    `[renderDigitalCharts] 🎨 Line colors: [${displayedColors.join(", ")}]`
  );

  // Create a pseudo-group for alignment calculation
  const digitalGroup = {
    indices: digitalIndicesToShow,
    name: "Digital Channels",
  };

  const dragBar = createDragBar(
    {
      indices: digitalChannelsToShow.map((_, i) => i),
      colors: displayedColors,
    },
    { analogChannels: digitalChannelsToShow },
    channelState
  );

  // Create chart container with individual digital channel names, colors, and type label
  const { parentDiv, chartDiv } = createChartContainer(
    dragBar,
    "chart-container",
    digitalYLabels,
    displayedColors,
    "Digital Channels",
    "",
    "digital"
  );
  chartsContainer.appendChild(parentDiv);
  console.log(`[renderDigitalCharts] 🏗️ Chart container created`);

  //const verticalLinesXState = verticalLinesX;
  const digitalDataZeroOne = digitalDataToShow.map((arr) =>
    arr.map((v) => (v ? 1 : 0))
  );
  const chartData = [data.time, ...digitalDataZeroOne];
  const digitalFillSignals = digitalChannelsToShow.map((ch, i) => ({
    signalIndex: i + 1,
    offset: (digitalChannelsToShow.length - 1 - i) * DigChannelOffset,
    color: displayedColors[i],
    targetVal: 1,
    originalIndex: ch.originalIndex,
  }));
  const yMin = -0.5;
  const yMax = (digitalChannelsToShow.length - 1) * DigChannelOffset + 2;
  const scales = {
    x: { time: false, auto: true },
    y: { min: yMin, max: yMax, auto: false },
  };

  // ✅ Get global axis alignment from global store (default 1 for digital)
  const maxYAxes = getMaxYAxes() || 1;
  console.log(
    `[renderDigitalCharts] ✅ Chart config: maxYAxes=${maxYAxes}, channels=${digitalChannelsToShow.length}, yMin=${yMin}, yMax=${yMax}`
  );

  const chartOptionsStartTime = performance.now();
  const opts = createChartOptions({
    title: "Digital Channels",
    yLabels,
    lineColors,
    verticalLinesX: verticalLinesX,
    xLabel,
    xUnit,
    getCharts: () => charts,
    yUnits,
    axesScales,
    scales,
    singleYAxis: true,
    autoScaleUnit: { x: true, y: false },
    maxYAxes: maxYAxes,
  });

  // ✅ DEBUG: Log Y-Axes Configuration
  console.log(`[renderDigitalCharts] 📏 Y-Axes Configuration:`, {
    maxYAxes,
    optsAxesLength: opts.axes?.length,
    firstAxisExists: !!opts.axes?.[1],
    additionalAxes: opts.axes?.slice(2).length,
    digitalChannelsCount: digitalChannelsToShow.length,
    originalAxes: opts.axes,
  });

  // ✅ Keep digital-specific formatting on first Y-axis, preserve additional axes for multi-axis sync
  const firstAxis = {
    ...opts.axes[1], // Preserve original axis properties
    scale: "y", // Ensure correct scale
    side: 3, // Left side
    show: true, // Ensure axis is visible
    size: 60, // Reserve space for axis
    stroke: "#d1d5db", // Visible stroke
    label: "Digital States", // Add label for clarity
    grid: { show: true },
    ticks: { show: true, size: 10 },
    gap: 5,
    values: (u, vals) =>
      vals.map((v) => {
        for (let i = 0; i < digitalChannelsToShow.length; ++i) {
          if (Math.abs(v - i * DigChannelOffset) < 0.5) return "0";
          if (Math.abs(v - (i * DigChannelOffset + 1)) < 0.5) return "1";
        }
        return "";
      }),
    splits: digitalChannelsToShow.flatMap((_, i) => [
      i * DigChannelOffset,
      i * DigChannelOffset + 1,
    ]),
    // Remove range - let scale handle it
  };

  console.log(`[renderDigitalCharts] 📏 First Axis Configuration:`, {
    originalAxis: opts.axes[1],
    modifiedAxis: firstAxis,
  });

  // Build axes array: [x-axis, first y-axis with digital formatting, ...additional axes]
  opts.axes = [opts.axes[0], firstAxis, ...opts.axes.slice(2)];

  console.log(`[renderDigitalCharts] 📏 Final Axes Array:`, opts.axes);

  opts.series = [
    {},
    ...digitalChannelsToShow.map((ch, i) => {
      // Prefer the authoritative label from channelState if available.
      const original = ch.originalIndex;
      let label = ch.id;
      try {
        if (
          Array.isArray(channelState.digital?.yLabels) &&
          channelState.digital.yLabels[original]
        ) {
          if (channelState.digital.yLabels[original] !== ch.id) {
            // small debug hint when label sources disagree
            console.debug(
              "renderDigitalCharts: label mismatch for originalIndex",
              original,
              "cfg.id=",
              ch.id,
              "state.label=",
              channelState.digital.yLabels[original]
            );
          }
          label = channelState.digital.yLabels[original];
        }
      } catch (e) {}
      return {
        label,
        stroke: "transparent",
        show: true,
      };
    }),
  ];
  opts.plugins = opts.plugins || [];
  opts.plugins = opts.plugins.filter(
    (p) => !(p && p.id === "verticalLinePlugin")
  );
  opts.plugins.push(createDigitalFillPlugin(digitalFillSignals, [yMin, yMax]));
  opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));

  const chartOptionsEndTime = performance.now();
  console.log(
    `[renderDigitalCharts] ⏱️ createChartOptions took ${(
      chartOptionsEndTime - chartOptionsStartTime
    ).toFixed(1)}ms`
  );

  const chartStartTime = performance.now();
  const chart = new uPlot(opts, chartData, chartDiv);
  const chartEndTime = performance.now();

  chart._seriesColors = opts.series.slice(1).map((s) => s.stroke);
  charts.push(chart);
  try {
    // store mapping from chart series -> global channel indices
    chart._channelIndices = digitalChannelsToShow.map((ch) => ch.originalIndex);
    chart._type = "digital";
  } catch (e) {}

  console.log(
    `[renderDigitalCharts] ✅ Digital chart created in ${(
      chartEndTime - chartStartTime
    ).toFixed(1)}ms with ${digitalChannelsToShow.length} channels`
  );

  const clickHandlerStartTime = performance.now();

  // Click handler to add/remove vertical lines
  const clickHandler = (e) => {
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
          const { getPolarChart, getCfg, getData } = await import("../main.js");
          const polarChart = getPolarChart();
          const cfgData = getCfg();
          const dataObj = getData();

          if (polarChart && cfgData && dataObj) {
            console.log(
              "[renderDigitalCharts] Updating polar chart for new vertical line at:",
              xVal
            );
            // Find nearest time index for this vertical line position
            const timeIndex = dataObj.time
              ? dataObj.time.findIndex((t) => t >= xVal)
              : 0;
            console.log(
              "[renderDigitalCharts] Calculated timeIndex:",
              timeIndex
            );
            polarChart.updatePhasorAtTimeIndex(
              cfgData,
              dataObj,
              Math.max(0, timeIndex)
            );
          } else {
            console.warn(
              "[renderDigitalCharts] Missing polarChart, cfg, or data:",
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
            "[renderDigitalCharts] Cannot update polar chart or deltaWindow:",
            e.message
          );
          console.error(e);
        }
        charts.forEach((c) => c.redraw());
      }, 0);
    }
  };

  // ✅ Attach click handler with cleanup tracking
  attachListenerWithCleanup(chart.over, "click", clickHandler, chart);

  const clickHandlerEndTime = performance.now();
  console.log(
    `[renderDigitalCharts] ⏱️ Click handler setup took ${(
      clickHandlerEndTime - clickHandlerStartTime
    ).toFixed(1)}ms`
  );

  const resizeObserverStartTime = performance.now();
  const ro = new ResizeObserver((entries) => {
    for (let entry of entries) {
      chart.setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  ro.observe(chartDiv);

  const resizeObserverEndTime = performance.now();
  console.log(
    `[renderDigitalCharts] ⏱️ ResizeObserver.observe took ${(
      resizeObserverEndTime - resizeObserverStartTime
    ).toFixed(1)}ms`
  );

  const renderEndTime = performance.now();
  const totalTime = renderEndTime - renderStartTime;
  console.log(
    `[renderDigitalCharts] ✓ Render complete in ${totalTime.toFixed(1)}ms`
  );
}
