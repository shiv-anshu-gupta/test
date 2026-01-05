/**
 * uPlot plugin for rendering filled regions under digital (boolean) signals.
 *
 * This plugin draws filled rectangles under digital signals (step lines) when the signal is in the "high" state (as defined by targetVal).
 * It supports multiple digital signals, each with its own vertical offset, color, and target value.
 *
 * The fill is drawn in sync with zoom/pan and respects the current axis scales.
 *
 *
 * @warning offset is expected to be always even when u.data contains offset. Else, define yData as
 * @param {Array<Object>} signals - Array of signal configuration objects.
 *   Each object should have:
 *     - signalIndex {number}: Index of the signal in the uPlot data array (e.g., 1 for the first signal after x).
 *     - offset {number}: Vertical offset to apply to the signal (for stacking multiple signals).
 *     - color {string}: Fill color for the high region (CSS color, e.g., 'rgba(0,150,255,0.3)').
 *     - targetVal {number}: Value to consider as "high" (usually 1).
 *
 * @returns {Object} uPlot plugin object to be included in the `plugins` array of uPlot options.
 *
 * @example
 * import { createDigitalFillPlugin } from './src/plugins/digitalFillPlugin.js';
 *
 * const xVals = [0, 1, 2, 3, 4, 5, 6];
 * const signal1 = [1, 0, 1, 1, 0, 1, 0];
 * const signal2 = [1, 1, 1, 0, 1, 1, 1];
 *
 * const signals = [
 *   { signalIndex: 1, offset: 0, color: 'rgba(0, 150, 255, 0.3)', targetVal: 1 },
 *   { signalIndex: 2, offset: 3, color: 'rgba(255, 100, 100, 0.3)', targetVal: 1 }
 * ];
 *
 * const opts = {
 *   width: 600,
 *   height: 300,
 *   scales: { x: { time: false }, y: { min: 0, max: 6 } },
 *   axes: [{}, {}],
 *   series: [
 *     {}, // x axis
 *     { label: "Signal 1", stroke: "transparent" },
 *     { label: "Signal 2", stroke: "transparent" }
 *   ],
 *   plugins: [
 *     createDigitalFillPlugin(signals)
 *   ]
 * };
 *
 * const data = [xVals, signal1, signal2];
 * new uPlot(opts, data, document.getElementById("chart-digital"));
 */
export function createDigitalFillPlugin(signals) {
  // signals: [{signalIndex, offset, color, targetVal, originalIndex?}]
  const currentColors = signals.map((s) => s.color);

  // ✅ DEBUG: Log plugin initialization
  console.log("[digitalFillPlugin] 🔧 Plugin initialized", {
    signalsCount: signals.length,
    signals: signals.map((s, i) => ({
      index: i,
      signalIndex: s.signalIndex,
      color: s.color,
      offset: s.offset,
      targetVal: s.targetVal,
      originalIndex: s.originalIndex,
    })),
    currentColors: currentColors,
  });

  const plugin = {
    id: "digitalFill",
    signals,
    getSignalColors() {
      // returns array [{ originalIndex, color }]
      return signals.map((sig, i) => ({
        originalIndex: sig.originalIndex ?? i,
        color: currentColors[i] || sig.color,
      }));
    },
    updateColors(newColors) {
      // ✅ DEBUG: Log input
      console.log("[digitalFillPlugin] updateColors called:", {
        receivedColors: newColors,
        currentSignals: signals.length,
      });

      let changed = false;

      // ✅ FIX: Map colors by SIGNAL index, not originalIndex
      // The newColors array is already in display order (0, 1, 2...)
      signals.forEach((sig, signalIdx) => {
        // Use signal index directly (not originalIndex!)
        const newColor = Array.isArray(newColors)
          ? newColors[signalIdx]
          : newColors?.[signalIdx];

        if (newColor && newColor !== currentColors[signalIdx]) {
          console.log(
            `[digitalFillPlugin] Signal ${signalIdx} color: ${currentColors[signalIdx]} → ${newColor}`
          );
          currentColors[signalIdx] = newColor;
          sig.color = newColor;
          changed = true;
        }
      });

      console.log("[digitalFillPlugin] updateColors result:", {
        changed,
        updatedColors: [...currentColors],
      });

      return changed;
    },
    // Allow external components to query the current colors
    getSignalColors() {
      return signals.map((sig, idx) => ({
        originalIndex: sig.originalIndex,
        color: currentColors[idx] || sig.color,
      }));
    },
    hooks: {
      setScale: [
        (u, scaleKey, opts) => {
          // ✅ DEBUG: Log setScale hook
          console.log("[digitalFillPlugin] setScale hook called", {
            scaleKey,
            opts,
            currentYScale: u?.scales?.y,
          });

          const yScaleOpts = u?.opts?.scales?.y;

          // ✅ FIX: Only force scale if it's NOT already set
          if (!yScaleOpts || yScaleOpts.auto !== false) {
            // Use the provided scale or default to 0-15
            const minVal = yScaleOpts?.min ?? 0;
            const maxVal = yScaleOpts?.max ?? 15;

            console.log("[digitalFillPlugin] Setting y-scale to:", {
              min: minVal,
              max: maxVal,
            });

            u.setScale("y", { min: minVal, max: maxVal, auto: false });
          } else {
            console.log(
              "[digitalFillPlugin] Y-scale already configured:",
              yScaleOpts
            );
          }
        },
      ],
      init: [
        (u) => {
          // ✅ DEBUG: Log when plugin is initialized in uPlot
          console.log("[digitalFillPlugin] ✅ Plugin init hook called", {
            chartWidth: u.width,
            chartHeight: u.height,
            dataLength: u.data?.[0]?.length,
            series: u.series.length,
          });
        },
      ],
      draw: [
        (u) => {
          const { ctx } = u;
          const xData = u.data[0];
          const n = xData.length;
          const yScale = u.scales.y;

          // ✅ DEBUG: Log draw hook execution with full validation
          console.log("[digitalFillPlugin] 🎨 Draw hook called", {
            signals: signals.length,
            currentColors: currentColors,
            yScaleMin: yScale?.min,
            yScaleMax: yScale?.max,
            xDataLength: xData?.length,
            dataArrays: u.data.length,
            canvasSize: {
              width: ctx.canvas?.width,
              height: ctx.canvas?.height,
            },
          });

          // ✅ VALIDATION: Check if we have valid data
          if (!xData || xData.length === 0) {
            console.warn(
              "[digitalFillPlugin] ❌ No x-axis data available, skipping draw"
            );
            return;
          }

          if (signals.length === 0) {
            console.warn(
              "[digitalFillPlugin] ❌ No signals configured, skipping draw"
            );
            return;
          }

          // ✅ VALIDATION: Check if all signal indices are valid
          signals.forEach((sig, idx) => {
            if (!u.data[sig.signalIndex]) {
              console.warn(
                `[digitalFillPlugin] ⚠️ Signal ${idx} signalIndex=${sig.signalIndex} not found (only ${u.data.length} arrays)`
              );
            }
          });

          if (isNaN(yScale.min) || isNaN(yScale.max)) {
            console.warn(
              "[digitalFillPlugin] ❌ yScale min/max invalid:",
              yScale
            );
            return;
          }

          // Get the plotting area boundaries to avoid drawing over axes/labels
          const left = u.bbox.left;
          const top = u.bbox.top;
          const right = u.bbox.left + u.bbox.width;
          const bottom = u.bbox.top + u.bbox.height;

          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, right - left, bottom - top);
          ctx.clip();
          ctx.closePath();

          signals.forEach((sig, idx) => {
            const yData = u.data[sig.signalIndex];

            // ✅ VALIDATION: Check if yData exists
            if (!yData) {
              console.warn(
                `[digitalFillPlugin] ⚠️ Signal ${idx} has no data at index ${sig.signalIndex}`
              );
              return;
            }

            ctx.save();
            // Use currentColors array if updated, fallback to signal color
            const fillColor =
              currentColors[idx] || sig.color || "rgba(100, 100, 255, 0.5)";

            // ✅ DEBUG: Log color being used for each signal
            console.log(
              `[digitalFillPlugin] Signal ${idx} drawing with color:`,
              {
                currentColor: currentColors[idx],
                sigColor: sig.color,
                usingColor: fillColor,
                yDataLength: yData.length,
                offset: sig.offset,
                targetVal: sig.targetVal,
              }
            );

            // ✅ DEBUG: Set canvas styles and confirm they're applied
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1.5;

            console.log(
              `[digitalFillPlugin] Signal ${idx} canvas styles set:`,
              {
                fillStyle: ctx.fillStyle,
                strokeStyle: ctx.strokeStyle,
                lineWidth: ctx.lineWidth,
              }
            );

            ctx.beginPath();
            let beginFill = false;
            let xWidthCount = 0;
            let xBegin = 0,
              yBegin = 0;
            let rectCount = 0; // ✅ Track how many rects drawn

            // Calculate the minimum value in yData to determine offsetPresent.
            // If the minimum is even, use it; otherwise, use the next lower even number.
            const offsetCalc = Math.min(...yData);
            const offsetPresent =
              offsetCalc % 2 === 0 ? offsetCalc : offsetCalc - 1;

            // Determine the effective offset to use for drawing
            const effectiveOffset = sig.offset;

            // Initial point for the step plot
            const px0 = u.valToPos(xData[0], "x", true);
            const py = u.valToPos(
              yData[0] - offsetPresent + effectiveOffset,
              "y",
              true
            );
            ctx.moveTo(px0, py);

            // If the first value is high, prepare to begin filling
            if (yData[0] === sig.targetVal + offsetPresent) {
              beginFill = true;
              xBegin = px0;
              yBegin = py;
            }

            // Calculate width and height for fill rectangles
            const xWidth = Math.abs(
              u.valToPos(xData[1], "x", true) - u.valToPos(xData[0], "x", true)
            );
            const yHeight = Math.abs(
              u.valToPos(
                yData[0] + sig.targetVal + effectiveOffset,
                "y",
                true
              ) - u.valToPos(yData[0] + effectiveOffset, "y", true)
            );

            console.log(`[digitalFillPlugin] Signal ${idx} dimensions:`, {
              offsetPresent,
              effectiveOffset,
              xWidth,
              yHeight,
              px0,
              py,
            });

            // Iterate through all data points to draw step lines and fill regions
            for (let i = 0; i < n - 1; i++) {
              const x0 = u.valToPos(xData[i], "x", true);
              const x1 = u.valToPos(xData[i + 1], "x", true);
              const y = u.valToPos(
                yData[i] - offsetPresent + effectiveOffset,
                "y",
                true
              );
              const y1 = u.valToPos(
                yData[i + 1] - offsetPresent + effectiveOffset,
                "y",
                true
              );

              ctx.lineTo(x1, y);
              if (y !== y1) ctx.lineTo(x1, y1);

              // If the signal transitions from high to low, fill the region
              if (yData[i] != sig.targetVal + offsetPresent) {
                if (beginFill) {
                  ctx.fillRect(xBegin, yBegin, x0 - xBegin, yHeight);
                  rectCount++;
                  ctx.stroke();
                }
                beginFill = false;
                xWidthCount = 0;
              }
              // If the signal is high, start or continue filling
              if (yData[i] == sig.targetVal + offsetPresent) {
                if (!beginFill) {
                  beginFill = true;
                  xBegin = x0;
                  yBegin = y;
                }
                xWidthCount++;
                // If this is the last point, fill to the end
                if (i === n - 2) {
                  ctx.fillRect(xBegin, yBegin, x1 - xBegin, yHeight);
                  rectCount++;
                  ctx.stroke();
                }
              }
            }
            ctx.stroke();
            ctx.closePath();

            // ✅ DEBUG: Log rectangles drawn for this signal
            console.log(`[digitalFillPlugin] Signal ${idx} complete:`, {
              rectanglesDrawn: rectCount,
            });

            ctx.restore();
          });
          ctx.restore(); // Remove the clip

          // ✅ DEBUG: Confirm draw hook completed
          console.log("[digitalFillPlugin] ✅ Draw hook completed");
        },
      ],
    },
  };
  return plugin;
}
