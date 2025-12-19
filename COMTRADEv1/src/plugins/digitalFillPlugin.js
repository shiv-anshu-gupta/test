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
    // signals: [{signalIndex, offset, color, targetVal}]
    return {
        hooks: {
            setScale: [
                (u, scaleKey, opts) => {
                    // if (scaleKey !== 'y') return;
                    const yScaleOpts = u?.opts?.scales?.y;
                    u.setScale('y', { min: 0, max: 15, auto: false });
                    if (yScaleOpts && typeof yScaleOpts.min === 'number' && typeof yScaleOpts.max === 'number') {
                        const cur = u.scales.y;
                        // Only set if not already correct
                        if (cur.min !== yScaleOpts.min || cur.max !== yScaleOpts.max || cur.auto !== false) {
                            u.setScale('y', { min: yScaleOpts.min, max: yScaleOpts.max, auto: false });
                        }
                    }
                }
            ],
            draw: [
                u => {
                    const { ctx } = u;
                    const xData = u.data[0];
                    const n = xData.length;
                    const yScale = u.scales.y;
                    if(isNaN(yScale.min) || isNaN(yScale.max)) {
                       console.warn("yScale min/max not defined, cannot draw digital fills");
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
                    
                    signals.forEach(sig => {
                        const yData = u.data[sig.signalIndex];
                        ctx.save();
                        ctx.fillStyle = sig.color;
                        ctx.strokeStyle = 'black';
                        ctx.lineWidth = 1.5;

                        ctx.beginPath();
                        let beginFill = false;
                        let xWidthCount = 0;
                        let xBegin = 0, yBegin = 0;

                        // Calculate the minimum value in yData to determine offsetPresent.
                        // If the minimum is even, use it; otherwise, use the next lower even number.
                        const offsetCalc = Math.min(...yData);
                        const offsetPresent = (offsetCalc % 2 === 0) ? offsetCalc : offsetCalc - 1;

                        // Determine the effective offset to use for drawing
                        const effectiveOffset = sig.offset;

                        // Initial point for the step plot
                        const px0 = u.valToPos(xData[0], 'x', true);
                        const py = u.valToPos(yData[0] - offsetPresent + effectiveOffset, 'y', true);
                        ctx.moveTo(px0, py);

                        // If the first value is high, prepare to begin filling
                        if (yData[0] === sig.targetVal + offsetPresent) {
                            beginFill = true;
                            xBegin = px0;
                            yBegin = py;
                        }

                        // Calculate width and height for fill rectangles
                        const xWidth = Math.abs(u.valToPos(xData[1], 'x', true) - u.valToPos(xData[0], 'x', true));
                        const yHeight = Math.abs(
                            u.valToPos(yData[0] + sig.targetVal + effectiveOffset, 'y', true) -
                            u.valToPos(yData[0] + effectiveOffset, 'y', true)
                        );

                        // Iterate through all data points to draw step lines and fill regions
                        for (let i = 0; i < n - 1; i++) {
                            const x0 = u.valToPos(xData[i], 'x', true);
                            const x1 = u.valToPos(xData[i + 1], 'x', true);
                            const y = u.valToPos(yData[i] - offsetPresent + effectiveOffset, 'y', true);
                            const y1 = u.valToPos(yData[i + 1] - offsetPresent + effectiveOffset, 'y', true);

                            ctx.lineTo(x1, y);
                            if (y !== y1) ctx.lineTo(x1, y1);

                            // If the signal transitions from high to low, fill the region
                            if (yData[i] != sig.targetVal + offsetPresent) {
                                if (beginFill) {
                                    ctx.fillRect(xBegin, yBegin, x0 - xBegin, yHeight);
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
                                    ctx.stroke();
                                }
                            }
                        }
                        ctx.stroke();
                        ctx.closePath();
                        ctx.restore();
                    });
                    ctx.restore(); // Remove the clip
                }
            ]
        }
    };
}