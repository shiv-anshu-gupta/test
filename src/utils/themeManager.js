/**
 * Theme Manager
 * Handles light/dark theme switching for the entire application
 */

export const THEMES = {
  light: {
    // Primary colors
    "--bg-primary": "#f5f5f5",
    "--bg-secondary": "#ffffff",
    "--bg-tertiary": "#f0f0f0",
    "--bg-sidebar": "#ffffff",
    "--text-primary": "#1a1a1a",
    "--text-secondary": "#666666",
    "--text-muted": "#999999",
    "--border-color": "#e0e0e0",
    // Chart specific
    "--chart-bg": "#ffffff",
    "--chart-text": "#1a1a1a",
    "--chart-grid": "#e0e0e0",
    "--chart-axis": "#666666",
  },
  dark: {
    // Primary colors
    "--bg-primary": "#1a1a1a",
    "--bg-secondary": "#2d2d2d",
    "--bg-tertiary": "#3a3a3a",
    "--bg-sidebar": "#2d2d2d",
    "--text-primary": "#ffffff",
    "--text-secondary": "#cccccc",
    "--text-muted": "#888888",
    "--border-color": "#404040",
    // Chart specific
    "--chart-bg": "#252525",
    "--chart-text": "#ffffff",
    "--chart-grid": "#404040",
    "--chart-axis": "#cccccc",
  },
};

/**
 * Get current theme from localStorage or default to 'light'
 */
export function getCurrentTheme() {
  const stored = localStorage.getItem("comtrade-theme");
  // Default to dark theme if not set
  return stored || "dark";
}

/**
 * Apply theme by updating CSS variables
 */
export function applyTheme(themeName) {
  const theme = THEMES[themeName];
  if (!theme) {
    console.error("[themeManager] Unknown theme:", themeName);
    return;
  }

  // Apply CSS variables to root
  Object.entries(theme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
    console.log(`[themeManager] Set ${key} = ${value}`);
  });

  // Save to localStorage
  localStorage.setItem("comtrade-theme", themeName);

  // Verify the variables were set
  console.log(`[themeManager] ✅ Theme switched to: ${themeName}`);
  console.log(
    `[themeManager] --chart-text = ${getComputedStyle(
      document.documentElement
    ).getPropertyValue("--chart-text")}`
  );
  console.log(
    `[themeManager] --chart-grid = ${getComputedStyle(
      document.documentElement
    ).getPropertyValue("--chart-grid")}`
  );

  // Dispatch custom event for dynamic elements
  window.dispatchEvent(
    new CustomEvent("themeChanged", { detail: { theme: themeName } })
  );
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const newTheme = current === "light" ? "dark" : "light";
  applyTheme(newTheme);
  return newTheme;
}

/**
 * Initialize theme on app load
 */
export function initTheme() {
  const theme = getCurrentTheme();
  applyTheme(theme);
  console.log(`[themeManager] Theme initialized: ${theme}`);
}

/**
 * Get theme-specific color
 */
export function getThemeColor(colorKey) {
  const theme = getCurrentTheme();
  return THEMES[theme][colorKey];
}

/**
 * Get all colors for current theme
 */
export function getCurrentThemeColors() {
  const theme = getCurrentTheme();
  return THEMES[theme];
}
