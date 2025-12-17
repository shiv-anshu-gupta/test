# Numeric Group Assignment Patterns in COMTRADE

## Summary

Groups in COMTRADE are **NOT** managed as numeric indices (0, 1, 2...). Instead, they are:

1. **Stored by name as strings** in `channelState.analog.groups[]` and `channelState.digital.groups[]`
2. **Indexed by channel position** (0-based array index matching the channel order)
3. **Resolved into numeric chart indices** at render time based on grouping

---

## 1. Group Storage Structure

### Location: [src/main.js](src/main.js#L1837-L1839)

```javascript
// Initialize empty group arrays
channelState.analog.groups = channelState.analog.groups || [];
channelState.digital.groups = channelState.digital.groups || [];
```

**Key Pattern:**

- `channelState.analog.groups[idx]` = string group name (e.g., "Currents", "Voltages", "Group 1")
- `idx` = global channel index (0-based position in the channel list)
- NOT numeric group ID

---

## 2. Group Assignment by Index

### Location: [src/main.js](src/main.js#L2323-L2333)

When a group is changed via UI (e.g., Tabulator cell edit):

```javascript
case CALLBACK_TYPE.GROUP: {
  // Routes group change to numeric index-based assignment

  // PATTERN 1: By channelID
  if (channelID) {
    const found = findChannelByID(channelID);
    if (found) {
      channelState[found.type].groups =
        channelState[found.type].groups || [];
      channelState[found.type].groups[found.idx] = newGroup;
      break;
    }
  }

  // PATTERN 2: By row index (primaryKey)
  const t = (row.type || "").toLowerCase();
  // Prefer explicit originalIndex/idx, else fall back to numeric id (1-based)
  let oi = Number(row.originalIndex ?? row.idx ?? -1);
  if (!Number.isFinite(oi) || oi < 0) {
    const maybeId = Number(row.id ?? row.name);
    if (Number.isFinite(maybeId)) oi = maybeId - 1;  // Convert 1-based to 0-based
  }

  if ((t === "analog" || t === "digital") && oi >= 0) {
    channelState[t].groups = channelState[t].groups || [];
    channelState[t].groups[oi] = newGroup;  // ← String group name stored at numeric index

    debugLite.log("msg.group.byIndex", {
      type: t,
      idx: oi,           // ← 0-based channel index
      newGroup,          // ← String group name
    });
  }

  // PATTERN 3: By channel label lookup
  else {
    let idx = channelState.analog.yLabels.indexOf(row.id ?? row.name);
    if (idx >= 0) {
      channelState.analog.groups = channelState.analog.groups || [];
      channelState.analog.groups[idx] = newGroup;

      debugLite.log("msg.group.byLabel", {
        type: "analog",
        idx,           // ← Index found by label matching
        newGroup,
      });
    }
  }
}
```

**Debug Output Examples:**

```javascript
{
  type: "analog",
  idx: 0,              // Channel index (0-based)
  newGroup: "Currents" // Group name (string)
}

{
  type: "digital",
  idx: 2,
  newGroup: "Group 1"
}
```

---

## 3. Group Resolution in Rendering

### Location: [src/components/renderAnalogCharts.js](src/components/renderAnalogCharts.js#L28-L75)

When rendering charts, groups are resolved from names back to channel indices:

```javascript
export function renderAnalogCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState,
  autoGroupChannels
) {
  let groups;

  // Get stored group assignments by channel index
  const userGroups = channelState?.analog?.groups; // ← Array of strings indexed by channel
  const channelIDs = channelState?.analog?.channelIDs || [];
  const totalAnalog = Array.isArray(cfg.analogChannels)
    ? cfg.analogChannels
    : [];

  if (Array.isArray(userGroups) && userGroups.length > 0) {
    // NUMERIC INDEX-BASED GROUPING:
    // Build map: group name -> [channel indices]
    const explicit = {};
    const autoIndices = [];

    for (let i = 0; i < totalAnalog.length; i++) {
      const g = userGroups[i]; // ← Get group name at index i

      if (g === undefined || g === null || g === "") {
        autoIndices.push(i); // ← Channel index i goes to auto-grouping
      } else {
        if (!explicit[g]) explicit[g] = [];
        explicit[g].push(i); // ← Numeric index i added to group g
      }
    }

    // Convert { "Currents": [0, 1, 2], "Voltages": [3, 4, 5] }
    // INTO group objects with resolved indices
    groups = Object.entries(explicit).map(([name, idxs]) => ({
      name,
      indices: idxs.slice(), // ← Array of channel indices for this group
      ids: idxs.map((j) => channelIDs[j]),
    }));

    // Auto-group remaining unassigned channels
    if (autoIndices.length > 0) {
      const remainingChannels = autoIndices.map((i) => totalAnalog[i]);
      const autoGroups = autoGroupChannels(remainingChannels || []);

      autoGroups.forEach((ag) => {
        // Remap local indices in auto-group to global indices
        const globalIndices = ag.indices.map(
          (localIdx) => autoIndices[localIdx] // ← Map back to global position
        );
        groups.push({
          name: ag.name,
          indices: globalIndices, // ← Global channel indices
          ids: globalIndices.map((gi) => channelIDs[gi]),
          colors: ag.colors,
        });
      });
    }
  }

  // Render each group as a separate chart
  groups.forEach((group) => {
    // Resolve channel IDs to indices
    const resolvedIndices = (group.ids || []).map((id, i) => {
      if (id == null) return group.indices ? group.indices[i] : -1;
      const idx = channelIDs.indexOf(id);
      return idx >= 0 ? idx : group.indices ? group.indices[i] : -1;
    });

    // Filter out invalid indices
    const validIndices = resolvedIndices.filter(
      (idx) => Number.isFinite(idx) && idx >= 0
    );

    // Create one chart per group with its channels
    // ... chart creation code ...
  });
}
```

---

## 4. Chart Array Indexing (Numeric Chart Numbers)

### Location: [src/components/showChannelListWindow.js](src/components/showChannelListWindow.js#L272-L275)

Charts are stored in a numeric array where:

- `charts[0]` = First analog group chart
- `charts[1]` = Second analog group chart (or digital chart if only 1 analog group)
- `charts[2]` = Computed channels chart (if present)

```javascript
// Example: Check if digital chart exists at charts[1]
if (charts && charts[1]) {
  charts[1].plugins &&
    charts[1].plugins.find((p) => p && p.id === "digitalFill");
}
```

**Visual mapping:**

```
Channel 0, 1, 2 (Currents)    ────→ Group "Currents"    ────→ charts[0]
Channel 3, 4, 5 (Voltages)    ────→ Group "Voltages"    ────→ charts[1]
Channel 6, 7, 8 (Line Volt)   ────→ Group "Line Volt"   ────→ charts[2]
Digital channels              ────→ Digital group        ────→ charts[3]
```

---

## 5. Auto-Grouping Pattern

### Location: [src/utils/autoGroupChannels.js](src/utils/autoGroupChannels.js#L8-L130)

When channels don't have explicit group assignments, auto-grouping maps by index:

```javascript
export function autoGroupChannels(analogChannels) {
  const groups = [];
  const patterns = [
    {
      name: "Currents",
      regex: /^I[ABC]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a"],
    },
    // ... more patterns ...
  ];

  // For each pattern, map channels to numeric indices
  patterns.forEach((pattern) => {
    const indices = analogChannels
      .map((ch, idx) => (pattern.regex.test(ch.id) ? idx : -1)) // ← idx = channel index (0-based)
      .filter((idx) => idx !== -1);

    if (indices.length > 0) {
      groups.push({
        name: pattern.name,
        indices, // ← [0, 1, 2] for Currents, etc.
        colors: pattern.colorSet.slice(0, indices.length),
      });
    }
  });

  // Handle remaining ungrouped channels by index
  const groupedIndices = groups.flatMap((g) => g.indices);
  const remaining = analogChannels
    .map((ch, idx) => (groupedIndices.includes(idx) ? -1 : idx)) // ← Remaining channel indices
    .filter((idx) => idx !== -1);

  if (remaining.length > 0) {
    groups.push({
      name: "Other",
      indices: remaining,
      colors: ["#888"],
    });
  }
  return groups;
}
```

**Data Structure:**

```javascript
[
  {
    name: "Currents",
    indices: [0, 1, 2], // ← Numeric indices into analogChannels array
    colors: ["#e41a1c", "#377eb8", "#4daf4a"],
  },
  {
    name: "Voltages",
    indices: [3, 4, 5], // ← Numeric indices
    colors: ["#984ea3", "#ff7f00", "#ffff33"],
  },
  {
    name: "Line Voltages",
    indices: [6, 7, 8], // ← Numeric indices
    colors: ["#a65628", "#f781bf", "#999999"],
  },
];
```

---

## 6. ChannelList TableData Structure

### Location: [src/components/ChannelList.js](src/components/ChannelList.js#L155-L220)

When channels are displayed in the Tabulator table, they get converted to display format:

```javascript
const tableData = [
  // Analog channels
  ...cfg.analogChannels.map((ch, i) => ({
    id: i + 1,                    // ← 1-based ID for display (primaryKey)
    type: "Analog",
    name: ch.id || `Analog ${i + 1}`,
    unit: ch.unit || "",
    group: ch.group || "Group",   // ← String group name (or pulled from ch.group)
    color: ch.color || "#888888",
    scale: ch.scale || 1,
    start: ch.start || 0,
    duration: ch.duration || "",
    invert: ch.invert || "",
    isNew: false,
    originalIndex: i,             // ← 0-based index for updating channelState
  })),

  // Digital channels
  ...cfg.digitalChannels.map((ch, i) => ({
    id: i + 1,
    type: "Digital",
    name: ch.id || `Digital ${i + 1}`,
    unit: ch.unit || "",
    group: ch.group || "Group",
    color: ch.color || "#888888",
    // ... other fields ...
    originalIndex: i,             // ← 0-based index for array lookup
  })),
];

const columns = [
  { title: "ID", field: "id", width: 60, hozAlign: "center" },
  { title: "Channel Name (Unit)", field: "name", headerFilter: "input", editor: "input" },
  { title: "Unit", field: "unit", editor: "input", width: 80 },
  { title: "Group", field: "group", editor: "input", width: 120 },  // ← String groups displayed
  { title: "Color", field: "color", formatter: (cell) => { ... } },
  // ... more columns ...
];
```

**Conversion Flow:**

```
tableData[0].id = 1                     (1-based display ID)
tableData[0].originalIndex = 0          (0-based array index)
tableData[0].group = "Currents"         (String group name)
        ↓
When edited, row is updated:
row.originalIndex = 0
row.group = "Voltages"
        ↓
Tabulator sends callback:
{ type: "group", row: { ...row }, newGroup: "Voltages" }
        ↓
Handler extracts: oi = row.originalIndex = 0
        ↓
Update: channelState.analog.groups[0] = "Voltages"
```

---

## 7. Chart Manager Change Detection

### Location: [src/components/chartManager.js](src/components/chartManager.js#L40-L60)

The chart manager detects structural changes by comparing group arrays:

```javascript
/**
 * Structure-changing operations (require full chart rebuild):
 * - Groups: channelState.analog.groups[0] = 1;  // Full rebuild
 * - Units: channelState.analog.yUnits[0] = "A"; // Full rebuild if scale-related
 * - Order: channels array length or indices changed
 * - Data: dataState dimensions changed
 *
 * In-place updates (cosmetic only):
 * - Colors: channelState.analog.lineColors[0] = '#FF0000'  // In-place
 * - Labels: channelState.analog.yLabels[0] = 'New Label'    // In-place
 */

// Example structural detection
if (channelState.analog.groups !== previousGroups) {
  // TRIGGER FULL REBUILD
  renderComtradeCharts(...);
}
```

---

## 8. Summary Table: Index Levels

| Level             | Type              | Range     | Example                | Purpose                                                 |
| ----------------- | ----------------- | --------- | ---------------------- | ------------------------------------------------------- |
| **Channel Index** | Numeric (0-based) | 0 to N-1  | 0, 1, 2, ...           | Position in `cfg.analogChannels[]`                      |
| **Group Name**    | String            | Unlimited | "Currents", "Voltages" | Assigned to each channel via `channelState.groups[idx]` |
| **Chart Index**   | Numeric (0-based) | 0 to M-1  | 0, 1, 2                | Position in `charts[]` array (one per group)            |
| **Table ID**      | Numeric (1-based) | 1 to N    | 1, 2, 3                | Display ID in Tabulator (for user readability)          |

---

## 9. Key Code Patterns to Find Numeric Groups

### Search Pattern 1: Index-Based Assignment

```javascript
channelState.analog.groups[idx] = newGroup;
channelState.digital.groups[idx] = newGroup;
```

### Search Pattern 2: Index Resolution

```javascript
let oi = Number(row.originalIndex ?? row.idx ?? -1);
if (!Number.isFinite(oi) || oi < 0) {
  const maybeId = Number(row.id ?? row.name);
  if (Number.isFinite(maybeId)) oi = maybeId - 1;
}
```

### Search Pattern 3: Group Array Initialization

```javascript
.map((ch, idx) => (pattern.regex.test(ch.id) ? idx : -1))
.filter((idx) => idx !== -1)
```

### Search Pattern 4: Chart Indexing

```javascript
charts[0]; // First group's chart
charts[1]; // Second group's chart (or digital)
charts[2]; // Third group's chart (or computed)
```

---

## 10. Backward Compatibility Notes

The system supports multiple ways to specify groups:

1. **By channelID** (stable):

   ```javascript
   findChannelByID(channelID) → { type, idx }
   channelState[type].groups[idx] = newGroup
   ```

2. **By originalIndex** (Tabulator primaryKey):

   ```javascript
   row.originalIndex = 0;
   channelState[type].groups[0] = newGroup;
   ```

3. **By 1-based ID** (fallback):

   ```javascript
   row.id = 1 → idx = 0
   channelState[type].groups[0] = newGroup
   ```

4. **By channel label** (label matching):
   ```javascript
   idx = channelState.analog.yLabels.indexOf("IA");
   channelState.analog.groups[idx] = newGroup;
   ```
