// File: src/services/computedChannels/stateUpdate.js
// Single Responsibility: Update application state

import { getComputedChannelsState } from "../../utils/computedChannelsState.js";

/**
 * Save channel to global data
 */
export const saveToGlobalData = (channelData) => {
  if (!window.globalData.computedData) {
    window.globalData.computedData = [];
  }
  window.globalData.computedData.push(channelData);
};

/**
 * Save channel to cfg
 */
export const saveToCfg = (channelData, cfgData) => {
  if (!cfgData.computedChannels) {
    cfgData.computedChannels = [];
  }

  cfgData.computedChannels.push({
    id: channelData.id,
    name: channelData.name,
    equation: channelData.equation,
    mathJsExpression: channelData.mathJsExpression,
    unit: channelData.unit,
    type: "Analog", // ✅ Set type to Analog so it displays with analog channels
    group: "Analog", // ✅ Add to Analog group instead of Computed group
    index: window.globalData.computedData.length - 1,
  });
};

/**
 * Update computed channels state store and channelState
 */
export const updateStateStore = (channelData) => {
  const computedChannelsState = getComputedChannelsState();
  if (computedChannelsState?.addChannel) {
    computedChannelsState.addChannel(channelData.id, channelData, "parent");
  }

  // Update reactive channelState for tabulator
  // ✅ Add computed channels to ANALOG group so they display with analog channels
  if (typeof window !== "undefined" && window.channelState?.analog) {
    const { channelState } = window;
    const analog = channelState.analog;

    // Add channel to analog reactive state
    analog.channelIDs.push(channelData.id);
    analog.yLabels.push(channelData.name || channelData.id);
    analog.lineColors.push("#FF6B6B"); // Default computed channel color
    analog.yUnits.push(channelData.unit || "");
    analog.groups.push("Analog"); // ✅ Add to Analog group
    analog.scales.push(1);
    analog.starts.push(0);
    analog.durations.push("");
    analog.inverts.push(false);
    analog.equations.push(channelData.equation || "");
    analog.types.push("Analog"); // ✅ Mark as Analog type

    console.log("[stateUpdate] ✅ Added computed channel to analog group:", {
      analogChannelCount: analog.channelIDs.length,
      newChannelId: channelData.id,
    });
  }
};
