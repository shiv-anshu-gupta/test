// src/components/renderComtradeCharts.js
import { createChartOptions, fixChartAxisColors } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { setupChartDragAndDrop } from "./setupChartDragAndDrop.js";
import { renderAnalogCharts } from "./renderAnalogCharts.js";
import { renderDigitalCharts } from "./renderDigitalCharts.js";
import { renderComputedChannels } from "./renderComputedChannels.js";
import { destroyCharts } from "../utils/chartUtils.js";
import { autoGroupChannels } from "../utils/autoGroupChannels.js";
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { unwrap, createState } from "./createState.js";

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
export function renderComtradeCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  createState,
  calculateDeltas,
  TIME_UNIT,
  channelState
) {
  const renderStartTime = performance.now();

  charts.length = 0; // <-- Clear the array at the start!
  chartsContainer.innerHTML = "";
  //destroyCharts(charts);
  setupChartDragAndDrop(chartsContainer);

  console.log("[renderComtradeCharts] Starting chart rendering...");

  // Phase 1: Render analog charts
  renderAnalogCharts(
    cfg,
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState,
    autoGroupChannels
  );

  // Phase 2: Render digital charts
  if (
    cfg.digitalChannels &&
    cfg.digitalChannels.length > 0 &&
    data.digitalData &&
    data.digitalData.length > 0
  ) {
    renderDigitalCharts(
      cfg,
      data,
      chartsContainer,
      charts,
      verticalLinesX,
      channelState
    );
  }

  // Phase 3: Render computed channels
  renderComputedChannels(
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState
  );

  const renderEndTime = performance.now();
  const totalTime = renderEndTime - renderStartTime;
  console.log(
    `[renderComtradeCharts] ✅ All ${
      charts.length
    } charts rendered in ${totalTime.toFixed(1)}ms`
  );

  if (charts.length > 0) {
    // Process deltas
    console.log(
      "[renderComtradeCharts] Processing deltas for",
      charts.length,
      "charts"
    );

    (async () => {
      try {
        const { collectChartDeltas } = await import(
          "../utils/calculateDeltas.js"
        );
        const allDeltaData = [];

        for (const chart of charts) {
          const chartDeltas = collectChartDeltas(
            verticalLinesX,
            chart,
            TIME_UNIT
          );
          if (chartDeltas.length > 0) {
            allDeltaData.push(...chartDeltas);
          }
        }

        if (allDeltaData.length > 0) {
          try {
            const { deltaWindow } = await import("../main.js");
            if (deltaWindow) {
              deltaWindow.update(allDeltaData);
            }
          } catch (e) {
            console.warn(
              "[renderComtradeCharts] Failed to update deltaWindow:",
              e.message
            );
          }
        }
      } catch (e) {
        console.error(
          "[renderComtradeCharts] Error processing deltas:",
          e.message
        );
      }
    })();
  }
}
