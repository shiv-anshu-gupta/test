// src/components/renderComputedChannels.js
// NEW: One chart per computed channel, stored in chartsComputed array
// Matches the pattern used for analog/digital charts

import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { getMaxYAxes } from "../utils/maxYAxesStore.js";
import { renderLatex } from "../utils/mathJaxLoader.js";
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
import { attachListenerWithCleanup } from "../utils/eventListenerManager.js";

/**
 * Format equation string for LaTeX display
 * @param {string} equation - Math.js format equation
 * @returns {string} LaTeX formatted equation
 */
function formatEquationForLatex(equation) {
  if (!equation) return "";

  let latex = equation;

  // Handle sqrt(expr) -> \sqrt{expr}
  while (latex.includes("sqrt(")) {
    let startIdx = latex.indexOf("sqrt(");
    let openCount = 1;
    let endIdx = startIdx + 5;

    while (endIdx < latex.length && openCount > 0) {
      if (latex[endIdx] === "(") openCount++;
      else if (latex[endIdx] === ")") openCount--;
      endIdx++;
    }

    const inner = latex.substring(startIdx + 5, endIdx - 1);
    latex =
      latex.substring(0, startIdx) +
      "\\sqrt{" +
      inner +
      "}" +
      latex.substring(endIdx);
  }

  // Replace other functions
  latex = latex.replace(/\babs\(/g, "\\left|");
  latex = latex.replace(/\bsin\(/g, "\\sin(");
  latex = latex.replace(/\bcos\(/g, "\\cos(");
  latex = latex.replace(/\btan\(/g, "\\tan(");
  latex = latex.replace(/\blog\(/g, "\\log(");
  latex = latex.replace(/\bln\(/g, "\\ln(");

  // Convert channel references to subscripts
  latex = latex.replace(/([ad])(\d+)/g, "$1_{$2}");

  // Replace constants
  latex = latex.replace(/\bpi\b/gi, "\\pi");

  return latex;
}

/**
 * Render computed channels - one chart per channel (matching analog/digital pattern)
 * @param {Object} data - Parsed COMTRADE data with time array
 * @param {HTMLElement} chartsContainer - The container for charts
 * @param {Array} chartsComputed - Array to store chart instances (one per computed channel)
 * @param {Array} verticalLinesX - Array of vertical line X positions
 * @param {Object} channelState - Reactive state for channels
 */
export function renderComputedChannels(
  data,
  chartsContainer,
  chartsComputed,
  verticalLinesX,
  channelState
) {
  const renderStartTime = performance.now();
  console.log(
    `[renderComputedChannels] 🟪 Starting computed channels rendering...`
  );

  const computedChannels =
    data?.computedData && Array.isArray(data.computedData)
      ? data.computedData
      : [];

  if (computedChannels.length === 0) {
    console.log("[renderComputedChannels] ℹ️ No computed channels to render");
    return;
  }

  console.log(
    `[renderComputedChannels] 📊 Creating ${computedChannels.length} charts (one per channel)...`
  );

  // Get time array
  let timeArray = data.time;
  if (!Array.isArray(data.time) || data.time.length === 0) {
    console.log(`[renderComputedChannels] 🔍 Time array check:`, {
      dataTimeExists: !!data.time,
      dataTimeIsArray: Array.isArray(data.time),
      dataTimeLength: data.time?.length || 0,
    });

    if (
      data.time?.data &&
      Array.isArray(data.time.data) &&
      data.time.data.length > 0
    ) {
      console.log("[renderComputedChannels] Using data.time.data");
      timeArray = data.time.data;
    } else if (
      data.timeArray &&
      Array.isArray(data.timeArray) &&
      data.timeArray.length > 0
    ) {
      console.log("[renderComputedChannels] Using data.timeArray");
      timeArray = data.timeArray;
    } else {
      // Generate synthetic time array
      const firstChannelData = computedChannels[0]?.data || [];
      const sampleCount = firstChannelData.length || 62464;
      console.log(
        `[renderComputedChannels] ✅ Generating synthetic time array (${sampleCount} samples)`
      );
      timeArray = Array.from({ length: sampleCount }, (_, i) => i * 0.01);
    }
  }

  // Get global axis alignment for consistent Y-axes
  const maxYAxes = getMaxYAxes() || 1;

  // Define colors for channels
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

  // Create one chart per computed channel (matching analog/digital pattern)
  computedChannels.forEach((channel, channelIdx) => {
    const chartStartTime = performance.now();

    try {
      // Create single-channel data array [timeArray, channelData]
      const channelData = channel.data || [];
      const chartData = [timeArray, channelData];

      // Create drag bar for this channel
      const dragBar = createDragBar(
        { indices: [0], name: channel.id }, // Single channel
        {},
        channelState
      );

      // Create chart container for this computed channel
      const { parentDiv, chartDiv } = createChartContainer(
        dragBar,
        "chart-container",
        [channel.id], // Just this channel
        [colors[channelIdx % colors.length]],
        "Computed Channel",
        "", // groupId
        "computed" // type
      );
      chartsContainer.appendChild(parentDiv);

      console.log(
        `[renderComputedChannels] 🔧 Creating chart for "${channel.id}"...`
      );

      // Create chart options
      const opts = createChartOptions({
        title: channel.id,
        yLabels: [channel.id],
        lineColors: [colors[channelIdx % colors.length]],
        verticalLinesX,
        xLabel: data.xLabel || "Time",
        xUnit: data.xUnit || "s",
        getCharts: () => chartsComputed, // ✅ Reference chartsComputed
        yUnits: [channel.unit || ""],
        axesScales: [1, 1], // [time axis, value axis]
        singleYAxis: true,
        maxYAxes: 1, // One axis per chart
      });

      // Add vertical line plugin
      opts.plugins = opts.plugins || [];
      opts.plugins = opts.plugins.filter(
        (p) => !(p && p.id === "verticalLinePlugin")
      );
      opts.plugins.push(verticalLinePlugin(verticalLinesX, () => chartsComputed));

      // Create uPlot chart instance
      const chart = initUPlotChart(opts, chartData, chartDiv, chartsComputed);

      // Tag chart with metadata
      chart._computed = true;
      chart._computedId = channel.id;
      chart._type = "computed";
      chart._channelIndex = channelIdx;

      console.log(
        `[renderComputedChannels] ✅ Chart created for "${channel.id}"`
      );

      // Create tooltip
      const tooltip = createTooltip();

      // Mouse move handler
      const mousemoveHandler = (e) => {
        const idx = chart.posToIdx(e.offsetX);
        if (idx >= 0 && idx < chart.data[0].length) {
          const time = chart.data[0][idx];
          const value = chart.data[1][idx];
          const valueStr =
            value != null && value.toFixed ? value.toFixed(2) : String(value);
          updateTooltip(
            e.pageX,
            e.pageY,
            `<b>${channel.id}</b><br>t: ${time.toFixed(2)}<br>v: ${valueStr}`
          );
        }
      };

      // Attach listeners with cleanup
      attachListenerWithCleanup(
        chart.over,
        "mousemove",
        mousemoveHandler,
        chart
      );
      attachListenerWithCleanup(chart.over, "mouseleave", hideTooltip, chart);

      // Click handler for vertical lines
      const clickHandler = (e) => {
        if (!chart.scales || !chart.scales.x) return;

        const xVal = chart.posToVal(e.offsetX, "x");
        const currentLines = verticalLinesX.asArray?.() || verticalLinesX.value || [];

        // Check if clicking near existing line
        const xRange = chart.scales.x.max - chart.scales.x.min;
        const tolerance = xRange * 0.02;
        const existingIdx = currentLines.findIndex(
          (line) => Math.abs(line - xVal) < tolerance
        );

        if (existingIdx >= 0) {
          // Remove line
          verticalLinesX.value = currentLines.filter((_, i) => i !== existingIdx);
        } else {
          // Add new line
          verticalLinesX.value = [...currentLines, xVal];

          // Auto-trigger delta calculation
          setTimeout(async () => {
            try {
              const { getPolarChart, getCfg, getData, deltaWindow } = await import("../main.js");
              const polarChart = getPolarChart();
              const cfgData = getCfg();
              const dataObj = getData();

              if (polarChart && cfgData && dataObj) {
                const timeIndex = dataObj.time
                  ? dataObj.time.findIndex((t) => t >= xVal)
                  : 0;
                polarChart.updatePhasorAtTimeIndex(
                  cfgData,
                  dataObj,
                  Math.max(0, timeIndex)
                );
              }

              if (deltaWindow && verticalLinesX.value.length > 1) {
                deltaWindow.show();
              }
            } catch (e) {
              console.error(
                "[renderComputedChannels] Cannot update polar chart:",
                e.message
              );
            }

            // Redraw all charts
            chartsComputed.forEach((c) => {
              if (c && c.redraw) c.redraw();
            });
          }, 0);
        }
      };

      attachListenerWithCleanup(chart.over, "click", clickHandler, chart);

      // Add equation label if present
      if (channel.equation) {
        const labelDiv = parentDiv.querySelector(".chart-label");
        if (labelDiv) {
          const formulaMatch = channel.equation.match(/=\s*(.+)$/);
          const formulaOnly = formulaMatch
            ? formulaMatch[1].trim()
            : channel.equation;

          const eqDiv = document.createElement("div");
          eqDiv.style.cssText = `
            width: 100%;
            font-size: 10px;
            text-align: center;
            padding: 4px 2px;
            background: white;
            border-radius: 2px;
            border: 1px solid #ddd;
            overflow-x: auto;
            max-width: 280px;
          `;

          const latexEquation = formatEquationForLatex(formulaOnly);
          eqDiv.innerHTML = `$$${latexEquation}$$`;
          labelDiv.appendChild(eqDiv);

          // Render LaTeX
          setTimeout(() => {
            renderLatex(labelDiv).catch((err) => {
              console.warn("[renderComputedChannels] ⚠️ MathJax render failed:", err);
            });
          }, 200);
        }
      }

      const chartTime = performance.now() - chartStartTime;
      console.log(
        `[renderComputedChannels] ✓ Chart "${channel.id}" created in ${chartTime.toFixed(
          1
        )}ms`
      );
    } catch (error) {
      console.error(
        `[renderComputedChannels] ❌ Error creating chart for "${channel.id}":`,
        error
      );
    }
  });

  const renderEndTime = performance.now();
  const totalTime = renderEndTime - renderStartTime;
  console.log(
    `[renderComputedChannels] ✅ Render complete: ${computedChannels.length} charts created in ${totalTime.toFixed(
      1
    )}ms`
  );
}
