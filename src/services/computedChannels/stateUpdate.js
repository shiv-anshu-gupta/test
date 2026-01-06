// File: src/services/computedChannels/stateUpdate.js
// Single Responsibility: Update application state

import { getComputedChannelsState } from "../../utils/computedChannelsState.js";
import { appendComputedChannelToStorage } from "../../utils/computedChannelStorage.js";

function resolveComputedGroup(channelData, cfgData) {
  const candidateGroup = (channelData?.group || "").trim();
  if (candidateGroup) {
    return candidateGroup;
  }

  const globalRef =
    typeof window !== "undefined"
      ? window
      : typeof globalThis !== "undefined"
      ? globalThis
      : null;

  let maxIndex = -1;
  const collectIndex = (value) => {
    if (typeof value !== "string") return;
    if (!value.startsWith("G")) return;
    const parsed = parseInt(value.slice(1), 10);
    if (!Number.isNaN(parsed) && parsed > maxIndex) {
      maxIndex = parsed;
    }
  };

  const collectArray = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach(collectIndex);
  };

  collectArray(
    (cfgData?.computedChannels || []).map((item) => item?.group || "")
  );

  try {
    const metadataState = globalRef?.__chartMetadataState;
    if (metadataState?.charts) {
      metadataState.charts.forEach((chart) => collectIndex(chart.userGroupId));
    }
    if (typeof metadataState?.nextUserGroupId === "number") {
      maxIndex = Math.max(maxIndex, metadataState.nextUserGroupId - 1);
    }
  } catch (err) {}

  collectArray(globalRef?.channelState?.analog?.groups);
  collectArray(globalRef?.channelState?.digital?.groups);
  collectArray(globalRef?.channelState?.computed?.groups);

  return `G${Math.max(0, maxIndex + 1)}`;
}

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
    // ✅ Channel already exists with stable ID
    const resolvedGroup = resolveComputedGroup(channelData, cfgData);
    channelData.group = resolvedGroup;
    existingChannel.group = resolvedGroup;

    if ((channelData?.unit || "").trim()) {
      existingChannel.unit = channelData.unit.trim();
    }
    if ((channelData?.color || "").trim()) {
      existingChannel.color = channelData.color.trim();
    }

    console.log(
      "[stateUpdate] 💾 Saving channel with stable ID to localStorage:",
      {
        id: existingChannel.id,
        name: existingChannel.name,
        group: existingChannel.group,
      }
    );

    // 💾 PERSIST to localStorage - use cfg.computedChannels (has correct numeric IDs)
    appendComputedChannelToStorage(existingChannel);
  } else {
    // ❌ Fallback: if no existing channel, create new one (shouldn't happen normally)
    console.warn(
      "[stateUpdate] ⚠️ No existing channel found in cfg, creating new entry"
    );

    // ✅ FIX: Detect unique group from existing groups in channelState
    const detectedGroup = resolveComputedGroup(channelData, cfgData);

    const newChannel = {
      id: channelData.id,
      name: channelData.name,
      equation: channelData.equation,
      mathJsExpression: channelData.mathJsExpression,
      unit: channelData.unit,
      type: "Analog",
      group: detectedGroup, // ✅ Use detected group
      index: window.globalData.computedData.length - 1,
    };

    channelData.group = detectedGroup;

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
  // ✅ Add computed channels to COMPUTED state (not analog)
  if (typeof window !== "undefined" && window.channelState?.computed) {
    const { channelState } = window;
    const computed = channelState.computed;

    // ✅ FIX: Look up group from cfg.computedChannels if not in channelData
    let channelGroup = channelData.group;
    if (
      !channelGroup &&
      typeof window !== "undefined" &&
      window.globalCfg?.computedChannels
    ) {
      const foundChannel = window.globalCfg.computedChannels.find(
        (ch) => ch.id === channelData.id
      );
      if (foundChannel) {
        channelGroup = foundChannel.group;
      }
    }
    // Final fallback to G0
    if (!channelGroup) {
      channelGroup = "G0";
    }

    // Add channel to computed reactive state
    computed.channelIDs.push(channelData.id);
    computed.yLabels.push(channelData.name || channelData.id);
    computed.lineColors.push("#FF6B6B"); // Default computed channel color
    computed.yUnits.push(channelData.unit || "");
    computed.groups.push(channelGroup); // ✅ Use detected group with fallback
    computed.scales.push(1);
    computed.starts.push(0);
    computed.durations.push("");
    computed.inverts.push(false);
    computed.equations.push(channelData.equation || "");

    console.log("[stateUpdate] ✅ Added computed channel with group:", {
      channelId: channelData.id,
      group: channelGroup,
      fromChannelData: !!channelData.group,
      fromCfg: !channelData.group && !!window.globalCfg?.computedChannels,
      computedChannelsCount: computed.channelIDs.length,
    });
  }
};
