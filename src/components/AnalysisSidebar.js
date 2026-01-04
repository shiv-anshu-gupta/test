/**
 * Analysis/Phasor Sidebar Component
 * Displays phasor diagram and analysis tools in a slide-out sidebar
 * Works like React portal - doesn't affect parent layout
 * Uses Tailwind CSS v4.1 with draggable resize functionality
 *
 * HTML structure is pre-built in index.html with Tailwind classes
 * This file handles behavior, state management, and resizer initialization
 */

import { sidebarStore } from "../utils/sidebarStore.js";
import { createSidebarResizer } from "./SidebarResizer.js";

export function createAnalysisSidebar() {
  let isOpen = false;

  function setupEventListeners() {
    const sidebar = document.getElementById("analysis-sidebar");
    const panel = document.getElementById("analysis-sidebar-panel");
    const closeBtn = document.getElementById("analysis-sidebar-close");

    if (!sidebar || !closeBtn) return;

    // Close sidebar
    const closeSidebar = () => {
      isOpen = false;
      sidebar.classList.add("hidden");
      panel.classList.remove("translate-x-0");
      panel.classList.add("translate-x-full");
    };

    // Open sidebar
    const openSidebar = () => {
      const sidebar = document.getElementById("analysis-sidebar");
      const panel = document.getElementById("analysis-sidebar-panel");

      isOpen = true;
      sidebar.classList.remove("hidden");
      panel.classList.remove("translate-x-full");
      panel.classList.add("translate-x-0");
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

      const sidebar = document.getElementById("analysis-sidebar");
      const panel = document.getElementById("analysis-sidebar-panel");

      if (!sidebar) {
        console.warn("[AnalysisSidebar] Sidebar element not found in DOM");
        return;
      }

      isOpen = true;
      sidebar.classList.remove("hidden");
      panel.classList.remove("translate-x-full");
      panel.classList.add("translate-x-0");
      console.log("[AnalysisSidebar] ✅ Sidebar shown with smooth transition");
    },

    hide: () => {
      console.log("[AnalysisSidebar] hide() called");
      const sidebar = document.getElementById("analysis-sidebar");
      const panel = document.getElementById("analysis-sidebar-panel");

      if (!sidebar) return;

      isOpen = false;
      panel.classList.remove("translate-x-0");
      panel.classList.add("translate-x-full");

      // Wait for transform animation to complete before hiding
      setTimeout(() => {
        sidebar.classList.add("hidden");
      }, 500); // Match Tailwind transition duration (duration-500)

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
     * Initialize sidebar - setup event listeners, styles, and resizer
     * Call this when DOM is ready
     */
    init: () => {
      setupEventListeners();
      createSidebarResizer("analysis-sidebar-panel", "left");
      console.log(
        "[AnalysisSidebar] ✅ Initialized with resizable functionality"
      );
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
