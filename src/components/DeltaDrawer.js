/**
 * Delta Display Drawer Component
 * Shows detailed crosshair values in a slide-out drawer (sidebar)
 * Uses plain HTML and CSS - no Tailwind
 */

import { sidebarStore } from "../utils/sidebarStore.js";
import { adjustMainContent } from "../utils/sidebarResize.js";

export function createDeltaDrawer() {
  let isOpen = false;

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
        width: 384px;
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
        overflow: hidden;
        background-color: #ffffff;
      }

      .delta-table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
        border-bottom: 2px solid #e5e7eb;
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

      /* Tabulator Theme Overrides */
      .tabulator {
        font-size: 13px;
        border: none !important;
        background-color: transparent;
      }

      .tabulator .tabulator-header {
        background-color: #f9fafb;
        border-bottom: 2px solid #d1d5db;
        font-weight: 600;
      }

      .tabulator .tabulator-header .tabulator-col {
        background-color: transparent;
        border-right: 1px solid #e5e7eb;
        padding: 10px 12px;
      }

      .tabulator .tabulator-header .tabulator-col-title {
        font-weight: 600;
        color: #374151;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .tabulator .tabulator-tableholder {
        background-color: #ffffff;
      }

      .tabulator .tabulator-row {
        border-bottom: 1px solid #f3f4f6;
        min-height: 40px;
      }

      .tabulator .tabulator-row:hover {
        background-color: #f9fafb !important;
      }

      .tabulator .tabulator-row.tabulator-row-even {
        background-color: #fafafa;
      }

      .tabulator .tabulator-cell {
        border-right: 1px solid #f3f4f6;
        padding: 10px 12px;
        vertical-align: middle;
      }

      /* Custom Cell Styles */
      .cell-channel {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .cell-color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .cell-channel-name {
        font-weight: 600;
        color: #111827;
      }

      .cell-value {
        font-family: 'Courier New', monospace;
        font-weight: 600;
        color: #111827;
        text-align: right;
        display: block;
      }

      .cell-percentage {
        font-family: 'Courier New', monospace;
        font-weight: 700;
        text-align: right;
        display: block;
      }

      .cell-percentage-positive {
        color: #16a34a;
      }

      .cell-percentage-negative {
        color: #dc2626;
      }

      .cell-percentage-zero {
        color: #6b7280;
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
   * Build Tabulator column configuration
   * @returns {Array} Tabulator columns definition
   */
  function buildTableColumns() {
    return [
      {
        title: "Channel",
        field: "channel",
        minWidth: 130,
        headerSort: false,
        formatter: function (cell) {
          const data = cell.getRow().getData();
          return `
            <div class="cell-channel">
              <span class="cell-color-dot" style="background-color: ${
                data.color
              };"></span>
              <span class="cell-channel-name">${cell.getValue()}</span>
            </div>
          `;
        },
      },
      {
        title: "Value 1",
        field: "v1",
        minWidth: 110,
        hozAlign: "right",
        headerSort: false,
        formatter: function (cell) {
          return `<span class="cell-value">${cell.getValue()}</span>`;
        },
      },
      {
        title: "Value 2",
        field: "v2",
        minWidth: 110,
        hozAlign: "right",
        headerSort: false,
        formatter: function (cell) {
          return `<span class="cell-value">${cell.getValue()}</span>`;
        },
      },
      {
        title: "Δ Value",
        field: "delta",
        minWidth: 110,
        hozAlign: "right",
        headerSort: false,
        formatter: function (cell) {
          return `<span class="cell-value">${cell.getValue()}</span>`;
        },
      },
      {
        title: "Δ %",
        field: "percentage",
        minWidth: 90,
        hozAlign: "right",
        sorter: "number",
        formatter: function (cell) {
          const value = cell.getValue();
          const numValue = parseFloat(value);
          let className = "cell-percentage";

          if (numValue < 0) {
            className += " cell-percentage-negative";
          } else if (numValue > 0) {
            className += " cell-percentage-positive";
          } else {
            className += " cell-percentage-zero";
          }

          return `<span class="${className}">${value}%</span>`;
        },
      },
    ];
  }

  /**
   * Transform delta data into Tabulator-compatible format
   * @param {Array} seriesArray - Array of series data objects
   * @returns {Array} Tabulator data array
   */
  function formatTableData(seriesArray) {
    if (!Array.isArray(seriesArray)) {
      console.warn("[DeltaDrawer] Invalid series data:", seriesArray);
      return [];
    }

    return seriesArray.map((seriesData) => ({
      channel: seriesData.name || "Unknown",
      color: seriesData.color || "#000000",
      v1:
        seriesData.v1Formatted ||
        (seriesData.v1 != null ? seriesData.v1.toFixed(2) : "N/A"),
      v2:
        seriesData.v2Formatted ||
        (seriesData.v2 != null ? seriesData.v2.toFixed(2) : "N/A"),
      delta:
        seriesData.deltaFormatted ||
        (seriesData.deltaY != null ? seriesData.deltaY.toFixed(2) : "N/A"),
      percentage: seriesData.percentage != null ? seriesData.percentage : 0,
    }));
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

      // ✅ Adjust main content layout to make room for drawer (384px on the right)
      adjustMainContent("right", 384);

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

      // Load Tabulator library
      try {
        await loadTabulator();
      } catch (error) {
        console.error(
          "[DeltaDrawer] Tabulator load failed, falling back to HTML:",
          error
        );
        // Fallback to displaying an error message
        content.innerHTML =
          '<p style="padding: 16px; color: #dc2626; text-align: center;">Error loading data visualization</p>';
        return;
      }

      // Clear content
      content.innerHTML = "";

      // Create Tabulator tables for each delta section
      deltaData.forEach((section, sectionIdx) => {
        // Create container
        const tableContainer = document.createElement("div");
        tableContainer.className = "delta-table-container";

        // Create header
        const header = document.createElement("div");
        header.className = "delta-table-header";
        header.innerHTML = `
          <div class="delta-table-title">Line Pair: T${sectionIdx + 1} → T${
          sectionIdx + 2
        }</div>
          <div class="delta-table-time">${section.deltaTime || ""}</div>
        `;
        tableContainer.appendChild(header);

        // Create table div
        const tableDiv = document.createElement("div");
        tableDiv.id = `delta-table-${sectionIdx}`;
        tableContainer.appendChild(tableDiv);

        content.appendChild(tableContainer);

        // Format data for Tabulator
        const tableData = formatTableData(section.series);

        // Verify we have valid data
        if (tableData.length === 0) {
          console.warn(`[DeltaDrawer] No valid data for section ${sectionIdx}`);
          tableDiv.innerHTML =
            '<p style="padding: 16px; color: #9ca3af; text-align: center;">No data available</p>';
          return;
        }

        // Create Tabulator instance
        try {
          new window.Tabulator(`#delta-table-${sectionIdx}`, {
            data: tableData,
            columns: buildTableColumns(),
            layout: "fitColumns",
            height: "auto",
            responsiveLayout: "hide",
            headerSort: true,
            placeholder: "No Data Available",
          });

          console.log(
            `[DeltaDrawer] ✅ Table ${sectionIdx} created with ${tableData.length} rows`
          );
        } catch (error) {
          console.error(
            `[DeltaDrawer] Failed to create table ${sectionIdx}:`,
            error
          );
          tableDiv.innerHTML =
            '<p style="padding: 16px; color: #dc2626;">Error creating table</p>';
        }
      });
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
