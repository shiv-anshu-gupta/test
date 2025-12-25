import {
  createChartOptions,
  updateAllChartAxisColors,
} from "./components/chartComponent.js";
import { parseCFG, parseDAT } from "./components/comtradeUtils.js";
import { createState } from "./components/createState.js";
import {
  calculateDeltas,
  collectChartDeltas,
} from "./utils/calculateDeltas.js";
import { createDeltaWindow } from "./components/DeltaWindow.js";
import { createDragBar } from "./components/createDragBar.js";
import { setupChartDragAndDrop } from "./components/setupChartDragAndDrop.js";
import { handleVerticalLineShortcuts } from "./components/handleVerticalLineShortcuts.js";
import { showError } from "./components/showError.js";
import { renderComtradeCharts } from "./components/renderComtradeCharts.js";
import { renderComputedChannels } from "./components/renderComputedChannels.js";
import { handleComputedChannelEvaluation } from "./services/computedChannels/index.js";
import { ResizableGroup } from "./components/ResizableGroup.js";
import { showChannelListWindow } from "./components/showChannelListWindow.js";
import { createChannelList } from "./components/ChannelList.js";
import { createCustomElement } from "./utils/helpers.js";
import { analogPalette, digitalPalette } from "./utils/constants.js";
import { subscribeChartUpdates } from "./components/chartManager.js";
import { debugLite } from "./components/debugPanelLite.js";
import { autoGroupChannels } from "./utils/autoGroupChannels.js";
import { initVerticalLineControl } from "./components/initVerticalLineControl.js";
import { debounce } from "./utils/computedChannelOptimization.js";
import {
  exportComputedChannelAsASCII,
  importComputedChannelFromJSON,
  exportComputedChannelAsCFGDAT,
  exportAllComputedChannels,
} from "./components/EquationEvaluatorInChannelList.js";
import {
  showFileInfo,
  updateStatsCards,
  wrapChartInSection,
  updateFileInfo,
  toggleChartsVisibility,
  clearChartsContainer,
} from "./utils/uiHelpers.js";
import { exportComputedChannelsAsCSV } from "./utils/csvExport.js";
import {
  saveComputedChannelsToStorage,
  loadComputedChannelsFromStorage,
} from "./utils/computedChannelStorage.js";
import { PolarChart } from "./components/PolarChart.js";
import { PolarChartCanvas } from "./components/PolarChartCanvas.js"; // ✅ NEW: Canvas-based renderer
import { setupPolarChartWithVerticalLines } from "./components/setupPolarChartIntegration.js";
import {
  initTheme,
  toggleTheme,
  getCurrentTheme,
} from "./utils/themeManager.js";
import { initGlobalDOMUpdateQueue } from "./utils/domUpdateQueueInit.js";
import { openMergerWindow } from "./utils/mergerWindowLauncher.js";
import {
  initGlobalThemeState,
  toggleGlobalTheme,
  listenForChildThemeRequests,
} from "./utils/globalThemeState.js";
import {
  initComputedChannelsState,
  getComputedChannelsState,
  listenForComputedChannelChanges,
} from "./utils/computedChannelsState.js";

// Initialize global DOM update queue for selectiveUpdate feature
initGlobalDOMUpdateQueue();

/**
 * Simple file reader utility for loading text files
 * @param {File} file - File object to read
 * @returns {Promise<string>} File content as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(e.target.result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    reader.readAsText(file);
  });
}

/**
 * Convert LaTeX expression to math.js compatible format
 * Example: \sqrt{I_{A}^2+I_{B}^2+I_{C}^2} → sqrt(IA^2+IB^2+IC^2)
 * @param {string} latex - LaTeX expression from MathLive editor
 * @returns {string} math.js compatible expression
 */
function convertLatexToMathJs(latex) {
  if (!latex) return "";

  let expr = latex.trim();

  // Convert subscripts: I_{A} → IA, I_{B} → IB, etc.
  expr = expr.replace(/([A-Za-z])_\{([A-Za-z0-9]+)\}/g, "$1$2");

  // Convert sqrt: \sqrt{x} → sqrt(x)
  expr = expr.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");

  // Convert fractions: \frac{a}{b} → (a)/(b)
  expr = expr.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // Convert functions: \operatorname{func} → func
  expr = expr.replace(
    /\\operatorname\{RMS\}\s*\\left\(\s*([^)]+)\s*\\right\)/gi,
    "sqrt(mean(($1)^2))"
  );
  expr = expr.replace(
    /\\operatorname\{AVG\}\s*\\left\(\s*([^)]+)\s*\\right\)/gi,
    "mean($1)"
  );
  expr = expr.replace(/\\operatorname\{([^}]+)\}/g, "$1");

  // Convert operators
  expr = expr.replace(/\\cdot/g, "*");
  expr = expr.replace(/\\times/g, "*");

  // Convert absolute value: \left\lvert a \right\rvert → abs(a)
  expr = expr.replace(/\\left\\lvert\s*([^\\]*)\s*\\right\\rvert/g, "abs($1)");

  // Convert parentheses
  expr = expr.replace(/\\left\(/g, "(");
  expr = expr.replace(/\\right\)/g, ")");

  // Convert power: ^{n} → ^(n) for math.js compatibility
  expr = expr.replace(/\^\{([^}]+)\}/g, "^($1)");

  // Remove remaining LaTeX artifacts
  expr = expr.replace(/\\[a-zA-Z]+/g, ""); // Remove remaining commands
  expr = expr.replace(/[\{\}]/g, ""); // Remove braces

  return expr.trim();
}

/**
 * @file main.js - Core application logic and parent-child window messaging
 * @module main
 * @description
 * This module handles COMTRADE file loading, chart initialization, and manages
 * communication between the parent window and child popup (ChannelList).
 *
 * Message Flow:
 * Child Window (Tabulator) → Parent Window → channelState update → Chart subscribers triggered
 */
/**
 * Channel row structure received from the ChannelList popup (Tabulator).
 * Copied here for JSDoc compatibility so JSDoc can resolve the type without
 * relying on `import()`-style type expressions which older JSDoc versions
 * do not accept.
 *
 * @typedef {Object} ChannelRow
 * @property {string} [type] - 'Analog' or 'Digital'
 * @property {number} [id] - 1-based table id
 * @property {number} [originalIndex] - zero-based original index when available
 * @property {string} [channelID] - stable channel identifier assigned by parent
 * @property {string} [name]
 * @property {string} [unit]
 * @property {string} [group]
 * @property {string} [color]
 * @property {number|string} [scale]
 * @property {number|string} [start]
 * @property {number|string} [duration]
 * @property {boolean} [invert]
 * @property {boolean} [isNew]
 */

/**
 * Child -> Parent message shape used by the ChannelList popup.
 *
 * @typedef {Object} ChildToParentMessage
 * @property {string} source - Should be 'ChildWindow'
 * @property {string} type - One of the CALLBACK_TYPE constants
 * @property {ChildMessagePayload} payload - The payload detailed below
 */

/**
 * Payload sent by the child window to the parent (Tabulator edits).
 * @typedef {Object} ChildMessagePayload
 * @property {string} [field]
 * @property {ChannelRow} [row]
 * @property {any} [newValue]
 * @property {string} [channelID]
 * @property {Array} [args]
 */

/**
 * Acknowledgement message posted back from parent -> child after channel add.
 * @typedef {Object} ParentAckMessage
 * @property {string} source - 'ParentWindow'
 * @property {string} type - 'ack_addChannel'
 * @property {Object} payload - { tempClientId, channelID, assignedIndex, type }
 */

// --- State ---
export const verticalLinesX = createState([]);
export const dataState = createState({ analog: [], digital: [] });

// Initialize delta display window
export const deltaWindow = createDeltaWindow();

// Export calculateDeltas utils for fast access
export { collectChartDeltas };

// Getter functions for global state
export function getCfg() {
  return cfg;
}

export function getData() {
  return data;
}

export function getPolarChart() {
  return polarChart;
}

export function getChartsComputed() {
  return chartsComputed;
}

let charts = [null, null]; // [analogChart, digitalChart]
const chartTypes = ["analog", "digital"];

// Computed channels charts array - one chart per computed channel
let chartsComputed = [];

// Expose charts globally for theme system to access
window.__charts = charts;
window.__chartsComputed = chartsComputed;

// Global config and data
let cfg, data;

// Polar chart instance (initialized when files are loaded)
let polarChart = null;

// Vertical Line Control instance (initialized when files are loaded)
let verticalLineControl = null;

// --- Constants ---
const TIME_UNIT = "seconds";

// Callback message types from child window
export const CALLBACK_TYPE = {
  COLOR: "callback_color",
  SCALE: "callback_scale",
  START: "callback_start",
  DURATION: "callback_duration",
  INVERT: "callback_invert",
  CHANNEL_NAME: "callback_channelName",
  GROUP: "callback_group",
  ADD_CHANNEL: "callback_addChannel",
  DELETE: "callback_delete",
};

/**
 * Find a channel by its unique channelID in the channel state
 *
 * @function findChannelByID
 * @category State Management / Channel Lookup
 * @since 1.0.0
 *
 * @description
 * Searches for a channel across both analog and digital channel arrays using
 * its stable channelID. Returns the channel type and array index if found.
 * Analog channels are searched first, followed by digital channels.
 *
 * @param {string} channelID - Unique identifier of the channel to find
 *
 * @returns {Object|null} Channel location object or null if not found
 * @returns {string} returns.type - Channel type: "analog" or "digital"
 * @returns {number} returns.idx - Zero-based index in the type-specific array
 *
 * @mermaid
 * flowchart TD
 *     A["Input channelID"] --> B{"channelID valid?"}
 *     B -->|No| C["Return null"]
 *     B -->|Yes| D["Search analog channelIDs"]
 *     D -->|Found| E["Return {type:'analog', idx}"]
 *     D -->|Not Found| F["Search digital channelIDs"]
 *     F -->|Found| G["Return {type:'digital', idx}"]
 *     F -->|Not Found| H["Return null"]
 *     style A fill:#E3F2FD,stroke:#1565C0,color:#000
 *     style E fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style G fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style C fill:#FFCDD2,stroke:#C62828,color:#000
 *     style H fill:#FFCDD2,stroke:#C62828,color:#000
 *
 * @example
 * // Finding an existing analog channel
 * const result = findChannelByID("analog-0-abc123");
 * // Returns: { type: "analog", idx: 0 }
 *
 * @example
 * // Finding a non-existent channel
 * const result = findChannelByID("invalid-id");
 * // Returns: null
 *
 * @example
 * // Using the result to update channel state
 * const found = findChannelByID("CH001");
 * if (found) {
 *   channelState[found.type].lineColors[found.idx] = "#ff0000";
 * }
 *
 * @algorithm
 * 1. Validate that channelID is provided
 * 2. Search in analog channels:
 *    - Use indexOf on channelState.analog.channelIDs
 *    - If found (index >= 0), return { type: "analog", idx }
 * 3. If not found in analog, search digital channels:
 *    - Use indexOf on channelState.digital.channelIDs
 *    - If found (index >= 0), return { type: "digital", idx }
 * 4. If not found in either array, return null
 *
 * @throws {TypeError} Does not throw, but returns null for invalid input
 *
 * @dependencies
 * - channelState.analog.channelIDs {string[]} - Array of analog channel IDs
 * - channelState.digital.channelIDs {string[]} - Array of digital channel IDs
 *
 * @testcase
 * Input: channelID = "analog-0-abc123" (exists at analog index 0)
 * Expected: { type: "analog", idx: 0 }
 *
 * @testcase
 * Input: channelID = "digital-2-xyz789" (exists at digital index 2)
 * Expected: { type: "digital", idx: 2 }
 *
 * @testcase
 * Input: channelID = "invalid-id-12345" (does not exist)
 * Expected: null
 *
 * @testcase
 * Input: channelID = null
 * Expected: null
 *
 * @testcase
 * Input: channelID = "" (empty string)
 * Expected: null
 *
 * @performance O(n) where n is the number of channels in the searched arrays
 *
 * @see {@link updateChannelFieldByID} - Uses this function to locate channels
 * @see {@link deleteChannelByID} - Uses this function to locate channels
 */
// ⚡ Fast lookup map for channelID -> {type, idx} (O(1) instead of O(n))
// Updated whenever channelIDs change
const channelIDMap = new Map();

/**
 * Rebuild the fast lookup map when channelIDs change
 * Should be called after any change to channelState.analog/digital.channelIDs
 */
function rebuildChannelIDMap() {
  channelIDMap.clear();

  // Map analog channels
  const analogIDs = channelState.analog?.channelIDs || [];
  analogIDs.forEach((id, idx) => {
    if (id) channelIDMap.set(id, { type: "analog", idx });
  });

  // Map digital channels
  const digitalIDs = channelState.digital?.channelIDs || [];
  digitalIDs.forEach((id, idx) => {
    if (id) channelIDMap.set(id, { type: "digital", idx });
  });
}

function findChannelByID(channelID) {
  if (!channelID) return null;

  // ⚡ Fast O(1) lookup using map instead of O(n) indexOf
  const result = channelIDMap.get(channelID);
  if (result) return result;

  // Fallback: rebuild map in case it's stale (safety net)
  rebuildChannelIDMap();
  return channelIDMap.get(channelID) || null;
}
/**
 * Update a specific field of a channel identified by its channelID
 *
 * @function updateChannelFieldByID
 * @category State Management / Channel Update
 * @since 1.0.0
 *
 * @description
 * High-level wrapper that locates a channel by its stable ID and updates
 * a specific field. This function automatically determines whether the channel
 * is analog or digital and delegates to updateChannelFieldByIndex for the
 * actual update. The reactive state system automatically notifies subscribers
 * after the update.
 *
 * @param {string} channelID - Unique identifier of the channel to update
 * @param {string} fieldName - Name of the field to update
 * @param {*} value - New value to set for the field
 *
 * @returns {boolean} true if update succeeded, false if channel not found
 *
 * @mermaid
 * flowchart TD
 *     A["Input channelID, fieldName, value"] --> B["Call findChannelByID"]
 *     B --> C{"Channel found?"}
 *     C -->|No| D["Log not-found and return false"]
 *     C -->|Yes| E["Extract type and index"]
 *     E --> F["Get channelState[type][fieldName]"]
 *     F --> G{"Array valid?"}
 *     G -->|No| D
 *     G -->|Yes| H["Update array[index] = value"]
 *     H --> I["Trigger subscribers"]
 *     I --> J["Log success and return true"]
 *     style A fill:#E3F2FD,stroke:#1565C0,color:#000
 *     style J fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style D fill:#FFCDD2,stroke:#C62828,color:#000
 *     style I fill:#F3E5F5,stroke:#6A1B9A,color:#fff
 *
 * @example
 * // Update channel color
 * const success = updateChannelFieldByID("analog-0-abc123", "lineColors", "#ff0000");
 * console.log(success); // true
 * // Result: Channel color updated, chart redraws automatically
 *
 * @example
 * // Update channel name
 * updateChannelFieldByID("digital-2-xyz789", "yLabels", "New Sensor Name");
 * // Result: Channel label updated, legend refreshes
 *
 * @example
 * // Update scale (triggers chart recreation)
 * updateChannelFieldByID("analog-1-def456", "scales", 2.5);
 * // Result: Scale factor changed, chart recreates with new data
 *
 * @example
 * // Attempting to update non-existent channel
 * const success = updateChannelFieldByID("invalid-id", "lineColors", "#00ff00");
 * console.log(success); // false
 * // Result: No changes made, debug log shows "not-found"
 *
 * @algorithm
 * 1. Call findChannelByID(channelID) to locate the channel
 * 2. If channel not found (result is null):
 *    - Log debug message with "not-found" status
 *    - Return false
 * 3. If channel found:
 *    - Extract type and index from result
 *    - Get the target array (channelState[type][fieldName])
 *    - Verify array exists
 *    - Update array[index] = value
 *    - Log debug message with success details
 *    - Return true
 * 4. Reactive state system automatically notifies subscribers
 *
 * @throws {TypeError} Does not throw, returns false on errors
 *
 * @dependencies
 * - findChannelByID() - To locate the channel
 * - channelState - Reactive state object containing channel data
 * - debugLite.log() - For debug logging (optional)
 *
 * @sideeffects
 * - Mutates channelState arrays directly
 * - Triggers reactive subscribers for the modified field
 * - May cause chart updates (redraw or recreation depending on field)
 * - Logs debug information to debugLite
 *
 * @testcase
 * Input: channelID="analog-0-abc", fieldName="lineColors", value="#ff0000"
 * Expected: Returns true, channelState.analog.lineColors[0] = "#ff0000"
 * Side Effect: Color subscriber triggered, chart series color updated
 *
 * @testcase
 * Input: channelID="digital-1-xyz", fieldName="inverts", value=true
 * Expected: Returns true, channelState.digital.inverts[1] = true
 * Side Effect: Invert subscriber triggered, data recalculated, chart recreated
 *
 * @testcase
 * Input: channelID="invalid-channel-id", fieldName="lineColors", value="#00ff00"
 * Expected: Returns false, no state changes
 * Side Effect: Debug log entry with "not-found" status
 *
 * @testcase
 * Input: channelID=null, fieldName="scales", value=2.0
 * Expected: Returns false (findChannelByID returns null)
 *
 * @performance O(n) for channel lookup, O(1) for update
 *
 * @see {@link findChannelByID} - Used internally for channel lookup
 * @see {@link updateChannelFieldByIndex} - Lower-level update function
 * @see {@link subscribeChartUpdates} - Handles subscriber notifications
 */
// Helper: update a named per-channel array (like 'inverts' or 'scales') by channelID
function updateChannelFieldByID(channelID, fieldName, value) {
  const found = findChannelByID(channelID);
  try {
    debugLite.log("updateByID.attempt", {
      channelID,
      field: found ? "found" : "not-found",
      fieldName,
      newValue: value,
    });
  } catch (e) {}
  if (!found) return false;
  const arr = channelState[found.type][fieldName];
  if (!Array.isArray(arr)) return false;
  arr[found.idx] = value;
  try {
    debugLite.log("updateByID.ok", {
      channelID,
      type: found.type,
      idx: found.idx,
      fieldName,
      newValue: value,
    });
  } catch (e) {}
  return true;
}

/**
 * Update a channel field using direct array index access
 *
 * @function updateChannelFieldByIndex
 * @category State Management / Direct Update
 * @since 1.0.0
 *
 * @description
 * Lower-level function that directly mutates channelState arrays using
 * numeric indices. This function performs defensive bounds checking and
 * ensures the target field array exists before updating. No channel ID
 * lookup is performed - the caller must provide the correct type and index.
 *
 * @param {string} type - Channel type: "analog" or "digital"
 * @param {number} idx - Zero-based array index
 * @param {string} fieldName - Field array name (e.g., "lineColors", "scales")
 * @param {*} value - New value to set
 *
 * @returns {boolean} true if update succeeded, false on validation failure
 *
 * @mermaid
 * flowchart TD
 *     A["Input type, index, fieldName, value"] --> B{"Type is analog or digital?"}
 *     B -->|No| B1["Return false"]
 *     B -->|Yes| C["Get channelState[type]"]
 *     C --> D{"Section exists?"}
 *     D -->|No| B1
 *     D -->|Yes| E["Ensure field array initialized"]
 *     E --> F["Get array reference"]
 *     F --> G{"Value is array?"}
 *     G -->|No| B1
 *     G -->|Yes| H["Convert idx to number"]
 *     H --> I{"Index finite and in range?"}
 *     I -->|No| B1
 *     I -->|Yes| J["Write value into array"]
 *     J --> K["Trigger subscribers"]
 *     K --> L["Return true"]
 *     style A fill:#E3F2FD,stroke:#1565C0,color:#000
 *     style L fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style B1 fill:#FFCDD2,stroke:#C62828,color:#000
 *     style K fill:#F3E5F5,stroke:#6A1B9A,color:#fff
 *
 * @example
 * // Update analog channel color by index
 * const success = updateChannelFieldByIndex("analog", 0, "lineColors", "#ff0000");
 * // Result: channelState.analog.lineColors[0] = "#ff0000"
 *
 * @example
 * // Update digital channel invert flag
 * updateChannelFieldByIndex("digital", 2, "inverts", true);
 * // Result: channelState.digital.inverts[2] = true, chart recreates
 *
 * @example
 * // Update scale factor
 * updateChannelFieldByIndex("analog", 1, "scales", 2.5);
 * // Result: channelState.analog.scales[1] = 2.5
 *
 * @example
 * // Invalid type - returns false
 * const success = updateChannelFieldByIndex("invalid", 0, "lineColors", "#fff");
 * console.log(success); // false
 *
 * @example
 * // Out of bounds index - returns false
 * const success = updateChannelFieldByIndex("analog", 999, "lineColors", "#fff");
 * console.log(success); // false
 *
 * @algorithm
 * 1. Validate type parameter:
 *    - Must be exactly "analog" or "digital"
 *    - Return false if invalid
 * 2. Get channelState section: s = channelState[type]
 *    - Return false if section doesn't exist
 * 3. Ensure target field array exists:
 *    - Initialize s[fieldName] as empty array if undefined
 *    - Return false if fieldName is not array after initialization
 * 4. Validate index:
 *    - Convert idx to number
 *    - Check: Number.isFinite(i) && i >= 0 && i < arr.length
 *    - Log attempt via debugLite
 *    - Return false if validation fails
 * 5. Perform update:
 *    - arr[i] = value
 *    - Log success via debugLite
 *    - Return true
 *
 * @throws {TypeError} Does not throw, returns false for invalid inputs
 *
 * @dependencies
 * - channelState.analog - Analog channel state object
 * - channelState.digital - Digital channel state object
 * - debugLite.log() - Debug logging utility (optional, failures caught)
 *
 * @sideeffects
 * - Direct mutation of channelState arrays
 * - Triggers reactive subscribers for the field
 * - Chart updates depend on field type:
 *   - lineColors/yLabels → in-place chart update
 *   - scales/inverts → full chart recreation
 *   - starts/durations → x-axis scale update
 *
 * @validation
 * This function validates:
 * - Type is "analog" or "digital"
 * - State section exists
 * - Index is finite number within bounds
 *
 * This function does NOT validate:
 * - Value type correctness (caller's responsibility)
 * - Field name validity (invalid names have no effect)
 *
 * @testcase
 * Input: type="analog", idx=0, fieldName="lineColors", value="#ff0000"
 * Expected: Returns true, lineColors[0] updated
 *
 * @testcase
 * Input: type="digital", idx=1, fieldName="inverts", value=true
 * Expected: Returns true, inverts[1] = true
 *
 * @testcase
 * Input: type="invalid", idx=0, fieldName="lineColors", value="#fff"
 * Expected: Returns false, no changes
 *
 * @testcase
 * Input: type="analog", idx=-1, fieldName="scales", value=2.0
 * Expected: Returns false (negative index)
 *
 * @testcase
 * Input: type="analog", idx=1000, fieldName="lineColors", value="#fff"
 * Expected: Returns false (index out of bounds)
 *
 * @testcase
 * Input: type="analog", idx=NaN, fieldName="scales", value=1.5
 * Expected: Returns false (non-finite index)
 *
 * @performance O(1) constant time operation
 *
 * @see {@link updateChannelFieldByID} - Higher-level wrapper using channelID
 * @see {@link subscribeChartUpdates} - Subscriber system that reacts to changes
 */
function updateChannelFieldByIndex(type, idx, fieldName, value) {
  const updateStartTime = performance.now();

  if (type !== "analog" && type !== "digital") return false;
  const s = channelState[type];
  if (!s) return false;
  // ensure the target field exists and is an array
  s[fieldName] = s[fieldName] || [];
  const arr = s[fieldName];
  if (!Array.isArray(arr)) return false;
  const i = Number(idx);
  try {
    debugLite.log("updateByIndex.attempt", {
      type,
      idx: i,
      fieldName,
      newValue: value,
    });
  } catch (e) {}
  if (!Number.isFinite(i) || i < 0 || i >= arr.length) return false;
  arr[i] = value;

  const updateEndTime = performance.now();
  const updateTime = updateEndTime - updateStartTime;
  if (updateTime > 10) {
    console.log(
      `[Performance] updateChannelFieldByIndex: ${fieldName} = ${value}`,
      {
        type,
        idx: i,
        timeMs: updateTime.toFixed(2),
      }
    );
  }

  try {
    debugLite.log("updateByIndex.ok", {
      type,
      idx: i,
      fieldName,
      newValue: value,
    });
  } catch (e) {}
  return true;
}

/**
 * Delete a channel completely from the system by its channelID
 *
 * @function deleteChannelByID
 * @category State Management / Channel Deletion
 * @since 1.0.0
 *
 * @description
 * Removes a channel from all related arrays in channelState, dataState, and
 * the raw data object. This ensures all arrays remain synchronized with the
 * same length. The operation is immediate and irreversible. After deletion,
 * reactive subscribers trigger and charts are automatically recreated with
 * the updated series list.
 *
 * @param {string} channelID - Unique identifier of channel to delete
 *
 * @returns {boolean} true if channel was found and deleted, false otherwise
 *
 * @mermaid
 * flowchart TD
 *     A["Input channelID"] --> B["Find channel with findChannelByID"]
 *     B --> C{"Channel exists?"}
 *     C -->|No| D["Return false; no change"]
 *     C -->|Yes| E["Extract type and index"]
 *     E --> F["List arrays that must stay in sync"]
 *     F --> G["Splice index from each array"]
 *     G --> H["Remove matching dataState series"]
 *     H --> I["Remove matching raw data series"]
 *     I --> J["Notify channelIDs subscribers"]
 *     J --> K["Charts rebuild without channel"]
 *     K --> L["Return true"]
 *     style A fill:#F44336,stroke:#B71C1C,color:#fff
 *     style D fill:#FFCDD2,stroke:#C62828,color:#000
 *     style L fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style G fill:#FFCCBC,stroke:#D84315,color:#000
 *     style J fill:#2196F3,stroke:#0D47A1,color:#fff
 *
 * @example
 * // Delete an existing analog channel
 * const success = deleteChannelByID("analog-0-abc123");
 * console.log(success); // true
 * // Result: Channel removed from all arrays, chart recreated without it
 *
 * @example
 * // Attempt to delete non-existent channel
 * const success = deleteChannelByID("invalid-channel-id");
 * console.log(success); // false
 * // Result: No changes made, function returns early
 *
 * @example
 * // Delete digital channel
 * deleteChannelByID("digital-2-xyz789");
 * // Result: Digital channel removed, digital chart recreated
 *
 * @algorithm
 * 1. Locate channel using findChannelByID(channelID)
 * 2. If not found (result is null):
 *    - Return false immediately
 * 3. If found, extract type and index from result
 * 4. Get state section: s = channelState[type]
 * 5. Define list of arrays that must be synchronized:
 *    - yLabels, lineColors, yUnits, groups, axesScales
 *    - scales, starts, durations, inverts, channelIDs
 * 6. For each array name in the list:
 *    - Check if s[name] exists and is array
 *    - If valid and index is in bounds: splice(index, 1)
 * 7. Remove corresponding series from dataState[type]:
 *    - Calculate seriesIdx = index + 1 (offset for time array)
 *    - Splice from dataState array
 * 8. Remove corresponding series from raw data[type]:
 *    - Calculate seriesIdx = index + 1
 *    - Splice from data array
 * 9. Reactive system notifies channelIDs subscribers
 * 10. Subscribers trigger chart recreation
 * 11. Return true
 *
 * @throws {TypeError} Does not throw, catches errors and continues
 *
 * @dependencies
 * - findChannelByID() - To locate the channel
 * - channelState - Reactive state with channel metadata
 * - dataState - Reactive state with chart data arrays
 * - data - Raw parsed data object
 *
 * @sideeffects
 * - Mutates multiple arrays in channelState[type]
 * - Mutates dataState[type] series array
 * - Mutates raw data[type] series array
 * - Triggers channelIDs subscriber (causes chart recreation)
 * - All arrays must remain synchronized (same length after deletion)
 *
 * @synchronization
 * Critical: All per-channel arrays must be kept in sync!
 * Before deletion (3 channels):
 * ```
 * channelIDs:   ["CH001", "CH002", "CH003"]
 * yLabels:      ["Temp1", "Temp2", "Temp3"]
 * lineColors:   ["#f00",  "#0f0",  "#00f"]
 * scales:       [1,       1,       2]
 * ```
 * After deleteChannelByID("CH002") (2 channels remain):
 * ```
 * channelIDs:   ["CH001", "CH003"]
 * yLabels:      ["Temp1", "Temp3"]
 * lineColors:   ["#f00",  "#00f"]
 * scales:       [1,       2]
 * ```
 *
 * @testcase
 * Input: channelID = "analog-1-abc" (exists at index 1 of 3 channels)
 * Expected: Returns true
 * State Before: yLabels=["A","B","C"], lineColors=["#f00","#0f0","#00f"]
 * State After: yLabels=["A","C"], lineColors=["#f00","#00f"]
 * Side Effect: Chart recreated with 2 series
 *
 * @testcase
 * Input: channelID = "invalid-id"
 * Expected: Returns false
 * State: No changes to any arrays
 *
 * @testcase
 * Input: channelID = "digital-0-xyz" (last remaining digital channel)
 * Expected: Returns true
 * State After: All digital arrays become empty []
 * Side Effect: Digital chart recreated with no series
 *
 * @testcase
 * Input: channelID = null
 * Expected: Returns false (findChannelByID returns null)
 *
 * @testcase
 * Input: channelID = ""
 * Expected: Returns false (findChannelByID returns null)
 *
 * @performance O(n*m) where n = number of arrays, m = array length
 *
 * @warnings
 * ⚠️ This operation is IRREVERSIBLE - no undo functionality
 * ⚠️ All arrays must be kept in sync - missing splice causes corruption
 * ⚠️ Chart will be completely recreated (expensive operation)
 *
 * @see {@link findChannelByID} - Used to locate the channel
 * @see {@link subscribeChartUpdates} - Handles post-deletion chart recreation
 * @see {@link CALLBACK_TYPE.DELETE} - Message type that triggers this function
 */
// Helper: delete a channel by channelID (splice same arrays as delete-by-index)
function deleteChannelByID(channelID) {
  const found = findChannelByID(channelID);
  if (!found) return false;
  const s = channelState[found.type];
  const i = found.idx;

  // Arrays that must remain in sync for each channel
  const perChannelArrays = [
    "yLabels",
    "lineColors",
    "yUnits",
    "groups",
    "axesScales",
    "scales",
    "starts",
    "durations",
    "inverts",
    "channelIDs",
  ];

  perChannelArrays.forEach((name) => {
    if (s[name] && Array.isArray(s[name])) {
      if (i >= 0 && i < s[name].length) s[name].splice(i, 1);
    }
  });

  // Also remove the placeholder series from dataState and original data to keep series alignment.
  try {
    const dtype = found.type;
    const arr = dataState && dataState[dtype];
    const raw = data && data[dtype];
    // series arrays start at index 1 (0 is time)
    const seriesIdx = i + 1;
    if (Array.isArray(arr) && seriesIdx >= 1 && seriesIdx < arr.length) {
      arr.splice(seriesIdx, 1);
    }
    if (raw && Array.isArray(raw) && seriesIdx >= 1 && seriesIdx < raw.length) {
      raw.splice(seriesIdx, 1);
    }
  } catch (e) {
    // non-fatal
  }

  return true;
}

/**
 * Process combined CFG and DAT data from child merger app
 * Parses the combined files and loads them into the main app
 */
async function processCombinedDataFromMerger(cfgText, datText) {
  try {
    console.log(
      "[processCombinedDataFromMerger] 🔄 Starting combined data processing..."
    );

    // PHASE 1: Parse CFG and DAT files
    console.log("[processCombinedDataFromMerger] 📝 Parsing CFG and DAT...");
    const cfg = parseCFG(cfgText, TIME_UNIT);
    const data = parseDAT(datText, cfg, "ASCII", TIME_UNIT);

    // Store globally
    window.globalCfg = cfg;
    window.globalData = data;

    console.log("[processCombinedDataFromMerger] ✅ Parsing complete");

    // Show loading indicator
    const fixedResultsEl = document.getElementById("fixedResults");
    if (fixedResultsEl) {
      fixedResultsEl.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-secondary);"><p>🔄 Loading combined data...</p></div>';
    }

    // Validation
    if (!data.time || data.time.length === 0) {
      throw new Error("Failed to parse combined COMTRADE data.");
    }

    console.log(
      "[processCombinedDataFromMerger] 📊 PHASE 2: Updating UI state"
    );

    // PHASE 2: Update global data state
    dataState.analog = data.analogData;
    dataState.digital = data.digitalData;

    // Update UI with filename
    const cfgFileNameEl = document.getElementById("cfgFileName");
    const datFileNameEl = document.getElementById("datFileName");
    if (cfgFileNameEl) cfgFileNameEl.textContent = "Combined Data (Merged)";
    if (datFileNameEl) datFileNameEl.textContent = "Combined Data (Merged)";

    const groups = autoGroupChannels(cfg.analogChannels);

    // UI helper calls
    showFileInfo();
    updateFileInfo("Combined Data (Merged)", "Combined Data (Merged)");
    updateStatsCards({
      sampleRate: cfg.sampleRate || 4800,
      duration: cfg.duration || 2000,
      analogChannels: cfg.analogChannels,
      digitalChannels: cfg.digitalChannels,
    });
    toggleChartsVisibility(true);

    console.log(
      "[processCombinedDataFromMerger] 🎨 PHASE 3: Channel state initialization"
    );

    // PHASE 3: Initialize channel state
    if (channelState && channelState.suspendHistory)
      channelState.suspendHistory();
    try {
      initializeChannelState(cfg, data);

      // Populate group IDs
      const analogGroupIds = new Array(cfg.analogChannels.length);
      groups.forEach((group) => {
        group.indices.forEach((channelIdx) => {
          analogGroupIds[channelIdx] = group.groupId;
        });
      });
      channelState.analog.groups = analogGroupIds;
      console.log(
        "[processCombinedDataFromMerger] ✅ Populated analog group IDs"
      );
    } finally {
      if (channelState && channelState.resumeHistory)
        channelState.resumeHistory();
    }

    console.log("[processCombinedDataFromMerger] 📈 PHASE 4: Chart rendering");

    // PHASE 4: Render all charts
    renderComtradeCharts(
      cfg,
      data,
      chartsContainer,
      charts,
      verticalLinesX,
      createState,
      calculateDeltas,
      TIME_UNIT,
      channelState
    );

    console.log(
      "[processCombinedDataFromMerger] 🎯 PHASE 5: Polar chart initialization"
    );

    // PHASE 5: Initialize Polar Chart
    try {
      if (!polarChart) {
        polarChart = new PolarChart("polarChartContainer");
        polarChart.init();
        console.log("[processCombinedDataFromMerger] ✅ PolarChart created");
      }

      if (window.requestIdleCallback) {
        window.requestIdleCallback(
          () => {
            try {
              polarChart.updatePhasorAtTimeIndex(cfg, data, 0);
              console.log(
                "[processCombinedDataFromMerger] ✅ Phasor data updated"
              );
            } catch (err) {
              console.error(
                "[processCombinedDataFromMerger] Phasor update failed:",
                err
              );
            }
          },
          { timeout: 2000 }
        );
      } else {
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              polarChart.updatePhasorAtTimeIndex(cfg, data, 0);
            } catch (err) {
              console.error(
                "[processCombinedDataFromMerger] Phasor update failed:",
                err
              );
            }
          }, 100);
        });
      }
    } catch (err) {
      console.error(
        "[processCombinedDataFromMerger] Polar chart failed:",
        err.message
      );
    }

    console.log(
      "[processCombinedDataFromMerger] 📟 PHASE 6: Computed channels"
    );

    // PHASE 6: Load persisted computed channels
    const savedChannels = loadComputedChannelsFromStorage();
    if (savedChannels.length > 0) {
      if (!data.computedData) data.computedData = [];
      for (const savedChannel of savedChannels) {
        const exists = data.computedData.some(
          (ch) => ch.equation === savedChannel.expression
        );
        if (!exists) {
          data.computedData.push({
            id: savedChannel.name,
            equation: savedChannel.expression,
            data: savedChannel.data,
            index: data.computedData.length,
          });
        }
      }
      if (data.computedData.length > 0) {
        renderComputedChannels(
          data,
          chartsContainer,
          charts,
          verticalLinesX,
          subscribeChartUpdates,
          createState,
          calculateDeltas,
          TIME_UNIT,
          channelState
        );
      }
    }

    console.log(
      "[processCombinedDataFromMerger] ✅ Combined data processing complete!"
    );

    if (fixedResultsEl) {
      fixedResultsEl.innerHTML =
        '<div style="padding: 20px; text-align: center; color: green;">✅ Combined data loaded successfully!</div>';
    }
  } catch (error) {
    console.error("[processCombinedDataFromMerger] ❌ Error:", error);
    const fixedResultsEl = document.getElementById("fixedResults");
    if (fixedResultsEl) {
      fixedResultsEl.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">❌ Error loading combined data: ${error.message}</div>`;
    }
  }
}

// Channel state for analog/digital
export const channelState = createState({
  analog: {
    yLabels: [],
    lineColors: [],
    yUnits: [],
    groups: [],
    axesScales: [],
    // per-channel parameters managed by ChannelList
    scales: [],
    starts: [],
    durations: [],
    inverts: [],
    xLabel: "",
    xUnit: "",
  },
  digital: {
    yLabels: [],
    lineColors: [],
    yUnits: [],
    groups: [],
    axesScales: [],
    // per-channel parameters managed by ChannelList
    scales: [],
    starts: [],
    durations: [],
    inverts: [],
    xLabel: "",
    xUnit: "",
  },
});

// Small runtime helper to inspect key runtime structures from DevTools.
// Call `window.__inspectComtradeState()` in the console to print `data`,
// `dataState`, `channelState`, and `charts` (safe, non-destructive).
try {
  if (typeof window !== "undefined") {
    window.__inspectComtradeState = function () {
      try {
        console.groupCollapsed("__inspectComtradeState");
        console.log(
          "data (module):",
          typeof data !== "undefined" ? data : null
        );
        console.log(
          "dataState (module):",
          typeof dataState !== "undefined" ? dataState : null
        );
        console.log(
          "channelState (module):",
          typeof channelState !== "undefined" ? channelState : null
        );
        try {
          console.log(
            "charts (module):",
            typeof charts !== "undefined" ? charts : null
          );
          if (Array.isArray(charts)) {
            charts.forEach((c, i) => {
              try {
                const xArr = c && c.data && c.data[0] ? c.data[0] : undefined;
                console.log(
                  `chart[${i}] x-array (first 10):`,
                  xArr && xArr.slice ? xArr.slice(0, 10) : xArr
                );
              } catch (e) {}
            });
          }
        } catch (e) {}
        console.groupEnd();
      } catch (err) {
        console.error("__inspectComtradeState failed:", err);
      }
    };
  }
} catch (e) {}

// Friendly property aliases so callers can subscribe using business names
export const PROPERTY_ALIASES = {
  color: "lineColors",
  name: "yLabels",
  scale: "scales",
  start: "starts",
  duration: "durations",
  invert: "inverts",
  // allow subscribing directly to channelIDs array if desired
  channelIDs: "channelIDs",
  group: "groups",
};

// Convenience helper: subscribe to a logical property across both analog and digital
// Usage: channelState.subscribeProperty('color', handler, { descendants: true })
// The handler receives the same change object emitted by createState
channelState.subscribeProperty = function (propName, fn, options = {}) {
  const mapped = PROPERTY_ALIASES[propName] || propName;
  try {
    // subscribe to analog.<mapped> and digital.<mapped>
    this.subscribe(fn, {
      path: `analog.${mapped}`,
      descendants: !!options.descendants,
    });
    this.subscribe(fn, {
      path: `digital.${mapped}`,
      descendants: !!options.descendants,
    });
  } catch (e) {
    console.warn("subscribeProperty failed:", e);
  }
};

// Background mode: 0 = white, 1 = dark
export const whiteBackground = createState(0);

// --- DOM Elements ---
const cfgFileInput = document.getElementById("cfgFile");
const loadBtn = document.getElementById("loadBtn");
const cfgFileNameEl = document.getElementById("cfgFileName");
const datFileNameEl = document.getElementById("datFileName");
const chartsContainer = document.getElementById("charts");
const fixedResultsEl = document.getElementById("fixed-results");

console.log("[main.js] DOM Elements:", {
  loadBtn,
  cfgFileInput,
  chartsContainer,
});

// Global error capture so runtime crashes are visible in the app UI
window.addEventListener("error", (ev) => {
  try {
    const msg = `Error: ${ev.message} at ${ev.filename}:${ev.lineno}:${ev.colno}`;
    console.error(msg, ev.error);
    if (fixedResultsEl)
      fixedResultsEl.textContent =
        msg + "\n" + (ev.error && ev.error.stack ? ev.error.stack : "");
  } catch (e) {
    console.error("Error handler failed", e);
  }
});
window.addEventListener("unhandledrejection", (ev) => {
  try {
    const msg = `UnhandledRejection: ${
      ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)
    }`;
    console.error(msg, ev.reason);
    if (fixedResultsEl)
      fixedResultsEl.textContent =
        msg + "\n" + (ev.reason && ev.reason.stack ? ev.reason.stack : "");
  } catch (e) {
    console.error("Rejection handler failed", e);
  }
});

// --- Event Listeners ---
loadBtn.addEventListener("click", handleLoadFiles);
console.log("[main.js] loadBtn event listener attached");

// Merge Multiple Files button
const mergeMultipleFilesBtn = document.getElementById("mergeMultipleFilesBtn");
if (mergeMultipleFilesBtn) {
  mergeMultipleFilesBtn.addEventListener("click", () => {
    console.log("[main.js] Opening COMTRADE File Merger...");
    openMergerWindow();
  });
  console.log("[main.js] mergeMultipleFilesBtn event listener attached");
}

// Listen for merged files from the merger app
window.addEventListener("mergedFilesReceived", async (event) => {
  console.log(
    "[main.js] 📦 Received merged files from merger app:",
    event.detail
  );

  try {
    // Handle BOTH old and new data structures for backwards compatibility
    const {
      cfg: cfgData,
      data: parsedData, // NEW: Already parsed data from combiner
      datContent, // OLD: Raw DAT text for backwards compatibility
      filenames,
      fileCount,
      isMerged,
      isMergedFromCombiner,
    } = event.detail;

    // Validate we have either the new structure (cfg+data) or old structure (cfgData+datContent)
    if (!cfgData || (!parsedData && !datContent)) {
      showError(
        "Invalid merged file data received from merger app.",
        fixedResultsEl
      );
      return;
    }

    // Show loading indicator
    fixedResultsEl.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-secondary);"><p>🔄 Loading merged files...</p><p style="font-size: 0.9rem; margin-top: 10px;">Processing merged COMTRADE data</p></div>';

    console.log("[main.js] 📊 PHASE 1: Processing merged data");

    // Parse the merged CFG and DAT data
    cfg = cfgData;

    // ✅ Make cfg globally accessible for computed channel evaluation (like temp repo)
    window.globalCfg = cfg;

    // Use already-parsed data if available (NEW path from combiner)
    // Otherwise parse raw text (OLD path for backwards compatibility)
    let datData;
    if (parsedData) {
      // NEW: Data is already parsed by combiner using parent's parseCFG/parseDAT
      console.log(`[main.js] ✅ Using pre-parsed data from combiner`);
      datData = parsedData;
    } else if (typeof datContent === "string") {
      // OLD: Parse raw text content
      const fileType = cfg.ft || "ASCII";
      console.log(`[main.js] Parsing merged DAT content as ${fileType} format`);
      datData = parseDAT(datContent, cfg, fileType, TIME_UNIT);
    } else {
      datData = datContent;
    }

    data = {
      ...datData,
      time: datData.time || [],
      analogData: datData.analogData || [],
      digitalData: datData.digitalData || [],
    };

    // ✅ Make data globally accessible for computed channel evaluation (like temp repo)
    window.globalData = data;

    if (!data.time || data.time.length === 0) {
      showError("Failed to parse merged COMTRADE data.", fixedResultsEl);
      return;
    }

    console.log("[main.js] 📊 PHASE 2: Initializing data state");

    // Update global data state
    dataState.analog = data.analogData;
    dataState.digital = data.digitalData;

    // Update UI with filenames
    const filenameText = isMerged
      ? `Merged: ${filenames.join(", ")}`
      : `Loaded: ${filenames[0]}`;

    cfgFileNameEl.textContent = filenameText;
    datFileNameEl.textContent = isMerged
      ? `(${fileCount} DAT files merged)`
      : `DAT File: ${filenames[0]}.dat`;

    const groups = autoGroupChannels(cfg.analogChannels);

    // ===== UI HELPER CALLS (Light) =====
    showFileInfo();
    updateFileInfo(
      filenames[0],
      isMerged ? `${fileCount} files merged` : `${filenames[0]}.dat`
    );
    updateStatsCards({
      sampleRate: cfg.sampleRate || 4800,
      duration: cfg.duration || 2000,
      analogChannels: cfg.analogChannels,
      digitalChannels: cfg.digitalChannels,
    });
    toggleChartsVisibility(true);

    console.log("[main.js] 🎨 PHASE 3: Channel state initialization");

    // PHASE 3: Initialize channel state
    if (channelState && channelState.suspendHistory)
      channelState.suspendHistory();
    try {
      initializeChannelState(cfg, data);

      // Populate group IDs from autoGroupChannels results
      const analogGroupIds = new Array(cfg.analogChannels.length);
      groups.forEach((group) => {
        group.indices.forEach((channelIdx) => {
          analogGroupIds[channelIdx] = group.groupId;
        });
      });
      channelState.analog.groups = analogGroupIds;
      console.log(
        "[main.js] ✅ Populated analog group IDs from merged files:",
        analogGroupIds
      );
    } finally {
      if (channelState && channelState.resumeHistory)
        channelState.resumeHistory();
    }

    // Yield to event loop
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("[main.js] 📈 PHASE 4: Chart rendering");

    // PHASE 4: Render all charts
    renderComtradeCharts(
      cfg,
      data,
      chartsContainer,
      charts,
      verticalLinesX,
      createState,
      calculateDeltas,
      TIME_UNIT,
      channelState
    );

    // Yield to event loop
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("[main.js] 🎯 PHASE 5: Polar chart initialization");

    // PHASE 5: Initialize Polar Chart
    try {
      console.log("[main.js] Creating PolarChart instance...");
      if (!polarChart) {
        polarChart = new PolarChart("polarChartContainer");
        polarChart.init();
        console.log("[main.js] ✅ PolarChart instance created");
      } else {
        console.log(
          "[main.js] ⏭️ PolarChart already exists, skipping creation"
        );
      }

      if (window.requestIdleCallback) {
        window.requestIdleCallback(
          () => {
            try {
              console.log("[PolarChart] Background: Updating phasor data...");
              polarChart.updatePhasorAtTimeIndex(cfg, data, 0);
              console.log("[PolarChart] ✅ Background phasor update complete");
            } catch (err) {
              console.error("[PolarChart] Background update failed:", err);
            }
          },
          { timeout: 2000 }
        );
      } else {
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              console.log("[PolarChart] Fallback: Updating phasor data...");
              polarChart.updatePhasorAtTimeIndex(cfg, data, 0);
            } catch (err) {
              console.error("[PolarChart] Fallback update failed:", err);
            }
          }, 100);
        });
      }

      console.log(
        "[main.js] ✅ Polar chart instance created (rendering deferred)"
      );
    } catch (err) {
      console.error(
        "[main.js] ❌ Failed to initialize polar chart:",
        err.message
      );
    }

    // Yield to event loop
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("[main.js] 📟 PHASE 6: Computed channels");

    // PHASE 6: Load persisted computed channels
    const savedChannels = loadComputedChannelsFromStorage();
    if (savedChannels.length > 0) {
      if (!data.computedData) data.computedData = [];
      for (const savedChannel of savedChannels) {
        const exists = data.computedData.some(
          (ch) => ch.equation === savedChannel.expression
        );
        if (!exists) {
          data.computedData.push({
            id: savedChannel.name,
            equation: savedChannel.expression,
            data: savedChannel.data,
            index: data.computedData.length,
          });
        }
      }
      if (data.computedData.length > 0) {
        const exportBtn = document.getElementById("exportComputedChannelBtn");
        const csvBtn = document.getElementById("exportCSVBtn");
        if (exportBtn) exportBtn.disabled = false;
        if (csvBtn) csvBtn.disabled = false;
        renderComputedChannels(
          data,
          chartsContainer,
          charts,
          verticalLinesX,
          channelState
        );
      }
    }
    setupComputedChannelsListener();

    // Yield to event loop
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("[main.js] 🔗 PHASE 7: Chart integrations");

    // PHASE 7: Setup polar chart with vertical lines
    if (polarChart) {
      try {
        setupPolarChartWithVerticalLines(
          polarChart,
          cfg,
          data,
          verticalLinesX,
          charts
        );
        console.log("[main.js] ✅ Polar chart integrated");
      } catch (err) {
        console.error(
          "[main.js] ❌ Polar chart integration failed:",
          err.message
        );
      }
    }

    // PHASE 8: Final setup
    try {
      applyInitialStartDurations(channelState, dataState, charts);
    } catch (e) {
      console.debug("applyInitialStartDurations failed:", e);
    }

    try {
      const maxDuration = data.time ? data.time[data.time.length - 1] : 1;
      verticalLineControl = initVerticalLineControl({
        dataState: dataState,
        maxDuration: maxDuration,
        onPositionChange: (value) => {
          // Vertical line position changed
        },
      });
    } catch (error) {
      console.error(
        "[main.js] Failed to initialize vertical line control:",
        error
      );
    }

    if (window._resizableGroup) window._resizableGroup.disconnect();
    window._resizableGroup = new ResizableGroup(".dragBar");

    // Initialize fast lookup map
    rebuildChannelIDMap();

    // Setup subscriptions
    try {
      channelState.analog?.subscribe?.(() => {
        rebuildChannelIDMap();
      });
      channelState.digital?.subscribe?.(() => {
        rebuildChannelIDMap();
      });
    } catch (e) {
      console.warn("[main] Failed to set up channelID map rebuild:", e);
    }

    // Defer subscription setup
    if (window.requestIdleCallback) {
      window.requestIdleCallback(
        () => {
          console.log(
            "[main.js] Background: Setting up chart subscriptions..."
          );
          subscribeChartUpdates(
            channelState,
            dataState,
            charts,
            chartsContainer,
            verticalLinesX,
            cfg,
            data,
            createState,
            calculateDeltas,
            TIME_UNIT
          );
          console.log("[main.js] ✅ Chart subscriptions ready");
        },
        { timeout: 2000 }
      );
    } else {
      setTimeout(() => {
        subscribeChartUpdates(
          channelState,
          dataState,
          charts,
          chartsContainer,
          verticalLinesX,
          cfg,
          data,
          createState,
          calculateDeltas,
          TIME_UNIT
        );
      }, 500);
    }

    console.log(
      "[main.js] 🎉 COMPLETE - All merged files loaded and rendered successfully"
    );
    fixedResultsEl.innerHTML = "";
  } catch (error) {
    console.error("[main.js] ❌ Error processing merged files:", error.message);
    showError(
      "An error occurred while processing the merged COMTRADE files. Check the console for details.",
      fixedResultsEl
    );
  }
});
console.log("[main.js] mergedFilesReceived event listener attached");

// Sidebar Toggle Functionality
const sidebar = document.getElementById("sidebar");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const mainContent = document.querySelector("main");
const floatingWindowBtn = document.getElementById("floatingWindowBtn");
const belowChartBtn = document.getElementById("belowChartBtn");
const returnSidebarBtn = document.getElementById("returnSidebarBtn");
const returnSidebarFromBelowBtn = document.getElementById(
  "returnSidebarFromBelowBtn"
);
const detachedWindow = document.getElementById("detachedWindow");
const windowTitleBar = document.getElementById("windowTitleBar");
const attachWindowBtn = document.getElementById("attachWindowBtn");
const closeWindowBtn = document.getElementById("closeWindowBtn");
const detachedWindowContent = document.getElementById("detachedWindowContent");

// Create analysis container for detached sidebar in charts area
let analysisContainer = null;
function getOrCreateAnalysisContainer() {
  if (!analysisContainer) {
    analysisContainer = document.createElement("div");
    analysisContainer.id = "analysis-sidebar-container";
    analysisContainer.style.background = "var(--bg-secondary)";
    analysisContainer.style.border = "1px solid var(--border-color)";
    analysisContainer.style.borderRadius = "var(--border-radius-sm)";
    analysisContainer.style.padding = "16px";
    analysisContainer.style.marginTop = "16px";
  }
  return analysisContainer;
}

// Track current sidebar layout mode
let sidebarLayoutMode = "sidebar"; // "sidebar", "floating", "charts-inline", "charts-below", or "analysis-container"

// Dragging variables
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Helper function to move polar chart section to different locations
function movePolarChartSection(targetMode) {
  const polarChartSection = document.querySelector(".polar-chart-section");
  if (!polarChartSection) return;

  switch (targetMode) {
    case "floating":
      // Move to floating window
      detachedWindowContent.innerHTML = polarChartSection.innerHTML;
      detachedWindow.classList.add("show");
      sidebar.style.display = "none";
      sidebarToggleBtn.style.display = "flex";
      if (mainContent) mainContent.classList.add("sidebar-closed");
      console.log("[main.js] Sidebar moved to floating window");
      break;

    case "charts-inline":
      // Move to charts container (side by side)
      const chartsGrid =
        document.querySelector(".charts-grid") ||
        chartsContainer.querySelector(".uplot-container");
      if (chartsContainer) {
        // Store original content before moving
        chartsContainer.classList.remove("charts-block-layout");
        polarChartSection.style.order = "-1"; // Display first in charts container
        chartsContainer.style.display = "grid";
        chartsContainer.style.gridTemplateColumns = "1fr 1fr";
        chartsContainer.style.gap = "16px";
        chartsContainer.insertBefore(
          polarChartSection,
          chartsContainer.firstChild
        );
        sidebar.style.display = "none";
        sidebarToggleBtn.style.display = "flex";
        if (mainContent) mainContent.classList.add("sidebar-closed");
        console.log(
          "[main.js] Sidebar moved to charts container inline (side by side)"
        );
      }
      break;

    case "charts-below":
      // Move to charts container (below charts)
      if (chartsContainer) {
        // Reset order and append to end (below charts)
        chartsContainer.classList.add("charts-block-layout");
        polarChartSection.style.order = "auto";
        chartsContainer.style.display = "block";
        chartsContainer.style.gridTemplateColumns = "auto";
        chartsContainer.style.gap = "auto";
        chartsContainer.appendChild(polarChartSection);
        sidebar.style.display = "none";
        sidebarToggleBtn.style.display = "flex";
        if (mainContent) mainContent.classList.add("sidebar-closed");
        console.log("[main.js] Sidebar moved to charts container below");
      }
      break;

    case "analysis-container":
      // Move to dedicated analysis container in charts area
      if (chartsContainer) {
        const container = getOrCreateAnalysisContainer();
        if (!container.parentElement) {
          chartsContainer.appendChild(container);
        }

        // Create header with close button
        const headerDiv = document.createElement("div");
        headerDiv.style.display = "flex";
        headerDiv.style.justifyContent = "space-between";
        headerDiv.style.alignItems = "center";
        headerDiv.style.marginBottom = "12px";
        headerDiv.style.paddingBottom = "8px";
        headerDiv.style.borderBottom = "1px solid var(--border-color)";

        const titleSpan = document.createElement("span");
        titleSpan.textContent = "Analysis";
        titleSpan.style.fontWeight = "600";
        titleSpan.style.color = "var(--text-primary)";
        headerDiv.appendChild(titleSpan);

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "⬅ Back";
        closeBtn.style.background = "none";
        closeBtn.style.border = "none";
        closeBtn.style.color = "var(--text-secondary)";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.fontSize = "0.85rem";
        closeBtn.style.padding = "4px 8px";
        closeBtn.style.borderRadius = "4px";
        closeBtn.style.transition = "background 0.2s";

        closeBtn.addEventListener("mouseenter", () => {
          closeBtn.style.background = "var(--bg-tertiary)";
        });
        closeBtn.addEventListener("mouseleave", () => {
          closeBtn.style.background = "none";
        });

        closeBtn.addEventListener("click", () => {
          sidebarLayoutMode = "sidebar";
          movePolarChartSection("sidebar");
        });

        headerDiv.appendChild(closeBtn);

        container.innerHTML = headerDiv.outerHTML + polarChartSection.innerHTML;
        sidebar.style.display = "none";
        sidebarToggleBtn.style.display = "flex";
        if (mainContent) mainContent.classList.add("sidebar-closed");
        console.log("[main.js] Sidebar moved to analysis container");
      }
      break;

    case "sidebar":
      // Return to original sidebar position
      const originalSidebar = document.getElementById("sidebar");
      if (originalSidebar) {
        // Restore original inline styles and remove CSS classes
        chartsContainer.classList.remove("charts-block-layout");
        if (analysisContainer && analysisContainer.parentElement) {
          analysisContainer.remove();
        }
        polarChartSection.style.order = "auto";
        originalSidebar.appendChild(polarChartSection);
        detachedWindow.classList.remove("show");
        sidebar.style.display = "flex";
        sidebar.style.flexDirection = "column";
        sidebarToggleBtn.style.display = "none";
        if (mainContent) mainContent.classList.remove("sidebar-closed");
        console.log("[main.js] Sidebar returned to original sidebar position");
      }
      break;
  }
}

// Handle floating window button
if (floatingWindowBtn) {
  floatingWindowBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarLayoutMode = "floating";
    movePolarChartSection("floating");
    updateLayoutButtonVisibility();
  });

  floatingWindowBtn.addEventListener("mouseenter", () => {
    floatingWindowBtn.style.background = "var(--bg-secondary)";
    floatingWindowBtn.style.opacity = "0.8";
  });
  floatingWindowBtn.addEventListener("mouseleave", () => {
    floatingWindowBtn.style.background = "var(--bg-tertiary)";
    floatingWindowBtn.style.opacity = "1";
  });
}

// Handle below chart button
if (belowChartBtn) {
  belowChartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarLayoutMode = "charts-below";
    movePolarChartSection("charts-below");
    updateLayoutButtonVisibility();
  });

  belowChartBtn.addEventListener("mouseenter", () => {
    belowChartBtn.style.background = "var(--bg-secondary)";
    belowChartBtn.style.opacity = "0.8";
  });
  belowChartBtn.addEventListener("mouseleave", () => {
    belowChartBtn.style.background = "var(--bg-tertiary)";
    belowChartBtn.style.opacity = "1";
  });
}

// Handle return to sidebar button
if (returnSidebarBtn) {
  returnSidebarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarLayoutMode = "sidebar";
    movePolarChartSection("sidebar");
    updateLayoutButtonVisibility();
  });

  returnSidebarBtn.addEventListener("mouseenter", () => {
    returnSidebarBtn.style.background = "var(--bg-secondary)";
    returnSidebarBtn.style.opacity = "0.8";
  });
  returnSidebarBtn.addEventListener("mouseleave", () => {
    returnSidebarBtn.style.background = "var(--bg-tertiary)";
    returnSidebarBtn.style.opacity = "1";
  });
}

// Handle return to sidebar button from below chart mode
if (returnSidebarFromBelowBtn) {
  returnSidebarFromBelowBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebarLayoutMode = "sidebar";
    movePolarChartSection("sidebar");
    updateLayoutButtonVisibility();
  });

  returnSidebarFromBelowBtn.addEventListener("mouseenter", () => {
    returnSidebarFromBelowBtn.style.background = "var(--bg-secondary)";
    returnSidebarFromBelowBtn.style.opacity = "0.8";
  });
  returnSidebarFromBelowBtn.addEventListener("mouseleave", () => {
    returnSidebarFromBelowBtn.style.background = "var(--bg-tertiary)";
    returnSidebarFromBelowBtn.style.opacity = "1";
  });
}

// Helper function to update button visibility based on layout mode
function updateLayoutButtonVisibility() {
  if (
    floatingWindowBtn &&
    belowChartBtn &&
    returnSidebarBtn &&
    returnSidebarFromBelowBtn
  ) {
    if (sidebarLayoutMode === "floating") {
      // Show return button in sidebar header when in floating mode
      returnSidebarBtn.style.display = "block";
      floatingWindowBtn.style.display = "none";
      belowChartBtn.style.display = "none";
      // Hide below button
      returnSidebarFromBelowBtn.style.display = "none";
    } else if (sidebarLayoutMode === "charts-below") {
      // Hide buttons in sidebar header and show return button in polar chart header
      returnSidebarBtn.style.display = "none";
      floatingWindowBtn.style.display = "none";
      belowChartBtn.style.display = "none";
      // Show return button in the below chart section
      returnSidebarFromBelowBtn.style.display = "block";
    } else {
      // Show mode buttons when in sidebar
      floatingWindowBtn.style.display = "block";
      belowChartBtn.style.display = "block";
      returnSidebarBtn.style.display = "none";
      returnSidebarFromBelowBtn.style.display = "none";
    }
  }
}

// Handle close sidebar
if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener("click", () => {
    sidebar.style.display = "none";
    sidebarToggleBtn.style.display = "flex";
    sidebarToggleBtn.style.alignItems = "center";
    sidebarToggleBtn.style.justifyContent = "center";
    if (mainContent) {
      mainContent.classList.add("sidebar-closed");
    }
    // Reset layout mode when closing sidebar
    sidebarLayoutMode = "sidebar";
    console.log("[main.js] Sidebar closed, main content expanded");
  });

  closeSidebarBtn.addEventListener("mouseenter", () => {
    closeSidebarBtn.style.opacity = "0.7";
  });
  closeSidebarBtn.addEventListener("mouseleave", () => {
    closeSidebarBtn.style.opacity = "1";
  });
}

// Handle sidebar toggle button
if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", () => {
    // Only open sidebar if currently in sidebar mode
    // If in floating or below mode, clicking toggle should close that mode instead
    if (sidebarLayoutMode === "floating") {
      // Close floating window and return to sidebar
      detachedWindow.classList.remove("show");
      sidebarLayoutMode = "sidebar";
      movePolarChartSection("sidebar");
      updateLayoutButtonVisibility();
      console.log("[main.js] Floating window closed via toggle button");
    } else if (sidebarLayoutMode === "charts-below") {
      // Close below mode and return to sidebar
      sidebarLayoutMode = "sidebar";
      movePolarChartSection("sidebar");
      updateLayoutButtonVisibility();
      console.log("[main.js] Below chart mode closed via toggle button");
    } else {
      // In sidebar mode - this shouldn't happen as toggle is hidden, but for safety
      sidebar.style.display = "flex";
      sidebar.style.flexDirection = "column";
      sidebarToggleBtn.style.display = "none";
      if (mainContent) {
        mainContent.classList.remove("sidebar-closed");
      }
      console.log("[main.js] Sidebar opened via toggle button");
    }
  });

  sidebarToggleBtn.addEventListener("mouseenter", () => {
    sidebarToggleBtn.style.backgroundColor = "var(--bg-tertiary)";
  });
  sidebarToggleBtn.addEventListener("mouseleave", () => {
    sidebarToggleBtn.style.backgroundColor = "var(--bg-secondary)";
  });
}

// Handle attach floating window back to sidebar
if (attachWindowBtn) {
  attachWindowBtn.addEventListener("click", () => {
    // Re-attach content to sidebar
    const polarChartSection = document.querySelector(".polar-chart-section");
    if (polarChartSection) {
      polarChartSection.innerHTML = detachedWindowContent.innerHTML;
    }
    detachedWindow.classList.remove("show");
    sidebar.style.display = "flex";
    sidebar.style.flexDirection = "column";
    sidebarToggleBtn.style.display = "none";
    if (mainContent) {
      mainContent.classList.remove("sidebar-closed");
    }
    sidebarLayoutMode = "sidebar";
    console.log("[main.js] Floating window attached back to sidebar");
  });
}

// Handle close floating window
if (closeWindowBtn) {
  closeWindowBtn.addEventListener("click", () => {
    detachedWindow.classList.remove("show");
    console.log("[main.js] Floating window closed");
  });
}

// Handle dragging for floating window
if (windowTitleBar) {
  windowTitleBar.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = detachedWindow.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    detachedWindow.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffsetX;
      const newY = e.clientY - dragOffsetY;

      // Constrain to viewport
      const constrainedX = Math.max(
        0,
        Math.min(newX, window.innerWidth - detachedWindow.offsetWidth)
      );
      const constrainedY = Math.max(
        0,
        Math.min(newY, window.innerHeight - detachedWindow.offsetHeight)
      );

      detachedWindow.style.left = constrainedX + "px";
      detachedWindow.style.top = constrainedY + "px";
      detachedWindow.style.right = "auto";
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      detachedWindow.style.cursor = "move";
    }
  });
}

document.addEventListener("keydown", (e) => {
  handleVerticalLineShortcuts(
    e,
    charts,
    verticalLinesX,
    fixedResultsEl,
    TIME_UNIT,
    calculateDeltas
  ).catch((err) =>
    console.error("[main.js] Error in handleVerticalLineShortcuts:", err)
  );
});

// === Theme Toggle ===
// Initialize global theme state and listen for child window requests
initGlobalThemeState();
listenForChildThemeRequests();

// === Computed Channels State ===
// Initialize global computed channels state for reactive updates
initComputedChannelsState({});

// Listen for computed channel changes and re-render charts
try {
  const computedChannelsState = getComputedChannelsState();
  if (computedChannelsState && computedChannelsState.onChannelsChanged) {
    computedChannelsState.onChannelsChanged(({ channels, source }) => {
      try {
        console.log("[main.js] Computed channels updated:", {
          source,
          channelCount: Object.keys(channels || {}).length,
        });

        // Only re-render if the change came from the child window or parent
        if (source !== "init" && channels) {
          // Re-render computed channels on the chart
          if (typeof renderComputedChannels === "function") {
            renderComputedChannels(charts, channelState, channels);
          }
        }
      } catch (e) {
        console.error("[main.js] Error handling computed channels update:", e);
      }
    });
  }
} catch (e) {
  console.warn("[main.js] Failed to setup computed channels listener:", e);
}

const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const themeName = document.getElementById("themeName");

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const newTheme = toggleGlobalTheme();
    updateThemeButton(newTheme);
    console.log(`[main.js] Theme switched to: ${newTheme}`);

    // Update all chart colors with the new theme
    updateAllChartAxisColors(charts);
  });
}

function updateThemeButton(theme) {
  if (themeIcon && themeName) {
    if (theme === "light") {
      themeIcon.textContent = "🌙";
      themeName.textContent = "Dark";
    } else {
      themeIcon.textContent = "☀️";
      themeName.textContent = "Light";
    }
  }
}

// Update button on load
updateThemeButton(getCurrentTheme());

// Listen for theme changes from other sources
window.addEventListener("themeChanged", (e) => {
  updateThemeButton(e.detail.theme);
  console.log("[main.js] Theme changed event received:", e.detail.theme);
});

// Reference existing buttons from header
const showChannelListBtn = document.getElementById("showChannelListBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

// Keep buttons enabled/disabled based on stack sizes
function updateUndoRedoButtons() {
  try {
    const canUndo = !!(
      channelState.getHistory && channelState.getHistory().length > 0
    );
    const canRedo = !!(
      channelState.getRedoStack && channelState.getRedoStack().length > 0
    );
    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
  } catch (e) {
    undoBtn.disabled = true;
    redoBtn.disabled = true;
  }
}

undoBtn.addEventListener("click", () => {
  try {
    channelState.undoLast();
  } finally {
    updateUndoRedoButtons();
  }
});
redoBtn.addEventListener("click", () => {
  try {
    channelState.redoLast && channelState.redoLast();
  } finally {
    updateUndoRedoButtons();
  }
});

// Export Computed Channel button
const exportComputedChannelBtn = document.getElementById(
  "exportComputedChannelBtn"
);
exportComputedChannelBtn.addEventListener("click", () => {
  try {
    // Export ALL computed channels as CFG+DAT (COMTRADE 2013 format)
    if (!data || !data.computedData || data.computedData.length === 0) {
      alert(
        "❌ No computed channels to export. Please create and execute equations first from the Channel List popup."
      );
      return;
    }

    const sampleRate = cfg?.sampleRate || 4800;
    exportAllComputedChannels(data, sampleRate);
  } catch (error) {
    console.error("[Export] Error:", error);
    alert(`❌ Export failed: ${error.message}`);
  }
});

// CSV Export button
const exportCSVBtn = document.getElementById("exportCSVBtn");
exportCSVBtn.addEventListener("click", () => {
  try {
    if (!data || !data.computedData || data.computedData.length === 0) {
      alert(
        "❌ No computed channels to export. Please create and execute equations first from the Channel List popup."
      );
      return;
    }

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, "");
    const filename = `computed-channels-${timestamp}.csv`;
    exportComputedChannelsAsCSV(data, filename);
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    alert(`❌ CSV export failed: ${error.message}`);
  }
});

// Update when state changes
channelState.subscribe(() => updateUndoRedoButtons());
// Initialize
updateUndoRedoButtons();

// Show Channel List button event listener
showChannelListBtn.addEventListener("click", () => {
  try {
    // Open popup window with Tabulator
    showChannelListWindow(
      channelState,
      (type, fromIdx, toIdx) => {
        // Channel reordering callback
      },
      (type, idx, color) => {
        if (type === "analog") {
          channelState.analog.lineColors[idx] = color;
        } else if (type === "digital") {
          channelState.digital.lineColors[idx] = color;
        }
      },
      charts,
      cfg,
      data
    );
  } catch (error) {
    console.error("Error opening channel list:", error);
  }
});

// Close modal when X is clicked
document
  .getElementById("close-channel-modal")
  ?.addEventListener("click", () => {
    const modal = document.getElementById("channel-list-modal");
    if (modal) modal.style.display = "none";
  });

// Close modal when clicking outside
document
  .getElementById("channel-list-modal")
  ?.addEventListener("click", (e) => {
    if (e.target.id === "channel-list-modal") {
      e.target.style.display = "none";
    }
  });

// --- Main Handlers ---
async function handleLoadFiles() {
  console.log(
    "[handleLoadFiles] Button clicked, files selected:",
    cfgFileInput.files.length
  );

  if (cfgFileInput.files.length === 0) {
    // Debug: No files selected
    showError("Please select at least one CFG/DAT file pair.", fixedResultsEl);
    return;
  }

  try {
    // Show loading indicator
    fixedResultsEl.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-secondary);"><p>🔄 Loading and parsing files...</p><p style="font-size: 0.9rem; margin-top: 10px;">Please wait, processing file</p></div>';

    console.log("[handleLoadFiles] 📂 PHASE 1: Parsing single file pair");

    // PHASE 1: Parse single CFG/DAT file pair (simple approach)
    const files = Array.from(cfgFileInput.files);

    // Find the first CFG file
    const cfgFile = files.find((file) =>
      file.name.toLowerCase().endsWith(".cfg")
    );
    if (!cfgFile) {
      throw new Error("No CFG file found. Please select a .cfg file.");
    }

    // Find matching DAT file
    const baseName = cfgFile.name.replace(/\.(cfg|dat)$/i, "");
    const datFile = files.find(
      (f) =>
        f.name.toLowerCase().startsWith(baseName.toLowerCase()) &&
        f.name.toLowerCase().endsWith(".dat")
    );

    if (!datFile) {
      throw new Error(`No matching DAT file found for ${cfgFile.name}`);
    }

    // Read and parse CFG file
    const cfgText = await readFileAsText(cfgFile);
    const cfg = parseCFG(cfgText, TIME_UNIT);

    // Read and parse DAT file
    const datText = await readFileAsText(datFile);
    const data = parseDAT(datText, cfg, "ASCII", TIME_UNIT);

    // ✅ Make cfg and data globally accessible (like temp repo)
    window.globalCfg = cfg;
    window.globalData = data;

    // Basic validation
    if (!data.time || data.time.length === 0) {
      throw new Error("Failed to parse COMTRADE data.");
    }

    console.log("[handleLoadFiles] 📊 PHASE 2: Initializing data state");

    // PHASE 2: Update global data state (light operations)
    dataState.analog = data.analogData;
    dataState.digital = data.digitalData;

    // Update UI with filename
    const filenameText = cfgFile.name.replace(".cfg", "");
    cfgFileNameEl.textContent = filenameText;
    datFileNameEl.textContent = `DAT File: ${datFile.name}`;

    const groups = autoGroupChannels(cfg.analogChannels);

    // ===== UI HELPER CALLS (Light) =====
    showFileInfo();
    updateFileInfo(filenameText, datFile.name);
    updateStatsCards({
      sampleRate: cfg.sampleRate || 4800,
      duration: cfg.duration || 2000,
      analogChannels: cfg.analogChannels,
      digitalChannels: cfg.digitalChannels,
    });
    toggleChartsVisibility(true);

    console.log("[handleLoadFiles] 🎨 PHASE 3: Channel state initialization");

    // PHASE 3: Initialize channel state (this is heavy - suspend history)
    if (channelState && channelState.suspendHistory)
      channelState.suspendHistory();
    try {
      initializeChannelState(cfg, data);

      // NEW: Populate group IDs from autoGroupChannels results
      // Convert group objects { groupId, indices, ... } into per-channel array
      // Build array where each index corresponds to a channel and contains its group ID
      const analogGroupIds = new Array(cfg.analogChannels.length);
      groups.forEach((group) => {
        group.indices.forEach((channelIdx) => {
          analogGroupIds[channelIdx] = group.groupId; // e.g., "G0", "G1", "G2"
        });
      });
      channelState.analog.groups = analogGroupIds;
      console.log(
        "[handleLoadFiles] ✅ Populated analog group IDs:",
        analogGroupIds
      );
    } finally {
      if (channelState && channelState.resumeHistory)
        channelState.resumeHistory();
    }

    console.log("[handleLoadFiles] 📈 PHASE 4: Chart rendering");

    // PHASE 4: Render all charts
    renderComtradeCharts(
      cfg,
      data,
      chartsContainer,
      charts,
      verticalLinesX,
      createState,
      calculateDeltas,
      TIME_UNIT,
      channelState
    );

    console.log("[handleLoadFiles] 🎯 PHASE 5: Polar chart initialization");

    // PHASE 5: Initialize Polar Chart using Canvas (much faster than SVG!)
    try {
      console.log("[handleLoadFiles] Creating PolarChartCanvas instance...");
      if (!polarChart) {
        // ✅ Use Canvas-based renderer for 10x+ better performance
        polarChart = new PolarChartCanvas("polarChartContainer");
        polarChart.init();
        console.log("[handleLoadFiles] ✅ PolarChartCanvas instance created");
      } else {
        console.log(
          "[handleLoadFiles] ⏭️ PolarChart already exists, skipping creation"
        );
      }

      // ✅ OPTIMIZED: Use double RAF for better responsiveness
      // Canvas rendering is so fast we can use regular RAF instead of requestIdleCallback
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            console.log("[PolarChart] 🎨 Deferred: Updating phasor visualization...");
            polarChart.updatePhasorAtTimeIndex(cfg, data, 0);
            console.log("[PolarChart] ✅ Phasor visualization complete");
          } catch (err) {
            console.error("[PolarChart] Phasor update failed:", err);
          }
        });
      });

      console.log(
        "[handleLoadFiles] ✅ Polar chart initialized (Canvas render - super fast!)"
      );
    } catch (err) {
      console.error(
        "[handleLoadFiles] ❌ Failed to initialize polar chart:",
        err.message
      );
    }

    console.log("[handleLoadFiles] 📟 PHASE 6: Computed channels");

    // PHASE 6: Load persisted computed channels
    const savedChannels = loadComputedChannelsFromStorage();
    if (savedChannels.length > 0) {
      if (!data.computedData) data.computedData = [];
      for (const savedChannel of savedChannels) {
        const exists = data.computedData.some(
          (ch) => ch.equation === savedChannel.expression
        );
        if (!exists) {
          data.computedData.push({
            id: savedChannel.name,
            equation: savedChannel.expression,
            data: savedChannel.data,
            index: data.computedData.length,
          });
        }
      }
      if (data.computedData.length > 0) {
        const exportBtn = document.getElementById("exportComputedChannelBtn");
        const csvBtn = document.getElementById("exportCSVBtn");
        if (exportBtn) exportBtn.disabled = false;
        if (csvBtn) csvBtn.disabled = false;
        renderComputedChannels(
          data,
          chartsContainer,
          charts,
          verticalLinesX,
          channelState
        );
      }
    }
    setupComputedChannelsListener();

    console.log("[handleLoadFiles] 🔗 PHASE 7: Chart integrations");

    // PHASE 7: Setup polar chart with vertical lines
    if (polarChart) {
      try {
        setupPolarChartWithVerticalLines(
          polarChart,
          cfg,
          data,
          verticalLinesX,
          charts
        );
        console.log("[handleLoadFiles] ✅ Polar chart integrated");
      } catch (err) {
        console.error(
          "[handleLoadFiles] ❌ Polar chart integration failed:",
          err.message
        );
      }
    }

    // PHASE 8: Final setup
    try {
      applyInitialStartDurations(channelState, dataState, charts);
    } catch (e) {
      console.debug("applyInitialStartDurations failed:", e);
    }

    try {
      const maxDuration = data.time ? data.time[data.time.length - 1] : 1;
      verticalLineControl = initVerticalLineControl({
        dataState: dataState,
        maxDuration: maxDuration,
        onPositionChange: (value) => {
          // Vertical line position changed
        },
      });
    } catch (error) {
      console.error(
        "[handleLoadFiles] Failed to initialize vertical line control:",
        error
      );
    }

    if (window._resizableGroup) window._resizableGroup.disconnect();
    window._resizableGroup = new ResizableGroup(".dragBar");

    // Initialize fast lookup map
    rebuildChannelIDMap();

    // Setup subscriptions
    try {
      channelState.analog?.subscribe?.(() => {
        rebuildChannelIDMap();
      });
      channelState.digital?.subscribe?.(() => {
        rebuildChannelIDMap();
      });
    } catch (e) {
      console.warn("[main] Failed to set up channelID map rebuild:", e);
    }

    // Defer subscription setup
    if (window.requestIdleCallback) {
      window.requestIdleCallback(
        () => {
          console.log(
            "[handleLoadFiles] Background: Setting up chart subscriptions..."
          );
          subscribeChartUpdates(
            channelState,
            dataState,
            charts,
            chartsContainer,
            verticalLinesX,
            cfg,
            data,
            createState,
            calculateDeltas,
            TIME_UNIT
          );
          console.log("[handleLoadFiles] ✅ Chart subscriptions ready");
        },
        { timeout: 2000 }
      );
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        subscribeChartUpdates(
          channelState,
          dataState,
          charts,
          chartsContainer,
          verticalLinesX,
          cfg,
          data,
          createState,
          calculateDeltas,
          TIME_UNIT
        );
      }, 500);
    }

    console.log(
      "[handleLoadFiles] 🎉 COMPLETE - File loaded and rendered successfully"
    );
    fixedResultsEl.innerHTML = "";
  } catch (error) {
    console.error("[handleLoadFiles] ❌ Error:", error.message);
    showError(
      "An error occurred while processing the COMTRADE files. Check the console for details.",
      fixedResultsEl
    );
  }
}
/**
 * Initialize channelState from parsed COMTRADE configuration
 *
 * @function initializeChannelState
 * @category Initialization
 * @since 1.0.0
 *
 * @description
 * Populates channelState with metadata from the parsed CFG file. Assigns
 * colors from palettes, generates stable channelIDs, and initializes all
 * per-channel arrays (scales, starts, durations, inverts) with default values.
 * History tracking is suspended during initialization to avoid recording
 * individual array mutations.
 *
 * @param {Object} cfg - Parsed COMTRADE configuration
 * @param {Array} cfg.analogChannels - Analog channel metadata
 * @param {Array} cfg.digitalChannels - Digital channel metadata
 * @param {Object} data - Parsed COMTRADE data (unused but kept for signature)
 *
 * @returns {void} Mutates channelState directly
 *
 * @mermaid
 * flowchart TD
 *     A["initializeChannelState entry"] --> B["Select palette row"]
 *     B --> C["Prepare analog arrays"]
 *     C1["Clear arrays"] -.-> C
 *     C2["Create channelIDs array"] -.-> C1
 *     C3["Seed axesScales with 1e-6"] -.-> C2
 *     C4["Loop over analog channels"] -.-> C3
 *     C5["Assign palette color"] -.-> C4
 *     C6["Push metadata into arrays"] -.-> C5
 *     C7["Generate stable channelID"] -.-> C6
 *     C8["Store channelID"] -.-> C7
 *     C9["Advance palette index"] -.-> C8
 *     C --> D["Set analog axes labels"]
 *     D --> E["Initialize digital arrays with same steps"]
 *     E --> F["channelState populated"]
 *     F --> G["All per-channel arrays aligned"]
 *     style A fill:#4CAF50,stroke:#1B5E20,color:#fff
 *     style C fill:#BBDEFB,stroke:#1565C0,color:#000
 *     style E fill:#BBDEFB,stroke:#1565C0,color:#000
 *     style F fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style G fill:#4CAF50,stroke:#1B5E20,color:#fff
 *
 * @example
 * // Initialize after parsing COMTRADE files
 * const cfg = parseCFG(cfgText, TIME_UNIT);
 * const data = parseDAT(datContent, cfg, fileType, TIME_UNIT);
 * initializeChannelState(cfg, data);
 * // Result: channelState populated with all channel metadata
 *
 * @algorithm
 * 1. Get palette row based on whiteBackground.value
 * 2. Ensure groups and yUnits arrays exist (empty arrays)
 * 3. Initialize analog channels:
 *    a. Clear all existing arrays (length = 0)
 *    b. Initialize channelIDs as empty array
 *    c. Add base axesScales value (1e-6)
 *    d. For each analog channel:
 *       - Assign color from palette (cycling through colors)
 *       - Set stroke = color
 *       - Push to yLabels, lineColors, yUnits arrays
 *       - Push default scale/start/duration/invert values
 *       - Generate stable channelID if missing
 *       - Push channelID to array
 *       - Increment palette index
 *    e. Set xLabel = "Time", xUnit = "sec"
 * 4. Initialize digital channels (same process as analog):
 *    a. Clear existing arrays
 *    b. Add axesScales values (1e-6, 1)
 *    c. Process each digital channel
 *    d. Set xLabel and xUnit
 *
 * @dependencies
 * - whiteBackground - State controlling palette selection
 * - analogPalette - Color palette array for analog channels
 * - digitalPalette - Color palette array for digital channels
 * - channelState - Reactive state object to populate
 *
 * @sideeffects
 * - Clears and repopulates channelState.analog arrays
 * - Clears and repopulates channelState.digital arrays
 * - Mutates cfg channel objects (adds color, stroke, channelID)
 * - Triggers reactive subscribers (if not suspended)
 *
 * @testcase
 * Input: cfg with 3 analog channels, 2 digital channels
 * Expected:
 * - channelState.analog arrays have length 3
 * - channelState.digital arrays have length 2
 * - All channels have unique channelIDs
 * - Colors assigned from palette
 *
 * @see {@link parseCFG} - Generates the cfg object
 * @see {@link handleLoadFiles} - Calls this function during file loading
 */
// --- Initialize channelState ---
function initializeChannelState(cfg, data) {
  const paletteRow = whiteBackground.value || 0;

  // ensure groups and yUnits exist as arrays to keep lengths consistent
  channelState.analog.groups = channelState.analog.groups || [];
  channelState.analog.yUnits = channelState.analog.yUnits || [];
  channelState.digital.groups = channelState.digital.groups || [];
  channelState.digital.yUnits = channelState.digital.yUnits || [];

  // Analog channels
  channelState.analog.yLabels.length = 0;
  channelState.analog.lineColors.length = 0;
  channelState.analog.yUnits.length = 0;
  channelState.analog.axesScales.length = 0;
  // stable ids for channels in this session
  channelState.analog.channelIDs = [];
  channelState.analog.axesScales.push(1e-6);
  let analogPaletteIdx = 0;
  cfg.analogChannels.forEach((ch, idx) => {
    ch.color =
      ch.color ||
      analogPalette[paletteRow][
        analogPaletteIdx % analogPalette[paletteRow].length
      ];
    ch.stroke = ch.color;
    channelState.analog.yLabels.push(ch.id);
    channelState.analog.lineColors.push(ch.color);
    channelState.analog.yUnits.push(ch.unit || "");
    channelState.analog.scales.push(ch.scale || 1);
    channelState.analog.starts.push(ch.start || 0);
    channelState.analog.durations.push(ch.duration || "");
    channelState.analog.inverts.push(ch.invert || false);
    // assign a stable channelID if missing
    if (!ch.channelID) {
      ch.channelID = `analog-${idx}-${Math.random().toString(36).slice(2, 9)}`;
    }
    channelState.analog.channelIDs.push(ch.channelID);
    analogPaletteIdx++;
  });
  channelState.analog.xLabel = "Time";
  channelState.analog.xUnit = "sec";

  // Digital channels
  channelState.digital.yLabels.length = 0;
  channelState.digital.lineColors.length = 0;
  channelState.digital.yUnits.length = 0;
  channelState.digital.axesScales.length = 0;
  channelState.digital.channelIDs = [];
  channelState.digital.axesScales.push(1e-6, 1);
  let digitalPaletteIdx = 0;
  cfg.digitalChannels.forEach((ch, idx) => {
    ch.color =
      ch.color ||
      digitalPalette[paletteRow][
        digitalPaletteIdx % digitalPalette[paletteRow].length
      ];
    ch.stroke = ch.color;
    channelState.digital.yLabels.push(ch.id);
    channelState.digital.lineColors.push(ch.color);
    channelState.digital.yUnits.push("");
    channelState.digital.scales.push(ch.scale || 1);
    channelState.digital.starts.push(ch.start || 0);
    channelState.digital.durations.push(ch.duration || "");
    channelState.digital.inverts.push(ch.invert || false);
    if (!ch.channelID) {
      ch.channelID = `digital-${idx}-${Math.random().toString(36).slice(2, 9)}`;
    }
    channelState.digital.channelIDs.push(ch.channelID);
    digitalPaletteIdx++;
  });
  channelState.digital.xLabel = "Time";
  channelState.digital.xUnit = "sec";
}

/**
 * Setup listener for computed channels being saved
 * Re-renders computed channels chart when new ones are created
 * OPTIMIZED: Uses debouncing and requestAnimationFrame for performance
 */
function setupComputedChannelsListener() {
  // ✅ OPTIMIZATION: Debounce rapid computed channel events (300ms delay)
  const handleComputedChannelSaved = debounce((event) => {
    const listenerStartTime = performance.now();
    console.log("[Main] Processing computed channel saved event");

    // ✅ Enable export buttons when computed channel is saved
    const exportBtn = document.getElementById("exportComputedChannelBtn");
    const csvBtn = document.getElementById("exportCSVBtn");
    if (exportBtn) {
      exportBtn.disabled = false;
    }
    if (csvBtn) {
      csvBtn.disabled = false;
    }

    // ✅ FIXED: Initialize data object if it doesn't exist
    // Computed channels can be created independently of base data
    if (!data) {
      console.log(
        "[Main] Initializing data object for computed channel rendering"
      );
      data = {
        computedData: [],
        time: null, // ← Don't initialize as empty array, use null so synthetic time is generated
        analogData: [],
        digitalData: [],
      };
    }

    // Process event data
    if (event.detail.fullData) {
      const eventProcessStart = performance.now();
      if (!data.computedData) data.computedData = [];

      // Check if it already exists
      const exists = data.computedData.some(
        (ch) => ch.id === event.detail.fullData.id
      );
      if (!exists) {
        const computedChannelObj = event.detail.fullData;

        // ✅ Validate data array contains NUMBERS
        if (computedChannelObj.data && Array.isArray(computedChannelObj.data)) {
          computedChannelObj.data = computedChannelObj.data.map((val) => {
            const num = Number(val);
            return isNaN(num) ? 0 : num;
          });
        }

        data.computedData.push(computedChannelObj);

        // Store in globalData as well
        if (window.globalData && !window.globalData.computedData) {
          window.globalData.computedData = [];
        }
        if (window.globalData && window.globalData.computedData) {
          window.globalData.computedData.push(computedChannelObj);
        }

        // Save to localStorage for persistence
        saveComputedChannelsToStorage(data.computedData);
      }
      const eventProcessTime = performance.now() - eventProcessStart;
      console.log(
        `[Main] ⏱️ Event data processing: ${eventProcessTime.toFixed(2)}ms`
      );
    }

    // ✅ OPTIMIZATION: Use requestAnimationFrame to defer chart rendering
    // This prevents blocking user interactions while charts are being created
    const rafStartTime = performance.now();
    requestAnimationFrame(() => {
      const rafExecStart = performance.now();
      console.log(
        `[Main] ⏱️ requestAnimationFrame wait: ${(
          rafExecStart - rafStartTime
        ).toFixed(2)}ms`
      );

      const chartsContainer = document.getElementById("charts");
      if (!chartsContainer) {
        console.error("[Main] Charts container not found");
        return;
      }

      // ✅ Clear old computed charts for fresh render
      const removeStartTime = performance.now();
      
      // Destroy old chart instances
      chartsComputed.forEach((chart) => {
        try {
          chart.destroy();
        } catch (e) {}
      });
      chartsComputed = [];
      window.__chartsComputed = chartsComputed;
      
      // Remove old computed chart containers from DOM
      const oldComputedContainers = chartsContainer.querySelectorAll(
        '[data-chart-type="computed"]'
      );
      oldComputedContainers.forEach((container) => {
        container.remove();
      });
      
      const removeTime = performance.now() - removeStartTime;
      console.log(`[Main] ⏱️ Chart cleanup: ${removeTime.toFixed(2)}ms`);

      // Create computed channel charts - one per channel
      try {
        const renderStartTime = performance.now();
        console.log(
          "[Main] Rendering computed channels...",
          data.computedData?.length || 0
        );
        
        // ✅ Pass chartsComputed array to renderComputedChannels (one chart per channel)
        renderComputedChannels(
          data,
          chartsContainer,
          chartsComputed,  // ← Pass chartsComputed array
          verticalLinesX,
          channelState
        );
        const renderTime = performance.now() - renderStartTime;
        console.log(
          `[Main] ⏱️ renderComputedChannels function: ${renderTime.toFixed(
            2
          )}ms`
        );

        // Scroll to the new chart
        const scrollStartTime = performance.now();
        const newComputedChart = chartsContainer.querySelector(
          '[data-chart-type="computed"]'
        );
        if (newComputedChart) {
          // ✅ FIXED: Use 'auto' instead of 'smooth' to avoid multi-second animation
          // 'smooth' uses requestAnimationFrame loops causing 3+ second freeze
          newComputedChart.scrollIntoView({
            behavior: "auto", // ← Changed from 'smooth' to prevent freeze
            block: "nearest",
          });
        }
        const scrollTime = performance.now() - scrollStartTime;
        console.log(`[Main] ⏱️ Scroll into view: ${scrollTime.toFixed(2)}ms`);
      } catch (error) {
        console.error("[Main] Error rendering computed channels:", error);
      }

      const totalRafTime = performance.now() - rafExecStart;
      console.log(
        `[Main] ⏱️ Total requestAnimationFrame work: ${totalRafTime.toFixed(
          2
        )}ms`
      );

      // Schedule a check after RAF to see if anything else is running
      requestAnimationFrame(() => {
        const afterRafTime = performance.now() - listenerStartTime;
        console.log(
          `[Main] ⏱️ After RAF callback: ${afterRafTime.toFixed(
            2
          )}ms (this captures any hanging async work)`
        );
      });
    });

    const totalListenerTime = performance.now() - listenerStartTime;
    console.log(
      `[Main] ⏱️ Total listener execution (sync part): ${totalListenerTime.toFixed(
        2
      )}ms`
    );
  }, 0); // ✅ CHANGED: No debounce delay - process immediately instead of waiting 300ms

  window.addEventListener("computedChannelSaved", handleComputedChannelSaved);
}

// One-time helper: apply initial start/duration windows after charts are created
function applyInitialStartDurations(channelState, dataState, charts) {
  const types = ["analog", "digital"];
  types.forEach((type, typeIdx) => {
    const chart = charts[typeIdx];
    if (
      !chart ||
      !Array.isArray(dataState[type]) ||
      !Array.isArray(dataState[type][0])
    )
      return;
    const timeArr = dataState[type][0];
    if (!timeArr || timeArr.length === 0) return;
    const first = timeArr[0];
    const last = timeArr[timeArr.length - 1];
    const totalSamples = timeArr.length;
    const starts = channelState[type].starts || [];
    const durations = channelState[type].durations || [];

    for (let i = 0; i < Math.max(starts.length, durations.length); i++) {
      let sRaw = starts[i];
      let dRaw = durations[i];
      let sNum = sRaw == null ? NaN : Number(sRaw);
      let dNum = dRaw == null ? NaN : Number(dRaw);

      if (Number.isInteger(sNum) && sNum >= 0 && sNum < totalSamples) {
        sNum = timeArr[sNum];
      }
      if (Number.isInteger(dNum) && dNum > 0 && dNum < totalSamples) {
        const dt = (last - first) / Math.max(1, totalSamples - 1);
        dNum = dNum * dt;
      }
      if (Number.isFinite(sNum)) {
        if (sNum < first) sNum = first;
        if (sNum > last) sNum = last;
      }
      if (Number.isFinite(dNum) && Number.isFinite(sNum)) {
        if (sNum + dNum > last) dNum = Math.max(0, last - sNum);
      }

      try {
        if (Number.isFinite(sNum) && Number.isFinite(dNum)) {
          if (typeof chart.batch === "function") {
            chart.batch(() =>
              chart.setScale("x", { min: sNum, max: sNum + dNum })
            );
          } else {
            chart.setScale("x", { min: sNum, max: sNum + dNum });
          }
          break; // apply first valid window only
        } else if (Number.isFinite(sNum)) {
          chart.setScale("x", { min: sNum, max: null });
          break;
        }
      } catch (e) {
        // ignore and try next channel
      }
    }
  });
}

// ⚡ OPTIMIZATION NOTE: Removed old updateChartsSafely function
// Color updates are now handled efficiently by the chartManager.js color subscriber
// which performs in-place updates without full chart recreation

// ⚡ OPTIMIZATION: Color updates are handled by the chartManager color subscriber
// which does efficient in-place updates. Disable the old updateChartsSafely to avoid
// full renders on color changes.
// OLD CODE (disabled): channelState.subscribe for lineColors → updateChartsSafely
// NEW PATH: lineColors change → chartManager color subscriber → in-place chart update

// Debug: watch start/duration state changes and log via debugPanelLite so we can trace
try {
  channelState.subscribeProperty(
    "start",
    (change) => {
      try {
        debugLite.log("state.start.change", change);
      } catch (e) {}
    },
    { descendants: true }
  );
  channelState.subscribeProperty(
    "duration",
    (change) => {
      try {
        debugLite.log("state.duration.change", change);
      } catch (e) {}
    },
    { descendants: true }
  );
} catch (e) {
  /* subscribeProperty not available - skip */
}

// Parent message handler: accept callbacks posted from the child popup
/**
 * Message Event Handler - Routes child window messages to appropriate handlers
 *
 * @description
 * Handles window.postMessage events from the child popup window (ChannelList/Tabulator).
 * Routes different message types to appropriate update functions, maintaining synchronization
 * between the child UI and parent application state. Supports multiple payload formats
 * for backwards compatibility.
 *
 * @mermaid
 * flowchart TD
 *     A["window message event"] --> B{"Source is ChildWindow?"}
 *     B -->|No| C["Ignore message"]
 *     B -->|Yes| D["Read type and payload"]
 *     D --> E{"Dispatch by type"}
 *     E -->|callback_color| E1["Update color via ID"]
 *     E -->|callback_scale| E2["Update scale via ID"]
 *     E -->|callback_start| E3["Update start via ID"]
 *     E -->|callback_duration| E4["Update duration via ID"]
 *     E -->|callback_invert| E5["Update invert via ID"]
 *     E -->|callback_channelName| E6["Update label via ID"]
 *     E -->|callback_group| E7["Write group field"]
 *     E -->|callback_addChannel| E8["Insert new channel"]
 *     E -->|callback_delete| E9["Delete channel"]
 *     E -->|callback_update| E10["Legacy routing"]
 *     E -->|other| E11["Log unknown type"]
 *     E1 --> F["channelState updated"]
 *     E2 --> F
 *     E3 --> F
 *     E4 --> F
 *     E5 --> F
 *     E6 --> F
 *     E7 --> F
 *     E8 --> F
 *     E9 --> F
 *     E10 --> F
 *     E11 --> G["Log error and continue"]
 *     F --> H["Notify subscribers"]
 *     H --> I["Charts refresh"]
 *     I --> J["UI reflects change"]
 *     style A fill:#E3F2FD,stroke:#1565C0,color:#000
 *     style F fill:#F3E5F5,stroke:#6A1B9A,color:#fff
 *     style J fill:#C8E6C9,stroke:#2E7D32,color:#000
 *     style E11 fill:#FFCDD2,stroke:#C62828,color:#000
 */
window.addEventListener("message", (ev) => {
  const msgStartTime = performance.now();
  const msg = ev && ev.data;

  // Listen for messages from child windows (ChannelList, Merger app)
  if (!msg || msg.source !== "ChildWindow") return;

  const { type, payload } = msg;

  // ⏱️ DIAGNOSTIC: Track all phases of message processing
  const timings = {
    start: msgStartTime,
    parsed: 0,
    switched: 0,
    subscribers: 0,
    chartUpdate: 0,
    total: 0,
  };

  console.log(`[Performance] 📨 Message received: ${type}`, {
    timestamp: msgStartTime.toFixed(2),
  });

  try {
    debugLite.log("child->parent", {
      type,
      channelID: payload?.channelID,
      field: payload?.field || payload?.name || payload?.newName || null,
      rowId: payload?.row?.id ?? payload?.rowId ?? null,
    });
  } catch (e) {}
  try {
    switch (type) {
      // ✅ Handle merged files from merger app
      case "merged_files_ready": {
        console.log("[main.js] 📦 Received merged files from merger app");
        const { cfg, data, filenames, fileCount, isMergedFromCombiner } =
          payload || {};

        if (cfg && data) {
          console.log("[main.js] ✅ Processing merged file data from combiner");

          // ✅ Data is ALREADY PARSED by combiner (using parent's parseCFG/parseDAT)
          // Just use it directly!
          window.globalCfg = cfg;
          window.globalData = data;

          console.log("[main.js] ✅ Global data set:", {
            analogChannels: cfg.analogChannels?.length || 0,
            digitalChannels: cfg.digitalChannels?.length || 0,
            samples: data.time?.length || 0,
          });

          // Trigger event for mergedFilesReceived listener
          window.dispatchEvent(
            new CustomEvent("mergedFilesReceived", {
              detail: {
                cfg: cfg,
                data: data,
                filenames: filenames || [],
                fileCount: fileCount || 1,
                isMerged: true,
                isMergedFromCombiner: isMergedFromCombiner,
              },
            })
          );
        }
        break;
      }

      // Backwards-compat: ChannelList historically sent generic 'callback_update' messages
      // for many editable fields. If we receive that, inspect payload.field and route to
      // the dedicated handlers (e.g., group) so parent updates channelState correctly.
      case CALLBACK_TYPE.INVERT: {
        const { channelID, newValue, row } = payload || {};
        if (channelID) {
          updateChannelFieldByID(channelID, "inverts", !!newValue);
        } else if (row) {
          const t = (row.type || "").toLowerCase();
          const idx = Number(row.originalIndex ?? row.id - 1);
          updateChannelFieldByIndex(t, idx, "inverts", !!row.invert);
        }
        break;
      }
      case "callback_update": {
        try {
          const f =
            payload && payload.field
              ? String(payload.field).toLowerCase()
              : null;
          if (f === "group") {
            // reuse GROUP handling logic by falling through to the GROUP case
            // construct a synthetic message and assign type for processing below
            // (we'll handle inline here to avoid code duplication)
            let row = payload && payload.row ? payload.row : null;
            let channelID = null;
            const newGroup =
              payload && payload.newValue !== undefined
                ? payload.newValue
                : payload && payload.group !== undefined
                ? payload.group
                : null;
            if (!row) {
              if (Array.isArray(payload) && payload.length >= 3)
                channelID = payload[1];
              else if (payload && payload.channelID)
                channelID = payload.channelID;
            }
            if (channelID) {
              const found = findChannelByID(channelID);
              if (found) {
                channelState[found.type].groups =
                  channelState[found.type].groups || [];
                channelState[found.type].groups[found.idx] = newGroup;
                break;
              }
            }
            if (!row) break;
            const t = (row.type || "").toLowerCase();
            // prefer explicit originalIndex/idx, else fall back to numeric id (1-based) when present
            let oi = Number(row.originalIndex ?? row.idx ?? -1);
            if (!Number.isFinite(oi) || oi < 0) {
              const maybeId = Number(row.id ?? row.name);
              if (Number.isFinite(maybeId)) oi = maybeId - 1;
            }
            if ((t === "analog" || t === "digital") && oi >= 0) {
              channelState[t].groups = channelState[t].groups || [];
              channelState[t].groups[oi] = newGroup;
              try {
                debugLite.log("msg.group.byIndex", {
                  type: t,
                  idx: oi,
                  newGroup,
                });
              } catch (e) {}
            } else {
              let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
              if (idx >= 0) {
                channelState.analog.groups = channelState.analog.groups || [];
                channelState.analog.groups[idx] = newGroup;
                try {
                  debugLite.log("msg.group.byLabel", {
                    type: "analog",
                    idx,
                    newGroup,
                  });
                } catch (e) {}
              } else {
                idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
                if (idx >= 0) {
                  channelState.digital.groups =
                    channelState.digital.groups || [];
                  channelState.digital.groups[idx] = newGroup;
                  try {
                    debugLite.log("msg.group.byLabel", {
                      type: "digital",
                      idx,
                      newGroup,
                    });
                  } catch (e) {}
                } else {
                  try {
                    debugLite.log("msg.group.notfound", { row, payload });
                  } catch (e) {}
                }
              }
            }
          }
        } catch (e) {
          /* ignore */
        }
        break;
      }
      case CALLBACK_TYPE.COLOR: {
        // Support payload shapes:
        // - legacy: { row: {...}, newValue: ... }
        // - tabulator: payload = [chartInstance, channelID, newValue]
        // - alt: { channelID, newValue }
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        let color =
          payload && payload.newValue
            ? payload.newValue
            : payload && payload.color
            ? payload.color
            : null;
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3) {
            channelID = payload[1];
            color = payload[2];
          } else if (payload && payload.channelID) {
            channelID = payload.channelID;
          }
        }

        if (channelID) {
          const updated = updateChannelFieldByID(
            channelID,
            "lineColors",
            color
          );
          if (updated) return;
          // fall through to legacy behavior if update failed
        }

        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          // use helper with bounds checks
          updateChannelFieldByIndex(t, oi, "lineColors", color);
        } else {
          // fallback: match by label
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0)
            updateChannelFieldByIndex("analog", idx, "lineColors", color);
          else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0)
              updateChannelFieldByIndex("digital", idx, "lineColors", color);
          }
        }
        break;
      }
      case CALLBACK_TYPE.SCALE: {
        // support channelID-based payloads: [chartInstance, channelID, newVal] or {channelID, newValue}
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        const newVal =
          payload && payload.newValue !== undefined
            ? payload.newValue
            : payload && payload.scale !== undefined
            ? payload.scale
            : null;
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3)
            channelID = payload[1];
          else if (payload && payload.channelID) channelID = payload.channelID;
        }
        if (channelID) {
          const updated = updateChannelFieldByID(channelID, "scales", newVal);
          if (updated) return;
        }
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          updateChannelFieldByIndex(t, oi, "scales", newVal);
        } else {
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0)
            updateChannelFieldByIndex("analog", idx, "scales", newVal);
          else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0)
              updateChannelFieldByIndex("digital", idx, "scales", newVal);
          }
        }
        break;
      }
      case CALLBACK_TYPE.START: {
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        const newVal =
          payload && payload.newValue !== undefined
            ? payload.newValue
            : payload && payload.start !== undefined
            ? payload.start
            : null;
        try {
          debugLite.log("msg.start.received", { payload, row, newVal });
        } catch (e) {}
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3)
            channelID = payload[1];
          else if (payload && payload.channelID) channelID = payload.channelID;
        }
        if (channelID) {
          const updated = updateChannelFieldByID(channelID, "starts", newVal);
          if (updated) return;
          try {
            debugLite.log("msg.start.byChannelID", {
              channelID,
              newVal,
              updated,
            });
          } catch (e) {}
        }
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          updateChannelFieldByIndex(t, oi, "starts", newVal);
          try {
            debugLite.log("msg.start.byIndex", { type: t, oi, newVal, ok });
          } catch (e) {}
        } else {
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0)
            updateChannelFieldByIndex("analog", idx, "starts", newVal);
          else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0)
              updateChannelFieldByIndex("digital", idx, "starts", newVal);
          }
        }
        break;
      }
      case CALLBACK_TYPE.DURATION: {
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        const newVal =
          payload && payload.newValue !== undefined
            ? payload.newValue
            : payload && payload.duration !== undefined
            ? payload.duration
            : null;
        try {
          debugLite.log("msg.duration.received", { payload, row, newVal });
        } catch (e) {}
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3)
            channelID = payload[1];
          else if (payload && payload.channelID) channelID = payload.channelID;
        }
        if (channelID) {
          const updated = updateChannelFieldByID(
            channelID,
            "durations",
            newVal
          );
          if (updated) return;
          try {
            debugLite.log("msg.duration.byChannelID", {
              channelID,
              newVal,
              updated,
            });
          } catch (e) {}
        }
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          const ok = updateChannelFieldByIndex(t, oi, "durations", newVal);
          try {
            debugLite.log("msg.duration.byIndex", { type: t, oi, newVal, ok });
          } catch (e) {}
        } else {
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0) {
            const ok = updateChannelFieldByIndex(
              "analog",
              idx,
              "durations",
              newVal
            );
            try {
              debugLite.log("msg.duration.byLabel", {
                type: "analog",
                idx,
                newVal,
                ok,
              });
            } catch (e) {}
          } else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0) {
              const ok = updateChannelFieldByIndex(
                "digital",
                idx,
                "durations",
                newVal
              );
              try {
                debugLite.log("msg.duration.byLabel", {
                  type: "digital",
                  idx,
                  newVal,
                  ok,
                });
              } catch (e) {}
            }
          }
        }
        break;
      }
      case CALLBACK_TYPE.INVERT: {
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        const newVal =
          payload && payload.newValue !== undefined
            ? payload.newValue
            : payload && payload.invert !== undefined
            ? payload.invert
            : null;
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3)
            channelID = payload[1];
          else if (payload && payload.channelID) channelID = payload.channelID;
        }
        if (channelID) {
          const updated = updateChannelFieldByID(channelID, "inverts", newVal);
          if (updated) return;
        }
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          updateChannelFieldByIndex(t, oi, "inverts", newVal);
        } else {
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0)
            updateChannelFieldByIndex("analog", idx, "inverts", newVal);
          else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0)
              updateChannelFieldByIndex("digital", idx, "inverts", newVal);
          }
        }
        break;
      }
      case CALLBACK_TYPE.CHANNEL_NAME: {
        try {
          debugLite.log("channel-name", {
            channelID: payload?.channelID,
            newValue: payload?.newValue ?? payload?.newName ?? null,
            rowId: payload?.row?.id ?? payload?.rowId ?? null,
          });
        } catch (e) {}
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        const newName =
          payload && payload.newValue
            ? payload.newValue
            : payload && payload.newName
            ? payload.newName
            : null;
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3)
            channelID = payload[1];
          else if (payload && payload.channelID) channelID = payload.channelID;
        }
        if (channelID) {
          const updated = updateChannelFieldByID(channelID, "yLabels", newName);
          if (updated) return;
        }
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          updateChannelFieldByIndex(t, oi, "yLabels", newName);
        } else {
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0)
            updateChannelFieldByIndex("analog", idx, "yLabels", newName);
          else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0)
              updateChannelFieldByIndex("digital", idx, "yLabels", newName);
          }
        }
        break;
      }
      case CALLBACK_TYPE.GROUP: {
        // payload shapes similar to other fields: { row, newValue } or [_, channelID, newValue]
        let row = payload && payload.row ? payload.row : null;
        let channelID = null;
        const newGroup =
          payload && payload.newValue !== undefined
            ? payload.newValue
            : payload && payload.group !== undefined
            ? payload.group
            : null;
        if (!row) {
          if (Array.isArray(payload) && payload.length >= 3)
            channelID = payload[1];
          else if (payload && payload.channelID) channelID = payload.channelID;
        }
        if (channelID) {
          // find by id and update groups array
          const found = findChannelByID(channelID);
          if (found) {
            channelState[found.type].groups =
              channelState[found.type].groups || [];
            channelState[found.type].groups[found.idx] = newGroup;
            return;
          }
        }
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);
        if ((t === "analog" || t === "digital") && oi >= 0) {
          channelState[t].groups = channelState[t].groups || [];
          channelState[t].groups[oi] = newGroup;
        } else {
          // fallback: find by label
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0) {
            channelState.analog.groups = channelState.analog.groups || [];
            channelState.analog.groups[idx] = newGroup;
          } else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0) {
              channelState.digital.groups = channelState.digital.groups || [];
              channelState.digital.groups[idx] = newGroup;
            }
          }
        }
        break;
      }
      // ✅ NEW: Handle computed channel evaluation from child window
      case "evaluateComputedChannel": {
        try {
          // ✅ REFACTORED: Use new modular orchestrator instead of monolithic case block

          const { expression, unit } = payload || {};
          if (!expression) {
            console.warn(
              "[main.js] No expression provided for computed channel"
            );
            break;
          }

          console.log(
            "[main.js] 📨 Received computed channel expression from child:",
            expression
          );

          // Convert LaTeX to math.js format
          const mathJsExpr = convertLatexToMathJs(expression);
          console.log("[main.js] 📝 Expression conversion:", {
            original: expression,
            converted: mathJsExpr,
          });

          // ✅ Delegate to new orchestrator with ORIGINAL expression
          // (so it can extract channel name from "c1=sqrt(...)" format)
          if (typeof handleComputedChannelEvaluation === "function") {
            console.log("[main.js] 🎯 Delegating to new orchestrator...");
            handleComputedChannelEvaluation({
              expression: expression, // Pass ORIGINAL for channel name extraction
              unit: unit,
            });
          } else {
            console.error(
              "[main.js] ❌ Orchestrator not available - handleComputedChannelEvaluation not found"
            );
          }
        } catch (e) {
          console.error("[main.js] ❌ Error in evaluateComputedChannel:", e);
        }
        break;
      }
      case CALLBACK_TYPE.ADD_CHANNEL: {
        const ch = payload;
        if (!ch) return;
        const t = (ch.type || ch.row?.type || "").toLowerCase();
        const isAnalog = t === "analog" || ch.type === "Analog";

        // requested insertion index (in the per-type arrays) may be provided by child
        let requestedIndex = Number(ch.requestedIndexInType);
        if (!Number.isFinite(requestedIndex) || requestedIndex < 0)
          requestedIndex = null;

        // assign a stable channelID for the new channel
        const assignedID =
          (isAnalog ? "analog" : "digital") +
          "-" +
          Math.random().toString(36).slice(2, 9);

        // ensure arrays exist
        const target = isAnalog ? channelState.analog : channelState.digital;
        target.yLabels = target.yLabels || [];
        target.lineColors = target.lineColors || [];
        target.scales = target.scales || [];
        target.starts = target.starts || [];
        target.durations = target.durations || [];
        target.inverts = target.inverts || [];
        target.channelIDs = target.channelIDs || [];

        // compute actual insert index (clamped)
        const insertAt = (() => {
          const len = target.yLabels.length;
          if (requestedIndex == null) return len; // append
          const i = Math.max(0, Math.min(len, Math.floor(requestedIndex)));
          return i;
        })();

        // insert into per-channel arrays at insertAt
        target.yLabels.splice(
          insertAt,
          0,
          ch.id || ch.name || (isAnalog ? "New Analog" : "New Digital")
        );
        target.lineColors.splice(insertAt, 0, ch.color || "#888");
        target.scales.splice(insertAt, 0, ch.scale || 1);
        target.starts.splice(insertAt, 0, ch.start || 0);
        target.durations.splice(insertAt, 0, ch.duration || "");
        target.inverts.splice(insertAt, 0, ch.invert || false);
        target.channelIDs.splice(insertAt, 0, assignedID);

        // Also insert a placeholder series into dataState (and data) so charts keep series aligned
        try {
          const dtype = isAnalog ? "analog" : "digital";
          const arr = dataState && dataState[dtype];
          const raw = data && data[dtype];
          if (Array.isArray(arr) && Array.isArray(arr[0])) {
            const timeArr = arr[0];
            const n = timeArr.length;
            const placeholder = new Array(n).fill(isAnalog ? NaN : 0);
            // series arrays start at index 1 (0 is time)
            const seriesInsertAt = insertAt + 1;
            arr.splice(seriesInsertAt, 0, placeholder);
            if (raw && Array.isArray(raw))
              raw.splice(seriesInsertAt, 0, placeholder.slice());
          }
        } catch (e) {
          console.warn(
            "Failed to insert placeholder series for new channel",
            e
          );
        }

        const assignedIndex = insertAt;

        // ack back to the child (if possible) so it can update its row metadata
        try {
          ev.source &&
            ev.source.postMessage(
              {
                source: "ParentWindow",
                type: "ack_addChannel",
                payload: {
                  tempClientId: ch.tempClientId,
                  channelID: assignedID,
                  assignedIndex,
                  type: isAnalog ? "Analog" : "Digital",
                },
              },
              "*"
            );
        } catch (e) {
          /* ignore */
        }
        // Force full re-render so charts pick up the new placeholder series and mappings
        try {
          renderComtradeCharts(
            cfg,
            data,
            chartsContainer,
            charts,
            verticalLinesX,
            createState,
            calculateDeltas,
            TIME_UNIT,
            channelState
          );
        } catch (e) {
          console.warn("re-render after addChannel failed", e);
        }
        break;
      }
      case CALLBACK_TYPE.DELETE: {
        // Accept payload shapes: channelID-based or legacy row object
        const channelID =
          Array.isArray(payload) && payload.length >= 2
            ? payload[1]
            : payload && payload.channelID
            ? payload.channelID
            : null;
        if (channelID) {
          const deleted = deleteChannelByID(channelID);
          if (deleted) {
            // Force recreation so chart._channelIndices and series alignment are rebuilt
            renderComtradeCharts(
              cfg,
              data,
              chartsContainer,
              charts,
              verticalLinesX,
              createState,
              calculateDeltas,
              TIME_UNIT,
              channelState
            );
            return;
          }
          // fall through to legacy if delete by ID failed
        }

        const row = payload;
        if (!row) return;
        const t = (row.type || "").toLowerCase();
        const oi = Number(row.originalIndex ?? row.idx ?? -1);

        const perChannelArrays = [
          "yLabels",
          "lineColors",
          "yUnits",
          "groups",
          "axesScales",
          "scales",
          "starts",
          "durations",
          "inverts",
          "channelIDs",
        ];

        const removeSeriesForType = (type, index) => {
          const s = channelState[type];
          perChannelArrays.forEach((name) => {
            if (s[name] && Array.isArray(s[name])) {
              if (index >= 0 && index < s[name].length)
                s[name].splice(index, 1);
            }
          });
          try {
            const arr = dataState && dataState[type];
            const raw = data && data[type];
            const seriesIdx = index + 1;
            if (
              Array.isArray(arr) &&
              seriesIdx >= 1 &&
              seriesIdx < arr.length
            ) {
              arr.splice(seriesIdx, 1);
            }
            if (
              raw &&
              Array.isArray(raw) &&
              seriesIdx >= 1 &&
              seriesIdx < raw.length
            ) {
              raw.splice(seriesIdx, 1);
            }
          } catch (e) {
            /* non-fatal */
          }
        };

        if (t === "analog" && oi >= 0) {
          removeSeriesForType("analog", oi);
          renderComtradeCharts(
            cfg,
            data,
            chartsContainer,
            charts,
            verticalLinesX,
            createState,
            calculateDeltas,
            TIME_UNIT,
            channelState
          );
          return;
        } else if (t === "digital" && oi >= 0) {
          removeSeriesForType("digital", oi);
          renderComtradeCharts(
            cfg,
            data,
            chartsContainer,
            charts,
            verticalLinesX,
            createState,
            calculateDeltas,
            TIME_UNIT,
            channelState
          );
          return;
        } else {
          // fallback: delete by label match
          let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
          if (idx >= 0) {
            removeSeriesForType("analog", idx);
            renderComtradeCharts(
              cfg,
              data,
              chartsContainer,
              charts,
              verticalLinesX,
              createState,
              calculateDeltas,
              TIME_UNIT,
              channelState
            );
            return;
          } else {
            idx = channelState.digital.yLabels.indexOf(row.id ?? row.name);
            if (idx >= 0) {
              removeSeriesForType("digital", idx);
              renderComtradeCharts(
                cfg,
                data,
                chartsContainer,
                charts,
                verticalLinesX,
                createState,
                calculateDeltas,
                TIME_UNIT,
                channelState
              );
              return;
            }
          }
        }
        break;
      }
      default:
        // unknown message type - ignore
        break;
    }
  } catch (err) {
    console.error("Error handling child message:", err);
  }

  // ⏱️ DIAGNOSTIC: Log detailed breakdown of where time was spent
  const msgEndTime = performance.now();
  const totalTime = msgEndTime - msgStartTime;

  if (totalTime > 30) {
    console.warn(`[Performance] ⚠️ SLOW Message processing: ${type}`, {
      totalMs: totalTime.toFixed(2),
      detail:
        "🐢 Check if: debugLite.log() is slow, subscribers are blocking, chart.redraw() is expensive",
      performance:
        totalTime > 500
          ? "🔴 VERY SLOW (FREEZE!)"
          : totalTime > 200
          ? "🔴 SLOW"
          : totalTime > 100
          ? "🟡 MEDIUM"
          : "🟡 OK",
    });
  } else if (totalTime > 10) {
    console.log(`[Performance] ✅ Message processing: ${type}`, {
      totalMs: totalTime.toFixed(2),
      performance: "🟢 FAST",
    });
  }
});
