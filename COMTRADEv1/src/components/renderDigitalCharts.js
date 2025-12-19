import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { findChangedDigitalChannelIndices } from "../utils/digitalChannelUtils.js";
import { createCustomElement } from '../utils/helpers.js';
import verticalLinePlugin from '../plugins/verticalLinePlugin.js';

export function renderDigitalCharts(cfg, data, chartsContainer, charts, verticalLinesX, channelState) {
  const DigChannelOffset = 3;
  const parentDiv = createCustomElement("div", "chart-parent-container");
  const changedIndices = findChangedDigitalChannelIndices(data.digitalData);
  const digitalIndicesToShow = changedIndices;
  const digitalChannelsToShow = digitalIndicesToShow.map(i => cfg.digitalChannels[i]);
  const digitalDataToShow = digitalIndicesToShow.map(i => data.digitalData[i]);
  const yLabels = channelState.digital.yLabels;
  const lineColors = channelState.digital.lineColors;
  const yUnits = channelState.digital.yUnits;
  const axesScales = channelState.digital.axesScales;
  const xLabel = channelState.digital.xLabel;
  const xUnit = channelState.digital.xUnit;
  parentDiv.appendChild(createDragBar({
    indices: digitalChannelsToShow.map((_, i) => i),
    colors: lineColors
  }, { analogChannels: digitalChannelsToShow }, channelState));
  const chartDiv = createCustomElement("div", "chart-container");
  parentDiv.appendChild(chartDiv);
  chartsContainer.appendChild(parentDiv);
  //const verticalLinesXState = verticalLinesX;
  const digitalDataZeroOne = digitalDataToShow.map(arr => arr.map(v => (v ? 1 : 0)));
  const chartData = [data.time, ...digitalDataZeroOne];
  const digitalFillSignals = digitalChannelsToShow.map((ch, i) => ({
    signalIndex: i + 1,
    offset: (digitalChannelsToShow.length - 1 - i) * DigChannelOffset,
    color: lineColors[i],
    targetVal: 1
  }));
  const yMin = -0.5;
  const yMax = (digitalChannelsToShow.length - 1) * DigChannelOffset + 2;
  const scales = {
    x: { time: false, auto: true },
    y: { min: yMin, max: yMax, auto: false }
  };
  const opts = createChartOptions({
    title: "Digital Channels",
    yLabels,
    lineColors,
    verticalLinesX: verticalLinesX,
    xLabel,
    xUnit,
    getCharts: () => charts,
    yUnits,
    axesScales,
    scales,
    singleYAxis: true,
    autoScaleUnit: { x: true, y: false },
  });
  opts.axes = [
    opts.axes[0],
    {
      ...opts.axes[1],
      grid: { show: true },
      values: (u, vals) => vals.map(v => {
        for (let i = 0; i < digitalChannelsToShow.length; ++i) {
          if (Math.abs(v - i * DigChannelOffset) < 0.5) return '0';
          if (Math.abs(v - (i * DigChannelOffset + 1)) < 0.5) return '1';
        }
        return '';
      }),
      splits: digitalChannelsToShow.flatMap((_, i) => [i * DigChannelOffset, i * DigChannelOffset + 1]),
      range: [yMin, yMax],
    }
  ];
  opts.series = [
    {},
    ...digitalChannelsToShow.map((ch, i) => ({
      label: ch.id,
      stroke: "transparent",
      show: true,
    }))
  ];
  opts.plugins = opts.plugins || [];
  opts.plugins = opts.plugins.filter(p => !(p && p.id === 'verticalLinePlugin'));
  opts.plugins.push(createDigitalFillPlugin(digitalFillSignals, [yMin, yMax]));
  opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));
  const chart = new uPlot(opts, chartData, chartDiv);
  chart._seriesColors = opts.series.slice(1).map(s => s.stroke);
  charts.push(chart);
  const ro = new ResizeObserver(entries => {
    for (let entry of entries) {
      chart.setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    }
  });
  ro.observe(chartDiv);
}
