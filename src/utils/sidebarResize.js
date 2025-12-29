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
 * Applies margin to main content area to create space for sidebars
 * Charts are resized to fit the available space after transition
 * @param {string} position - 'left' or 'right'
 * @param {number} sidebarWidth - Width of sidebar in pixels (0 to close)
 */
export function adjustMainContent(position, sidebarWidth) {
  // Target the main element (parent of everything)
  const main = document.querySelector("main");
  const chartsContainer = document.getElementById("charts");

  if (!main) {
    console.warn("[adjustMainContent] Main element not found");
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

  // Apply margin to main element to create space for sidebars
  main.style.marginLeft = `${leftSidebarWidth}px`;
  main.style.marginRight = `${rightSidebarWidth}px`;
  console.log("[adjustMainContent] Applied margins to main element");

  // Remove any padding from charts container (it should be content wrapper's job)
  if (chartsContainer) {
    chartsContainer.style.paddingLeft = "0";
    chartsContainer.style.paddingRight = "0";
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
 * Calculates actual available width and height
 */
function resizeAllCharts() {
  // Get the actual available width from viewport minus margins
  const viewportWidth = window.innerWidth;
  const main = document.querySelector("main");
  
  let availableWidth = viewportWidth;
  
  if (main) {
    const mainRect = main.getBoundingClientRect();
    availableWidth = mainRect.width;
    console.log(`[resizeAllCharts] Main width: ${availableWidth}px, Viewport: ${viewportWidth}px`);
  }

  // Resize main analog/digital charts
  if (window.charts && Array.isArray(window.charts)) {
    window.charts.forEach((chart, idx) => {
      if (chart && typeof chart.setSize === "function") {
        const container = chart.root?.parentElement;
        if (container) {
          // Use the container's actual width, but ensure it's within available space
          const containerWidth = Math.min(
            container.clientWidth,
            availableWidth
          );
          const containerHeight = container.clientHeight || 300;
          
          chart.setSize({
            width: containerWidth,
            height: containerHeight,
          });
          console.log(
            `[resizeAllCharts] Chart ${idx}: ${containerWidth}px × ${containerHeight}px`
          );
        }
      }
    });
  }

  // Resize computed channel charts
  if (window.__chartsComputed && Array.isArray(window.__chartsComputed)) {
    window.__chartsComputed.forEach((chart, idx) => {
      if (chart && typeof chart.setSize === "function") {
        const container = chart.root?.parentElement;
        if (container) {
          const containerWidth = Math.min(
            container.clientWidth,
            availableWidth
          );
          const containerHeight = container.clientHeight || 300;
          
          chart.setSize({
            width: containerWidth,
            height: containerHeight,
          });
          console.log(
            `[resizeAllCharts] Computed chart ${idx}: ${containerWidth}px × ${containerHeight}px`
          );
        }
      }
    });
  }

  console.log("[resizeAllCharts] ✅ All charts resized");
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
