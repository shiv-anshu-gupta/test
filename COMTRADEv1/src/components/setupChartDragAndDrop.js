// src/components/setupChartDragAndDrop.js
/**
 * Setup drag-and-drop reordering for chart containers.
 * @param {HTMLElement} chartGrid - The container element holding chart-parent-containers.
 */
export function setupChartDragAndDrop(chartGrid) {
  let dragged = null;
  chartGrid.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("dragBar")) {
      dragged = e.target.closest(".chart-parent-container");
      dragged.classList.add("dragging");
      e.dataTransfer.setDragImage(dragged, 20, 20);
    } else {
      dragged = null;
      e.preventDefault();
    }
  });
  chartGrid.addEventListener("dragend", () => {
    if (dragged) dragged.classList.remove("dragging");
    dragged = null;
  });
  chartGrid.addEventListener("dragover", (e) => e.preventDefault());
  chartGrid.addEventListener("drop", (e) => {
    e.preventDefault();
    const target = e.target.closest(".chart-parent-container");
    if (target && target !== dragged) {
      target.before(dragged);
    }
  });
}
