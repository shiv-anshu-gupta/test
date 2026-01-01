/**
 * Delta Display Drawer Component
 * Shows detailed crosshair values in a slide-out drawer (sidebar)
 * Uses plain HTML and CSS - no Tailwind
 */

import { sidebarStore } from "../utils/sidebarStore.js";
import { adjustMainContent } from "../utils/sidebarResize.js";
import { crosshairColors } from "../utils/constants.js";

export function createDeltaDrawer() {
  let isOpen = false;
  let tabulatorInstances = []; // Track table instances for cleanup

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
        overflow: hidden;
        background-color: #ffffff;
        min-width: 100%;
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

      /* Tabulator Theme Overrides */
      .tabulator {
        font-size: 13px;
        border: none !important;
        background-color: transparent;
        width: 100% !important;
        display: block !important;
      }

      .tabulator .tabulator-tableholder {
        background-color: #ffffff;
        overflow-x: auto !important;
      }

      .tabulator .tabulator-table {
        display: table !important;
        width: 100% !important;
      }

      /* Hide the default Tabulator header - we use our custom header instead */
      .tabulator .tabulator-header {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      .tabulator .tabulator-row {
        display: table-row !important;
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
        display: table-cell !important;
        border-right: 1px solid #f3f4f6;
        padding: 10px 12px;
        vertical-align: middle;
        white-space: nowrap;
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
   * Build dynamic Tabulator columns with time values
   * ✅ FIX: Added time display and special time row handling
   * @param {number} verticalLinesCount - Number of vertical lines
   * @param {Array} verticalLineTimes - Time values for each line
   * @returns {Array} Tabulator column definitions
   */
  function buildTableColumns(verticalLinesCount, verticalLineTimes = []) {
    const columns = [];

    // First column: Channel name (frozen/pinned)
    columns.push({
      title: "Channel",
      field: "channel",
      minWidth: 130,
      width: 130,
      frozen: true,
      headerSort: false,
      responsive: 0,
      formatter: function (cell) {
        const data = cell.getRow().getData();

        // ✅ SPECIAL: If this is the time row, show "Time (T)"
        if (data.channel === "__TIME_ROW__") {
          return '<span style="font-weight: 700; color: #6b7280; font-style: italic;">Time (T)</span>';
        }

        return `
          <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
            <span style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: ${data.color};
              display: inline-block;
              border: 1px solid rgba(0,0,0,0.2);
            "></span>
            <span style="font-weight: 600; color: #111827;">${cell.getValue()}</span>
          </div>
        `;
      },
    });

    // Value columns (one per vertical line)
    for (let i = 0; i < verticalLinesCount; i++) {
      const lineColor = crosshairColors[i % crosshairColors.length];
      const colorHex = getColorHex(lineColor);
      const timeValue = verticalLineTimes[i] || "N/A";

      columns.push({
        title: `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${colorHex}; border: 1px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.2);"></span>
          <span style="font-size: 10px; color: #6b7280; font-weight: 500;">T${
            i + 1
          }</span>
        </div>`,
        field: `v${i}`,
        minWidth: 120,
        width: 120,
        hozAlign: "right",
        headerSort: false,
        responsive: i + 1,
        formatter: function (cell) {
          const data = cell.getRow().getData();

          // ✅ SPECIAL: If this is the time row, show time value with blue styling
          if (data.channel === "__TIME_ROW__") {
            return `<span style="font-family: 'Courier New', monospace; font-weight: 700; color: #3b82f6;">${cell.getValue()}</span>`;
          }

          const val = cell.getValue();
          return `<span style="font-family: 'Courier New', monospace; font-weight: 600; white-space: nowrap;">${
            val || "N/A"
          }</span>`;
        },
      });
    }

    // Delta columns (one pair per consecutive vertical lines)
    for (let i = 0; i < verticalLinesCount - 1; i++) {
      const line1Color = crosshairColors[i % crosshairColors.length];
      const line2Color = crosshairColors[(i + 1) % crosshairColors.length];
      const color1Hex = getColorHex(line1Color);
      const color2Hex = getColorHex(line2Color);

      // Delta value column
      columns.push({
        title: `<span style="display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color1Hex};"></span>
          <span style="font-size: 10px;">→</span>
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color2Hex};"></span>
          <span style="font-size: 11px; margin-left: 2px;">Δ</span>
        </span>`,
        field: `delta${i}`,
        minWidth: 110,
        width: 110,
        hozAlign: "right",
        headerSort: false,
        responsive: verticalLinesCount + i * 2 + 1,
        formatter: function (cell) {
          const data = cell.getRow().getData();

          // ✅ SPECIAL: If this is the time row, show delta time in green
          if (data.channel === "__TIME_ROW__") {
            return `<span style="font-family: 'Courier New', monospace; font-weight: 700; color: #10b981;">${cell.getValue()}</span>`;
          }

          const val = cell.getValue();
          return `<span style="font-family: 'Courier New', monospace; font-weight: 600; white-space: nowrap;">${
            val || "N/A"
          }</span>`;
        },
      });

      // Delta percentage column
      columns.push({
        title: `<span style="display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color1Hex};"></span>
          <span style="font-size: 10px;">→</span>
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color2Hex};"></span>
          <span style="font-size: 11px; margin-left: 2px;">%</span>
        </span>`,
        field: `percentage${i}`,
        minWidth: 90,
        width: 90,
        hozAlign: "right",
        sorter: "number",
        responsive: verticalLinesCount + i * 2 + 2,
        formatter: function (cell) {
          const data = cell.getRow().getData();

          // ✅ SPECIAL: Time row doesn't have percentages
          if (data.channel === "__TIME_ROW__") {
            return '<span style="color: #d1d5db;">—</span>';
          }

          const value = parseFloat(cell.getValue());
          if (isNaN(value))
            return '<span style="white-space: nowrap;">N/A</span>';

          let color = "#6b7280";
          if (value < 0) color = "#dc2626";
          else if (value > 0) color = "#16a34a";

          return `<span style="font-family: 'Courier New', monospace; font-weight: 700; color: ${color}; white-space: nowrap;">${value.toFixed(
            1
          )}%</span>`;
        },
      });
    }

    return columns;
  }

  /**
   * Transform deltaData into a single consolidated table format
   * @param {Array} deltaData - Array of delta sections (one per line pair)
   * @param {number} verticalLinesCount - Number of vertical lines
   * @returns {Array} Consolidated Tabulator data
   */
  /**
   * Transform deltaData from multiple charts into a single consolidated table
   * ✅ FIX: Properly handle data structure where deltaData is an array of sections,
   * each containing only series from ONE chart. We need to collect ALL series
   * across all sections into a single merged table.
   * @param {Array} deltaData - Array of delta sections (one per chart per pair)
   * @param {number} verticalLinesCount - Number of vertical lines
   * @param {Array} verticalLineTimes - Array of time values for each vertical line
   * @returns {Array} Consolidated Tabulator data
   */
  function formatTableData(
    deltaData,
    verticalLinesCount,
    verticalLineTimes = []
  ) {
    if (!Array.isArray(deltaData) || deltaData.length === 0) {
      console.warn("[DeltaDrawer] No delta data to format");
      return [];
    }

    console.log(
      `[DeltaDrawer] 📊 Formatting data for ${verticalLinesCount} lines from ${deltaData.length} delta sections`
    );

    // Build a map: { channelName: { color, v0, v1, v2, ..., delta0, delta1, ..., percentage0, percentage1, ... } }
    const channelMap = new Map();

    // ✅ KEY FIX: When you have N charts with M vertical lines:
    // - deltaData has N sections (one per chart)
    // - Each section has series from ONE chart only
    // - All sections represent the SAME pair indices
    // We need to iterate through ALL sections and collect series from each

    // Group sections by their pair index (pairIdx)
    // ✅ CRITICAL FIX: All sections represent the SAME pair index!
    // Multiple sections = multiple charts, NOT multiple pairs
    // Each chart has the same pair (pair 0 when there are 2 vertical lines)
    const pairGroups = {};

    deltaData.forEach((section, sectionIdx) => {
      if (!section.series || !Array.isArray(section.series)) {
        console.warn(
          `[DeltaDrawer] ⚠️ Section ${sectionIdx} has no series data`
        );
        return;
      }

      // ✅ KEY FIX: All sections are from DIFFERENT CHARTS but represent the SAME PAIR
      // The pair index is always 0 (or constant based on verticalLinesCount)
      // Not based on sectionIdx!
      const pairIdx = 0; // All sections share the same pair index!

      if (!pairGroups[pairIdx]) {
        pairGroups[pairIdx] = {
          deltaTime: section.deltaTime || "",
          allSeries: [],
        };
      }

      // Collect ALL series from this section (different chart, same pair)
      section.series.forEach((seriesData) => {
        pairGroups[pairIdx].allSeries.push(seriesData);
      });

      console.log(
        `[DeltaDrawer] Section ${sectionIdx} (Chart ${sectionIdx}): ${section.series.length} channels for pair ${pairIdx}`
      );
    });

    console.log(
      `[DeltaDrawer] Total pair groups: ${Object.keys(pairGroups).length}`
    );

    // ✅ NOW: Process each pair group and build channel map
    Object.entries(pairGroups).forEach(([pairIdx, pairGroup]) => {
      pairIdx = parseInt(pairIdx);

      pairGroup.allSeries.forEach((seriesData) => {
        const channelName = seriesData.name || `Unknown_${pairIdx}`;

        // Initialize channel if not exists
        if (!channelMap.has(channelName)) {
          channelMap.set(channelName, {
            channel: channelName,
            color: seriesData.color || "#6b7280",
          });
          console.log(`[DeltaDrawer] ✨ New channel: ${channelName}`);
        }

        const channelData = channelMap.get(channelName);

        // ✅ FIX: Add v0 value only for the FIRST pair (index 0)
        if (pairIdx === 0 && !channelData.hasOwnProperty("v0")) {
          channelData.v0 = seriesData.v1Formatted || "N/A";
          console.log(
            `[DeltaDrawer] Channel ${channelName}: v0 = ${channelData.v0}`
          );
        }

        // ✅ FIX: Always add v(pairIdx+1) value for this pair
        const vKey = `v${pairIdx + 1}`;
        channelData[vKey] = seriesData.v2Formatted || "N/A";
        console.log(
          `[DeltaDrawer] Channel ${channelName}: ${vKey} = ${channelData[vKey]}`
        );

        // ✅ FIX: Add delta and percentage for this pair
        channelData[`delta${pairIdx}`] = seriesData.deltaFormatted || "N/A";
        channelData[`percentage${pairIdx}`] =
          seriesData.percentage != null ? seriesData.percentage : 0;

        console.log(
          `[DeltaDrawer] Channel ${channelName}: delta${pairIdx} = ${
            channelData[`delta${pairIdx}`]
          }, percentage${pairIdx} = ${channelData[`percentage${pairIdx}`]}%`
        );
      });
    });

    // ✅ FIX: Fill in missing values with "N/A" for channels that don't exist in all charts
    channelMap.forEach((channelData, channelName) => {
      for (let i = 0; i < verticalLinesCount; i++) {
        const vKey = `v${i}`;
        if (!channelData.hasOwnProperty(vKey)) {
          channelData[vKey] = "N/A";
          console.log(
            `[DeltaDrawer] ⚠️ Channel ${channelName}: ${vKey} missing, set to N/A`
          );
        }
      }

      for (let i = 0; i < verticalLinesCount - 1; i++) {
        if (!channelData.hasOwnProperty(`delta${i}`)) {
          channelData[`delta${i}`] = "N/A";
          channelData[`percentage${i}`] = 0;
          console.log(
            `[DeltaDrawer] ⚠️ Channel ${channelName}: delta${i} missing, set to N/A`
          );
        }
      }
    });

    const tableData = Array.from(channelMap.values());

    console.log(
      `[DeltaDrawer] ✅ Consolidated ${
        tableData.length
      } channels with ${verticalLinesCount} value columns and ${
        verticalLinesCount - 1
      } delta pairs`
    );
    return tableData;
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

      // Destroy old table instance
      console.log(
        `[DeltaDrawer] 🧹 Destroying ${tabulatorInstances.length} old table(s)`
      );
      tabulatorInstances.forEach((table, idx) => {
        try {
          if (table && typeof table.destroy === "function") {
            table.destroy();
            console.log(`[DeltaDrawer] ✅ Destroyed table ${idx}`);
          }
        } catch (error) {
          console.warn(
            `[DeltaDrawer] ⚠️ Error destroying table ${idx}:`,
            error
          );
        }
      });
      tabulatorInstances = [];

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
        content.innerHTML =
          '<p style="padding: 16px; color: #dc2626; text-align: center;">Error loading data visualization</p>';
        return;
      }

      // Completely clear content and remove all previous table containers
      content.innerHTML = "";

      // Also ensure old tables are completely removed from DOM
      const oldTables = content.querySelectorAll(".delta-table-container");
      oldTables.forEach((table) => table.remove());
      console.log(
        "[DeltaDrawer] ✨ Content cleared, creating single table container"
      );

      // ✅ EXTRACT: Time values BEFORE creating container
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

      // Create single table container
      const tableContainer = document.createElement("div");
      tableContainer.className = "delta-table-container";

      // Create header showing all line pairs
      const header = document.createElement("div");
      header.className = "delta-table-header";

      let pairsHTML = "";
      for (let i = 0; i < verticalLinesCount - 1; i++) {
        const color1 = getColorHex(crosshairColors[i % crosshairColors.length]);
        const color2 = getColorHex(
          crosshairColors[(i + 1) % crosshairColors.length]
        );

        if (i > 0)
          pairsHTML += '<span style="margin: 0 8px; color: #d1d5db;">|</span>';

        pairsHTML += `
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color1}; border: 2px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></span>
            <span style="color: #9ca3af; font-size: 12px;">→</span>
            <span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color2}; border: 2px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></span>
          </span>
        `;
      }

      header.innerHTML = `
        <div class="delta-table-title">
          <span style="display: inline-flex; align-items: center; gap: 8px;">
            <span style="color: #6b7280; font-size: 13px; font-weight: 500;">${verticalLinesCount} Lines - ${
        verticalLinesCount - 1
      } ${verticalLinesCount - 1 === 1 ? "Pair" : "Pairs"}: </span>
            ${pairsHTML}
          </span>
        </div>
        <div class="delta-table-time">${deltaData.length} Chart${
        deltaData.length > 1 ? "s" : ""
      }</div>
      `;
      tableContainer.appendChild(header);
      console.log("[DeltaDrawer] ✅ Header created and appended (ONCE)");

      // Create table div
      const tableDiv = document.createElement("div");
      tableDiv.id = "delta-table-main";
      tableContainer.appendChild(tableDiv);
      console.log("[DeltaDrawer] ✅ Table div created (ONCE)");

      content.appendChild(tableContainer);
      console.log(
        "[DeltaDrawer] ✅ Table container appended to content (ONCE)"
      );

      // ✅ FIX: Format data with time values
      const tableData = formatTableData(
        deltaData,
        verticalLinesCount,
        verticalLineTimes
      );

      if (tableData.length === 0) {
        console.warn("[DeltaDrawer] No valid table data");
        tableDiv.innerHTML =
          '<p style="padding: 16px; color: #9ca3af; text-align: center;">No data available</p>';
        return;
      }

      // ✅ FIX: Add time row as first row
      const timeRow = {
        channel: "__TIME_ROW__",
        color: "#3b82f6",
      };

      // Add time values
      verticalLineTimes.forEach((timeVal, idx) => {
        timeRow[`v${idx}`] = timeVal;
      });

      // Add delta times - only for the actual delta PAIRS (not for each chart)
      // Number of delta pairs = verticalLinesCount - 1
      for (let i = 0; i < verticalLinesCount - 1; i++) {
        // Use the first section's deltaTime (all sections for same pair have same deltaTime)
        timeRow[`delta${i}`] = deltaData[0]?.deltaTime || "N/A";
        timeRow[`percentage${i}`] = 0; // No percentage for time row
      }

      // Insert time row at the beginning
      tableData.unshift(timeRow);

      // Create single expanding table
      try {
        const table = new window.Tabulator("#delta-table-main", {
          data: tableData,
          columns: buildTableColumns(verticalLinesCount, verticalLineTimes),
          layout: "fitDataTable",
          height: "auto",
          autoColumns: false,
          responsiveLayout: false,
          headerSort: true,
          placeholder: "No Data Available",
          printAsHtml: true,
          printStyled: true,
          layoutColumnsOnNewData: false,
          persistentLayout: true,
          rowFormatter: function (row) {
            // ✅ SPECIAL: Style the time row
            const data = row.getData();
            if (data.channel === "__TIME_ROW__") {
              row.getElement().style.backgroundColor = "#f9fafb";
              row.getElement().style.fontWeight = "700";
              row.getElement().style.borderBottom = "2px solid #3b82f6";
            }
          },
        });

        tabulatorInstances.push(table);

        // Force redraw to ensure proper layout
        setTimeout(() => {
          table.redraw(true);
        }, 100);

        console.log(
          `[DeltaDrawer] ✅ Table created with ${
            tableData.length
          } rows (including time row) and ${
            buildTableColumns(verticalLinesCount).length
          } columns`
        );
      } catch (error) {
        console.error("[DeltaDrawer] ❌ Failed to create table:", error);
        tableDiv.innerHTML =
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
