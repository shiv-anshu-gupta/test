/**
 * Delta Display Drawer Component
 * Shows detailed delta measurements in a slide-out drawer (sidebar)
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
              <h2 id="delta-drawer-title">Delta Measurements</h2>
            </div>
          </div>
          <div id="delta-drawer-content">
            <p class="delta-empty-state">No delta data available</p>
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

    update: (deltaData = [], verticalLinesCount = 0) => {
      console.log(
        "[DeltaDrawer] update() called with",
        deltaData.length,
        "sections and",
        verticalLinesCount,
        "vertical lines"
      );
      injectDrawerHTML();

      const content = document.getElementById("delta-drawer-content");
      if (!content) return;

      // Show message if less than 2 vertical lines
      if (!deltaData || deltaData.length === 0 || verticalLinesCount < 2) {
        const message =
          verticalLinesCount < 1
            ? "Add vertical lines using <strong>Alt + 1</strong> on the chart to see delta values"
            : "Add another vertical line using <strong>Alt + 1</strong> to see delta values between them";

        content.innerHTML = `
          <div class="delta-empty-state" style="text-align: center; padding: 24px 16px; color: var(--text-secondary);">
            <div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">
              ${message}
            </div>
            <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 16px;">
              💡 Place markers on the chart to measure values and differences
            </div>
          </div>
        `;
        return;
      }

      // Build HTML from the old DeltaWindow format
      let html = "";

      deltaData.forEach((section, sectionIdx) => {
        // Time delta box
        if (section.deltaTime !== undefined) {
          html += `
            <div style="background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 12px; margin-bottom: 16px; border-radius: 6px; text-align: center;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Time Difference (T${
                sectionIdx + 1
              } → T${sectionIdx + 2})</div>
              <div style="font-size: 16px; font-weight: 700; color: #111827; font-family: 'Courier New', monospace;">${
                section.deltaTime
              }</div>
            </div>
          `;
        }

        // Series deltas
        if (section.series && section.series.length > 0) {
          html += `
            <div class="delta-section">
              <div class="delta-section-header">
                <h3 class="delta-section-title">Line Pair: T${
                  sectionIdx + 1
                } → T${sectionIdx + 2}</h3>
              </div>
              <div class="delta-items">
          `;

          section.series.forEach((seriesData) => {
            const color = seriesData.color || "#000000";
            html += `
              <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
                  <span style="font-weight: 600; color: ${color}; font-size: 13px;">${
              seriesData.name
            }</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px;">
                  <div style="flex: 1;">
                    <div style="color: #6b7280; font-size: 11px; margin-bottom: 2px;">Values</div>
                    <div style="font-weight: 700; color: #111827; font-family: 'Courier New', monospace;">${seriesData.v1.toFixed(
                      2
                    )} → ${seriesData.v2.toFixed(2)}</div>
                  </div>
                  <div style="flex: 1;">
                    <div style="color: #6b7280; font-size: 11px; margin-bottom: 2px;">Δ Value</div>
                    <div style="font-weight: 700; color: #111827; font-family: 'Courier New', monospace;">${seriesData.deltaY.toFixed(
                      2
                    )}</div>
                  </div>
                  <div style="flex: 1;">
                    <div style="color: #6b7280; font-size: 11px; margin-bottom: 2px;">Δ %</div>
                    <div style="font-weight: 700; color: #111827;">${
                      seriesData.percentage
                    }%</div>
                  </div>
                </div>
              </div>
            `;
          });

          html += `
              </div>
            </div>
          `;
        }
      });

      content.innerHTML = html;
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
