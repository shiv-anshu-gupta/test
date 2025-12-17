/**
 * Computed Channel Storage Manager
 * Persists computed channels to localStorage for persistence across page reloads
 */

const STORAGE_KEY = "COMTRADE_COMPUTED_CHANNELS";
const STORAGE_METADATA_KEY = "COMTRADE_COMPUTED_METADATA";

/**
 * Save computed channels to localStorage
 * @param {Array} computedData - Array of computed channel objects
 * @param {Object} metadata - Optional metadata to save
 * @returns {boolean} Success status
 */
export function saveComputedChannelsToStorage(computedData, metadata = {}) {
  try {
    if (!Array.isArray(computedData)) {
      throw new Error("computedData must be an array");
    }

    // Prepare data for storage (exclude large uPlot references)
    const dataToStore = computedData.map((channel) => ({
      name: channel.name || channel.id,
      data: channel.data, // Array of numeric values
      unit: channel.unit,
      type: channel.type || "Computed",
      group: channel.group || "Computed",
      expression: channel.expression || channel.equation,
      color: channel.color,
      min: channel.min,
      max: channel.max,
      samples: channel.samples || (channel.data ? channel.data.length : 0),
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    localStorage.setItem(
      STORAGE_METADATA_KEY,
      JSON.stringify({
        ...metadata,
        savedAt: new Date().toISOString(),
        channelCount: dataToStore.length,
      })
    );

    console.log(
      `✅ Saved ${dataToStore.length} computed channels to localStorage`
    );
    return true;
  } catch (error) {
    console.error("[Storage] Error saving computed channels:", error);
    return false;
  }
}

/**
 * Load computed channels from localStorage
 * @returns {Array} Array of computed channel objects or empty array if none found
 */
export function loadComputedChannelsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("[Storage] No computed channels found in localStorage");
      return [];
    }

    const computedData = JSON.parse(stored);
    const metadata = JSON.parse(
      localStorage.getItem(STORAGE_METADATA_KEY) || "{}"
    );

    console.log(
      `✅ Loaded ${computedData.length} computed channels from localStorage (saved at ${metadata.savedAt})`
    );

    return Array.isArray(computedData) ? computedData : [];
  } catch (error) {
    console.error("[Storage] Error loading computed channels:", error);
    return [];
  }
}

/**
 * Clear all computed channels from localStorage
 * @returns {boolean} Success status
 */
export function clearComputedChannelsFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_METADATA_KEY);
    console.log("✅ Cleared computed channels from localStorage");
    return true;
  } catch (error) {
    console.error("[Storage] Error clearing computed channels:", error);
    return false;
  }
}

/**
 * Get storage metadata
 * @returns {Object} Metadata object or empty object if none
 */
export function getComputedChannelStorageMetadata() {
  try {
    const metadata = localStorage.getItem(STORAGE_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : {};
  } catch (error) {
    console.error("[Storage] Error reading metadata:", error);
    return {};
  }
}

/**
 * Check if stored computed channels exist
 * @returns {boolean} True if computed channels are stored
 */
export function hasStoredComputedChannels() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}
