// chartDomUtils.js
// Small abstractions for chart container and uPlot chart setup
import { createCustomElement } from "./helpers.js";
import { fixChartAxisColors } from "../components/chartComponent.js";

/**
 * Creates a chart parent container with a label, drag bar, and chart div.
 * @param {HTMLElement} dragBar - The drag bar element.
 * @param {string} chartContainerClass - The class for the chart container div.
 * @param {string|Array} label - Optional label to display on left side (string or array of channel names).
 * @param {Array} colors - Optional array of colors for each channel.
 * @param {string} typeLabel - Optional channel type label (e.g., "Analog Channels", "Digital Channels").
 * @param {string} groupId - Optional group ID to display once below type label (e.g., "G0", "G1"). Shows at group level, not per-channel.
 * @returns {{ parentDiv: HTMLElement, chartDiv: HTMLElement }}
 */
export function createChartContainer(
  dragBar,
  chartContainerClass = "chart-container",
  label = "",
  colors = [],
  typeLabel = "",
  groupId = ""
) {
  const parentDiv = createCustomElement("div", "chart-parent-container");

  // Add label on left side if provided
  if (label) {
    const labelDiv = createCustomElement("div", "chart-label");

    // If label is an array of channel names, display them vertically with colors
    if (Array.isArray(label)) {
      labelDiv.style.display = "flex";
      labelDiv.style.flexDirection = "column";
      labelDiv.style.alignItems = "center";
      labelDiv.style.justifyContent = "flex-start";
      labelDiv.style.gap = "12px";
      labelDiv.style.padding = "8px 4px";
      labelDiv.style.overflow = "auto";

      // Add type label at the top if provided
      if (typeLabel) {
        const typeSpan = document.createElement("span");
        typeSpan.textContent = typeLabel;
        typeSpan.style.fontSize = "0.7rem";
        typeSpan.style.fontWeight = "700";
        typeSpan.style.color = "var(--accent-cyan)";
        typeSpan.style.textAlign = "center";
        typeSpan.style.textTransform = "uppercase";
        typeSpan.style.letterSpacing = "0.05em";
        typeSpan.style.paddingBottom = "4px";
        typeSpan.style.width = "100%";
        labelDiv.appendChild(typeSpan);

        // NEW: Display group ID once below type label (if provided)
        // This shows the group assignment for all channels in this chart
        if (groupId) {
          const groupIdSpan = document.createElement("span");
          groupIdSpan.textContent = groupId;
          groupIdSpan.style.fontSize = "0.65rem";
          groupIdSpan.style.fontWeight = "700";
          groupIdSpan.style.color = "var(--accent-cyan)";
          groupIdSpan.style.textAlign = "center";
          groupIdSpan.style.paddingTop = "2px";
          groupIdSpan.style.paddingBottom = "4px";
          groupIdSpan.style.borderBottom = "1px solid var(--border-color)";
          groupIdSpan.style.width = "100%";
          labelDiv.appendChild(groupIdSpan);
        } else {
          // No group ID - just add border below type label
          typeSpan.style.borderBottom = "1px solid var(--border-color)";
        }
      }

      // Add channel names with color indicators
      label.forEach((channelName, idx) => {
        const channelContainer = document.createElement("div");
        channelContainer.style.display = "flex";
        channelContainer.style.flexDirection = "column";
        channelContainer.style.alignItems = "center";
        channelContainer.style.gap = "2px";
        channelContainer.style.width = "100%";

        // Color indicator dot
        const colorDot = document.createElement("span");
        colorDot.style.width = "10px";
        colorDot.style.height = "10px";
        colorDot.style.borderRadius = "50%";
        colorDot.style.background = (colors && colors[idx]) || "#888";
        colorDot.style.border = "1px solid var(--border-color)";
        channelContainer.appendChild(colorDot);

        // Channel name
        const nameSpan = document.createElement("span");
        nameSpan.textContent = channelName;
        nameSpan.style.fontSize = "0.7rem";
        nameSpan.style.fontWeight = "500";
        nameSpan.style.color = "var(--text-secondary)";
        nameSpan.style.textAlign = "center";
        nameSpan.style.wordBreak = "break-word";
        nameSpan.style.lineHeight = "1.1";
        channelContainer.appendChild(nameSpan);

        labelDiv.appendChild(channelContainer);
      });
    } else {
      // If label is a string, display normally
      labelDiv.textContent = label;
    }

    parentDiv.appendChild(labelDiv);
  }

  parentDiv.appendChild(dragBar);
  const chartDiv = createCustomElement("div", chartContainerClass);
  parentDiv.appendChild(chartDiv);
  return { parentDiv, chartDiv };
}

/**
 * Creates a simple container for holding analysis sidebar/phasor diagram
 * @param {string} containerClass - The class for the container div.
 * @returns {HTMLElement}
 */
export function createSimpleContainer(containerClass = "analysis-container") {
  const container = createCustomElement("div", containerClass);
  return container;
}

/**
 * Initializes a uPlot chart, sets series colors, adds to array, and attaches ResizeObserver.
 * @param {Object} opts
 * @param {Array} chartData
 * @param {HTMLElement} chartDiv
 * @param {Array} charts
 * @returns {uPlot}
 */
export function initUPlotChart(opts, chartData, chartDiv, charts) {
  const chart = new uPlot(opts, chartData, chartDiv);
  chart._seriesColors = opts.series.slice(1).map((s) => s.stroke);
  charts.push(chart);
  // Fix axis text colors for dark theme - call twice with delay to ensure it works
  fixChartAxisColors(chartDiv);
  setTimeout(() => fixChartAxisColors(chartDiv), 100);
  const ro = new ResizeObserver((entries) => {
    for (let entry of entries) {
      chart.setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
      // Fix colors again after resize
      setTimeout(() => fixChartAxisColors(chartDiv), 50);
    }
  });
  ro.observe(chartDiv);
  return chart;
}
