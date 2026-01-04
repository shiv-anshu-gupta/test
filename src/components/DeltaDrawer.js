/**
 * Delta Display Drawer Component
 * Shows detailed crosshair values in a slide-out drawer (sidebar)
 * Uses plain HTML table with createState subscriptions for auto-updates
 *
 * HTML structure is pre-built in index.html
 * This file only handles styling and behavior
 */

import { sidebarStore } from "../utils/sidebarStore.js";
import { adjustMainContent } from "../utils/sidebarResize.js";
import { crosshairColors } from "../utils/constants.js";
import { createDeltaTableRenderer } from "./DeltaTableRenderer.js";
import { formatTableData } from "./DeltaTableDataFormatter.js";
import { createSidebarResizer } from "./SidebarResizer.js";

export function createDeltaDrawer() {
  let isOpen = false;
  let sidebarWidth = 30; // Percentage width
  const minWidth = 15;
  const maxWidth = 70;
  let tableRenderer = null;
  let lastUpdateHash = null;

  function setupEventListeners() {
    const drawer = document.getElementById("delta-drawer");
    if (!drawer) {
      console.warn("[DeltaDrawer] Delta drawer element not found in DOM");
      return;
    }
  }

  const api = {
    show: () => {
      console.log("[DeltaDrawer] show() called");

      const drawer = document.getElementById("delta-drawer");
      const mainContent = document.getElementById("mainContent");
      const divider = document.getElementById("resizeDivider");

      if (!drawer) {
        console.error("[DeltaDrawer] ❌ Delta drawer element not found in DOM");
        return;
      }

      isOpen = true;

      // Show drawer by setting width
      drawer.classList.remove("hidden");
      drawer.style.width = sidebarWidth + "%";
      mainContent.style.width = 100 - sidebarWidth + "%";
      divider.classList.remove("hidden");

      setupEventListeners();
      console.log("[DeltaDrawer] ✅ Drawer shown");
    },

    hide: () => {
      console.log("[DeltaDrawer] hide() called");
      const drawer = document.getElementById("delta-drawer");
      const mainContent = document.getElementById("mainContent");
      const divider = document.getElementById("resizeDivider");

      if (!drawer) {
        console.warn("[DeltaDrawer] Drawer not found in DOM");
        isOpen = false;
        return;
      }

      isOpen = false;

      // Hide drawer by setting width to 0
      drawer.style.width = "0px";
      mainContent.style.width = "100%";
      divider.classList.add("hidden");

      // Add delay before adding hidden class to allow animation
      setTimeout(() => {
        drawer.classList.add("hidden");
      }, 300);

      console.log("[DeltaDrawer] ✅ Drawer hidden");
    },

    update: async (deltaData = [], verticalLinesCount = 0) => {
      // ✅ Generate hash of current data to prevent duplicate renders
      const currentHash = JSON.stringify({ deltaData, verticalLinesCount });

      // ✅ Skip if data hasn't changed
      if (currentHash === lastUpdateHash) {
        console.log(
          "[DeltaDrawer] ⏭️ Skipping duplicate update (data unchanged)"
        );
        return;
      }

      lastUpdateHash = currentHash;

      console.log(
        "[DeltaDrawer] update() called with",
        deltaData.length,
        "sections and",
        verticalLinesCount,
        "vertical lines"
      );

      const content = document.getElementById("delta-drawer-content");
      if (!content) {
        console.error("[DeltaDrawer] Content element not found");
        return;
      }

      // Destroy old renderer
      if (tableRenderer) {
        tableRenderer.destroy();
        tableRenderer = null;
      }

      // Show empty state if insufficient data
      if (!deltaData || deltaData.length === 0 || verticalLinesCount < 2) {
        const message =
          verticalLinesCount < 1
            ? "Add vertical lines using <strong>Alt + 1</strong> on the chart to see delta values"
            : "Add another vertical line using <strong>Alt + 1</strong> to see delta values between them";

        content.innerHTML = `
          <div class="delta-empty-state">
            <div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">
              ${message}
            </div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
              💡 Place markers on the chart to measure values and differences
            </div>
          </div>
        `;
        return;
      }

      // Completely clear content
      content.innerHTML = "";
      console.log(
        "[DeltaDrawer] ✨ Content cleared, creating single table container"
      );

      // Create table container
      const tableContainer = document.createElement("div");
      tableContainer.className = "delta-table-container";
      tableContainer.id = "delta-table-main";
      content.appendChild(tableContainer);
      console.log(
        "[DeltaDrawer] ✅ Table container appended to content (ONCE)"
      );

      // ✅ EXTRACT: Time values BEFORE creating renderer
      let verticalLineTimes = [];

      try {
        const mainModule = await import("../main.js");
        const verticalLinesXState = mainModule.verticalLinesX;

        if (verticalLinesXState && typeof verticalLinesXState === "object") {
          let linesArray = verticalLinesXState.value || [];

          if (
            (!Array.isArray(linesArray) || linesArray.length === 0) &&
            typeof verticalLinesXState.asArray === "function"
          ) {
            linesArray = verticalLinesXState.asArray();
          }

          if (!Array.isArray(linesArray)) {
            linesArray = Array.isArray(verticalLinesXState)
              ? verticalLinesXState
              : [];
          }

          if (Array.isArray(linesArray) && linesArray.length > 0) {
            linesArray.forEach((timeValue) => {
              if (typeof timeValue === "number") {
                verticalLineTimes.push(`${timeValue.toFixed(2)} μs`);
              }
            });
            console.log("[DeltaDrawer] ✅ Got time values:", verticalLineTimes);
          }
        }
      } catch (error) {
        console.warn(
          "[DeltaDrawer] Could not extract time values:",
          error.message
        );
      }

      // Fallback to placeholders if no time values
      if (verticalLineTimes.length === 0) {
        console.warn("[DeltaDrawer] ⚠️ Using placeholder time values");
        for (let i = 0; i < verticalLinesCount; i++) {
          verticalLineTimes.push(`T${i + 1}`);
        }
      }

      // Format data with time values
      const tableData = formatTableData(
        deltaData,
        verticalLinesCount,
        verticalLineTimes
      );

      if (tableData.length === 0) {
        console.warn("[DeltaDrawer] No valid table data");
        tableContainer.innerHTML =
          '<p style="padding: 16px; color: #9ca3af; text-align: center;">No data available</p>';
        return;
      }

      // Get verticalLinesX state for subscription
      try {
        const mainModule = await import("../main.js");
        const verticalLinesXState = mainModule.verticalLinesX;

        // Create renderer and subscribe to state changes
        tableRenderer = createDeltaTableRenderer(
          tableContainer,
          verticalLinesXState
        );
        tableRenderer.render(tableData, verticalLinesCount);

        console.log(
          `[DeltaDrawer] ✅ Table rendered with ${tableData.length} rows (including time row) and ${verticalLinesCount} columns`
        );
      } catch (error) {
        console.error("[DeltaDrawer] ❌ Failed to create table:", error);
        tableContainer.innerHTML =
          '<p style="padding: 16px; color: #dc2626;">Error creating table</p>';
      }
    },

    isOpen: () => {
      const drawer = document.getElementById("delta-drawer");
      return drawer ? !drawer.classList.contains("hidden") : isOpen;
    },

    toggle: () => {
      if (api.isOpen()) {
        api.hide();
      } else {
        api.show();
      }
    },

    /**
     * Initialize drawer - setup event listeners and resizer
     * Call this when DOM is ready
     */
    init: () => {
      setupEventListeners();
      createSidebarResizer("delta-drawer-panel", "left");
      console.log("[DeltaDrawer] ✅ Initialized with resizable functionality");
    },
  };

  /**
   * Register this drawer with the global sidebar store
   * Ensures only one sidebar is visible at a time
   */
  api.registerWithStore = () => {
    sidebarStore.register("delta-drawer", {
      show: api.show,
      hide: api.hide,
      isOpen: api.isOpen,
      isClosedByDefault: true,
    });
    console.log("[DeltaDrawer] Registered with sidebar store");
  };

  /**
   * Unregister this drawer from the global sidebar store
   */
  api.unregisterFromStore = () => {
    sidebarStore.unregister("delta-drawer");
    console.log("[DeltaDrawer] Unregistered from sidebar store");
  };

  return api;
}
