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
 * Reduces chart container width and applies margin to create space for sidebars
 * @param {string} position - 'left' or 'right'
 * @param {number} sidebarWidth - Width of sidebar in pixels (0 to close)
 */
export function adjustMainContent(position, sidebarWidth) {
  // Target the main element and charts container
  const main = document.querySelector("main");
  const chartsContainer = document.getElementById("charts");
  const contentWrapper = document.querySelector(".content-wrapper");

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

  // Calculate available width (viewport minus sidebars)
  const viewportWidth = window.innerWidth;
  const availableWidth = viewportWidth - leftSidebarWidth - rightSidebarWidth;

  // Apply margin to main element to create space for sidebars
  main.style.marginLeft = `${leftSidebarWidth}px`;
  main.style.marginRight = `${rightSidebarWidth}px`;
  console.log(
    `[adjustMainContent] Applied margins to main. Available width: ${availableWidth}px`
  );

  // ✅ KEY FIX: Set explicit width on charts container to prevent overlap
  if (chartsContainer) {
    chartsContainer.style.width = `${availableWidth}px`;
    chartsContainer.style.paddingLeft = "0";
    chartsContainer.style.paddingRight = "0";
  }

  // Also set width on content wrapper if it exists
  if (contentWrapper) {
    contentWrapper.style.width = `${availableWidth}px`;
  }

  // Resize charts after CSS transition completes
  setTimeout(() => {
    resizeAllCharts(availableWidth);
  }, 350); // Match CSS transition duration
}

// ✅ Export to window for onclick handlers
window.__sidebarResize.adjustMainContent = adjustMainContent;

/**
 * Resize all uPlot charts to fit available width
 * @param {number} availableWidth - Available width in pixels
 */
function resizeAllCharts(availableWidth) {
  // If no width provided, calculate it from main element
  if (!availableWidth) {
    const main = document.querySelector("main");
    const chartsContainer = document.getElementById("charts");

    if (main) {
      const mainRect = main.getBoundingClientRect();
      availableWidth = mainRect.width;
    } else if (chartsContainer) {
      availableWidth = chartsContainer.clientWidth;
    } else {
      availableWidth = window.innerWidth;
    }
  }

  console.log(`[resizeAllCharts] Resizing charts to ${availableWidth}px`);

  // Resize main analog/digital charts
  if (window.charts && Array.isArray(window.charts)) {
    window.charts.forEach((chart, idx) => {
      if (chart && typeof chart.setSize === "function") {
        const containerHeight = 300; // Default height

        chart.setSize({
          width: availableWidth,
          height: containerHeight,
        });
        console.log(
          `[resizeAllCharts] Chart ${idx}: ${availableWidth}px × ${containerHeight}px`
        );
      }
    });
  }

  // Resize computed channel charts
  if (window.__chartsComputed && Array.isArray(window.__chartsComputed)) {
    window.__chartsComputed.forEach((chart, idx) => {
      if (chart && typeof chart.setSize === "function") {
        const containerHeight = 300; // Default height

        chart.setSize({
          width: availableWidth,
          height: containerHeight,
        });
        console.log(
          `[resizeAllCharts] Computed chart ${idx}: ${availableWidth}px × ${containerHeight}px`
        );
      }
    });
  }

  console.log("[resizeAllCharts] ✅ All charts resized successfully");
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
