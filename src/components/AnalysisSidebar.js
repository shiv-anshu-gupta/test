/**
 * Analysis/Phasor Sidebar Component
 * Displays phasor diagram and analysis tools in a slide-out sidebar
 * Works like React portal - doesn't affect parent layout
 * Uses plain HTML and CSS - no Tailwind
 *
 * HTML structure is pre-built in index.html
 * This file only handles styling and behavior
 */

import { sidebarStore } from "../utils/sidebarStore.js";

export function createAnalysisSidebar() {
  let isOpen = false;

  const styleHTML = `
    <style id="analysis-sidebar-styles">
      #analysis-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 997;
        display: none;
        pointer-events: none;  /* Always none - let clicks pass through */
      }

      #analysis-sidebar-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: transparent;
        display: none;
        pointer-events: none;
      }

      #analysis-sidebar-panel {
        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        width: 320px;
        max-width: 90vw;
        background-color: #ffffff;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.5s ease-in-out;
        z-index: 998;
        pointer-events: auto;
        overflow-y: auto;
        overflow-x: hidden;
      }

      #analysis-sidebar-panel.open {
        transform: translateX(0);
      }

      .analysis-sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        background-color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .analysis-sidebar-title {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }

      .analysis-sidebar-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        transition: color 0.2s ease;
        border-radius: 6px;
        font-size: 1.2rem;
      }

      .analysis-sidebar-close-btn:hover {
        color: #111827;
        background-color: #f3f4f6;
      }

      .analysis-sidebar-controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .analysis-sidebar-control-btn {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.75rem;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .analysis-sidebar-control-btn:hover {
        background: var(--bg-secondary);
        color: var(--text-primary);
      }

      .analysis-sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .polar-chart-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .polar-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .polar-section-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
        margin: 0;
      }

      #polarChartContainer {
        width: 100%;
        height: 300px;
        background: var(--bg-tertiary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
      }
    </style>
  `;

  function injectStyles() {
    // Check if styles already injected
    if (document.getElementById("analysis-sidebar-styles")) return;

    // Inject styles
    const styleContainer = document.createElement("div");
    styleContainer.innerHTML = styleHTML;
    document.head.appendChild(styleContainer.firstElementChild);
  }

  function setupEventListeners() {
    const sidebar = document.getElementById("analysis-sidebar");
    const panel = document.getElementById("analysis-sidebar-panel");
    const closeBtn = document.getElementById("analysis-sidebar-close");

    if (!sidebar || !closeBtn) return;

    // Close sidebar
    const closeSidebar = () => {
      isOpen = false;
      sidebar.style.display = "none";
      panel.classList.remove("open");
    };

    // Open sidebar
    const openSidebar = () => {
      const sidebar = document.getElementById("analysis-sidebar");
      const panel = document.getElementById("analysis-sidebar-panel");

      isOpen = true;
      sidebar.style.display = "block";
      panel.classList.add("open");
    };

    closeBtn.addEventListener("click", closeSidebar);

    // Keyboard: ESC to close
    const handleEscKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        closeSidebar();
      }
    };
    document.addEventListener("keydown", handleEscKey);
  }

  // Build API object
  const api = {
    show: () => {
      console.log("[AnalysisSidebar] show() called");
      injectStyles();

      const sidebar = document.getElementById("analysis-sidebar");
      const panel = document.getElementById("analysis-sidebar-panel");

      if (!sidebar) {
        console.warn("[AnalysisSidebar] Sidebar element not found in DOM");
        return;
      }

      isOpen = true;
      sidebar.style.display = "block";
      // Force reflow to ensure display change is applied before adding open class
      void sidebar.offsetWidth;
      panel.classList.add("open");
      console.log("[AnalysisSidebar] ✅ Sidebar shown with smooth transition");
    },

    hide: () => {
      console.log("[AnalysisSidebar] hide() called");
      const sidebar = document.getElementById("analysis-sidebar");
      const panel = document.getElementById("analysis-sidebar-panel");

      if (!sidebar) return;

      isOpen = false;
      if (panel) panel.classList.remove("open");

      // Wait for transform animation to complete before hiding
      setTimeout(() => {
        sidebar.style.display = "none";
      }, 500); // Match the CSS transition duration (0.5s)

      console.log("[AnalysisSidebar] ✅ Sidebar hidden with smooth transition");
    },

    isOpen: () => isOpen,

    toggle: () => {
      if (api.isOpen()) {
        api.hide();
      } else {
        api.show();
      }
    },

    /**
     * Initialize sidebar - setup event listeners and styles
     * Call this when DOM is ready
     */
    init: () => {
      injectStyles();
      setupEventListeners();
      console.log("[AnalysisSidebar] Initialized");
    },

    /**
     * Register this sidebar with the global sidebar store
     * Ensures only one sidebar is visible at a time
     */
    registerWithStore: () => {
      sidebarStore.register("analysis-sidebar", {
        show: api.show,
        hide: api.hide,
        isOpen: api.isOpen,
        isClosedByDefault: true,
      });
      console.log("[AnalysisSidebar] Registered with sidebar store");
    },

    /**
     * Unregister this sidebar from the global sidebar store
     */
    unregisterFromStore: () => {
      sidebarStore.unregister("analysis-sidebar");
      console.log("[AnalysisSidebar] Unregistered from sidebar store");
    },
  };

  return api;
}

export default createAnalysisSidebar;
