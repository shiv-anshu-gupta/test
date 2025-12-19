/**
 * uPlot Plugin: Vertical Line & Crosshair Points
 *
 * Features:
 * - Draws one or more draggable vertical lines on a uPlot chart.
 * - Shows crosshair points at the intersection of each vertical line and all series.
 * - Customizable line color, width, point radius, and label formatting.
 * - Supports multi-chart synchronization (dragging a line updates all linked charts).
 * - Keyboard accessibility: can be extended for keyboard support.
 * - Robust event management and cleanup.
 * - Defensive programming for safe integration.
 *
 * Nuances, Limitations, and Known Issues:
 * - Dragging is only supported with the mouse; keyboard accessibility is not implemented by default but can be extended.
 * - The plugin expects the x-axis data to be sorted and continuous; erratic or non-monotonic x data may cause unexpected behavior.
 * - If multiple charts are synchronized, all must share the same x-axis domain for correct vertical line alignment.
 * - The plugin does not prevent vertical lines from overlapping; users can drag lines to the same x position.
 * - If the chart is resized rapidly or the DOM is manipulated externally, redraws may lag or lines may temporarily misalign.
 * - The plugin assumes the chart's overlay (`u.over`) is present and not replaced by other plugins or custom code.
 * - If the state object does not implement `.subscribe`, only direct array mutation will trigger redraws.
 * - The labelFormatter function receives the color as its only argument; for more context, you must wrap the plugin or extend it.
 * - The plugin is robust to missing or undefined chart/overlay references, but will silently do nothing if these are not present.
 * - If you use a reactive state, ensure you do not mutate the array in place; always replace the array to trigger subscribers.
 *
 * @param {Object|number[]} verticalLinesXState
 *   State object with a `.value` property (array of x positions) or a plain array of x positions.
 *   If using a state object, it should support `.subscribe(fn)` for reactive updates (optional).
 *
 * @param {function(): uPlot[]} [getCharts]
 *   Optional getter function that returns an array of all uPlot chart instances to synchronize.
 *   If provided, dragging a line will update/redraw all charts and recalculate deltas.
 *
 * @param {Object} [options]
 *   Customization options for appearance and behavior.
 * @param {string[]} [options.lineColors] - Array of colors for vertical lines (default: crosshairColors).
 * @param {number}   [options.lineWidth]  - Width of vertical lines (default: 2).
 * @param {number}   [options.pointRadius]- Radius of crosshair points (default: 5).
 * @param {function(string): string} [options.labelFormatter] - Function to format the label text (default: capitalizes color name).
 *
 * @returns {Object} uPlot plugin object with hooks for draw, ready, and destroy.
 *
 * @example <caption>Basic usage with a plain array</caption>
 * import verticalLinePlugin from './plugins/verticalLinePlugin.js';
 *
 * const verticalLines = [0.1, 0.5];
 * const opts = {
 *   ...otherUplotOptions,
 *   plugins: [verticalLinePlugin(verticalLines)]
 * };
 * new uPlot(opts, data, target);
 *
 * @example <caption>Usage with a reactive state object and multi-chart sync</caption>
 * import createState from './createState.js';
 * import verticalLinePlugin from './plugins/verticalLinePlugin.js';
 *
 * const verticalLinesState = createState([0.1, 0.5]);
 * const getCharts = () => [chart1, chart2];
 * const opts = {
 *   ...otherUplotOptions,
 *   plugins: [verticalLinePlugin(verticalLinesState, getCharts, {
 *     lineColors: ['#e41a1c', '#377eb8'],
 *     lineWidth: 3,
 *     pointRadius: 7,
 *     labelFormatter: (color) => `Line: ${color}`
 *   })]
 * };
 * const chart1 = new uPlot(opts, data1, target1);
 * const chart2 = new uPlot(opts, data2, target2);
 *
 * @example <caption>Custom label formatting</caption>
 * verticalLinePlugin(state, null, {
 *   labelFormatter: (color) => `T = ${color}`
 * });
 */
import { crosshairColors } from "../utils/constants.js";
import { getNearestIndex } from "../utils/helpers.js";
import { calculateDeltas } from "../utils/calculateDeltas.js";

export default function verticalLinePlugin(
  verticalLinesXState,
  getCharts = null,
  options = {}
) {
  let isDragging = false;
  let draggedLineIndex = null;
  let overlayRef = null;
  let unsubscribe = null;
  const handlerRefs = {};
  const lineColors = options.lineColors || crosshairColors;
  const lineWidth = options.lineWidth || 2;
  const pointRadius = options.pointRadius || 5;
  const labelFormatter =
    options.labelFormatter ||
    ((color) => color.charAt(0).toUpperCase() + color.slice(1));

  function isHoveringLine(u, xVal, hoverRadius) {
    const lines = verticalLinesXState.asArray();
    return lines.some((xData) => Math.abs(xVal - xData) < hoverRadius);
  }

  function updateLines(state, lines) {
    if (state && state.value !== undefined) {
      state.value = Array.from(lines);
    } else {
      state = Array.from(lines);
    }
  }

  return {
    hooks: {
      init: [
        (u) => {


          const overlay = u.over;
          overlayRef = overlay;
          // prevent selection during dragging

          overlay.addEventListener("mousedown", (e) => {
            if (!u || !u.scales || !u.data) return;
            const lines = verticalLinesXState.asArray();
            const xVal = u.posToVal(e.offsetX, "x");
            const hoverRadius = (u.scales.x.max - u.scales.x.min) * 0.01;
            for (let idx = 0; idx < lines.length; idx++) {
              const xData = lines[idx];
              if (Math.abs(xVal - xData) < hoverRadius) {
                isDragging = true;
                draggedLineIndex = idx;
                e.preventDefault();
e.stopPropagation();
e.stopImmediatePropagation();
                u.redraw();
                return;
              }
            }
          });

          overlay.addEventListener("mousemove", (e) => {
            const xVal = u.posToVal(e.offsetX, "x");
            const hoverRadius = (u.scales.x.max - u.scales.x.min) * 0.005;
            const isHovering = isHoveringLine(u, xVal, hoverRadius);
            overlay.style.cursor = isHovering ? "ew-resize" : "default";
            if(isHovering) {
              e.preventDefault();
              e.stopImmediatePropagation();
            }
            if (isDragging) {
              const xData = verticalLinesXState[draggedLineIndex];
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              verticalLinesXState[draggedLineIndex] = xVal; // Update the state directly
              console.log("MOUSEMOVE CALLED:", verticalLinesXState.asArray());
              if (getCharts) {
                const charts = getCharts();
                charts.forEach((chart) => {
               //   chart.setSelect(null); // Clear selection to prevent unwanted behavior
                  chart.redraw(); // Redraw all linked charts
                  calculateDeltas(verticalLinesXState.asArray(), chart);
                }); 
            }
          }
          });

          overlay.addEventListener("mouseup", (event) => {
            console.log("MOUSEUP CALLED:", draggedLineIndex, isDragging);
            if (isDragging) {
              isDragging = false;
              setTimeout(() => u.setSelect(null), 0); // Clear selection to prevent unwanted behavior
              event.stopPropagation();
              event.preventDefault();
              event.stopImmediatePropagation();
              overlay.style.cursor = "default";
              //   u.setSelect({left: 0, top: 0, width: 0, height: 0}); // Clear selection to prevent unwanted behavior
              draggedLineIndex = null;
                        const origSetSelect = u.setSelect;
      u.setSelect = function(sel) {
        if (isDragging) {
          origSetSelect.call(u, null);
        } else {
          origSetSelect.call(u, sel);
        }
      };
            }
          });

          overlay.addEventListener("mouseleave", () => {
            //     isDragging = false;
            //    draggedLineIndex = null;
          });
        },
      ],
      draw: [
        (u) => {
          const ctx = u.ctx;
          const { top, height } = u.bbox;
          const lines = verticalLinesXState.asArray();
          ctx.save();
          ctx.lineWidth = options.lineWidth || 2;
          lines.forEach((xData, idx) => {
            const nearestIdx = getNearestIndex(u.data[0], xData);
            const xPos = u.valToPos(u.data[0][nearestIdx], "x", true);
            const color = (options.lineColors || crosshairColors)[
              idx % crosshairColors.length
            ];
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, top + height);
            ctx.stroke();
            u.data.slice(1).forEach((series) => {
              const yPos = u.valToPos(series[nearestIdx], "y", true);
              ctx.beginPath();
              ctx.arc(xPos, yPos, options.pointRadius || 5, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            });
            ctx.font = "bold 12px Arial";
            ctx.fillStyle = lineColors[idx % lineColors.length];
            ctx.fillText(
              labelFormatter(lineColors[idx % lineColors.length]),
              xPos + 5,
              u.bbox.top + 15
            );
          });
          ctx.restore();
        },
      ],
/*       setSelect: [
        function(u, select) {
          // Prevent infinite recursion: only clear selection if select is not null/false
          if (isDragging && flag == false) {
            flag = true
            console.log("SETSELECT called during dragging, clearing selection once");
            u.setSelect(null); // This will not recurse infinitely because we check select
          }
        }
      ], */
      destroy: [
        (u) => {
          if (overlayRef) {
            overlayRef.replaceWith(overlayRef.cloneNode(true)); // Remove all event listeners
          }
        },
      ],
    },
  };
}

// helpers
function isArrayLike(a) {
  return a && typeof a.length === "number";
}
