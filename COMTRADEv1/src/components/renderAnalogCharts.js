import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { createCustomElement } from '../utils/helpers.js';
import { createChartContainer, initUPlotChart } from '../utils/chartDomUtils.js';
import verticalLinePlugin from '../plugins/verticalLinePlugin.js';

export function renderAnalogCharts(cfg, data, chartsContainer, charts, verticalLinesX, channelState, autoGroupChannels) {
  const groups = autoGroupChannels(cfg.analogChannels);
  groups.forEach(group => {
    const dragBar = createDragBar(group, cfg, channelState);
    const { parentDiv, chartDiv } = createChartContainer(dragBar);
    chartsContainer.appendChild(parentDiv);
    const yLabels = channelState.analog.yLabels;
    const lineColors = channelState.analog.lineColors;
    const yUnits = channelState.analog.yUnits;
    const axesScales = channelState.analog.axesScales;
    const xLabel = channelState.analog.xLabel;
    const xUnit = channelState.analog.xUnit;
    const groupYLabels = group.indices.map(idx => yLabels[idx]);
    const groupLineColors = group.indices.map(idx => lineColors[idx]);
    const groupYUnits = group.indices.map(idx => yUnits[idx]);
    const groupAxesScales = [axesScales[0], ...group.indices.map(idx => axesScales[idx + 1])];
    const chartData = [data.time, ...group.indices.map(idx => data.analogData[idx])];
    const opts = createChartOptions({
      title: "",
      yLabels: groupYLabels,
      lineColors: groupLineColors,
      verticalLinesX: verticalLinesX,
      xLabel,
      xUnit,
      getCharts: () => charts,
      yUnits: groupYUnits,
      axesScales: groupAxesScales,
      singleYAxis: true,
    });
    opts.plugins = opts.plugins || [];
    opts.plugins = opts.plugins.filter(p => !(p && p.id === 'verticalLinePlugin'));
    opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));
    initUPlotChart(opts, chartData, chartDiv, charts);
  });
}
