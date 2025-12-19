// main.js
import { createChartOptions } from "./components/chartComponent.js";
import { parseCFG, parseDAT } from "./components/comtradeUtils.js";
import { createState } from './components/createState.js';
import { calculateDeltas } from "./utils/calculateDeltas.js";
import { autoGroupChannels } from "./utils/autoGroupChannels.js";
import { createDragBar } from "./components/createDragBar.js";
import { setupChartDragAndDrop } from "./components/setupChartDragAndDrop.js";
import { handleVerticalLineShortcuts } from "./components/handleVerticalLineShortcuts.js";
import { showError } from "./components/showError.js";
import { renderComtradeCharts } from "./components/renderComtradeCharts.js";
// Import if using modules, or just paste the class above in your JS file
import { ResizableGroup } from './components/ResizableGroup.js';
import { showChannelListWindow } from "./components/showChannelListWindow.js";
import { createCustomElement } from './utils/helpers.js';
import { analogPalette, digitalPalette } from "./utils/constants.js";
import { subscribeChartUpdates } from './components/chartManager.js';

// --- State ---
export const verticalLinesX = createState([]);
export const dataState = createState({ analog: [], digital: [] }); // NEW: holds chart data for both types

let charts = [null, null]; // [analogChart, digitalChart]
const chartTypes = ['analog', 'digital'];

// Declare cfg and data at the top-level for global access
let cfg, data;

// --- Global Constants ---
const TIME_UNIT = "seconds";

// Channel state for analog/digital, colors, etc.
export const channelState = createState({
  analog: {
    yLabels: [],
    lineColors: [],
    yUnits: [],
    axesScales: [],
    xLabel: "",
    xUnit: "",
  },
  digital: {
    yLabels: [],
    lineColors: [],
    yUnits: [],
    axesScales: [],
    xLabel: "",
    xUnit: "",
  }
});
// Add a createState for background mode: 0 = white, 1 = dark, In the future, it can have 2 or 3 with different backgrounds and contrast palettes can be made.
export const whiteBackground = createState(0);

// --- DOM Elements ---
const cfgFileInput = document.getElementById("cfgFile");
const loadBtn = document.getElementById("loadBtn");
const cfgFileNameEl = document.getElementById("cfgFileName");
const datFileNameEl = document.getElementById("datFileName");
const chartsContainer = document.getElementById("charts");
const fixedResultsEl = document.getElementById("fixed-results");

// --- Event Listeners ---
loadBtn.addEventListener("click", handleLoadFiles);
document.addEventListener("keydown", (e) => handleVerticalLineShortcuts(e, charts, verticalLinesX, fixedResultsEl, TIME_UNIT, calculateDeltas));

// Add Show Channel List button after Load Files button
const showChannelListBtn = createCustomElement('button');
showChannelListBtn.id = 'showChannelListBtn';
showChannelListBtn.textContent = 'Show Channel List';
loadBtn.insertAdjacentElement('afterend', showChannelListBtn);

showChannelListBtn.addEventListener('click', () => {
  showChannelListWindow(
    channelState, // pass channelState instead of cfg
    (type, fromIdx, toIdx) => {
      // Update your channel order here (analog or digital)
      // For example, reorder channelState.analog or channelState.digital arrays
      // Then re-render charts:
      renderComtradeCharts(cfg, data, chartsContainer, charts, verticalLinesX, createState, calculateDeltas, TIME_UNIT, channelState);
    },
    (type, idx, color) => {
      // Update channelState color for analog or digital
      if (type === 'analog') {
        channelState.analog.lineColors[idx] = color;
      } else if (type === 'digital') {
        channelState.digital.lineColors[idx] = color;
      }
      // Destroy and recreate charts to reflect color change
      renderComtradeCharts(cfg, data, chartsContainer, charts, verticalLinesX, createState, calculateDeltas, TIME_UNIT, channelState);
    }
  );
});

// --- Main Handlers ---
async function handleLoadFiles() {
  const files = Array.from(cfgFileInput.files);
  if (files.length === 0) {
    showError("Please select a CFG file and its corresponding DAT file.", fixedResultsEl);
    return;
  }
  const cfgFile = files.find((file) => file.name.toLowerCase().endsWith(".cfg"));
  if (!cfgFile) {
    showError("CFG file not found. Please ensure you upload a valid CFG file.", fixedResultsEl);
    return;
  }
  try {
    cfgFileNameEl.textContent = `CFG File: ${cfgFile.name}`;
    const cfgText = await cfgFile.text();
    cfg = parseCFG(cfgText, TIME_UNIT); // <-- assign to global
    const baseName = cfgFile.name.replace(/\.cfg$/i, "");
    const datFileName = `${baseName}.dat`;
    const datFile = files.find((file) => file.name.toLowerCase() === datFileName.toLowerCase());
    if (!datFile) {
      showError(`DAT file (${datFileName}) not found. Please ensure it is uploaded along with the CFG file.`, fixedResultsEl);
      return;
    }
    datFileNameEl.textContent = `DAT File: ${datFile.name}`;
    const fileType = cfg.ft.toUpperCase();
    let datContent;
    if (fileType === "ASCII") {
      datContent = await datFile.text();
    } else {
      datContent = await datFile.arrayBuffer();
    }
    data = parseDAT(datContent, cfg, fileType, TIME_UNIT); // <-- assign to global
    if (!data.time || data.time.length === 0) {
      showError("Failed to parse COMTRADE data.", fixedResultsEl);
      return;
    }
       // Set dataState for both analog and digital
    dataState.analog = data.analog;
    dataState.digital = data.digital;
    await Promise.resolve(); // flush microtasks so dataState is updated for subscribers
    // In handleLoadFiles, after cfg and data are set and before renderComtradeCharts:
    initializeChannelState(cfg, data);

    // Render charts
    renderComtradeCharts(cfg, data, chartsContainer, charts, verticalLinesX, createState, calculateDeltas, TIME_UNIT, channelState);

    // Instantiate ResizableGroup AFTER .dragBar elements are rendered
    if (window._resizableGroup) window._resizableGroup.disconnect();
    window._resizableGroup = new ResizableGroup('.dragBar');

// Subscribe to state changes for chart updates
    subscribeChartUpdates(channelState, dataState, charts, chartsContainer, verticalLinesX);

  } catch (error) {
    console.error("Error processing COMTRADE files:", error);
    showError("An error occurred while processing the COMTRADE files. Check the console for details.", fixedResultsEl);
  }
}

// In handleLoadFiles or after parsing cfg, initialize channelState
// (add this after cfg and data are set)
function initializeChannelState(cfg, data) {
  // Analog
  const analogIndices = cfg.analogChannels.map((_, idx) => idx);
  channelState.analog.yLabels.length = 0;
  channelState.analog.lineColors.length = 0;
  channelState.analog.yUnits.length = 0;
  channelState.analog.axesScales.length = 0;
  channelState.analog.axesScales.push(1e-6);
  // In initializeChannelState, select palette row based on background
  const paletteRow = whiteBackground.value || 0; // 0 for white, 1 for dark
  let analogPaletteIdx = 0;
  for (const idx of analogIndices) {
    // Initialize color and stroke if empty
    if (!cfg.analogChannels[idx].color) {
      cfg.analogChannels[idx].color = analogPalette[paletteRow][analogPaletteIdx % analogPalette[paletteRow].length];
    }
    if (!cfg.analogChannels[idx].stroke) {
      cfg.analogChannels[idx].stroke = analogPalette[paletteRow][analogPaletteIdx % analogPalette[paletteRow].length];
    }
    channelState.analog.yLabels.push(cfg.analogChannels[idx].id);
    // Always assign color from palette sequentially
    let color = analogPalette[paletteRow][analogPaletteIdx % analogPalette[paletteRow].length];
    analogPaletteIdx++;
    channelState.analog.lineColors.push(color);
    channelState.analog.yUnits.push(cfg.analogChannels[idx].unit || "");
    const unit = cfg.analogChannels[idx].unit || "";
    if (unit === "s" && data.timeUnit === "microseconds") channelState.analog.axesScales.push(1e-6);
    else if (unit === "ms" && data.timeUnit === "microseconds") channelState.analog.axesScales.push(1e-3);
    else channelState.analog.axesScales.push(1);
  }
  channelState.analog.xLabel = "Time";
  channelState.analog.xUnit = "sec";
  // Digital
  const digitalIndices = cfg.digitalChannels.map((_, idx) => idx);
  channelState.digital.yLabels.length = 0;
  channelState.digital.lineColors.length = 0;
  channelState.digital.yUnits.length = 0;
  channelState.digital.axesScales.length = 0;
  channelState.digital.axesScales.push(1e-6, 1);
  let digitalPaletteIdx = 0;
  for (let i = 0; i < digitalIndices.length; ++i) {
    // Initialize color and stroke if empty
    if (!cfg.digitalChannels[i].color) {
      cfg.digitalChannels[i].color = digitalPalette[paletteRow][digitalPaletteIdx % digitalPalette[paletteRow].length];
    }
    if (!cfg.digitalChannels[i].stroke) {
      cfg.digitalChannels[i].stroke = digitalPalette[paletteRow][digitalPaletteIdx % digitalPalette[paletteRow].length];
    }
    channelState.digital.yLabels.push(cfg.digitalChannels[i].id);
    // Always assign color from palette sequentially
    let color = digitalPalette[paletteRow][digitalPaletteIdx % digitalPalette[paletteRow].length];
    digitalPaletteIdx++;
    channelState.digital.lineColors.push(color);
    channelState.digital.yUnits.push("");
  }
  channelState.digital.xLabel = "Time";
  channelState.digital.xUnit = "sec";
}
