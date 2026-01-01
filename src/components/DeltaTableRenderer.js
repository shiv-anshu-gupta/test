/**
 * @file DeltaTableRenderer.js
 * @description DOM renderer for Delta Table
 * Uses createState subscriptions for automatic updates
 */

import { buildTableHTML } from "./DeltaTable.js";
import { crosshairColors } from "../utils/constants.js";

/**
 * Create Delta Table Renderer
 * @param {HTMLElement} containerElement - Container to render table into
 * @param {Object} verticalLinesXState - Reactive state from createState
 * @returns {Object} API with render() and destroy() methods
 */
export function createDeltaTableRenderer(
  containerElement,
  verticalLinesXState
) {
  let unsubscribe = null;
  let currentTableData = [];
  let currentVerticalLinesCount = 0;

  /**
   * Render table to DOM
   * @param {Object[]} tableData - Formatted table data
   * @param {number} verticalLinesCount - Number of vertical lines
   */
  function render(tableData, verticalLinesCount) {
    currentTableData = tableData;
    currentVerticalLinesCount = verticalLinesCount;

    // ✅ Debug: Log data being rendered
    console.log("[DeltaTableRenderer] render() called with:", {
      rowCount: tableData.length,
      linesCount: verticalLinesCount,
      firstRow: tableData[0],
    });

    // Extract time values from verticalLinesX state
    const verticalLineTimes = [];
    try {
      const linesArray = verticalLinesXState.asArray
        ? verticalLinesXState.asArray()
        : verticalLinesXState.value || [];
      linesArray.forEach((timeValue) => {
        if (typeof timeValue === "number") {
          verticalLineTimes.push(`${timeValue.toFixed(2)} μs`);
        }
      });
    } catch (e) {
      console.warn(
        "[DeltaTableRenderer] Could not extract time values:",
        e.message
      );
    }

    // Fallback to placeholders
    if (verticalLineTimes.length === 0) {
      for (let i = 0; i < verticalLinesCount; i++) {
        verticalLineTimes.push(`T${i + 1}`);
      }
    }

    // Build HTML
    const tableHTML = buildTableHTML(
      tableData,
      verticalLinesCount,
      verticalLineTimes,
      crosshairColors
    );

    // Render to DOM
    containerElement.innerHTML = tableHTML;

    console.log(
      `[DeltaTableRenderer] ✅ Rendered table with ${tableData.length} rows and ${verticalLinesCount} lines`
    );
  }

  /**
   * Subscribe to verticalLinesX state changes
   * Auto-re-renders table when lines are added/removed/moved
   */
  function subscribeToStateChanges() {
    if (
      verticalLinesXState &&
      typeof verticalLinesXState.subscribe === "function"
    ) {
      unsubscribe = verticalLinesXState.subscribe((change) => {
        console.log(
          "[DeltaTableRenderer] Vertical lines changed, re-rendering table"
        );
        // Re-render with current data (table structure changes when line count changes)
        if (currentTableData.length > 0) {
          render(currentTableData, currentVerticalLinesCount);
        }
      });
      console.log("[DeltaTableRenderer] Subscribed to verticalLinesX state");
    }
  }

  /**
   * Clean up subscriptions
   */
  function destroy() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    containerElement.innerHTML = "";
    console.log("[DeltaTableRenderer] Destroyed");
  }

  // Auto-subscribe on creation
  subscribeToStateChanges();

  return {
    render,
    destroy,
    get currentData() {
      return currentTableData;
    },
    get currentLinesCount() {
      return currentVerticalLinesCount;
    },
  };
}
