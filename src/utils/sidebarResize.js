/**
 * Simple sidebar resize utility
 * Adjusts whole application when sidebars open/close
 */

// Make adjustMainContent globally available for onclick handlers
window.__sidebarResize = window.__sidebarResize || {};

// Track current sidebar widths
let leftSidebarWidth = 0;
let rightSidebarWidth = 0;

/**
 * Adjust entire application layout when sidebar opens/closes
 * Applies padding to content wrapper to create space for sidebars (not margins to avoid doubling)
 * @param {string} position - 'left' or 'right'
 * @param {number} sidebarWidth - Width of sidebar in pixels (0 to close)
 */
export function adjustMainContent(position, sidebarWidth) {
  // Target the content wrapper and charts container
  const contentWrapper =
    document.querySelector(".content-wrapper") ||
    document.getElementById("main-content");
  const chartsContainer = document.getElementById("charts");

  if (!contentWrapper) {
    console.warn("[adjustMainContent] Content wrapper element not found");
    return;
  }

  // Update tracked widths
  if (position === "left") {
    leftSidebarWidth = sidebarWidth;
  } else if (position === "right") {
    rightSidebarWidth = sidebarWidth;
  }

  console.log(
    `[adjustMainContent] Position: ${position}, Left: ${leftSidebarWidth}px, Right: ${rightSidebarWidth}px`
  );

  // Apply padding to content wrapper to create space (not margin to avoid doubling with body margin)
  contentWrapper.style.paddingLeft = `${leftSidebarWidth}px`;
  contentWrapper.style.paddingRight = `${rightSidebarWidth}px`;
  console.log("[adjustMainContent] Applied padding to content wrapper");

  // Apply padding to charts container as well
  if (chartsContainer) {
    chartsContainer.style.paddingLeft = `${leftSidebarWidth}px`;
    chartsContainer.style.paddingRight = `${rightSidebarWidth}px`;
  }

  // Resize charts after CSS transition completes
  setTimeout(() => {
    resizeAllCharts();
  }, 350); // Match CSS transition duration
}

// ✅ Export to window for onclick handlers
window.__sidebarResize.adjustMainContent = adjustMainContent;

/**
 * Resize all uPlot charts to fit new container size
 */
function resizeAllCharts() {
  // Resize main analog/digital charts
  if (window.charts && Array.isArray(window.charts)) {
    window.charts.forEach((chart) => {
      if (chart && typeof chart.setSize === "function") {
        const container = chart.root?.parentElement;
        if (container) {
          chart.setSize({
            width: container.clientWidth,
            height: container.clientHeight,
          });
        }
      }
    });
  }

  // Resize computed channel charts
  if (window.__chartsComputed && Array.isArray(window.__chartsComputed)) {
    window.__chartsComputed.forEach((chart) => {
      if (chart && typeof chart.setSize === "function") {
        const container = chart.root?.parentElement;
        if (container) {
          chart.setSize({
            width: container.clientWidth,
            height: container.clientHeight,
          });
        }
      }
    });
  }

  console.log("[adjustMainContent] ✅ Charts resized");
}

/**
 * Get actual width of an element
 * @param {string} elementId - Element ID
 * @returns {number} Width in pixels
 */
export function getElementWidth(elementId) {
  const el = document.getElementById(elementId);
  return el ? el.offsetWidth : 0;
}
