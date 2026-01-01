/**
 * Delta Display Drawer Component
 * Shows detailed crosshair values in a slide-out drawer (sidebar)
 * Uses plain HTML table with createState subscriptions for auto-updates
 */

import { sidebarStore } from "../utils/sidebarStore.js";
import { adjustMainContent } from "../utils/sidebarResize.js";
import { crosshairColors } from "../utils/constants.js";
import { createDeltaTableRenderer } from "./DeltaTableRenderer.js";
import { formatTableData } from "./DeltaTableDataFormatter.js";

export function createDeltaDrawer() {
  let isOpen = false;
  let tableRenderer = null; // Replace tabulatorInstances with single renderer
  let lastUpdateHash = null; // Track last update to prevent duplicate renders

  // ✅ CSS moved to styles/components/drawer.css
  // No inline styles needed - all styling is now managed through CSS imports

  const drawerHTML = `
    <div id="delta-drawer">
      <div id="delta-drawer-backdrop"></div>
      <div id="delta-drawer-scrim">
        <div id="delta-drawer-panel">
          <div class="delta-drawer-header">
            <div class="delta-drawer-header-content">
              <h2 id="delta-drawer-title">Crosshair Data</h2>
            </div>
          </div>
          <div id="delta-drawer-content">
            <p class="delta-empty-state">No crosshair data available</p>
          </div>
        </div>
      </div>
    </div>
  `;

  function injectDrawerHTML() {
    if (document.getElementById("delta-drawer")) {
      console.log("[DeltaDrawer] HTML already injected, skipping");
      return; // Already injected
    }

    console.log("[DeltaDrawer] Injecting drawer HTML...");

    // Inject drawer HTML (CSS now comes from styles/components/drawer.css)
    const container = document.createElement("div");
    container.innerHTML = drawerHTML;
    document.body.appendChild(container.firstElementChild);
    console.log("[DeltaDrawer] Drawer HTML injected into body");

    // Verify injection
    const drawer = document.getElementById("delta-drawer");
    const panel = document.getElementById("delta-drawer-panel");
    if (drawer && panel) {
      console.log(
        "[DeltaDrawer] ✅ Injection verified - drawer and panel found in DOM"
      );
    } else {
      console.error(
        "[DeltaDrawer] ❌ Injection failed - drawer:",
        !!drawer,
        "panel:",
        !!panel
      );
    }

    setupEventListeners();
  }

  /**
   * Dynamically load Tabulator library from CDN
   * @returns {Promise<boolean>} True if Tabulator is ready to use
   */
  async function loadTabulator() {
    // Return immediately if already loaded
    if (window.Tabulator) {
      console.log("[DeltaDrawer] Tabulator already loaded");
      return true;
    }

    return new Promise((resolve, reject) => {
      // Load CSS (check if not already loaded)
      if (!document.querySelector('link[href*="tabulator"]')) {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href =
          "https://unpkg.com/tabulator-tables@5.5.0/dist/css/tabulator_simple.min.css";
        document.head.appendChild(cssLink);
        console.log("[DeltaDrawer] Tabulator CSS loaded");
      }

      // Load JavaScript
      if (!document.querySelector('script[src*="tabulator"]')) {
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/tabulator-tables@5.5.0/dist/js/tabulator.min.js";
        script.onload = () => {
          console.log("[DeltaDrawer] Tabulator JS loaded successfully");
          resolve(true);
        };
        script.onerror = (error) => {
          console.error("[DeltaDrawer] Failed to load Tabulator:", error);
          reject(new Error("Tabulator load failed"));
        };
        document.head.appendChild(script);
      } else {
        resolve(true);
      }
    });
  }

  /**
   * Convert color name to hex value
   * @param {string} colorName - Color from crosshairColors array
   * @returns {string} Hex color code
   */
  function getColorHex(colorName) {
    const colorMap = {
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#22c55e",
      magenta: "#d946ef",
      purple: "#a855f7",
      orange: "#f97316",
      brown: "#92400e",
      black: "#000000",
      pink: "#ec4899",
      yellow: "#eab308",
    };
    return colorMap[colorName] || "#6b7280";
  }

  function setupEventListeners() {
    const drawer = document.getElementById("delta-drawer");
    const panel = document.getElementById("delta-drawer-panel");
    const scrim = document.getElementById("delta-drawer-scrim");

    if (!drawer) return;

    // Close drawer
    const closeDrawer = () => {
      isOpen = false;
      drawer.classList.remove("open");
      drawer.style.display = "none";
      scrim.style.display = "none";
      panel.classList.remove("open");
    };

    // Don't close on backdrop click - portal should not block parent
    // backdrop.addEventListener("click", closeDrawer);

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) {
        closeDrawer();
      }
    });
  }

  // Build API object step by step to allow self-referencing
  const api = {
    show: () => {
      console.log("[DeltaDrawer] show() called");
      injectDrawerHTML();

      const drawer = document.getElementById("delta-drawer");
      const backdrop = document.getElementById("delta-drawer-backdrop");
      const panel = document.getElementById("delta-drawer-panel");
      const scrim = document.getElementById("delta-drawer-scrim");

      if (!drawer) {
        console.error("[DeltaDrawer] ❌ Failed to inject drawer HTML");
        return;
      }

      isOpen = true;
      drawer.style.display = "block";
      // Force reflow to ensure display change is applied before adding open class
      void drawer.offsetWidth;
      drawer.classList.add("open");

      if (backdrop) {
        backdrop.style.display = "block";
        backdrop.style.opacity = "1";
      }
      if (scrim) {
        scrim.style.display = "block";
        scrim.classList.add("open");
      }
      if (panel) {
        panel.classList.add("open");
      }

      // ✅ Adjust main content layout to make room for drawer (600px on the right)
      adjustMainContent("right", 600);

      console.log("[DeltaDrawer] ✅ Drawer shown with smooth transition");
    },

    hide: () => {
      console.log("[DeltaDrawer] hide() called");
      const drawer = document.getElementById("delta-drawer");
      const backdrop = document.getElementById("delta-drawer-backdrop");
      const panel = document.getElementById("delta-drawer-panel");
      const scrim = document.getElementById("delta-drawer-scrim");

      if (!drawer) {
        console.warn("[DeltaDrawer] Drawer not found in DOM");
        isOpen = false;
        return;
      }

      isOpen = false;
      drawer.classList.remove("open");
      if (backdrop) {
        backdrop.style.opacity = "0";
      }
      if (scrim) {
        scrim.classList.remove("open");
      }
      if (panel) {
        panel.classList.remove("open");
      }

      // ✅ Reset main content layout (remove right margin)
      adjustMainContent("right", 0);

      // Wait for transform animation to complete before hiding
      setTimeout(() => {
        drawer.style.display = "none";
        if (backdrop) backdrop.style.display = "none";
        if (scrim) scrim.style.display = "none";
      }, 500); // Match the CSS transition duration (0.5s)

      console.log("[DeltaDrawer] ✅ Drawer hidden with smooth transition");
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
      injectDrawerHTML();

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

    isOpen: () => isOpen,

    toggle: () => {
      if (api.isOpen()) {
        api.hide();
      } else {
        api.show();
      }
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
