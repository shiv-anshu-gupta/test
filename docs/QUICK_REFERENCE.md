# COMTRADE v1 - Flowchart Quick Reference Card

## 🚀 Quick Navigation

| Diagram | File                    | Focus                  | Key Concepts                                          |
| ------- | ----------------------- | ---------------------- | ----------------------------------------------------- |
| 1       | flowcharts.md           | 📊 App Initialization  | File loading, state setup, rendering                  |
| 2       | flowcharts.md           | 🔍 Channel Lookup      | findChannelByID, search logic, fallbacks              |
| 3       | flowcharts.md           | 💬 Message Handling    | postMessage flow, child→parent communication          |
| 4       | flowcharts.md           | 🔔 Reactive Updates    | State changes, subscriber notification, chart updates |
| 5       | flowcharts.md           | 🗑️ Delete Channel      | Array splice, synchronization, data removal           |
| 6       | flowcharts.md           | 🎨 Init State          | Color assignment, channel IDs, array population       |
| 7       | flowcharts.md           | 👥 Group Persistence   | Edit→update→persist→reload flow                       |
| 8       | flowcharts.md           | 📉 Digital Charts      | Label mapping, originalIndex usage                    |
| 9       | flowcharts.md           | 🔀 Message Router      | Switch statement, all callback types                  |
| 10      | flowcharts.md           | 📡 Subscribers         | Pattern implementation, filtering                     |
| 11      | flowcharts-advanced.md  | ✔️ Update Validation   | Input checks, bounds validation, type verification    |
| 12      | flowcharts-advanced.md  | 🔗 Array Sync          | Multi-array splice, series alignment                  |
| 13      | flowcharts-advanced.md  | 🔀 Fallback Logic      | channelID→index→label fallback chain                  |
| 14      | flowcharts-advanced.md  | 👥 Group Lifecycle     | Complete 9-step persistence flow                      |
| 15      | flowcharts-advanced.md  | ⚠️ Error Tree          | Validation decisions, recovery paths                  |
| 16      | flowcharts-advanced.md  | 🧠 Reactive Internals  | Proxy mechanics, path detection                       |
| 17      | flowcharts-advanced.md  | 🏗️ Data Architecture   | Complete system data flow                             |
| 18      | flowcharts-advanced.md  | 📋 Field Mapping       | Property types, callback routing                      |
| 19      | flowcharts-advanced.md  | 🆘 Error Recovery      | Logging, UI feedback, failsafes                       |
| 20      | flowcharts-advanced.md  | ➕ Add Channel         | Insertion, placeholder series, ACK                    |
| 21      | flowcharts-sequences.md | 📊 Full Sequence       | Complete message→update→render cycle                  |
| 22      | flowcharts-sequences.md | 👥 Group Sequence      | Edit→message→update→persist→reopen                    |
| 23      | flowcharts-sequences.md | 🗑️ Delete Sequence     | Delete→splice→recreate with cascade                   |
| 24      | flowcharts-sequences.md | ➕ Add Sequence        | Add→insert→ACK→recreate flow                          |
| 25      | flowcharts-sequences.md | 🔔 Subscriber Sequence | Register→mutate→notify→execute                        |
| 26      | flowcharts-sequences.md | 🆘 Error Sequence      | Error→validate→fallback→recover                       |
| 27      | flowcharts-sequences.md | 🔀 Router Flowchart    | Multi-type routing decision tree                      |
| 28      | flowcharts-sequences.md | 💾 Persistence         | Memory layer, recovery mechanisms                     |
| 29      | flowcharts-sequences.md | 🔍 Lookup Compare      | ID vs Label vs Index strategies                       |
| 30      | flowcharts-sequences.md | 🔄 Lifecycle           | Complete app birth→interaction→reload                 |

---

## 🎯 Find Diagram By Use Case

### I need to understand...

**How the app starts**
→ Diagram 1, 30

**How to find a channel**
→ Diagram 2, 29

**How messages flow from child to parent**
→ Diagram 3, 9, 21

**How state updates work**
→ Diagram 4, 10, 16, 25

**How to delete a channel**
→ Diagram 5, 12, 23

**How group edits persist**
→ Diagram 7, 14, 22

**Why labels are correct in digital chart**
→ Diagram 8

**What happens when color changes**
→ Diagram 4, 9, 10, 27

**How error handling works**
→ Diagram 15, 19, 26

**How to add a new channel**
→ Diagram 20, 24

**How reactive subscriptions work**
→ Diagram 10, 16, 25

**Complete system architecture**
→ Diagram 17, 28, 30

**How the message router works**
→ Diagram 9, 13, 27

**How array synchronization works**
→ Diagram 5, 12

**How validation happens**
→ Diagram 11, 15

---

## 🔑 Key Algorithms Visualized

### findChannelByID

**Location**: Diagram 2, 29
**Algorithm**:

1. Validate channelID
2. Search analog.channelIDs
3. Search digital.channelIDs
4. Return {type, idx} or null

### updateChannelFieldByID

**Location**: Diagram 2, 13
**Algorithm**:

1. Find channel by ID
2. Get array reference
3. Update array[idx] = value
4. Trigger subscribers

### updateChannelFieldByIndex

**Location**: Diagram 11
**Algorithm**:

1. Validate type & index
2. Initialize array if needed
3. Verify bounds
4. Update and notify

### deleteChannelByID

**Location**: Diagrams 5, 12, 23
**Algorithm**:

1. Find channel
2. Splice 10 synchronized arrays
3. Remove data series
4. Trigger recreation

### Group Edit Persistence

**Location**: Diagrams 7, 14, 22
**Algorithm**:

1. User edits group in Tabulator
2. Send callback_update message
3. Parent converts row.id (1-based) to index (0-based)
4. Update channelState.groups[idx]
5. On reopen, read persisted groups

---

## 🎨 Color Legend Quick Reference

```
🟢 SUCCESS/COMPLETION
   └─ Operations succeeded, ready for next step

🔵 PROCESSING/ACTIVE
   └─ Currently executing, receiving input/data

🟡 VALIDATION/DECISION
   └─ Checking conditions, branching logic

🔴 ERROR/FAILURE
   └─ Operation failed, error path

🟣 STATE MUTATION
   └─ Critical state changes, reactive triggers
```

---

## 📊 Message Types Reference

| Type                 | Field Mapping | Trigger           |
| -------------------- | ------------- | ----------------- |
| callback_color       | lineColors    | In-place update   |
| callback_scale       | scales        | Full recreate     |
| callback_start       | starts        | Full recreate     |
| callback_duration    | durations     | Full recreate     |
| callback_invert      | inverts       | Full recreate     |
| callback_channelName | yLabels       | In-place update   |
| callback_group       | groups        | State update      |
| callback_addChannel  | [all]         | Insert + recreate |
| callback_delete      | [all]         | Splice + recreate |
| callback_update      | [any]         | Legacy handler    |

---

## 🔐 Critical Paths

**Must Understand Before Coding**:

1. Message Handler (Diagram 3, 9)
2. State Update (Diagram 4, 16)
3. Reactive System (Diagram 10, 25)
4. Array Sync (Diagram 5, 12)

**Must Handle in Edge Cases**:

1. Index Validation (Diagram 11, 15)
2. Fallback Logic (Diagram 13)
3. Error Recovery (Diagram 19, 26)
4. Group Conversion (Diagram 14, 22)

---

## 📝 Array Synchronization List

These 10 arrays must stay in sync:

```javascript
channelState[type] = {
  yLabels              // Channel names
  lineColors           // Series colors
  yUnits               // Unit labels
  groups               // Group assignments
  axesScales           // Y-axis scaling
  scales               // Scale factors
  starts               // Start indices
  durations            // Duration values
  inverts              // Invert flags
  channelIDs           // Stable IDs
}
```

When deleting index i, splice ALL 10 arrays!

---

## 🎯 Testing Coverage Matrix

| Feature | Diagram | Test Scenarios                               |
| ------- | ------- | -------------------------------------------- |
| Lookup  | 2, 29   | Valid ID, invalid ID, null                   |
| Update  | 4, 11   | Valid update, bounds error, type error       |
| Delete  | 5, 12   | Delete first, middle, last channel           |
| Message | 3, 21   | Valid payload, missing field, wrong type     |
| Group   | 7, 22   | Edit, persist, reload, auto-compute          |
| Add     | 20, 24  | Insert at position, append, invalid position |
| Error   | 15, 26  | Validation failure, recovery, logging        |

---

## 💡 Performance Notes (from Diagrams)

| Operation         | Complexity | Notes                                   |
| ----------------- | ---------- | --------------------------------------- |
| findChannelByID   | O(n)       | Uses indexOf twice                      |
| updateByIndex     | O(1)       | Direct array access after validation    |
| deleteChannelByID | O(n\*m)    | Splices n arrays, each splice O(m)      |
| renderCharts      | O(n)       | Depends on channel count                |
| Subscriber notify | O(m)       | m = number of subscribers matching path |

---

## 🚨 Critical Validation Points

All shown in **Diagram 15** and **11**:

1. **Type Check**: `type ∈ {analog, digital}` ✅
2. **Bounds Check**: `0 ≤ idx < arr.length` ✅
3. **Array Check**: `Array.isArray(arr)` ✅
4. **Index Check**: `Number.isFinite(i)` ✅
5. **Channel Check**: `findChannelByID(id) !== null` ✅

---

## 📞 Diagram Cross-References

**Related diagrams often appear together**:

- D2 + D13: Lookup with fallback
- D3 + D9: Message routing
- D4 + D10: Reactive subscription
- D5 + D12: Array synchronization
- D7 + D22: Group persistence
- D15 + D19: Error handling
- D20 + D24: Add channel operation
- D21 + D30: Complete lifecycle

---

## ✅ Checklist for New Features

Before implementing a new feature, check:

- [ ] Is there a flowchart for this flow?
- [ ] Have I traced through all decision paths?
- [ ] Are error cases handled (Diagram 15)?
- [ ] Do I need array sync (Diagram 5, 12)?
- [ ] Do I need to handle messages (Diagram 3, 9)?
- [ ] Will state need subscription (Diagram 10, 25)?
- [ ] Do I need to handle old payloads (Diagram 13)?
- [ ] Is validation complete (Diagram 11)?

---

## 📚 Learning Resources

- **Beginner**: Start with Diagram 30 (Lifecycle)
- **Intermediate**: Follow Diagrams 1-9 in order
- **Advanced**: Study Diagrams 11-20 deep dives
- **Expert**: Analyze Diagrams 21-25 sequences
- **Debugging**: Use Diagrams 13, 15, 19, 26 for error cases

---

**Last Updated**: 2025
**Diagrams**: 30 Professional Mermaid Flowcharts
**Based On**: JSDoc Comments in src/main.js
**Format**: GitHub-Compatible Markdown + Mermaid
**Status**: Production Ready ✅
