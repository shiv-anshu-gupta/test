/**
 * @file themeBroadcast.js
 * @description Unified Theme Broadcast System
 * Manages theme across main window, popups, and tabs
 * ✅ Centralized theme management
 * ✅ Multi-tab synchronization via BroadcastChannel
 * ✅ localStorage persistence
 * ✅ Child window support
 */

const themeBroadcast = {
  channel: null,
  currentTheme: "dark",

  /**
   * Initialize - Call once in main window
   */
  init() {
    console.log("[themeBroadcast] Initializing theme broadcast system...");

    // Create BroadcastChannel for multi-tab sync
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel("comtrade-theme-sync");

        // Listen for theme from other tabs
        this.channel.addEventListener("message", (ev) => {
          if (ev.data && ev.data.theme) {
            console.log(
              "[themeBroadcast] Received theme from another tab:",
              ev.data.theme
            );
            this.applyTheme(ev.data.theme, true); // true = skip broadcast to avoid loop
          }
        });
        console.log(
          "[themeBroadcast] BroadcastChannel created for multi-tab sync"
        );
      } catch (e) {
        console.warn(
          "[themeBroadcast] BroadcastChannel not supported:",
          e.message
        );
      }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem("comtrade-theme") || "dark";
    this.applyTheme(savedTheme, false);

    // Attach to theme button
    const themeButton = document.getElementById("themeToggleBtn");
    if (themeButton) {
      themeButton.addEventListener("click", () => {
        this.toggleTheme();
      });
      console.log("[themeBroadcast] Theme button listener attached");
    } else {
      console.warn("[themeBroadcast] Theme button not found (themeToggleBtn)");
    }

    console.log("[themeBroadcast] ✅ Initialized with theme:", savedTheme);
  },

  /**
   * Toggle between light and dark
   */
  toggleTheme() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(newTheme, false);
  },

  /**
   * Apply theme to main window
   * @param {string} themeName - 'light' or 'dark'
   * @param {boolean} skipBroadcast - true to skip broadcasting (used when receiving from other tab)
   */
  applyTheme(themeName, skipBroadcast = false) {
    this.currentTheme = themeName;

    // Set data-theme attribute on document root (CSS uses this for theme switching)
    document.documentElement.setAttribute("data-theme", themeName);

    // Save to localStorage
    localStorage.setItem("comtrade-theme", themeName);

    // Update button icon
    const themeIcon = document.getElementById("themeIcon");
    if (themeIcon) {
      themeIcon.textContent = themeName === "dark" ? "🌙" : "☀️";
    }

    // Send to child windows and other tabs
    if (!skipBroadcast) {
      this.broadcastToChildren(themeName);
      this.broadcastToTabs(themeName);
    }

    console.log("[themeBroadcast] Theme applied:", themeName);
  },

  /**
   * Load theme.css in child window
   * @param {Window} childWindow - Popup window reference
   */
  loadThemeCSS(childWindow) {
    if (!childWindow || childWindow.closed) {
      console.warn("[themeBroadcast] Cannot load CSS - window is closed");
      return;
    }

    try {
      const cssUrl = new URL("/styles/theme.css", window.location.origin).href;

      const link = childWindow.document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      link.crossOrigin = "anonymous";

      childWindow.document.head.appendChild(link);

      console.log(
        "[themeBroadcast] ✅ CSS loaded in child window from:",
        cssUrl
      );
    } catch (e) {
      console.warn(
        "[themeBroadcast] Failed to load CSS in child window:",
        e.message
      );
    }
  },

  /**
   * Broadcast theme to all known child windows
   * ✅ FIXED: Only send to ACTUAL popup windows (not drawers/sidebars)
   * DeltaWindow is a drawer (sidebar), NOT a popup window!
   * @param {string} theme - 'light' or 'dark'
   */
  broadcastToChildren(theme) {
    // ✅ REMOVED 'DeltaWindow' - it's a drawer/sidebar, not a popup!
    // Only actual popup windows: ChannelListWindow, COMTRADE_Merger
    const windowNames = ["ChannelListWindow", "COMTRADE_Merger"];

    windowNames.forEach((name) => {
      try {
        const win = window.open("", name);
        if (win && !win.closed && win.location.href !== "about:blank") {
          win.postMessage({ theme }, "*");
          console.log(`[themeBroadcast] Theme sent to ${name}:`, theme);
        }
      } catch (e) {
        // Window doesn't exist or is blocked by CORS - ignore silently
        console.log(
          `[themeBroadcast] Window '${name}' not accessible:`,
          e.message
        );
      }
    });
  },

  /**
   * Broadcast theme to other tabs
   * @param {string} theme - 'light' or 'dark'
   */
  broadcastToTabs(theme) {
    if (this.channel) {
      try {
        this.channel.postMessage({ theme });
        console.log("[themeBroadcast] Theme broadcast to other tabs:", theme);
      } catch (e) {
        console.warn(
          "[themeBroadcast] Failed to broadcast to tabs:",
          e.message
        );
      }
    }
  },

  /**
   * Set up message listener for child windows to receive theme changes
   * Call this in child windows to listen for theme updates
   * @param {Function} callback - Called with (theme) when theme changes
   */
  listenForChanges(callback) {
    window.addEventListener("message", (ev) => {
      if (ev.data && ev.data.theme) {
        console.log(
          "[themeBroadcast] Child window received theme:",
          ev.data.theme
        );
        callback(ev.data.theme);
      }
    });
  },

  /**
   * Setup child window theme (call in popup windows)
   */
  setupChildWindow() {
    // Load CSS from parent
    const cssUrl = new URL("/styles/theme.css", window.location.origin).href;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);

    // Apply saved theme
    const savedTheme = localStorage.getItem("comtrade-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Listen for future changes
    this.listenForChanges((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("comtrade-theme", theme);
    });

    console.log("[themeBroadcast] ✅ Child window theme setup complete");
  },

  /**
   * Get current theme
   * @returns {string} 'light' or 'dark'
   */
  getTheme() {
    return this.currentTheme;
  },

  /**
   * Check if dark theme is active
   * @returns {boolean}
   */
  isDark() {
    return this.currentTheme === "dark";
  },

  /**
   * Check if light theme is active
   * @returns {boolean}
   */
  isLight() {
    return this.currentTheme === "light";
  },
};

export default themeBroadcast;
