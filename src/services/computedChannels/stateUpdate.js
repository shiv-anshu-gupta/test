// File: src/services/computedChannels/stateUpdate.js
// Single Responsibility: Update application state

import { getComputedChannelsState } from "../../utils/computedChannelsState.js";
import { appendComputedChannelToStorage } from "../../utils/computedChannelStorage.js";

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

  // ✅ IMPORTANT: The stable ID was already calculated and stored in ChannelList.js
  // So we just use the LAST entry in cfg.computedChannels which has the correct stable ID
  const existingChannel =
    cfgData.computedChannels[cfgData.computedChannels.length - 1];

  if (existingChannel && existingChannel.id) {
    // ✅ Channel already exists with stable ID - just save it to localStorage
    console.log("[stateUpdate] 💾 Saving existing channel to localStorage:", {
      id: existingChannel.id,
      name: existingChannel.name,
    });

    // 💾 PERSIST to localStorage - use the channel with stable ID from cfg!
    appendComputedChannelToStorage(existingChannel);
  } else {
    // ❌ Fallback: if no existing channel, create new one (shouldn't happen normally)
    console.warn(
      "[stateUpdate] ⚠️ No existing channel found, creating new entry"
    );

    const newChannel = {
      id: channelData.id,
      name: channelData.name,
      equation: channelData.equation,
      mathJsExpression: channelData.mathJsExpression,
      unit: channelData.unit,
      type: "Analog",
      group: "G0",
      index: window.globalData.computedData.length - 1,
    };

    cfgData.computedChannels.push(newChannel);
    appendComputedChannelToStorage(newChannel);
  }
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
    analog.groups.push("G0"); // ✅ Use numeric group G0 (not word "Analog") to group with analog channels
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
