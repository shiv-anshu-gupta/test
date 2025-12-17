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
  charts.length = 0; // <-- Clear the array at the start!
  chartsContainer.innerHTML = "";
  //destroyCharts(charts);
  setupChartDragAndDrop(chartsContainer);
  renderAnalogCharts(
    cfg,
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState,
    autoGroupChannels
  );
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

  // Render computed channels if any exist
  renderComputedChannels(
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState
  );

  console.log("Charts rendered:", charts.length);
  if (charts.length > 0) {
    // Call calculateDeltas with new signature for each chart
    // Collect all delta data from all charts and show in a single window
    console.log(
      "[renderComtradeCharts] Calling calculateDeltas for all charts:",
      {
        totalCharts: charts.length,
        verticalLines: Array.isArray(verticalLinesX)
          ? verticalLinesX.length
          : 0,
      }
    );

    // Use IIFE to handle async operations without making this function async
    (async () => {
      try {
        const { collectChartDeltas } = await import(
          "../utils/calculateDeltas.js"
        );
        const allDeltaData = [];

        for (const chart of charts) {
          console.log(`[renderComtradeCharts] Processing chart:`, {
            hasData: !!chart && !!chart.data,
            seriesCount: chart && chart.data ? chart.data.length - 1 : 0,
          });
          // Collect deltas from this chart (without updating UI yet)
          const chartDeltas = collectChartDeltas(
            verticalLinesX,
            chart,
            TIME_UNIT
          );
          if (chartDeltas.length > 0) {
            allDeltaData.push(...chartDeltas);
            console.log(
              `[renderComtradeCharts] Collected ${chartDeltas.length} delta sections from chart`
            );
          }
        }

        // Now update delta window with ALL collected data
        if (allDeltaData.length > 0) {
          try {
            const { deltaWindow } = await import("../main.js");
            if (deltaWindow) {
              console.log(
                "[renderComtradeCharts] Updating deltaWindow with combined data:",
                {
                  sections: allDeltaData.length,
                  totalSeries: allDeltaData.reduce(
                    (sum, s) => sum + s.series.length,
                    0
                  ),
                }
              );
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
  // Do NOT clear charts here!
}
