import { createState } from "../components/createState.js";

const chartMetadataState = createState({
  charts: [],
  nextUserGroupId: 0,
  nextAnalogId: 0,
  nextDigitalId: 0,
  nextComputedId: 0,
});

function generateUPlotInstance(chartType, state) {
  switch (chartType) {
    case "analog": {
      const value = `A${state.nextAnalogId}`;
      state.nextAnalogId += 1;
      return value;
    }
    case "digital": {
      const value = `D${state.nextDigitalId}`;
      state.nextDigitalId += 1;
      return value;
    }
    case "computed": {
      const value = `C${state.nextComputedId}`;
      state.nextComputedId += 1;
      return value;
    }
    default: {
      const value = `X${state.nextComputedId}`;
      state.nextComputedId += 1;
      return value;
    }
  }
}

function renumberUserGroupIds(state) {
  state.charts.forEach((chart, index) => {
    const expected = `G${index}`;
    if (chart.userGroupId !== expected) {
      chart.userGroupId = expected;
    }
  });
  state.nextUserGroupId = state.charts.length;
}

function computeNextComputedIdFromCharts(charts) {
  return charts.reduce((nextId, chart) => {
    const match = /C(\d+)/.exec(chart.uPlotInstance || "");
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed)) {
        return Math.max(nextId, parsed + 1);
      }
    }
    return nextId;
  }, 0);
}

export function getChartMetadataState() {
  return chartMetadataState;
}

export function addChart(metadata = {}) {
  const state = chartMetadataState;
  const chartType = metadata.chartType || "unknown";
  const assignedUserGroupId = `G${state.nextUserGroupId}`;
  state.nextUserGroupId += 1;

  const assignedUPlotInstance = generateUPlotInstance(chartType, state);

  const fullMetadata = {
    userGroupId: assignedUserGroupId,
    uPlotInstance: assignedUPlotInstance,
    chartType,
    ...metadata,
    userGroupId: assignedUserGroupId,
    uPlotInstance: assignedUPlotInstance,
  };

  state.charts.push(fullMetadata);

  console.log("[chartMetadataStore] Added chart", fullMetadata);
  return fullMetadata;
}

export function removeChart(userGroupId) {
  const state = chartMetadataState;
  const index = state.charts.findIndex(
    (chart) => chart.userGroupId === userGroupId
  );
  if (index === -1) {
    console.warn(
      "[chartMetadataStore] Attempted to remove missing chart",
      userGroupId
    );
    return null;
  }

  const [removed] = state.charts.splice(index, 1);
  renumberUserGroupIds(state);

  console.log("[chartMetadataStore] Removed chart", {
    removed,
    remaining: state.charts.map((chart) => chart.userGroupId),
  });
  return removed;
}

export function getChartByUserGroupId(userGroupId) {
  const chart = chartMetadataState.charts.find(
    (item) => item.userGroupId === userGroupId
  );
  console.log("[chartMetadataStore] Lookup by userGroupId", userGroupId, chart);
  return chart || null;
}

export function getChartByUPlotInstance(uPlotInstance) {
  const chart = chartMetadataState.charts.find(
    (item) => item.uPlotInstance === uPlotInstance
  );
  console.log(
    "[chartMetadataStore] Lookup by uPlotInstance",
    uPlotInstance,
    chart
  );
  return chart || null;
}

export function getChartsByType(chartType) {
  const charts = chartMetadataState.charts.filter(
    (item) => item.chartType === chartType
  );
  console.log("[chartMetadataStore] Lookup by type", chartType, charts.length);
  return charts;
}

export function clearAllCharts() {
  const state = chartMetadataState;
  state.charts = [];
  state.nextUserGroupId = 0;
  state.nextAnalogId = 0;
  state.nextDigitalId = 0;
  state.nextComputedId = 0;
  console.log("[chartMetadataStore] Cleared all charts");
}

export function resetForFileReload() {
  const state = chartMetadataState;
  const computedCharts = state.charts.filter(
    (chart) => chart.chartType === "computed"
  );

  state.charts = computedCharts.map((chart, index) => ({
    ...chart,
    userGroupId: `G${index}`,
  }));

  state.nextUserGroupId = state.charts.length;
  state.nextAnalogId = 0;
  state.nextDigitalId = 0;
  state.nextComputedId = computeNextComputedIdFromCharts(state.charts);

  console.log("[chartMetadataStore] Reset for file reload", {
    preservedComputed: state.charts.length,
    nextComputedId: state.nextComputedId,
  });
  return state.charts;
}

export default chartMetadataState;
