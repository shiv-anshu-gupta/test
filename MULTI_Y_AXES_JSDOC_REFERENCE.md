# Multi-Y-Axes JSDoc Reference Guide

## Overview

All functional approach modules now include comprehensive JSDoc documentation following the same pattern as `main.js`. This guide shows the documentation structure.

---

## File Headers

Each file starts with a complete file header:

```javascript
/**
 * @file axisBuilder.js - Y-Axis Definition & Configuration Builder
 * @module axisBuilder
 * @category Architecture / Functional Approach
 * @since 2.0.0
 *
 * @description
 * [Detailed description of module's purpose, role in architecture]
 *
 * [ASCII diagram showing data flow]
 *
 * @example
 * // Code example showing typical usage
 */
```

### Components:

- **@file** - Filename and brief purpose
- **@module** - Module name for JSDoc references
- **@category** - Categorization (Architecture, Utils, etc.)
- **@since** - Version when feature was introduced
- **@description** - Detailed purpose, design decisions, architecture role
- **@example** - Practical usage example with comments

---

## Function Documentation

Each exported function includes comprehensive JSDoc:

```javascript
/**
 * Function short description
 *
 * @function functionName
 * @category Category / Subcategory
 *
 * @param {Type} paramName - Parameter description
 * @param {Type} paramName.property - Nested property description
 * @returns {Type} Return description
 *
 * @description
 * [Detailed explanation of what the function does]
 *
 * [Why it exists and how it fits in the architecture]
 *
 * [Algorithm or process description if applicable]
 *
 * @example
 * // Practical example 1
 * const result = functionName(input);
 *
 * @example
 * // Practical example 2 showing different usage
 * const other = functionName(otherInput);
 */
export function functionName(paramName) {
  // ...
}
```

### Key Sections:

- **@function** - Function name
- **@category** - Logical grouping
- **@param** - Input parameters with types
- **@returns** - Return value with type
- **@description** - Detailed explanation
- **@example** - One or more usage examples

---

## Documentation Structure by Module

### 1. maxYAxesStore.js

**Purpose:** Global state management for Y-axes count

**Documented Functions:**

```javascript
@function getMaxYAxes() → number
@function setMaxYAxes(value) → void
@function getMaxYAxesState() → Object
@function resetMaxYAxes() → void
```

**Key Documentation Features:**

- Explains why reactive state (not subscriptions)
- Data flow diagrams
- API usage patterns
- Error handling

**Example JSDoc Excerpt:**

```javascript
/**
 * Set maxYAxes value in global store (publish new state)
 *
 * @function setMaxYAxes
 * @category State Mutators
 * @param {number} value - New maxYAxes count (must be >= 1)
 * @returns {void}
 * @throws {void} Does not throw, but logs warning if value is invalid
 *
 * @example
 * setMaxYAxes(2); // All charts will now use 2 Y-axes
 * console.log(getMaxYAxes()); // Outputs: 2
 */
```

---

### 2. analyzeGroupsAndPublish.js

**Purpose:** Calculate axis requirements and publish to global store

**Documented Functions:**

```javascript
@function analyzeGroupsAndPublishMaxYAxes(charts, channelState, cfg) → number
@function analyzeSpecificGroup(groupId, channelState, cfg) → number
```

**Key Documentation Features:**

- Complete architecture overview with ASCII diagram
- Step-by-step algorithm
- Console output examples for debugging
- Error handling explanation

**Example JSDoc Excerpt:**

```javascript
/**
 * Analyze group composition and publish maxYAxes to global store
 *
 * @function analyzeGroupsAndPublishMaxYAxes
 * @category Group Analysis
 *
 * @param {Array} charts - Array of chart instances (for reference/logging only)
 * @param {Object} channelState - Reactive channel state object
 * @param {Object} cfg - COMTRADE configuration object
 *
 * @returns {number} The calculated and published maxYAxes value
 *
 * @description
 * **Algorithm:**
 * 1. Extract group assignments...
 * 2. Convert string IDs...
 * 3. For each unique group ID...
 * 4. Find maximum axisCount...
 * 5. Publish to global store...
 * 6. Log detailed analysis...
 * 7. Return published value
 *
 * **Error Handling:**
 * If any error occurs during analysis, logs the error and falls back
 * to maxYAxes=1.
 */
```

---

### 3. axisCalculator.js

**Purpose:** Classify units and pre-calculate axis requirements

**Documented Items:**

```javascript
@constant UNIT_TO_TYPE - Map of units to types
@constant TYPE_TO_AXIS - Map of types to axis numbers
@function getChannelType(unit) → string
@function getAxisForType(channelType) → number
@function calculateAxisCountForGroup(channels) → number
```

**Key Documentation Features:**

- Explains unit classification strategy
- Why different axes are needed
- Scale/magnitude differences explained
- Complete mapping documentation

**Example JSDoc Excerpt:**

```javascript
/**
 * Map of unit strings to channel types
 * Used to classify channels into compatible groupings based on their units.
 *
 * Supports common SI prefixes and variations:
 * - Voltage: V, mV, kV (all mapped to 'voltage' type)
 * - Current: A, mA, kA (all mapped to 'current' type)
 * - Power: W, kW, MW, Var, kVar, VA, kVA (all mapped to 'power' type)
 * - Frequency: Hz (mapped to 'frequency' type)
 *
 * @type {Object<string, string>}
 * @private
 * @constant
 */
const UNIT_TO_TYPE = { ... }
```

---

### 4. axisBuilder.js

**Purpose:** Convert axis requirements into uPlot axis objects

**Documented Functions:**

```javascript
@function createSingleAxisDefinition(config) → Object
@function createMultiAxisDefinition(config) → Array<Object>
@function buildCompleteAxesArray(config) → Array<Object>
```

**Key Documentation Features:**

- Explains axis numbering scheme ("y0", "y1", etc.)
- Key innovation: maxYAxes priority over singleYAxis
- Visual diagrams of axis positioning
- Theme color integration
- Scenario examples

**Example JSDoc Excerpt:**

````javascript
/**
 * Build complete axes array including X-axis and Y-axes
 *
 * @function buildCompleteAxesArray
 * @category Axis Definition / Complete
 *
 * @description
 * **Axis Count Decision Logic:**
 * ```
 * if (maxYAxes is specified) {
 *   axisCount = maxYAxes;  // Use global override
 * } else if (singleYAxis is true) {
 *   axisCount = 1;  // Force single axis
 * } else {
 *   axisCount = yLabels.length;  // Use natural count
 * }
 * ```
 *
 * **Key Change in v2.0:**
 * Previously, singleYAxis would override everything.
 * Now, maxYAxes takes priority to ensure global synchronization.
 */
````

---

## Category Organization

All functions are organized by category:

### Architecture / Functional Approach

- High-level functions that define the overall architecture
- Examples: analyzeGroupsAndPublishMaxYAxes, buildCompleteAxesArray

### State Management / Accessors

- Functions for reading state
- Examples: getMaxYAxes

### State Management / Mutators

- Functions for writing/updating state
- Examples: setMaxYAxes

### Type Classification

- Unit-to-type mapping functions
- Examples: getChannelType, getAxisForType

### Axis Calculation / Advanced

- Internal utilities for specialized use cases
- Examples: analyzeSpecificGroup

### Axis Definition / Single-Axis

- Single-axis building functions
- Examples: createSingleAxisDefinition

### Axis Definition / Multi-Axis

- Multi-axis building functions
- Examples: createMultiAxisDefinition

### Axis Definition / Complete

- Complete axis array builders
- Examples: buildCompleteAxesArray

---

## Parameter Documentation Pattern

Parameters follow a consistent pattern:

```javascript
@param {Type} name - Description
@param {Array} channels - Array of channel objects with unit property
@param {Object} config - Configuration object with properties:
@param {Array<string>} config.yLabels - Channel labels
@param {Array<string>} config.yUnits - Channel units
```

### Nested Properties:

```javascript
@param {Object} channelState - Channel state
@param {Array} channelState.analog - Analog channel state
@param {Array} channelState.analog.groups - Group assignment array
```

### Optional Parameters:

```javascript
@param {number} [config.labelIndex=0] - Which label to use (optional, defaults to 0)
@param {number} [config.maxYAxes] - Pre-calculated max axes (optional)
```

### Type Hints:

```javascript
@param {number}        - Numeric values
@param {string}        - Text values
@param {boolean}       - True/false values
@param {Array<Object>} - Array of objects
@param {Object}        - Generic object
@param {*}             - Any type
@param {void}          - No return/no parameter
```

---

## Return Value Documentation

Returns follow the pattern:

```javascript
@returns {Type} Description
```

Examples:

```javascript
@returns {number} The calculated and published maxYAxes value (1, 2, 3, etc.)
@returns {Array<Object>} Array of uPlot axis configurations
@returns {void} (No return value)
@returns {Object|null} Channel location object or null if not found
```

---

## Examples in JSDoc

Each function includes one or more `@example` blocks:

```javascript
@example
// First example showing basic usage
const result = functionName(input);

@example
// Second example showing advanced usage
const advanced = functionName(complexInput);
// Output: description of what happens
```

### Multiple Examples:

- Shows different use cases
- Demonstrates common patterns
- Illustrates edge cases
- Provides copy-paste ready code

---

## Architecture Diagrams in JSDoc

Complex modules include ASCII diagrams:

```javascript
@description
```

Visualization of data flow:

```
Input Source
    ↓
Processing Step 1
    ↓
Processing Step 2
    ↓
Output Result
```

````

Used in:
- maxYAxesStore.js - State flow diagram
- analyzeGroupsAndPublish.js - Full architecture diagram
- axisBuilder.js - Axis positioning diagram

---

## Module Overview

When viewing JSDoc for a module, you get:

1. **File Purpose** - What the module does
2. **Category** - Where it fits in the codebase
3. **Architecture Role** - How it fits in the larger system
4. **Data Flow Diagrams** - Visual representation
5. **Usage Examples** - How to use the functions
6. **Per-Function Documentation** - Detailed docs for each function

---

## Viewing JSDoc

### In VS Code:
- Hover over function names → Quick documentation appears
- Function signature shows with parameter types
- Examples visible in tooltip

### IDE/Editor Support:
- All functions are auto-completable
- Parameter hints show as you type
- Return types are documented
- Documentation is accessible via intellisense

### Generating HTML Docs:
```bash
# Generate HTML documentation
jsdoc src/utils/maxYAxesStore.js src/utils/analyzeGroupsAndPublish.js \
       src/utils/axisCalculator.js src/utils/axisBuilder.js \
       --destination ./docs/functional-api
````

---

## Best Practices Demonstrated

✅ **Comprehensive** - Every public function documented
✅ **Consistent** - Same pattern across all files
✅ **Clear** - Written in plain language
✅ **Practical** - Includes real usage examples
✅ **Detailed** - Explains "why" not just "what"
✅ **Discoverable** - Well-organized with categories
✅ **Debuggable** - Includes console output examples
✅ **Maintainable** - Easy to understand the code

---

## Summary

The JSDoc documentation for the multi-Y-axes functional approach provides:

1. **Complete Architecture Understanding** - How everything fits together
2. **Usage Examples** - How to use each function
3. **Design Rationale** - Why decisions were made
4. **Error Handling** - What to expect when things go wrong
5. **Integration Points** - Where functions are called
6. **Future Extensions** - How to build on this foundation

The documentation makes the codebase accessible to new developers and serves as a reference for maintaining and extending the system.
