// Utility to destroy all uPlot chart instances in an array
export function destroyCharts(charts) {
  if (!Array.isArray(charts)) return;
  charts.forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  charts.length = 0;
}
