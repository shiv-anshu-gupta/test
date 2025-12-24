/**
 * Theme Synchronization Test
 * Tests the global theme state and cross-window communication
 */

import {
  initGlobalThemeState,
  toggleGlobalTheme,
  getGlobalThemeState,
} from "../src/utils/globalThemeState.js";

// Test global theme state initialization
console.log("=== Testing Global Theme State ===");

// Initialize global theme state
const globalState = initGlobalThemeState();
console.log("Global theme state initialized:", globalState);

// Test theme toggle
console.log("Current theme:", globalState.currentTheme);
console.log("Is dark:", globalState.isDark);

// Toggle theme
const newTheme = toggleGlobalTheme();
console.log("After toggle - Current theme:", globalState.currentTheme);
console.log("After toggle - Is dark:", globalState.isDark);

// Test reactive updates
globalState.subscribe((change) => {
  console.log("Theme state changed:", change);
});

// Toggle again to test reactivity
setTimeout(() => {
  console.log("Toggling theme again...");
  toggleGlobalTheme();
}, 1000);

console.log("=== Theme Synchronization Test Complete ===");
