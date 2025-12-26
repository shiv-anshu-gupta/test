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
    group: "Computed",
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
  if (typeof window !== "undefined" && window.channelState?.computed) {
    const { channelState } = window;
    const computed = channelState.computed;

    // Add channel to reactive state
    computed.channelIDs.push(channelData.id);
    computed.yLabels.push(channelData.name || channelData.id);
    computed.lineColors.push("#FF6B6B"); // Default computed channel color
    computed.yUnits.push(channelData.unit || "");
    computed.groups.push("Computed");
    computed.scales.push(1);
    computed.starts.push(0);
    computed.durations.push("");
    computed.inverts.push(false);
    computed.equations.push(channelData.equation || "");

    console.log("[stateUpdate] ✅ Updated channelState.computed:", {
      channelIDs: computed.channelIDs.length,
      id: channelData.id,
    });
  }
};
