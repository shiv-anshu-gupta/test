# Group Dropdown - Visual Implementation Map

## 📱 UI Changes

### Before (Old)
```
┌─────────────────────────────────────────────┐
│ Channel List (Tabulator)                    │
├──────┬──────────┬──────┬────────┬───────────┤
│ ID   │ Name     │ Unit │ Group  │ Color     │
├──────┼──────────┼──────┼────────┼───────────┤
│ 1    │ IA       │ A    │ IA     │ [■ Red]   │  ← Text input
│ 2    │ IB       │ A    │ IB     │ [■ Blue]  │  ← No dropdown
│ 3    │ VA       │ V    │ VA     │ [■ Green] │
└──────┴──────────┴──────┴────────┴───────────┘
```

### After (New) ✅
```
┌─────────────────────────────────────────────┐
│ Channel List (Tabulator)                    │
├──────┬──────────┬──────┬────────┬───────────┤
│ ID   │ Name     │ Unit │ Group  │ Color     │
├──────┼──────────┼──────┼────────┼───────────┤
│ 1    │ IA       │ A    │ Current│ [■ Red]   │
│ 2    │ IB       │ A    │ Current│ [■ Blue]  │
│ 3    │ VA       │ V    │ ▼      │ [■ Green] │  ← Dropdown!
│      │          │      │ Voltages
│      │          │      │ Currents  ◄── ALL OPTIONS
│      │          │      │ Power
│      │          │      │ Frequency
│      │          │      │ Group 1
└──────┴──────────┴──────┴────────┴───────────┘
```

---

## 🔧 Code Structure

```
ChannelList.js
├── getAllAvailableGroups(tableData)
│   ├── defaultGroups = ["Currents", "Voltages", "Power", ...]
│   ├── Extract unique groups from tableData
│   └── Return { label: value, ... } format
│
├── Column Definition
│   {
│     title: "Group",
│     field: "group",
│     editor: "list",                    ◄── Dropdown editor
│     editorParams: {
│       values: getAllAvailableGroups(tableData)  ◄── Dynamic options
│     }
│   }
│
└── cellEdited Event Handler
    ├── When field === "group"
    ├── Get current tableData
    ├── Call getAllAvailableGroups(tableData)
    └── Update groupColumn.editorParams.values
```

---

## 🔄 Data Flow: Detailed Step-by-Step

### Phase 1: Component Initialization
```
showChannelListWindow()
  │
  ├─ Serialize channelState → tableData
  │   ├─ analogChannels → rows
  │   ├─ digitalChannels → rows
  │   └─ computedChannels → rows
  │
  └─ createChannelList(cfg, onChannelUpdate)
       │
       ├─ Build tableData array
       │   └─ Each row has { id, name, unit, group, color, ... }
       │
       ├─ Define columns
       │   └─ Group column:
       │       {
       │         editor: "list",
       │         editorParams: {
       │           values: getAllAvailableGroups(tableData) ◄── Populated here
       │         }
       │       }
       │
       └─ Create Tabulator instance
           └─ Show table with dropdown options
```

### Phase 2: User Edits Group
```
User clicks VA's Group cell
  │
  ├─ cellEdited event fires
  │
  ├─ field = "group"
  ├─ newValue = "Currents" (user selected)
  │
  ├─ ✅ UPDATE DROPDOWN OPTIONS
  │   ├─ currentData = table.getData()
  │   ├─ updatedOptions = getAllAvailableGroups(currentData)
  │   ├─ groupColumn.editorParams.values = updatedOptions
  │   └─ Console: "[ChannelList] ✅ Updated group dropdown options"
  │
  ├─ postMessage to parent
  │   {
  │     source: "ChildWindow",
  │     type: "callback_update",
  │     payload: {
  │       field: "group",
  │       newValue: "Currents",
  │       channelID: "analog-2-xyz",
  │       row: { id: 3, name: "VA", ... }
  │     }
  │   }
  │
  └─ Parent receives message
       └─ See Phase 3 below
```

### Phase 3: Parent Processes Update
```
main.js message handler
  │
  ├─ Receives "callback_update" with field="group"
  │
  ├─ updateChannelFieldByIndex("analog", 2, "group", "Currents")
  │
  ├─ channelState.analog.groups[2] = "Currents"
  │   └─ Reactive proxy detects change
  │
  └─ "group" subscriber triggered in chartManager.js
       │
       ├─ debugLite.log("chart.group.change", change)
       │
       └─ renderComtradeCharts() called
            │
            ├─ chartsContainer clear
            │
            ├─ autoGroupChannels()
            │   └─ Regroup channels based on NEW groups array
            │
            ├─ Destroy OLD charts
            │   ├─ Currents (IA, IB) → destroy
            │   ├─ Voltages (VA, VB) → destroy
            │   └─ Digital charts → destroy
            │
            ├─ Create NEW charts
            │   ├─ Currents (IA, IB, VA) ◄── VA MOVED!
            │   ├─ Voltages (VB) ◄── REORGANIZED
            │   └─ Digital → recreate
            │
            └─ ✅ uPlot instances display new grouping
```

---

## 🎯 getAllAvailableGroups() Logic

```javascript
Input: tableData = [
  { name: "IA", group: "Currents" },
  { name: "IB", group: "Currents" },
  { name: "VA", group: "Voltages" },
  { name: "VB", group: "Voltages" },
]

Process:
  1. defaultGroups = ["Currents", "Voltages", "Power", "Frequency", "Group 1", "Group 2", "Group 3"]
  
  2. Extract from tableData:
     extractedGroups = { "Currents", "Voltages" }
  
  3. Merge:
     allGroups = { "Currents", "Voltages", "Power", "Frequency", "Group 1", "Group 2", "Group 3" }
  
  4. Convert to Tabulator format:
     {
       "Currents": "Currents",
       "Voltages": "Voltages",
       "Power": "Power",
       "Frequency": "Frequency",
       "Group 1": "Group 1",
       "Group 2": "Group 2",
       "Group 3": "Group 3"
     }

Output: Object suitable for Tabulator list editor
```

---

## 📊 Dynamic Update Example

### Scenario: Adding Custom Group
```
Initial State:
  Dropdown shows: [Currents, Voltages, Power, Frequency, Group 1, Group 2, Group 3]

User Action:
  1. Click VA's group cell
  2. Types: "Custom Analysis" (or selects existing option)
  3. Presses Enter
  
cellEdited triggers:
  1. field = "group"
  2. getAllAvailableGroups() called again
  3. New group "Custom Analysis" extracted from tableData
  4. Dropdown updated!
  
Next Time User Opens Dropdown:
  Shows: [Currents, Voltages, Power, Frequency, Group 1, Group 2, Group 3, Custom Analysis]
         ↑ NEW OPTION ADDED!
```

---

## 🔐 Key Implementation Details

### 1. **Dropdown Editor**
```javascript
editor: "list"  // Tabulator's dropdown editor
```
Options:
- `"input"` = text field (old)
- `"list"` = dropdown selector (new) ✅

### 2. **EditorParams Format**
```javascript
editorParams: {
  autocomplete: true,      // Autocomplete search in dropdown
  allowEmpty: false,       // Force selection
  listOnEmpty: true,       // Show list on click
  values: {                // Available options
    "Currents": "Currents",
    "Voltages": "Voltages",
    ...
  }
}
```

### 3. **Dynamic Update Timing**
- Called in `cellEdited` handler
- After user confirms new value
- Before postMessage to parent
- Updates future dropdown opens

---

## 🚀 Testing Checklist

- [ ] Open Tabulator Group column
- [ ] Click on a group cell
- [ ] Verify dropdown appears with all options
- [ ] Select different group
- [ ] Charts update with new grouping ✅
- [ ] Empty Voltages chart removed
- [ ] VA appears in Currents chart
- [ ] Click another group cell
- [ ] Verify custom groups appear in new dropdown
- [ ] Test with digital channels
- [ ] Test with computed channels

---

## 📝 Related Files

| File | Purpose |
|------|---------|
| ChannelList.js | Group dropdown UI, cellEdited handler |
| chartManager.js | "group" subscriber triggers rebuild |
| renderComtradeCharts.js | Regroups channels, destroys/creates charts |
| main.js | Message handler, updateChannelFieldByIndex |
| autoGroupChannels.js | Groups channels by pattern/unit |

