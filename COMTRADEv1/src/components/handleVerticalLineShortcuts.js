// src/components/handleVerticalLineShortcuts.js
/**
 * Handle keyboard shortcuts for vertical line management on charts.
 * @param {KeyboardEvent} e - The keyboard event.
 * @param {Array} charts - Array of uPlot chart instances.
 * @param {Array} verticalLinesX - Array of vertical line X positions.
 * @param {HTMLElement} fixedResultsEl - Element to display results/errors.
 * @param {string} TIME_UNIT - Time unit string.
 * @param {Function} calculateDeltas - Function to calculate deltas.
 */
export function handleVerticalLineShortcuts(e, charts, verticalLinesX, fixedResultsEl, TIME_UNIT, calculateDeltas) {
  if (e.altKey && e.key === "0") {
    verticalLinesX.length = 0;
    charts.forEach((c) => c.redraw());
    fixedResultsEl.innerHTML = "";
  }
  if (e.altKey && e.key === "1") {
    if (charts.length === 0) return;
    const cursorX = charts[0].cursor.left;
    const xVal = charts[0].posToVal(cursorX, "x");
    verticalLinesX.push(xVal);
    charts.forEach((c) => c.redraw());
    calculateDeltas(
      charts,
      verticalLinesX,
      charts[0].data[0],
      charts.map((c) => c.data[1]),
      TIME_UNIT
    );
  }
  if (e.altKey && e.key === "2") {
    if (verticalLinesX.length > 0) {
      verticalLinesX;
      charts.forEach((c) => c.redraw());
      calculateDeltas(
        charts,
        verticalLinesX,
        charts[0].data[0],
        charts.map((c) => c.data[1]),
        TIME_UNIT
      );
    } else {
      console.warn("No vertical lines to remove.");
    }
  }
}
