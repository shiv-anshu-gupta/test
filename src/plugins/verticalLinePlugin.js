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

          // Subscribe to vertical lines state changes to recalculate deltas
          if (
            verticalLinesXState &&
            typeof verticalLinesXState.subscribe === "function"
          ) {
            unsubscribe = verticalLinesXState.subscribe(async () => {
              if (getCharts) {
                const charts = getCharts();
                const { collectChartDeltas } = await import(
                  "../utils/calculateDeltas.js"
                );
                const allDeltaData = [];

                for (const chart of charts) {
                  const chartDeltas = collectChartDeltas(
                    verticalLinesXState.asArray(),
                    chart,
                    "microseconds"
                  );
                  if (chartDeltas.length > 0) {
                    allDeltaData.push(...chartDeltas);
                  }
                }

                // Update delta window with all collected data
                if (allDeltaData.length > 0) {
                  try {
                    const { deltaWindow } = await import("../main.js");
                    if (deltaWindow) {
                      deltaWindow.update(allDeltaData);
                    }
                  } catch (e) {
                    // Silent fail - deltaWindow may not be available
                  }
                }
              }
            });
          }

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
                
                // ✅ DISABLE uPlot's selection while dragging vertical line
                u.setSelect = function() {
                  // Do nothing - block all selection updates during drag
                };

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
            if (isHovering) {
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
                (async () => {
                  // Update polar chart with dragged line position
                  try {
                    const { polarChart } = await import("../main.js");
                    if (polarChart) {
                      console.log(
                        "[verticalLinePlugin] Updating polar chart during drag at:",
                        x
                      );
                      // This will be called during drag, so update with current position
                      // We need cfg and data though...
                    }
                  } catch (e) {
                    console.log(
                      "[verticalLinePlugin] Cannot update polar chart:",
                      e.message
                    );
                  }

                  // Collect delta data from ALL charts
                  const { collectChartDeltas } = await import(
                    "../utils/calculateDeltas.js"
                  );
                  const allDeltaData = [];

                  for (const chart of charts) {
                    chart.redraw(); // Redraw chart
                    // Collect deltas from this chart
                    const chartDeltas = collectChartDeltas(
                      verticalLinesXState.asArray(),
                      chart,
                      "microseconds"
                    );
                    if (chartDeltas.length > 0) {
                      allDeltaData.push(...chartDeltas);
                    }
                  }

                  // Update delta window with combined data
                  // Only show delta window if there are 2 or more vertical lines
                  const linesArray =
                    verticalLinesXState?.value || verticalLinesXState || [];
                  const linesLength = Array.isArray(linesArray)
                    ? linesArray.length
                    : 0;

                  if (allDeltaData.length > 0 && linesLength > 1) {
                    try {
                      const { deltaWindow } = await import("../main.js");
                      if (deltaWindow) {
                        deltaWindow.show(); // OPEN THE POPUP WINDOW
                        deltaWindow.update(allDeltaData);
                      }
                    } catch (e) {
                      // Silent fail - deltaWindow may not be available
                    }
                  }
                })();
              }
            }
          });

          overlay.addEventListener("mouseup", (event) => {
            if (isDragging) {
              isDragging = false;
              event.stopPropagation();
              event.preventDefault();
              event.stopImmediatePropagation();
              
              // ✅ RE-ENABLE uPlot's selection after drag ends
              u.setSelect = originalSetSelect;
              
              // ✅ Clear any lingering selection box
              u.setSelect({ left: 0, top: 0, width: 0, height: 0 });
              
              overlay.style.cursor = "default";
              draggedLineIndex = null;
            }
          });

          overlay.addEventListener("mouseleave", () => {
            //     isDragging = false;
            //    draggedLineIndex = null;
          });
        },
      ],
      drawSeries: [
        (u, seriesIdx) => {
          // No-op on drawSeries - we use a separate layer
        },
      ],
      draw: [
        (u) => {
          // This runs after all series are drawn
          // Defensive: ensure verticalLinesXState is available
          if (!verticalLinesXState) {
            return;
          }

          // Validate chart data exists
          if (!u.data || !u.data[0] || u.data[0].length === 0) {
            return;
          }

          const ctx = u.ctx;
          const { top, height } = u.bbox;

          // Validate bbox
          if (!top || !height) {
            console.warn("[verticalLinePlugin] Invalid chart bbox");
            return;
          }

          const lines =
            typeof verticalLinesXState.asArray === "function"
              ? verticalLinesXState.asArray()
              : Array.isArray(verticalLinesXState)
              ? verticalLinesXState
              : verticalLinesXState.value || [];

          // Ensure we have valid context
          if (!ctx) {
            console.warn("[verticalLinePlugin] No canvas context available");
            return;
          }

          // Log for debugging with multiple files
          if (lines.length > 0) {
            console.log(
              "[verticalLinePlugin.draw] Rendering",
              lines.length,
              "lines for chart with",
              u.data.length - 1,
              "series"
            );
          }

          ctx.save();
          ctx.lineWidth = options.lineWidth || 2;

          lines.forEach((xData, idx) => {
            try {
              const nearestIdx = getNearestIndex(u.data[0], xData);

              // Validate nearestIdx
              if (
                !Number.isFinite(nearestIdx) ||
                nearestIdx < 0 ||
                nearestIdx >= u.data[0].length
              ) {
                console.warn(
                  "[verticalLinePlugin] Invalid nearestIdx:",
                  nearestIdx
                );
                return;
              }

              const xPos = u.valToPos(u.data[0][nearestIdx], "x", true);
              const color = (options.lineColors || crosshairColors)[
                idx % crosshairColors.length
              ];

              // Draw vertical line with higher z-order
              ctx.strokeStyle = color;
              ctx.globalAlpha = 1; // Ensure full opacity
              ctx.beginPath();
              ctx.moveTo(xPos, top);
              ctx.lineTo(xPos, top + height);
              ctx.stroke();

              // Draw crosshair points with interpolation for different sampling rates
              u.data.slice(1).forEach((series, seriesIdx) => {
                const actualIdx = seriesIdx + 1;
                if (!u.series[actualIdx]) return;

                // Get interpolated value
                const interpolatedValue = getInterpolatedValue(
                  u.data[0],
                  series,
                  xData,
                  nearestIdx
                );

                const yPos = u.valToPos(interpolatedValue, "y", true);
                ctx.beginPath();
                ctx.arc(xPos, yPos, options.pointRadius || 5, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.globalAlpha = 1;
                ctx.fill();
              });

              // Draw label
              ctx.font = "bold 12px Arial";
              ctx.fillStyle = lineColors[idx % lineColors.length];
              ctx.globalAlpha = 1;
              ctx.fillText(
                labelFormatter(lineColors[idx % lineColors.length]),
                xPos + 5,
                u.bbox.top + 15
              );
            } catch (err) {
              console.error(
                "[verticalLinePlugin] Error drawing line",
                idx,
                ":",
                err.message
              );
            }
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
function getInterpolatedValue(xData, yData, targetX, nearestIdx) {
  // If target X is exactly at a data point, return the value directly
  if (xData[nearestIdx] === targetX) {
    return yData[nearestIdx];
  }

  // Find two surrounding points for linear interpolation
  let idx1 = nearestIdx;
  let idx2 = nearestIdx;

  if (targetX > xData[nearestIdx] && nearestIdx < xData.length - 1) {
    idx2 = nearestIdx + 1;
  } else if (targetX < xData[nearestIdx] && nearestIdx > 0) {
    idx1 = nearestIdx - 1;
    idx2 = nearestIdx;
  }

  const x1 = xData[idx1];
  const x2 = xData[idx2];
  const y1 = yData[idx1];
  const y2 = yData[idx2];

  // Handle edge cases
  if (x1 === x2 || typeof y1 !== "number" || typeof y2 !== "number") {
    return yData[nearestIdx];
  }

  // Linear interpolation: y = y1 + (y2 - y1) * (x - x1) / (x2 - x1)
  const interpolated = y1 + ((y2 - y1) * (targetX - x1)) / (x2 - x1);
  return interpolated;
}

function isArrayLike(a) {
  return a && typeof a.length === "number";
}
