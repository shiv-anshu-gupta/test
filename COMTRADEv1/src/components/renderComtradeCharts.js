// src/components/renderComtradeCharts.js
import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { setupChartDragAndDrop } from "./setupChartDragAndDrop.js";
import { renderAnalogCharts } from "./renderAnalogCharts.js";
import { renderDigitalCharts } from "./renderDigitalCharts.js";
import { destroyCharts } from "../utils/chartUtils.js";
import { autoGroupChannels } from "../utils/autoGroupChannels.js";
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { unwrap, createState} from "./createState.js";

/**
 * Render COMTRADE charts in the container.
 * @param {Object} cfg - COMTRADE config object.
 * @param {Object} data - Parsed COMTRADE data.
 * @param {HTMLElement} chartsContainer - The container for charts.
 * @param {Array} charts - Array to store chart instances.
 * @param {Array} verticalLinesX - Array of vertical line X positions.
 * @param {Function} createState - State creation utility.
 * @param {Function} calculateDeltas - Function to calculate deltas.
 * @param {string} TIME_UNIT - Time unit string.
 */
export function renderComtradeCharts(cfg, data, chartsContainer, charts, verticalLinesX, createState, calculateDeltas, TIME_UNIT, channelState) {
  charts.length = 0; // <-- Clear the array at the start!
  chartsContainer.innerHTML = "";
  //destroyCharts(charts);
  setupChartDragAndDrop(chartsContainer);
  renderAnalogCharts(cfg, data, chartsContainer, charts, verticalLinesX, channelState, autoGroupChannels);
  if (cfg.digitalChannels && cfg.digitalChannels.length > 0 && data.digitalData && data.digitalData.length > 0) {
    renderDigitalCharts(cfg, data, chartsContainer, charts, verticalLinesX, channelState);
  }
  console.log("Charts rendered:", charts.length);
  if (charts.length > 0) {
    calculateDeltas(
      charts,
      verticalLinesX,
      charts[0].data[0],
      charts.map((c) => c.data[1])
    );
  }
  // Do NOT clear charts here!
}
