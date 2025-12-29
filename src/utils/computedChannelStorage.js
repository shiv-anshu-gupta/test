/**
 * Computed Channel Storage Manager
 * Persists computed channels to localStorage for persistence across page reloads
 */

const STORAGE_KEY = "COMTRADE_COMPUTED_CHANNELS";
const STORAGE_METADATA_KEY = "COMTRADE_COMPUTED_METADATA";

/**
 * Save computed channels to localStorage with merge (not replace!)
 * @param {Array} computedData - Array of computed channel objects
 * @param {Object} metadata - Optional metadata to save
 * @returns {boolean} Success status
 */
export function saveComputedChannelsToStorage(computedData, metadata = {}) {
  try {
    if (!Array.isArray(computedData)) {
      throw new Error("computedData must be an array");
    }

    // ✅ STEP 1: Load existing channels from localStorage
    const existingData = loadComputedChannelsFromStorage();

    console.log(
      `[Storage] 📂 Loaded ${existingData.length} existing channels from localStorage`
    );

    // ✅ STEP 2: Merge new channels with existing (avoiding duplicates)
    const mergedData = [...existingData];

    computedData.forEach((newChannel) => {
      // Check if channel already exists (by name, id, or expression)
      const existingIndex = mergedData.findIndex(
        (ch) =>
          ch.name === (newChannel.name || newChannel.id) ||
          ch.id === newChannel.id ||
          ch.expression === (newChannel.expression || newChannel.equation)
      );

      if (existingIndex >= 0) {
        // ✅ UPDATE existing channel
        console.log(
          `[Storage] 🔄 Updating existing channel: ${
            newChannel.name || newChannel.id
          }`
        );
        mergedData[existingIndex] = {
          ...mergedData[existingIndex],
          ...newChannel,
        };
      } else {
        // ✅ ADD new channel
        console.log(
          `[Storage] ➕ Adding new channel: ${newChannel.name || newChannel.id}`
        );
        mergedData.push(newChannel);
      }
    });

    // ✅ STEP 3: Prepare data for storage (exclude large uPlot references)
    const dataToStore = mergedData.map((channel) => ({
      id: channel.id, // ✅ FIRST: Stable numeric ID for table S.No.
      name: channel.name || channel.id,
      data: channel.data, // Array of numeric values
      unit: channel.unit,
      type: channel.type || "Analog", // ✅ Default to "Analog" not "Computed"
      group: channel.group || "G0", // ✅ Default to "G0" not "Computed"
      expression: channel.expression || channel.equation,
      color: channel.color,
      min: channel.min,
      max: channel.max,
      samples: channel.samples || (channel.data ? channel.data.length : 0),
    }));

    // ✅ STEP 4: Save merged data
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
      `✅ Saved ${dataToStore.length} computed channels to localStorage (${existingData.length} existing + ${computedData.length} new)`
    );
    return true;
  } catch (error) {
    console.error("[Storage] Error saving computed channels:", error);
    return false;
  }
}

/**
 * Append a single computed channel to localStorage (convenience helper)
 * @param {Object} channelData - Single channel object
 * @returns {boolean} Success status
 */
export function appendComputedChannelToStorage(channelData) {
  try {
    // Load existing channels
    const existingChannels = loadComputedChannelsFromStorage();

    // Check for duplicates
    const isDuplicate = existingChannels.some(
      (ch) =>
        ch.name === (channelData.name || channelData.id) ||
        ch.id === channelData.id
    );

    if (isDuplicate) {
      console.log(
        `[Storage] 🔄 Channel already exists: ${channelData.name}, updating instead`
      );
      // Update existing
      const updatedChannels = existingChannels.map((ch) =>
        ch.name === (channelData.name || channelData.id) ||
        ch.id === channelData.id
          ? { ...ch, ...channelData }
          : ch
      );
      return saveComputedChannelsToStorage(updatedChannels);
    }

    // Append new channel
    const updatedChannels = [...existingChannels, channelData];
    return saveComputedChannelsToStorage(updatedChannels);
  } catch (error) {
    console.error("[Storage] Error appending channel:", error);
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
