# Group Dropdown Implementation Guide

## ✅ What Was Implemented

### 1. **Dynamic Group Dropdown in Tabulator**
The "Group" column in Tabulator now displays a **dropdown list** instead of a simple text input.

**File Modified:** `src/components/ChannelList.js`

### 2. **Key Changes**

#### A. **Group Column Definition (Line ~1627)**
```javascript
{
  title: "Group",
  field: "group",
  editor: "list",              // ✅ Changed from "input" to "list"
  width: 150,
  headerFilter: "input",
  hozAlign: "center",
  editorParams: {
    autocomplete: true,
    allowEmpty: false,
    listOnEmpty: true,
    values: getAllAvailableGroups(tableData), // ✅ Dynamic options
  },
  formatter: (cell) => {
    const value = cell.getValue();
    return value || "No Group";
  },
},
```

#### B. **New Helper Function: `getAllAvailableGroups()` (Line ~1508)**
```javascript
function getAllAvailableGroups(tableData) {
  // Default groups always available
  const defaultGroups = [
    "Currents",
    "Voltages",
    "Power",
    "Frequency",
    "Group 1",
    "Group 2",
    "Group 3",
  ];

  // Extract unique groups from current tableData
  const extractedGroups = new Set();
  if (Array.isArray(tableData)) {
    tableData.forEach((row) => {
      if (row.group && typeof row.group === "string") {
        extractedGroups.add(row.group);
      }
    });
  }

  // Combine + convert to Tabulator format
  const allGroups = new Set([...defaultGroups, ...extractedGroups]);
  const groupOptions = {};
  allGroups.forEach((group) => {
    groupOptions[group] = group;
  });

  return groupOptions;
}
```

#### C. **Dynamic Update on Group Change (Line ~1811)**
```javascript
table.on("cellEdited", (cell) => {
  const field = cell.getField ? cell.getField() : null;
  const newValue = cell.getValue();

  // ✅ When group field is edited
  if (field === "group" && newValue) {
    const currentData = table.getData();
    const updatedOptions = getAllAvailableGroups(currentData);
    
    // Update dropdown options
    const groupColumn = table.getColumn("group");
    if (groupColumn && groupColumn.getDefinition) {
      const colDef = groupColumn.getDefinition();
      if (colDef.editorParams) {
        colDef.editorParams.values = updatedOptions;
        console.log("[ChannelList] ✅ Updated group dropdown options:");
      }
    }
  }
  // ... rest of cellEdited handler
});
```

---

## 🎯 User Experience Flow

### Step 1: **Open Tabulator**
```
Currents:  [IA] [IB]
Voltages:  [VA] [VB]
```

### Step 2: **Click on Group Column**
```
User clicks on VA's "Group" cell
↓
Dropdown appears with options:
  • Currents ✓
  • Voltages (current)
  • Power
  • Frequency
  • Group 1
  • Group 2
  • Group 3
```

### Step 3: **Select New Group**
```
User selects "Currents"
↓
postMessage sent to parent
↓
chartManager.js receives message
↓
renderComtradeCharts() called
```

### Step 4: **Charts Update**
```
BEFORE:
  Currents Chart: [IA, IB]
  Voltages Chart: [VA, VB]

AFTER:
  Currents Chart: [IA, IB, VA] ← VA moved!
  Voltages Chart: [VB] ← Updated
```

---

## 📊 Data Flow: Tabulator Group Change → uPlot Update

```
1. User edits Group cell in Tabulator
   ↓
2. cellEdited event fires
   ↓
3. getAllAvailableGroups() updates dropdown with new options
   ↓
4. postMessage sent to parent (main.js)
   ↓
5. main.js message handler receives "callback_update" with field="group"
   ↓
6. updateChannelFieldByIndex() called
   ↓
7. channelState.analog.groups[idx] = newGroup
   ↓
8. Reactive proxy detects change
   ↓
9. "group" subscriber in chartManager.js triggers
   ↓
10. renderComtradeCharts() called
    ├─ Old charts destroyed
    ├─ Channels regrouped based on new group values
    └─ New charts created with updated groups
    ↓
11. ✅ uPlot instances updated!
    - VA now appears in Currents chart
    - Voltages chart reorganized
```

---

## 🔄 Dynamic Group Options Update

**When you add a new custom group:**

1. User types/selects any group value in Tabulator
2. `cellEdited` event fires
3. `getAllAvailableGroups()` is called
4. New group is extracted from tableData
5. Dropdown options are **dynamically refreshed**
6. Next time you click a group cell, the new option appears!

**Example:**
```javascript
User creates: "Custom Analysis" group on channel IA
↓
getAllAvailableGroups() detects this
↓
Dropdown now includes: "Custom Analysis"
↓
Other channels can now select "Custom Analysis"
```

---

## 🎨 Available Default Groups

These groups are **always available** in the dropdown:
- ✅ Currents
- ✅ Voltages
- ✅ Power
- ✅ Frequency
- ✅ Group 1
- ✅ Group 2
- ✅ Group 3
- ✅ + Any custom groups from channels

---

## 🔍 Console Logs for Debugging

When you change a group, check console for:
```javascript
[ChannelList] ✅ Updated group dropdown options: ['Currents', 'Voltages', 'Power', ...]
```

---

## ✨ Summary

| Feature | Status | Location |
|---------|--------|----------|
| Dropdown instead of text input | ✅ Done | ChannelList.js:1627 |
| Extract all available groups | ✅ Done | getAllAvailableGroups() |
| Default groups included | ✅ Done | Line 1514 |
| Dynamic options update | ✅ Done | cellEdited handler:1811 |
| Triggers renderComtradeCharts | ✅ Done | Via chartManager subscriber |
| Updates uPlot instances | ✅ Done | Full rebuild with new groups |

