/**
 * Child Theme Manager
 * Handles theme synchronization for child windows (merger app)
 * Listens for theme changes from parent window and applies them locally
 */

// Import THEMES from parent if available, otherwise use fallback
let THEMES = {
  light: {
    "--bg-primary": "#f5f5f5",
    "--bg-secondary": "#ffffff",
    "--bg-tertiary": "#f0f0f0",
    "--bg-sidebar": "#ffffff",
    "--text-primary": "#1a1a1a",
    "--text-secondary": "#666666",
    "--text-muted": "#999999",
    "--border-color": "#e0e0e0",
    "--chart-bg": "#ffffff",
    "--chart-text": "#1a1a1a",
    "--chart-grid": "#e0e0e0",
    "--chart-axis": "#666666",
  },
  dark: {
    "--bg-primary": "#1a1a1a",
    "--bg-secondary": "#2d2d2d",
    "--bg-tertiary": "#3a3a3a",
    "--bg-sidebar": "#2d2d2d",
    "--text-primary": "#ffffff",
    "--text-secondary": "#cccccc",
    "--text-muted": "#888888",
    "--border-color": "#404040",
    "--chart-bg": "#252525",
    "--chart-text": "#ffffff",
    "--chart-grid": "#404040",
    "--chart-axis": "#cccccc",
  },
};

/**
 * Initialize child theme manager
 * Sets up listeners for parent theme changes
 */
export function initChildThemeManager() {
  // Listen for theme changes from parent window
  listenForParentThemeChanges();

  // Apply initial theme from localStorage or default to light
  const savedTheme = localStorage.getItem("comtrade-theme") || "light";
  applyTheme(savedTheme);

  console.log(`[childThemeManager] Initialized with theme: ${savedTheme}`);
}

/**
 * Listen for theme changes from parent window
 */
function listenForParentThemeChanges() {
  if (!window.opener) {
    console.log("[childThemeManager] No parent window, skipping theme sync");
    return;
  }

  window.addEventListener("message", (event) => {
    // Only accept messages from parent window
    if (event.source !== window.opener) return;

    const { source, type, payload } = event.data || {};

    if (source === "MainApp" && type === "theme_change") {
      const { theme, colors } = payload;
      console.log(
        `[childThemeManager] Received theme change from parent: ${theme}`
      );

      // Apply theme in child window
      applyTheme(theme, colors);
    }
  });

  // Request current theme from parent on load
  requestThemeFromParent();

  console.log("[childThemeManager] Listening for parent theme changes");
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
          windowType: "merger",
          timestamp: Date.now(),
        },
      },
      "*"
    );
  } catch (err) {
    console.warn(
      "[childThemeManager] Could not request theme from parent:",
      err
    );
  }
}

/**
 * Apply theme to child window
 * @param {string} themeName - Theme name ('light' or 'dark')
 * @param {object} customColors - Optional custom colors from parent
 */
export function applyTheme(themeName, customColors = null) {
  const colors = customColors || THEMES[themeName];

  if (!colors) {
    console.error(`[childThemeManager] Unknown theme: ${themeName}`);
    return;
  }

  // Apply CSS variables to document root
  const root = document.documentElement.style;
  Object.entries(colors).forEach(([key, value]) => {
    root.setProperty(key, value);
  });

  // Save to localStorage for persistence
  localStorage.setItem("comtrade-theme", themeName);

  // Dispatch custom event for components that need to react to theme changes
  window.dispatchEvent(
    new CustomEvent("themeChanged", {
      detail: {
        theme: themeName,
        fromParent: !!customColors,
        colors,
      },
    })
  );

  console.log(`[childThemeManager] Applied theme: ${themeName}`);
}

/**
 * Get current theme name
 */
export function getCurrentTheme() {
  return localStorage.getItem("comtrade-theme") || "light";
}

/**
 * Get current theme colors
 */
export function getCurrentThemeColors() {
  const theme = getCurrentTheme();
  return THEMES[theme];
}

/**
 * Check if current theme is dark
 */
export function isDarkTheme() {
  return getCurrentTheme() === "dark";
}
