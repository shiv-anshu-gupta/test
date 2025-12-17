// src/components/renderComputedChannels.js
import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
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
import { createComputedChannelsLabels } from "./ComputedChannelsLabel.js";

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
 * Render computed channels as a new chart group.
 * @param {Object} data - Parsed COMTRADE data with time array
 * @param {HTMLElement} chartsContainer - The container for charts
 * @param {Array} charts - Array to store chart instances
 * @param {Array} verticalLinesX - Array of vertical line X positions
 * @param {Object} channelState - Reactive state for channels
 */
export function renderComputedChannels(
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState
) {
  const computedChannels =
    data?.computedData && Array.isArray(data.computedData)
      ? data.computedData
      : [];

  if (computedChannels.length === 0) {
    return;
  }

  const groupYLabels = computedChannels.map((ch) => ch.id || "Computed");
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
  const groupLineColors = computedChannels.map(
    (_, idx) => colors[idx % colors.length]
  );
  const groupYUnits = computedChannels.map(() => "");

  const dragBar = createDragBar(
    { indices: [], name: "Computed Channels" },
    {},
    channelState
  );

  const { parentDiv, chartDiv } = createChartContainer(
    dragBar,
    "chart-container",
    groupYLabels,
    groupLineColors,
    "Computed Channels"
  );
  parentDiv.setAttribute("data-chart-type", "computed");
  chartsContainer.appendChild(parentDiv);

  // 📊 Replace the default chart-label with our computed channels labels showing equations
  const defaultLabelDiv = parentDiv.querySelector(".chart-label");
  if (defaultLabelDiv && computedChannels.length > 0) {
    // Clear default labels
    defaultLabelDiv.innerHTML = "";

    // Add type label
    const typeSpan = document.createElement("span");
    typeSpan.textContent = "Computed Channels";
    typeSpan.style.cssText = `
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent-cyan);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-color);
      width: 100%;
    `;
    defaultLabelDiv.appendChild(typeSpan);

    // Add channel labels with equations
    computedChannels.forEach((channel) => {
      const channelContainer = document.createElement("div");
      channelContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 100%;
        padding: 6px 4px;
        border: 1px solid #e0e0e0;
        border-radius: 3px;
        background: #f9f9f9;
      `;

      // Channel name with color dot
      const nameContainer = document.createElement("div");
      nameContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 100%;
      `;

      // Color dot
      const colorDot = document.createElement("span");
      colorDot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${channel.color || "#999"};
        border: 1px solid var(--border-color);
      `;
      nameContainer.appendChild(colorDot);

      // Channel name
      const nameSpan = document.createElement("span");
      nameSpan.textContent = channel.name || channel.id;
      nameSpan.style.cssText = `
        font-size: 0.7rem;
        font-weight: 500;
        color: var(--text-secondary);
        text-align: center;
        word-break: break-word;
        line-height: 1.1;
      `;
      nameContainer.appendChild(nameSpan);
      channelContainer.appendChild(nameContainer);

      // LaTeX equation
      if (channel.equation) {
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

        const latexEquation = formatEquationForLatex(channel.equation);
        eqDiv.innerHTML = `$$${latexEquation}$$`;
        channelContainer.appendChild(eqDiv);
      }

      defaultLabelDiv.appendChild(channelContainer);
    });

    // Trigger MathJax rendering
    setTimeout(() => {
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise([defaultLabelDiv]).catch(() => {});
      }
    }, 100);
  }

  // ✅ OPTIMIZATION: Data already scaled during save, no runtime scaling needed
  const channelDataArrays = computedChannels.map((ch) => {
    if (!ch.data || !Array.isArray(ch.data)) {
      return [];
    }
    return ch.data;
  });

  let timeArray = data.time;
  if (!Array.isArray(data.time)) {
    if (data.time?.data && Array.isArray(data.time.data)) {
      timeArray = data.time.data;
    } else if (data.timeArray && Array.isArray(data.timeArray)) {
      timeArray = data.timeArray;
    } else {
      console.error("[renderComputedChannels] Time array not found");
      return;
    }
  }

  const chartData = [timeArray, ...channelDataArrays];

  const opts = createChartOptions({
    title: "Computed Channels",
    yLabels: groupYLabels,
    lineColors: groupLineColors,
    verticalLinesX,
    xLabel: data.xLabel || "Time",
    xUnit: data.xUnit || "s",
    getCharts: () => charts,
    yUnits: groupYUnits,
    axesScales: [1, ...computedChannels.map(() => 1)],
    singleYAxis: true,
  });

  opts.plugins = opts.plugins || [];
  opts.plugins = opts.plugins.filter(
    (p) => !(p && p.id === "verticalLinePlugin")
  );
  opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));
  // opts.plugins.push(deltaBoxPlugin()); // DISABLED: Using DeltaWindow popup instead

  const chart = initUPlotChart(opts, chartData, chartDiv, charts);

  chart._computed = true;
  chart._computedIds = computedChannels.map((ch) => ch.id);
  chart._type = "computed";

  const tooltip = createTooltip();
  chart.over.addEventListener("mousemove", (e) => {
    const idx = chart.posToIdx(e.offsetX);
    if (idx >= 0 && idx < chart.data[0].length) {
      const time = chart.data[0][idx];
      const values = chart.data
        .slice(1)
        .map((series, i) => {
          const label =
            chart.series?.[i + 1]?.label ||
            groupYLabels[i] ||
            `Computed${i + 1}`;
          const stroke = chart.series?.[i + 1]?.stroke || groupLineColors[i];
          const val = series[idx] != null ? series[idx].toFixed(2) : "N/A";
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
          const { getPolarChart, getCfg, getData } = await import("../main.js");
          const polarChart = getPolarChart();
          const cfgData = getCfg();
          const dataObj = getData();

          if (polarChart && cfgData && dataObj) {
            console.log(
              "[renderComputedChannels] Updating polar chart for new vertical line at:",
              xVal
            );
            // Find nearest time index for this vertical line position
            const timeIndex = dataObj.time
              ? dataObj.time.findIndex((t) => t >= xVal)
              : 0;
            console.log(
              "[renderComputedChannels] Calculated timeIndex:",
              timeIndex
            );
            polarChart.updatePhasorAtTimeIndex(
              cfgData,
              dataObj,
              Math.max(0, timeIndex)
            );
          } else {
            console.warn(
              "[renderComputedChannels] Missing polarChart, cfg, or data:",
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
            "[renderComputedChannels] Cannot update polar chart or deltaWindow:",
            e.message
          );
          console.error(e);
        }
        charts.forEach((c) => c.redraw());
      }, 0);
    }
  });
}
