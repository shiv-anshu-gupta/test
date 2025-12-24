/**
 * Global Theme State Manager
 * Provides centralized theme state management across all windows/applications
 * Uses createState for reactive theme management and postMessage for cross-window sync
 */

import { createState } from "../components/createState.js";
import { applyTheme, getCurrentTheme, THEMES } from "../utils/themeManager.js";
import { getMergerWindow } from "../utils/mergerWindowLauncher.js";

// Global theme state - shared across all windows
let globalThemeState = null;

/**
 * Get reference to the ChannelList window
 * @function getChannelListWindow
 * @returns {Window|null} Reference to ChannelList window or null
 */
export function getChannelListWindow() {
  try {
    // Try to access the named ChannelList window
    const channelListWindow = window.open("", "ChannelListWindow");
    if (channelListWindow && !channelListWindow.closed) {
      return channelListWindow;
    }
  } catch (err) {
    // Window might not exist or be accessible
  }
  return null;
}

/**
 * Initialize global theme state
 * Should be called once in the main application
 */
export function initGlobalThemeState() {
  if (globalThemeState) {
    console.warn("[globalThemeState] Already initialized");
    return globalThemeState;
  }

  // Get current theme from localStorage
  const currentTheme = getCurrentTheme();

  // Create reactive state
  globalThemeState = createState({
    currentTheme,
    colors: THEMES[currentTheme],
    isDark: currentTheme === "dark",
  });

  // Subscribe to theme changes
  globalThemeState.subscribe((change) => {
    if (change.path.includes("currentTheme")) {
      const newTheme = change.newValue;
      console.log(`[globalThemeState] Theme changed to: ${newTheme}`);

      // Update colors
      globalThemeState.colors = THEMES[newTheme];
      globalThemeState.isDark = newTheme === "dark";

      // Apply theme to current window
      applyTheme(newTheme);

      // Broadcast theme change to child windows
      broadcastThemeChange(newTheme);
    }
  });

  console.log(`[globalThemeState] Initialized with theme: ${currentTheme}`);
  return globalThemeState;
}

/**
 * Get the global theme state
 * Can be called from any window to access the shared theme state
 */
export function getGlobalThemeState() {
  if (!globalThemeState) {
    console.warn("[globalThemeState] Not initialized, initializing now...");
    return initGlobalThemeState();
  }
  return globalThemeState;
}

/**
 * Set theme globally
 * Updates the global state which triggers all subscribers
 */
export function setGlobalTheme(themeName) {
  const state = getGlobalThemeState();
  if (THEMES[themeName]) {
    state.currentTheme = themeName;
  } else {
    console.error(`[globalThemeState] Unknown theme: ${themeName}`);
  }
}

/**
 * Toggle between light and dark themes
 */
export function toggleGlobalTheme() {
  const state = getGlobalThemeState();
  const newTheme = state.currentTheme === "light" ? "dark" : "light";
  setGlobalTheme(newTheme);
  return newTheme;
}

/**
 * Broadcast theme change to all child windows
 */
function broadcastThemeChange(themeName) {
  // Send message to merger window
  const mergerWindow = getMergerWindow();
  if (mergerWindow && !mergerWindow.closed) {
    try {
      mergerWindow.postMessage(
        {
          source: "MainApp",
          type: "theme_change",
          payload: {
            theme: themeName,
            colors: THEMES[themeName],
            timestamp: Date.now(),
          },
        },
        "*"
      );
      console.log(
        `[globalThemeState] Broadcasted theme change to merger window: ${themeName}`
      );
    } catch (err) {
      console.warn(
        "[globalThemeState] Could not broadcast to merger window:",
        err
      );
    }
  }

  // Send message to ChannelList window
  const channelListWindow = getChannelListWindow();
  if (channelListWindow && !channelListWindow.closed) {
    try {
      channelListWindow.postMessage(
        {
          source: "MainApp",
          type: "theme_change",
          payload: {
            theme: themeName,
            colors: THEMES[themeName],
            timestamp: Date.now(),
          },
        },
        "*"
      );
      console.log(
        `[globalThemeState] Broadcasted theme change to ChannelList window: ${themeName}`
      );
    } catch (err) {
      console.warn(
        "[globalThemeState] Could not broadcast to ChannelList window:",
        err
      );
    }
  }

  // Send to any other child windows (can be extended)
  // You can add more child window references here as needed
}

/**
 * Listen for theme changes from parent window (for child windows)
 * Should be called in child windows to sync with parent theme
 */
export function listenForParentThemeChanges() {
  if (!window.opener) {
    console.log("[globalThemeState] No parent window, skipping theme sync");
    return;
  }

  window.addEventListener("message", (event) => {
    // Only accept messages from parent window
    if (event.source !== window.opener) return;

    const { source, type, payload } = event.data || {};

    if (source === "MainApp" && type === "theme_change") {
      const { theme, colors } = payload;
      console.log(
        `[globalThemeState] Received theme change from parent: ${theme}`
      );

      // Apply theme in child window
      applyThemeInChildWindow(theme, colors);
    }
  });

  // Request current theme from parent on load
  requestThemeFromParent();

  console.log("[globalThemeState] Listening for parent theme changes");
}

/**
 * Request current theme from parent window
 */
function requestThemeFromParent() {
  if (!window.opener || window.opener.closed) return;

  try {
    window.opener.postMessage(
      {
        source: "ChildApp",
        type: "theme_request",
        payload: {
          windowType: window.location.pathname.includes("merger")
            ? "merger"
            : "unknown",
          timestamp: Date.now(),
        },
      },
      "*"
    );
  } catch (err) {
    console.warn(
      "[globalThemeState] Could not request theme from parent:",
      err
    );
  }
}

/**
 * Apply theme in child window
 */
function applyThemeInChildWindow(themeName, colors) {
  // Apply CSS variables to child window
  const root = document.documentElement.style;
  Object.entries(colors).forEach(([key, value]) => {
    root.setProperty(key, value);
  });

  // Save to localStorage for persistence
  localStorage.setItem("comtrade-theme", themeName);

  // Dispatch custom event for child window components
  window.dispatchEvent(
    new CustomEvent("themeChanged", {
      detail: { theme: themeName, fromParent: true },
    })
  );

  console.log(`[globalThemeState] Applied theme in child window: ${themeName}`);
}

/**
 * Listen for theme requests from child windows (for parent window)
 * Should be called in main application
 */
export function listenForChildThemeRequests() {
  window.addEventListener("message", (event) => {
    const { source, type, payload } = event.data || {};

    if (source === "ChildApp" && type === "theme_request") {
      // Send current theme to requesting child
      const currentTheme = getGlobalThemeState().currentTheme;
      const colors = THEMES[currentTheme];

      try {
        event.source.postMessage(
          {
            source: "MainApp",
            type: "theme_change",
            payload: {
              theme: currentTheme,
              colors,
              timestamp: Date.now(),
            },
          },
          "*"
        );
        console.log(
          `[globalThemeState] Sent current theme to child: ${currentTheme}`
        );
      } catch (err) {
        console.warn("[globalThemeState] Could not send theme to child:", err);
      }
    }
  });
}

/**
 * Get current theme colors (reactive)
 */
export function getCurrentThemeColors() {
  return getGlobalThemeState().colors;
}

/**
 * Check if current theme is dark
 */
export function isDarkTheme() {
  return getGlobalThemeState().isDark;
}
