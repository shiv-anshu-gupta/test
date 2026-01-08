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

  const rawId =
    channelData?.id ?? channelData?.name ?? `computed_${Date.now()}`;
  const normalizedId = rawId;
  const comparisonId = rawId != null ? String(rawId) : null;

  const rawName = channelData?.name ?? channelData?.id ?? normalizedId;
  const normalizedName = String(rawName);

  // Ensure the channelData object carries the normalized identifiers
  channelData.id = normalizedId;
  channelData.name = normalizedName;

  const resolvedGroup = resolveComputedGroup(channelData, cfgData);
  channelData.group = resolvedGroup;

  const findMatchingChannel = (item) => {
    if (!item) return false;
    if (comparisonId !== null && String(item.id) === comparisonId) {
      return true;
    }
    if (String(item.name) === normalizedName) {
      return true;
    }
    if (channelData.equation && item.equation === channelData.equation) {
      return true;
    }
    return false;
  };

  const existingIndex = cfgData.computedChannels.findIndex(findMatchingChannel);

  const computeIndex = () => {
    if (typeof channelData.index === "number") {
      return channelData.index;
    }

    const computedLength =
      typeof window !== "undefined" &&
      Array.isArray(window.globalData?.computedData)
        ? window.globalData.computedData.length
        : 0;

    if (computedLength > 0) {
      return computedLength - 1;
    }

    return cfgData.computedChannels.length;
  };

  const buildChannelPayload = (existingChannel = {}) => {
    return {
      ...existingChannel,
      id: normalizedId,
      name: normalizedName,
      equation: channelData.equation ?? existingChannel.equation,
      mathJsExpression:
        channelData.mathJsExpression ?? existingChannel.mathJsExpression,
      unit: channelData.unit ?? existingChannel.unit ?? "",
      type: channelData.type ?? existingChannel.type ?? "Analog",
      group: resolvedGroup,
      color: channelData.color ?? existingChannel.color,
      index:
        typeof existingChannel.index === "number"
          ? existingChannel.index
          : computeIndex(),
    };
  };

  if (existingIndex >= 0) {
    const mergedChannel = buildChannelPayload(
      cfgData.computedChannels[existingIndex]
    );
    cfgData.computedChannels[existingIndex] = mergedChannel;

    console.log("[stateUpdate] 💾 Updating existing computed channel:", {
      id: mergedChannel.id,
      name: mergedChannel.name,
      group: mergedChannel.group,
    });

    appendComputedChannelToStorage(mergedChannel);
  } else {
    const newChannel = buildChannelPayload();

    cfgData.computedChannels.push(newChannel);

    console.log("[stateUpdate] 💾 Added new computed channel:", {
      id: newChannel.id,
      name: newChannel.name,
      group: newChannel.group,
    });

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
    computed.lineColors.push(channelData.color || "#4ECDC4");
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
