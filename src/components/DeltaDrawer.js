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

  const styleHTML = `
    <style id="delta-drawer-styles">
      #delta-drawer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999;
        display: none;
        pointer-events: none;  /* Always none - let clicks pass through to content below */
      }

      #delta-drawer.open {
        /* Do NOT change pointer-events here - keep it as none */
        /* This allows clicks to pass through to the main window */
      }

      #delta-drawer-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: transparent;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        pointer-events: none;
        display: none;
      }

      #delta-drawer-scrim {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: none;
        outline: none;
        pointer-events: none;  /* Always none - only the panel needs pointer events */
      }

      #delta-drawer-scrim.open {
        /* Do NOT change pointer-events here - keep it as none */
        /* This allows clicks to pass through to the main window */
      }

      #delta-drawer-panel {
        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        width: 600px;
        max-width: 90vw;
        background-color: #ffffff;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.5s ease-in-out;
        z-index: 1000;
        pointer-events: auto;
      }

      #delta-drawer-panel.open {
        transform: translateX(0);
      }

      .delta-drawer-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        background-color: #ffffff;
      }

      .delta-drawer-header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      #delta-drawer-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }

      #delta-drawer-content {
        flex: 1;
        overflow-x: auto;
        overflow-y: auto;
        padding: 24px;
        background-color: #ffffff;
      }

      .delta-section {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
      }

      .delta-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .delta-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .delta-color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .delta-section-title {
        font-size: 14px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }

      .delta-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .delta-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .delta-label {
        color: #6b7280;
        font-weight: 500;
      }

      .delta-value {
        color: #111827;
        font-family: 'Courier New', monospace;
        font-weight: 600;
      }

      .delta-empty-state {
        color: #9ca3af;
        font-size: 14px;
        text-align: center;
        padding: 32px 16px;
      }

      /* Tabulator Table Container */
      .delta-table-container {
        margin-bottom: 20px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: auto;
        background-color: #ffffff;
        display: block !important;
      }

      .delta-table-header {
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 12px 16px !important;
        background: linear-gradient(to bottom, #f9fafb, #f3f4f6) !important;
        border-bottom: 2px solid #e5e7eb !important;
        width: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
        z-index: 10 !important;
      }

      .delta-table-title {
        font-size: 14px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }

      .delta-table-time {
        font-size: 12px;
        font-family: 'Courier New', monospace;
        color: #6b7280;
        font-weight: 600;
      }

      /* Plain HTML Table Styles */
      .delta-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .delta-th {
        padding: 12px;
        text-align: left;
        background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
        border-bottom: 2px solid #e5e7eb;
        font-weight: 600;
        color: #111827;
        white-space: nowrap;
      }

      .delta-th-content {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
      }

      .delta-th-channel {
        position: sticky;
        left: 0;
        background: #f9fafb;
        z-index: 2;
      }

      .delta-color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
      }

      .delta-arrow {
        font-size: 10px;
        color: #9ca3af;
      }

      .delta-td {
        padding: 10px 12px;
        border-bottom: 1px solid #f3f4f6;
        vertical-align: middle;
        white-space: nowrap;
        font-family: 'Courier New', monospace;
      }

      .delta-table tbody tr:hover {
        background-color: #f9fafb;
      }

      .delta-row-time {
        background-color: #f9fafb;
        font-weight: 700;
        border-bottom: 2px solid #3b82f6;
      }

      .delta-td-channel {
        position: sticky;
        left: 0;
        background: #ffffff;
        font-weight: 600;
        font-family: inherit;
      }

      .delta-table tbody tr:hover .delta-td-channel {
        background-color: #f9fafb;
      }

      .delta-channel-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .delta-channel-name {
        font-weight: 600;
        color: #111827;
      }

      .delta-td-value,
      .delta-td-delta {
        font-weight: 600;
        text-align: right;
      }

      .delta-time-row {
        color: #3b82f6;
        font-weight: 700;
      }

      .delta-td-percentage {
        text-align: right;
      }

      .delta-percentage {
        font-weight: 700;
      }

      .delta-percentage.positive {
        color: #16a34a;
      }

      .delta-percentage.negative {
        color: #dc2626;
      }

      .delta-percentage.zero {
        color: #6b7280;
      }

      .delta-empty {
        text-align: center;
        padding: 32px;
        color: #9ca3af;
      }

      /* Scrollbar styling */
      #delta-drawer-content::-webkit-scrollbar {
        width: 8px;
      }

      #delta-drawer-content::-webkit-scrollbar-track {
        background: #f3f4f6;
      }

      #delta-drawer-content::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      #delta-drawer-content::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      /* Responsive for mobile */
      @media (max-width: 768px) {
        #delta-drawer-panel {
          width: 100%;
          max-width: 100%;
        }
      }
    </style>
  `;

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

    // Inject styles
    const styleContainer = document.createElement("div");
    styleContainer.innerHTML = styleHTML;
    document.head.appendChild(styleContainer.firstElementChild);
    console.log("[DeltaDrawer] Styles injected");

    // Inject drawer HTML (without button - using HTML button from index.html instead)
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
      // ✅ DEBUG: Add trace to see if update() is called multiple times
      console.log(
        "[DeltaDrawer] update() called with",
        deltaData.length,
        "sections and",
        verticalLinesCount,
        "vertical lines"
      );
      console.trace("[DeltaDrawer] 📍 Update() call stack:");
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
